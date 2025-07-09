/**
 * Server Integration for Enhancer System
 * Provides middleware and utilities for integrating enhancers with MCP server
 */

import { ResponseFactory } from './enhanced-response.js';
import { initializeDefaultEnhancers, defaultRegistry } from '../enhancers/index.js';
import { SessionManager } from '../context/session-manager.js';

/**
 * Enhanced response factory with automatic enhancement pipeline
 */
export class EnhancedResponseFactory extends ResponseFactory {
  constructor(options = {}) {
    super();
    this.registry = options.registry || defaultRegistry;
    this.sessionManager = options.sessionManager || new SessionManager();
    this.initialized = false;
  }

  /**
   * Initialize the enhanced factory
   * @returns {Promise<void>}
   */
  async initialize() {
    if (this.initialized) return;
    
    // Initialize default enhancers
    await initializeDefaultEnhancers(this.registry);
    
    // Create response factory instance
    this.factory = new ResponseFactory({
      registry: this.registry,
      autoEnhance: true
    });
    
    this.initialized = true;
  }

  /**
   * Create an enhanced response
   * @param {string} type - Response type (success, error, warning, info)
   * @param {string} message - Response message
   * @param {*} data - Response data
   * @param {Object} context - Enhancement context
   * @returns {Promise<EnhancedResponse>}
   */
  async createResponse(type, message, data, context = {}) {
    if (!this.initialized) {
      await this.initialize();
    }

    // Build full context
    const fullContext = {
      ...context,
      session: context.sessionId ? this.sessionManager.getSession(context.sessionId) : null,
      operationStartTime: context.startTime || Date.now()
    };

    // Create and enhance response
    switch (type) {
      case 'success':
        return this.factory.success(message, data, { context: fullContext });
      case 'error':
        return this.factory.error(message, data, { context: fullContext });
      case 'warning':
        return this.factory.warning(message, data, { context: fullContext });
      case 'info':
        return this.factory.info(message, data, { context: fullContext });
      default:
        return this.factory.success(message, data, { context: fullContext });
    }
  }

  /**
   * Create middleware for MCP tools
   * @returns {Function} Middleware function
   */
  createMiddleware() {
    return async (toolHandler) => {
      return async (args, context = {}) => {
        const startTime = Date.now();
        
        try {
          // Execute tool
          const result = await toolHandler(args);
          
          // Check if result is already an EnhancedResponse
          if (result && result.constructor && result.constructor.name === 'EnhancedResponse') {
            return result;
          }
          
          // Create enhanced response
          return await this.createResponse('success', 'Operation completed', result, {
            ...context,
            startTime,
            operation: context.toolName,
            args
          });
        } catch (error) {
          // Create enhanced error response
          return await this.createResponse('error', error.message || 'Operation failed', error, {
            ...context,
            startTime,
            operation: context.toolName,
            args
          });
        }
      };
    };
  }

  /**
   * Wrap a tool with enhancement
   * @param {Object} tool - Tool configuration
   * @returns {Object} Enhanced tool
   */
  wrapTool(tool) {
    const middleware = this.createMiddleware();
    
    return {
      ...tool,
      handler: middleware(tool.handler)
    };
  }

  /**
   * Configure enhancers
   * @param {Object} config - Enhancer configuration
   */
  configureEnhancers(config) {
    if (config.enhancers) {
      for (const [name, settings] of Object.entries(config.enhancers)) {
        const enhancer = this.registry.get(name);
        if (enhancer) {
          enhancer.setEnabled(settings.enabled !== false);
          if (settings.config) {
            enhancer.updateConfig(settings.config);
          }
        }
      }
    }
    
    if (config.pipelines) {
      for (const [name, settings] of Object.entries(config.pipelines)) {
        if (!this.registry.getPipeline(name)) {
          this.registry.createPipeline(name, settings);
        }
      }
    }
  }

  /**
   * Get enhancer statistics
   * @returns {Object} Statistics
   */
  getStats() {
    const pipeline = this.registry.getPipeline('default');
    return {
      registry: this.registry.getStats(),
      pipeline: pipeline ? pipeline.getStats() : null
    };
  }
}

/**
 * Create enhanced MCP server
 * @param {Object} serverConfig - Server configuration
 * @returns {Object} Enhanced server configuration
 */
export function createEnhancedServer(serverConfig) {
  const enhancedFactory = new EnhancedResponseFactory();
  
  // Wrap all tools with enhancement
  const enhancedTools = {};
  for (const [name, tool] of Object.entries(serverConfig.tools || {})) {
    enhancedTools[name] = enhancedFactory.wrapTool(tool);
  }
  
  return {
    ...serverConfig,
    tools: enhancedTools,
    enhancedFactory,
    
    // Add enhancer management methods
    async initialize() {
      await enhancedFactory.initialize();
      if (serverConfig.initialize) {
        await serverConfig.initialize();
      }
    },
    
    configureEnhancers(config) {
      enhancedFactory.configureEnhancers(config);
    },
    
    getEnhancerStats() {
      return enhancedFactory.getStats();
    }
  };
}
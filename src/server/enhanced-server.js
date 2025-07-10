/**
 * Enhanced MCP Server with full lifecycle management
 */

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ErrorCode,
  ListToolsRequestSchema,
  McpError,
} from "@modelcontextprotocol/sdk/types.js";
import { EventEmitter } from 'events';
import fs from 'fs';
import path from 'path';

// Import tool registrations
import { registerGitHubFlowTools } from "../tools/github-flow.js";
import { registerAutomationTools } from "../tools/automation.js";
import { registerUtilityTools } from "../tools/utilities.js";
import { registerContextTools } from "../tools/context.js";
import { registerTeamTools } from "../tools/team.js";
import { registerSafetyTools } from "../tools/safety.js";

// Import tool registry
import { toolRegistry, ToolCategories } from "../core/tool-registry.js";

// Import session manager
import { SessionManager } from "../context/session-manager.js";

// Import utilities
import { showBanner, getWelcomeMessage } from "../utils/banner.js";

export class EnhancedMCPServer extends EventEmitter {
  constructor() {
    super();
    
    this.status = 'stopped';
    this.startTime = null;
    this.connections = 0;
    this.tools = [];
    this.transport = null;
    this.logger = null;
    this.sessionManager = null;
    
    // Default configuration
    this.config = {
      server: {
        port: 3000,
        host: 'localhost',
        maxConnections: 100,
        timeout: 30000
      },
      tools: {
        enabledCategories: Object.values(ToolCategories),
        disabledTools: [],
        customToolPaths: []
      },
      session: {
        persistence: true,
        sessionPath: './.sessions',
        maxSessions: 1000,
        sessionTimeout: 3600000 // 1 hour
      },
      logging: {
        level: 'info',
        format: 'json',
        destination: 'stdout'
      },
      authentication: {
        enabled: false,
        providers: []
      }
    };
    
    // Initialize MCP server
    this.server = new Server(
      {
        name: "glam-mcp",
        version: "2.0.0",
      },
      {
        capabilities: {
          tools: {},
        },
      },
    );
    
    this.setupHandlers();
  }

  /**
   * Load configuration from file and environment
   */
  async loadConfiguration(configPath) {
    // Load from file if provided
    if (configPath && fs.existsSync(configPath)) {
      const fileConfig = JSON.parse(await fs.promises.readFile(configPath, 'utf8'));
      this.mergeConfig(fileConfig);
    }
    
    // Override with environment variables
    if (process.env.MCP_SERVER_PORT) {
      this.config.server.port = parseInt(process.env.MCP_SERVER_PORT);
    }
    if (process.env.MCP_SERVER_HOST) {
      this.config.server.host = process.env.MCP_SERVER_HOST;
    }
    if (process.env.MCP_LOG_LEVEL) {
      this.config.logging.level = process.env.MCP_LOG_LEVEL;
    }
    if (process.env.MCP_SESSION_PATH) {
      this.config.session.sessionPath = process.env.MCP_SESSION_PATH;
    }
    if (process.env.MCP_DISABLED_TOOLS) {
      this.config.tools.disabledTools = process.env.MCP_DISABLED_TOOLS.split(',');
    }
    
    // Validate configuration
    this.validateConfiguration();
    
    return this.config;
  }

  /**
   * Merge configuration objects
   */
  mergeConfig(newConfig) {
    Object.keys(newConfig).forEach(key => {
      if (typeof newConfig[key] === 'object' && !Array.isArray(newConfig[key])) {
        this.config[key] = { ...this.config[key], ...newConfig[key] };
      } else {
        this.config[key] = newConfig[key];
      }
    });
  }

  /**
   * Validate configuration
   */
  validateConfiguration() {
    if (!this.config.server.port || this.config.server.port < 1 || this.config.server.port > 65535) {
      throw new Error('Invalid server port configuration');
    }
    
    if (!this.config.session.sessionPath) {
      throw new Error('Session path is required');
    }
    
    const validLogLevels = ['debug', 'info', 'warn', 'error'];
    if (!validLogLevels.includes(this.config.logging.level)) {
      throw new Error(`Invalid log level: ${this.config.logging.level}`);
    }
  }

  /**
   * Start the server
   */
  async start(options = {}) {
    if (this.status === 'running') {
      throw new Error('Server is already running');
    }
    
    this.status = 'starting';
    this.emit('server:starting');
    
    try {
      // Load configuration
      if (options.configPath || !this.configLoaded) {
        await this.loadConfiguration(options.configPath);
        this.configLoaded = true;
      }
      
      // Initialize subsystems
      await this.initializeLogging();
      await this.initializeSessionManager();
      await this.registerTools();
      
      // Setup signal handlers
      this.setupSignalHandlers();
      
      // Connect transport
      this.transport = new StdioServerTransport();
      await this.server.connect(this.transport);
      
      this.status = 'running';
      this.startTime = new Date();
      this.emit('server:started');
      
      // Show welcome message
      if (options.showBanner !== false) {
        showBanner('compact');
        console.log(getWelcomeMessage());
      }
      
      this.logger.info('Server started successfully', {
        port: this.config.server.port,
        toolsRegistered: this.tools.length
      });
      
      return { 
        status: 'started', 
        port: this.config.server.port,
        tools: this.tools.length
      };
    } catch (error) {
      this.status = 'stopped';
      this.logger?.error('Failed to start server', { error: error.message });
      throw error;
    }
  }

  /**
   * Stop the server
   */
  async stop(options = {}) {
    if (this.status !== 'running') {
      throw new Error('Server is not running');
    }
    
    this.status = 'stopping';
    this.emit('server:stopping');
    
    const timeout = options.timeout || 5000;
    
    try {
      const result = await Promise.race([
        this.gracefulShutdown(),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Shutdown timeout')), timeout)
        )
      ]);
      
      this.status = 'stopped';
      this.emit('server:stopped');
      
      this.logger?.info('Server stopped successfully');
      
      return result;
    } catch (error) {
      this.status = 'stopped';
      this.logger?.error('Error during shutdown', { error: error.message });
      throw error;
    }
  }

  /**
   * Restart the server
   */
  async restart(options = {}) {
    this.logger?.info('Restarting server');
    
    await this.stop(options);
    await this.start(options);
    
    return { status: 'restarted' };
  }

  /**
   * Graceful shutdown
   */
  async gracefulShutdown() {
    const shutdownTasks = [];
    
    // Close transport connection
    if (this.transport) {
      shutdownTasks.push(this.server.close());
    }
    
    // Save session data
    if (this.sessionManager && this.config.session.persistence) {
      shutdownTasks.push(this.saveSessionData());
    }
    
    // Wait for all tasks
    await Promise.all(shutdownTasks);
    
    // Cleanup resources
    await this.cleanup();
    
    return { status: 'stopped', graceful: true };
  }

  /**
   * Initialize logging system
   */
  async initializeLogging() {
    const levels = {
      debug: 0,
      info: 1,
      warn: 2,
      error: 3
    };
    
    const currentLevel = levels[this.config.logging.level];
    
    this.logger = {
      level: this.config.logging.level,
      
      log: (level, message, meta = {}) => {
        if (levels[level] < currentLevel) return;
        
        const logEntry = {
          timestamp: new Date().toISOString(),
          level,
          message,
          ...meta
        };
        
        if (this.config.logging.format === 'json') {
          console.log(JSON.stringify(logEntry));
        } else {
          const metaStr = Object.keys(meta).length > 0 ? ` ${JSON.stringify(meta)}` : '';
          console.log(`[${logEntry.timestamp}] [${level.toUpperCase()}] ${message}${metaStr}`);
        }
      },
      
      debug: (msg, meta) => this.logger.log('debug', msg, meta),
      info: (msg, meta) => this.logger.log('info', msg, meta),
      warn: (msg, meta) => this.logger.log('warn', msg, meta),
      error: (msg, meta) => this.logger.log('error', msg, meta)
    };
    
    this.logger.info('Logging system initialized', { level: this.config.logging.level });
  }

  /**
   * Initialize session manager
   */
  async initializeSessionManager() {
    // Create session directory if it doesn't exist
    await fs.promises.mkdir(this.config.session.sessionPath, { recursive: true });
    
    // Initialize SessionManager singleton with config
    this.sessionManager = SessionManager.getInstance();
    
    // Configure session manager
    this.sessionManager.setMaxSessions(this.config.session.maxSessions);
    this.sessionManager.setSessionTimeout(this.config.session.sessionTimeout);
    
    // Load existing sessions if persistence is enabled
    if (this.config.session.persistence) {
      await this.loadSessionData();
    }
    
    this.logger.info('Session manager initialized', {
      persistence: this.config.session.persistence,
      maxSessions: this.config.session.maxSessions
    });
  }

  /**
   * Register tools based on configuration
   */
  async registerTools() {
    this.tools = [];
    
    // Helper to add tool with filtering
    const addTool = (tool) => {
      // Check if tool is disabled
      if (this.config.tools.disabledTools.includes(tool.name)) {
        this.logger.debug(`Skipping disabled tool: ${tool.name}`);
        return;
      }
      
      // Check if category is enabled
      const category = this.inferCategory(tool.name);
      if (!this.config.tools.enabledCategories.includes(category)) {
        this.logger.debug(`Skipping tool from disabled category: ${tool.name} (${category})`);
        return;
      }
      
      this.tools.push(tool);
      
      // Register in centralized registry
      try {
        const metadata = {
          category,
          tags: this.inferTags(tool),
          ...tool.metadata
        };
        
        toolRegistry.register({
          ...tool,
          metadata
        });
      } catch (e) {
        // Tool might already be registered
        this.logger.debug(`Tool already registered: ${tool.name}`);
      }
    };
    
    // Create registration context with addTool method
    const registrationContext = { addTool };
    
    // Register core tools
    registerGitHubFlowTools(registrationContext);
    registerAutomationTools(registrationContext);
    registerUtilityTools(registrationContext);
    registerContextTools(registrationContext);
    registerTeamTools(registrationContext);
    registerSafetyTools(registrationContext);
    
    // Register registry management tools
    this.registerRegistryTools(registrationContext);
    
    // Load custom tools
    for (const customPath of this.config.tools.customToolPaths) {
      await this.loadCustomTools(customPath, registrationContext);
    }
    
    this.logger.info(`Registered ${this.tools.length} tools`, {
      categories: [...new Set(this.tools.map(t => this.inferCategory(t.name)))]
    });
  }

  /**
   * Register registry management tools
   */
  registerRegistryTools(context) {
    // Tool discovery
    context.addTool({
      name: "tool_search",
      description: "Search for tools by keyword, category, or capability. Use this to discover available tools.",
      inputSchema: {
        type: "object",
        properties: {
          keyword: {
            type: "string",
            description: "Keyword to search for"
          },
          category: {
            type: "string",
            enum: Object.values(ToolCategories),
            description: "Tool category to filter by"
          },
          tag: {
            type: "string",
            description: "Tag to filter by"
          }
        }
      },
      handler: async (params) => {
        const results = toolRegistry.search(params);
        return {
          success: true,
          message: `Found ${results.length} tools`,
          data: results.map(tool => ({
            name: tool.name,
            description: tool.description,
            category: tool.metadata.category,
            tags: tool.metadata.tags
          }))
        };
      },
      metadata: {
        category: ToolCategories.UTILITY,
        tags: ['discovery', 'search', 'registry']
      }
    });
    
    // Add other registry tools...
  }

  /**
   * Load custom tools from path
   */
  async loadCustomTools(customPath, context) {
    try {
      const fullPath = path.resolve(customPath);
      if (!fs.existsSync(fullPath)) {
        this.logger.warn(`Custom tool path not found: ${customPath}`);
        return;
      }
      
      const stats = await fs.promises.stat(fullPath);
      
      if (stats.isDirectory()) {
        // Load all .js files in directory
        const files = await fs.promises.readdir(fullPath);
        for (const file of files) {
          if (file.endsWith('.js')) {
            await this.loadToolFile(path.join(fullPath, file), context);
          }
        }
      } else if (stats.isFile() && fullPath.endsWith('.js')) {
        await this.loadToolFile(fullPath, context);
      }
    } catch (error) {
      this.logger.error(`Failed to load custom tools from ${customPath}`, { 
        error: error.message 
      });
    }
  }

  /**
   * Load a tool file
   */
  async loadToolFile(filePath, context) {
    try {
      const module = await import(filePath);
      
      if (module.registerTools && typeof module.registerTools === 'function') {
        module.registerTools(context);
        this.logger.debug(`Loaded tools from ${filePath}`);
      } else {
        this.logger.warn(`No registerTools export found in ${filePath}`);
      }
    } catch (error) {
      this.logger.error(`Failed to load tool file ${filePath}`, { 
        error: error.message 
      });
    }
  }

  /**
   * Setup MCP request handlers
   */
  setupHandlers() {
    // Handle tool listing
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      return {
        tools: this.tools.map((tool) => ({
          name: tool.name,
          description: tool.description,
          inputSchema: tool.inputSchema,
        })),
      };
    });

    // Handle tool execution
    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;

      const tool = this.tools.find((t) => t.name === name);
      if (!tool) {
        throw new McpError(ErrorCode.MethodNotFound, `Tool ${name} not found`);
      }

      try {
        this.connections++;
        
        const result = await tool.handler(args || {});
        
        this.connections--;
        
        return {
          content: [
            {
              type: "text",
              text:
                result.message ||
                result.text ||
                JSON.stringify(result, null, 2),
            },
          ],
        };
      } catch (error) {
        this.connections--;
        this.logger?.error(`Tool execution failed: ${name}`, { 
          error: error.message 
        });
        
        throw new McpError(
          ErrorCode.InternalError,
          `Tool execution failed: ${error.message}`,
        );
      }
    });
    
    // Setup error handling
    this.server.onerror = (error) => {
      this.logger?.error('MCP Error', { error: error.message });
    };
  }

  /**
   * Setup signal handlers
   */
  setupSignalHandlers() {
    const signals = ['SIGTERM', 'SIGINT', 'SIGHUP'];
    
    signals.forEach(signal => {
      process.on(signal, () => this.handleSignal(signal));
    });
  }

  /**
   * Handle system signals
   */
  handleSignal(signal) {
    this.logger?.info(`Received signal: ${signal}`);
    
    if (['SIGTERM', 'SIGINT'].includes(signal)) {
      this.stop({ timeout: 10000 }).then(() => {
        process.exit(0);
      }).catch((err) => {
        this.logger?.error('Error during shutdown', { error: err.message });
        process.exit(1);
      });
    } else if (signal === 'SIGHUP') {
      // Reload configuration
      this.restart().catch(err => {
        this.logger?.error('Error during restart', { error: err.message });
      });
    }
  }

  /**
   * Get health check status
   */
  async healthCheck() {
    const checks = {
      server: this.status === 'running' ? 'healthy' : 'unhealthy',
      transport: this.transport ? 'connected' : 'disconnected',
      uptime: this.startTime ? Date.now() - this.startTime.getTime() : 0,
      connections: this.connections,
      memory: process.memoryUsage(),
      sessionCount: this.sessionManager?.sessions?.size || 0
    };
    
    const isHealthy = checks.server === 'healthy' && checks.transport === 'connected';
    
    return {
      status: isHealthy ? 'healthy' : 'unhealthy',
      timestamp: new Date().toISOString(),
      checks
    };
  }

  /**
   * Get server metrics
   */
  async getMetrics() {
    return {
      uptime: this.startTime ? Date.now() - this.startTime.getTime() : 0,
      totalRequests: 0, // Would need request tracking
      activeConnections: this.connections,
      toolsRegistered: this.tools.length,
      sessionCount: this.sessionManager?.sessions?.size || 0,
      memoryUsage: process.memoryUsage(),
      cpuUsage: process.cpuUsage()
    };
  }

  /**
   * Save session data
   */
  async saveSessionData() {
    if (!this.sessionManager || !this.config.session.persistence) {
      return;
    }
    
    try {
      const sessions = Array.from(this.sessionManager.sessions.entries());
      const dataPath = path.join(this.config.session.sessionPath, 'sessions.json');
      
      await fs.promises.writeFile(
        dataPath,
        JSON.stringify(sessions, null, 2)
      );
      
      this.logger?.debug('Session data saved', { count: sessions.length });
      
      return { saved: true, count: sessions.length };
    } catch (error) {
      this.logger?.error('Failed to save session data', { error: error.message });
      throw error;
    }
  }

  /**
   * Load session data
   */
  async loadSessionData() {
    const dataPath = path.join(this.config.session.sessionPath, 'sessions.json');
    
    try {
      if (!fs.existsSync(dataPath)) {
        this.logger?.debug('No session data to load');
        return;
      }
      
      const data = await fs.promises.readFile(dataPath, 'utf8');
      const sessions = JSON.parse(data);
      
      // Restore sessions
      sessions.forEach(([id, session]) => {
        this.sessionManager.sessions.set(id, session);
      });
      
      this.logger?.info('Session data loaded', { count: sessions.length });
    } catch (error) {
      this.logger?.error('Failed to load session data', { error: error.message });
    }
  }

  /**
   * Cleanup resources
   */
  async cleanup() {
    // Clear event listeners
    this.removeAllListeners();
    
    // Clear intervals/timeouts
    // (would track and clear any created during operation)
    
    this.logger?.debug('Cleanup completed');
    
    return { cleaned: true };
  }

  /**
   * Infer category from tool name
   */
  inferCategory(toolName) {
    if (toolName.includes('github_flow')) return ToolCategories.GITHUB_FLOW;
    if (toolName.includes('auto_') || toolName.includes('npm_')) return ToolCategories.AUTOMATION;
    if (toolName.includes('context') || toolName.includes('session')) return ToolCategories.CONTEXT;
    if (toolName.includes('team')) return ToolCategories.TEAM;
    if (toolName.includes('safety') || toolName.includes('risk')) return ToolCategories.SAFETY;
    return ToolCategories.UTILITY;
  }

  /**
   * Infer tags from tool
   */
  inferTags(tool) {
    const tags = [];
    const name = tool.name.toLowerCase();
    const desc = tool.description.toLowerCase();
    
    // Infer from name
    if (name.includes('git')) tags.push('git');
    if (name.includes('test')) tags.push('test');
    if (name.includes('commit')) tags.push('commit');
    if (name.includes('branch')) tags.push('branch');
    if (name.includes('pr') || name.includes('pull')) tags.push('pr');
    
    // Infer from description
    if (desc.includes('analyze')) tags.push('analysis');
    if (desc.includes('safety') || desc.includes('risk')) tags.push('safety');
    if (desc.includes('format') || desc.includes('lint')) tags.push('code-quality');
    
    return tags;
  }
}

// Export for use
export default EnhancedMCPServer;
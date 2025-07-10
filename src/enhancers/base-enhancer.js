/**
 * Base Enhancer Interface for Response Enhancement System
 * Provides foundation for all response enhancers
 */

import { ResponseFactory } from '../core/enhanced-response.js';

/**
 * Base class for all response enhancers
 */
export class BaseEnhancer {
  constructor(options = {}) {
    this.name = options.name || this.constructor.name;
    this.priority = options.priority || 50; // 0-100, higher = earlier execution
    this.enabled = options.enabled !== false;
    this.config = options.config || {};
    this.dependencies = options.dependencies || [];
    this.tags = options.tags || [];
    this.metadata = {
      version: options.version || '1.0.0',
      description: options.description || '',
      author: options.author || ''
    };
  }

  /**
   * Process a response through this enhancer
   * @param {EnhancedResponse} response - The response to enhance
   * @param {Object} context - Additional context for enhancement
   * @returns {Promise<EnhancedResponse>} - The enhanced response
   */
  async enhance(response, context = {}) {
    if (!this.enabled) {
      return response;
    }

    const startTime = Date.now();
    
    try {
      // Validate inputs
      const validation = this.validate(response, context);
      if (validation.hasErrors()) {
        throw new Error(validation.message);
      }

      // Perform enhancement
      const enhanced = await this._doEnhance(response, context);
      
      // Add timing metadata
      const duration = Date.now() - startTime;
      enhanced.addMetadata(`enhancer.${this.name}.duration`, duration);
      
      // Log success
      this._logEnhancement('success', { duration });
      
      return enhanced;
    } catch (error) {
      // Log error
      this._logEnhancement('error', { 
        error: error.message,
        duration: Date.now() - startTime 
      });
      
      // Decide whether to propagate error or return original
      if (this.config.failSilently !== false) {
        // Only add metadata if response is valid
        if (response && response.addMetadata && typeof response.addMetadata === 'function') {
          response.addMetadata(`enhancer.${this.name}.error`, error.message);
        }
        return response;
      }
      
      throw error;
    }
  }

  /**
   * Validate inputs before enhancement
   * @param {EnhancedResponse} response - The response to validate
   * @param {Object} context - The context to validate
   * @returns {Response} - Validation result
   */
  validate(response, _context) {
    if (!response) {
      return ResponseFactory.error('Response is required');
    }

    if (!response.addMetadata || typeof response.addMetadata !== 'function') {
      return ResponseFactory.error('Invalid response object');
    }

    // Subclasses can add additional validation
    return ResponseFactory.success('Validation passed');
  }

  /**
   * Check if this enhancer can process the given response
   * @param {EnhancedResponse} response - The response to check
   * @param {Object} context - Additional context
   * @returns {boolean} - Whether this enhancer can process the response
   */
  canEnhance(response, context = {}) {
    return this.enabled && this.validate(response, context).isSuccess();
  }

  /**
   * Get enhancer metadata
   * @returns {Object} - Enhancer metadata
   */
  getMetadata() {
    return {
      name: this.name,
      priority: this.priority,
      enabled: this.enabled,
      dependencies: this.dependencies,
      ...this.metadata
    };
  }

  /**
   * Update enhancer configuration
   * @param {Object} config - New configuration values
   */
  updateConfig(config) {
    this.config = { ...this.config, ...config };
  }

  /**
   * Enable this enhancer
   */
  enable() {
    this.enabled = true;
  }

  /**
   * Disable this enhancer
   */
  disable() {
    this.enabled = false;
  }

  /**
   * Set whether this enhancer is enabled
   * @param {boolean} enabled - Whether to enable
   */
  setEnabled(enabled) {
    this.enabled = Boolean(enabled);
  }

  /**
   * Get configuration
   * @returns {Object} - Current configuration
   */
  getConfig() {
    return { ...this.config };
  }

  /**
   * Add a tag
   * @param {string} tag - Tag to add
   */
  addTag(tag) {
    if (!this.tags.includes(tag)) {
      this.tags.push(tag);
    }
  }

  /**
   * Remove a tag
   * @param {string} tag - Tag to remove
   */
  removeTag(tag) {
    const index = this.tags.indexOf(tag);
    if (index > -1) {
      this.tags.splice(index, 1);
    }
  }

  /**
   * Check if enhancer has a tag
   * @param {string} tag - Tag to check
   * @returns {boolean} - Whether tag exists
   */
  hasTag(tag) {
    return this.tags.includes(tag);
  }

  /**
   * Get all tags
   * @returns {Array<string>} - List of tags
   */
  getTags() {
    return [...this.tags];
  }

  /**
   * Add a dependency
   * @param {string} dependency - Dependency name
   */
  addDependency(dependency) {
    if (!this.dependencies.includes(dependency)) {
      this.dependencies.push(dependency);
    }
  }

  /**
   * Remove a dependency
   * @param {string} dependency - Dependency name
   */
  removeDependency(dependency) {
    const index = this.dependencies.indexOf(dependency);
    if (index > -1) {
      this.dependencies.splice(index, 1);
    }
  }

  /**
   * Check if enhancer has a dependency
   * @param {string} dependency - Dependency to check
   * @returns {boolean} - Whether dependency exists
   */
  hasDependency(dependency) {
    return this.dependencies.includes(dependency);
  }

  /**
   * Get dependencies for this enhancer
   * @returns {Array<string>} - List of enhancer names this depends on
   */
  getDependencies() {
    return [...this.dependencies];
  }

  /**
   * Perform the actual enhancement (to be implemented by subclasses)
   * @param {EnhancedResponse} response - The response to enhance
   * @param {Object} context - Additional context
   * @returns {Promise<EnhancedResponse>} - The enhanced response
   * @protected
   */
  async _doEnhance(_response, _context) {
    throw new Error(`${this.name} must implement _doEnhance method`);
  }

  /**
   * Log enhancement activity
   * @param {string} type - Type of log (success, error, warning)
   * @param {Object} data - Additional log data
   * @protected
   */
  _logEnhancement(type, data) {
    // In production, this would log to a proper logging system
    if (this.config.debug) {
      console.log(`[${this.name}] ${type}:`, data);
    }
  }
}

/**
 * Enhancer priority constants
 */
export const EnhancerPriority = {
  HIGHEST: 100,
  HIGH: 80,
  MEDIUM: 50,
  LOW: 20,
  LOWEST: 0
};

/**
 * Enhancer configuration schema
 */
export const EnhancerConfigSchema = {
  name: { type: 'string', required: true },
  priority: { type: 'number', min: 0, max: 100 },
  enabled: { type: 'boolean' },
  failSilently: { type: 'boolean' },
  debug: { type: 'boolean' },
  timeout: { type: 'number', min: 0 }
};
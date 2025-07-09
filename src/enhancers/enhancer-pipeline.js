/**
 * Enhancer Pipeline for Processing Responses
 * Manages the execution flow of multiple enhancers
 */

import { ResponseFactory } from '../core/enhanced-response.js';
import { BaseEnhancer } from './base-enhancer.js';

/**
 * Pipeline for managing and executing enhancers
 */
export class EnhancerPipeline {
  constructor(options = {}) {
    this.enhancers = new Map();
    this.config = {
      parallel: options.parallel || false,
      timeout: options.timeout || 5000,
      continueOnError: options.continueOnError !== false,
      maxConcurrent: options.maxConcurrent || 5,
      ...options
    };
    this.stats = {
      totalExecutions: 0,
      totalErrors: 0,
      enhancerStats: new Map()
    };
  }

  /**
   * Register an enhancer in the pipeline
   * @param {BaseEnhancer} enhancer - The enhancer to register
   * @returns {EnhancerPipeline} - For chaining
   */
  register(enhancer) {
    if (!(enhancer instanceof BaseEnhancer)) {
      throw new Error('Enhancer must extend BaseEnhancer');
    }

    this.enhancers.set(enhancer.name, enhancer);
    this.stats.enhancerStats.set(enhancer.name, {
      executions: 0,
      errors: 0,
      totalDuration: 0
    });

    return this;
  }

  /**
   * Unregister an enhancer
   * @param {string} name - Name of the enhancer to remove
   * @returns {boolean} - Whether the enhancer was removed
   */
  unregister(name) {
    return this.enhancers.delete(name);
  }

  /**
   * Process a response through the pipeline
   * @param {EnhancedResponse} response - The response to process
   * @param {Object} context - Additional context
   * @returns {Promise<EnhancedResponse>} - The enhanced response
   */
  async process(response, context = {}) {
    this.stats.totalExecutions++;
    const startTime = Date.now();

    try {
      // Get ordered list of enhancers
      const orderedEnhancers = this._getOrderedEnhancers();
      
      // Process enhancers
      let enhancedResponse = response;
      
      if (this.config.parallel) {
        enhancedResponse = await this._processParallel(enhancedResponse, orderedEnhancers, context);
      } else {
        enhancedResponse = await this._processSequential(enhancedResponse, orderedEnhancers, context);
      }

      // Add pipeline metadata
      enhancedResponse.addMetadata('pipeline.duration', Date.now() - startTime);
      enhancedResponse.addMetadata('pipeline.enhancersApplied', orderedEnhancers.length);

      return enhancedResponse;
    } catch (error) {
      this.stats.totalErrors++;
      
      if (!this.config.continueOnError) {
        throw error;
      }

      // Return response with error metadata
      response.addMetadata('pipeline.error', error.message);
      response.addMetadata('pipeline.duration', Date.now() - startTime);
      
      return response;
    }
  }

  /**
   * Get statistics about pipeline execution
   * @returns {Object} - Pipeline statistics
   */
  getStats() {
    const enhancerDetails = {};
    
    for (const [name, stats] of this.stats.enhancerStats) {
      enhancerDetails[name] = {
        ...stats,
        averageDuration: stats.executions > 0 
          ? Math.round(stats.totalDuration / stats.executions) 
          : 0,
        errorRate: stats.executions > 0 
          ? (stats.errors / stats.executions * 100).toFixed(2) + '%'
          : '0%'
      };
    }

    return {
      totalExecutions: this.stats.totalExecutions,
      totalErrors: this.stats.totalErrors,
      errorRate: this.stats.totalExecutions > 0 
        ? (this.stats.totalErrors / this.stats.totalExecutions * 100).toFixed(2) + '%'
        : '0%',
      enhancers: enhancerDetails
    };
  }

  /**
   * Reset pipeline statistics
   */
  resetStats() {
    this.stats.totalExecutions = 0;
    this.stats.totalErrors = 0;
    
    for (const stats of this.stats.enhancerStats.values()) {
      stats.executions = 0;
      stats.errors = 0;
      stats.totalDuration = 0;
    }
  }

  /**
   * Get all registered enhancers
   * @returns {Map<string, BaseEnhancer>} - Map of enhancers
   */
  getEnhancers() {
    return new Map(this.enhancers);
  }

  /**
   * Get enhancer by name
   * @param {string} name - Enhancer name
   * @returns {BaseEnhancer|undefined} - The enhancer or undefined
   */
  getEnhancer(name) {
    return this.enhancers.get(name);
  }

  /**
   * Update pipeline configuration
   * @param {Object} config - New configuration values
   */
  updateConfig(config) {
    this.config = { ...this.config, ...config };
  }

  // Private methods

  /**
   * Get enhancers ordered by priority and dependencies
   * @returns {Array<BaseEnhancer>} - Ordered enhancers
   * @private
   */
  _getOrderedEnhancers() {
    const enhancers = Array.from(this.enhancers.values())
      .filter(e => e.enabled);

    // First sort by priority
    enhancers.sort((a, b) => b.priority - a.priority);

    // Then ensure dependencies are respected
    return this._sortByDependencies(enhancers);
  }

  /**
   * Sort enhancers respecting dependencies
   * @param {Array<BaseEnhancer>} enhancers - Enhancers to sort
   * @returns {Array<BaseEnhancer>} - Sorted enhancers
   * @private
   */
  _sortByDependencies(enhancers) {
    const sorted = [];
    const visited = new Set();
    const visiting = new Set();

    const visit = (enhancer) => {
      if (visited.has(enhancer.name)) return;
      if (visiting.has(enhancer.name)) {
        throw new Error(`Circular dependency detected: ${enhancer.name}`);
      }

      visiting.add(enhancer.name);

      // Visit dependencies first
      for (const depName of enhancer.getDependencies()) {
        const dep = enhancers.find(e => e.name === depName);
        if (dep && !visited.has(depName)) {
          visit(dep);
        }
      }

      visiting.delete(enhancer.name);
      visited.add(enhancer.name);
      sorted.push(enhancer);
    };

    for (const enhancer of enhancers) {
      visit(enhancer);
    }

    return sorted;
  }

  /**
   * Process enhancers sequentially
   * @param {EnhancedResponse} response - The response
   * @param {Array<BaseEnhancer>} enhancers - Enhancers to apply
   * @param {Object} context - Context
   * @returns {Promise<EnhancedResponse>} - Enhanced response
   * @private
   */
  async _processSequential(response, enhancers, context) {
    let current = response;

    for (const enhancer of enhancers) {
      if (!enhancer.canEnhance(current, context)) {
        continue;
      }

      const startTime = Date.now();
      
      try {
        current = await this._executeEnhancer(enhancer, current, context);
        this._recordSuccess(enhancer.name, Date.now() - startTime);
      } catch (error) {
        this._recordError(enhancer.name, Date.now() - startTime);
        
        if (!this.config.continueOnError) {
          throw error;
        }
      }
    }

    return current;
  }

  /**
   * Process enhancers in parallel
   * @param {EnhancedResponse} response - The response
   * @param {Array<BaseEnhancer>} enhancers - Enhancers to apply
   * @param {Object} context - Context
   * @returns {Promise<EnhancedResponse>} - Enhanced response
   * @private
   */
  async _processParallel(response, enhancers, context) {
    // Group enhancers by dependency level
    const levels = this._groupByDependencyLevel(enhancers);
    let current = response;

    // Process each level in sequence, but enhancers within a level in parallel
    for (const level of levels) {
      const validEnhancers = level.filter(e => e.canEnhance(current, context));
      
      if (validEnhancers.length === 0) continue;

      // Process this level in parallel with concurrency limit
      const results = await this._processWithConcurrency(
        validEnhancers,
        async (enhancer) => {
          const startTime = Date.now();
          
          try {
            const result = await this._executeEnhancer(enhancer, current, context);
            this._recordSuccess(enhancer.name, Date.now() - startTime);
            return { success: true, result, enhancer: enhancer.name };
          } catch (error) {
            this._recordError(enhancer.name, Date.now() - startTime);
            return { success: false, error, enhancer: enhancer.name };
          }
        },
        this.config.maxConcurrent
      );

      // Merge successful results
      for (const result of results) {
        if (result.success && result.result) {
          // Merge enhancements from parallel execution
          current = this._mergeEnhancements(current, result.result);
        } else if (!result.success && !this.config.continueOnError) {
          throw result.error;
        }
      }
    }

    return current;
  }

  /**
   * Execute enhancer with timeout
   * @param {BaseEnhancer} enhancer - The enhancer
   * @param {EnhancedResponse} response - The response
   * @param {Object} context - Context
   * @returns {Promise<EnhancedResponse>} - Enhanced response
   * @private
   */
  async _executeEnhancer(enhancer, response, context) {
    if (this.config.timeout && this.config.timeout > 0) {
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error(`Enhancer ${enhancer.name} timed out`)), this.config.timeout);
      });

      return Promise.race([
        enhancer.enhance(response, context),
        timeoutPromise
      ]);
    }
    
    return enhancer.enhance(response, context);
  }

  /**
   * Group enhancers by dependency level
   * @param {Array<BaseEnhancer>} enhancers - Enhancers to group
   * @returns {Array<Array<BaseEnhancer>>} - Grouped enhancers
   * @private
   */
  _groupByDependencyLevel(enhancers) {
    const levels = [];
    const processed = new Set();

    while (processed.size < enhancers.length) {
      const level = [];
      
      for (const enhancer of enhancers) {
        if (processed.has(enhancer.name)) continue;
        
        // Check if all dependencies are processed
        const depsProcessed = enhancer.getDependencies()
          .every(dep => processed.has(dep) || !enhancers.some(e => e.name === dep));
        
        if (depsProcessed) {
          level.push(enhancer);
        }
      }

      if (level.length === 0) {
        // No progress made - circular dependency or missing dependency
        break;
      }

      for (const enhancer of level) {
        processed.add(enhancer.name);
      }

      levels.push(level);
    }

    return levels;
  }

  /**
   * Process items with concurrency limit
   * @param {Array} items - Items to process
   * @param {Function} processor - Processing function
   * @param {number} maxConcurrent - Max concurrent operations
   * @returns {Promise<Array>} - Results
   * @private
   */
  async _processWithConcurrency(items, processor, maxConcurrent) {
    const results = [];
    const executing = [];

    for (const item of items) {
      const promise = processor(item).then(result => {
        executing.splice(executing.indexOf(promise), 1);
        return result;
      });

      results.push(promise);
      executing.push(promise);

      if (executing.length >= maxConcurrent) {
        await Promise.race(executing);
      }
    }

    return Promise.all(results);
  }

  /**
   * Merge enhancements from parallel execution
   * @param {EnhancedResponse} base - Base response
   * @param {EnhancedResponse} enhanced - Enhanced response
   * @returns {EnhancedResponse} - Merged response
   * @private
   */
  _mergeEnhancements(base, enhanced) {
    // This is a simple merge strategy - could be made more sophisticated
    const merged = base;
    
    // Merge suggestions
    for (const suggestion of enhanced.suggestions) {
      if (!merged.suggestions.some(s => s.action === suggestion.action)) {
        merged.suggestions.push(suggestion);
      }
    }

    // Merge risks
    for (const risk of enhanced.risks) {
      if (!merged.risks.some(r => r.description === risk.description)) {
        merged.risks.push(risk);
      }
    }

    // Merge context
    merged.context = { ...merged.context, ...enhanced.context };

    // Merge metadata
    merged.metadata = { ...merged.metadata, ...enhanced.metadata };

    return merged;
  }

  /**
   * Record successful enhancement
   * @param {string} enhancerName - Enhancer name
   * @param {number} duration - Execution duration
   * @private
   */
  _recordSuccess(enhancerName, duration) {
    const stats = this.stats.enhancerStats.get(enhancerName);
    if (stats) {
      stats.executions++;
      stats.totalDuration += duration;
    }
  }

  /**
   * Record enhancement error
   * @param {string} enhancerName - Enhancer name
   * @param {number} duration - Execution duration
   * @private
   */
  _recordError(enhancerName, duration) {
    const stats = this.stats.enhancerStats.get(enhancerName);
    if (stats) {
      stats.executions++;
      stats.errors++;
      stats.totalDuration += duration;
    }
  }
}
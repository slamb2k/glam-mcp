/**
 * Enhancer Registry
 * Central registry for discovering and managing enhancers
 */

import { BaseEnhancer } from './base-enhancer.js';
import { EnhancerPipeline } from './enhancer-pipeline.js';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Registry for enhancer discovery and management
 */
export class EnhancerRegistry {
  constructor(options = {}) {
    this.enhancers = new Map();
    this.pipelines = new Map();
    this.config = {
      autoDiscover: options.autoDiscover !== false,
      discoveryPaths: options.discoveryPaths || ['./core'],
      enabledByDefault: options.enabledByDefault !== false,
      pipelineDefaults: options.pipelineDefaults || {},
      ...options
    };
  }

  /**
   * Initialize the registry
   * @returns {Promise<void>}
   */
  async initialize() {
    if (this.config.autoDiscover) {
      await this.discoverEnhancers();
    }
  }

  /**
   * Register an enhancer
   * @param {BaseEnhancer|Function} enhancer - Enhancer instance or class
   * @param {Object} options - Registration options
   * @returns {EnhancerRegistry} - For chaining
   */
  register(enhancer, options = {}) {
    let instance;
    
    if (typeof enhancer === 'function') {
      // It's a class, instantiate it
      instance = new enhancer(options.config);
    } else if (enhancer instanceof BaseEnhancer) {
      instance = enhancer;
    } else {
      throw new Error('Enhancer must be a BaseEnhancer instance or class');
    }

    const name = instance.name;
    
    // Check for duplicates
    if (this.enhancers.has(name)) {
      throw new Error(`Enhancer '${name}' is already registered`);
    }

    // Configure enhancer
    if (options.enabled !== undefined) {
      instance.setEnabled(options.enabled);
    } else if (this.config.enabledByDefault) {
      instance.setEnabled(true);
    }

    // Store registration info
    this.enhancers.set(name, {
      instance,
      class: enhancer.constructor || enhancer,
      registeredAt: new Date(),
      source: options.source || 'manual',
      ...options
    });

    return this;
  }

  /**
   * Unregister an enhancer
   * @param {string} name - Enhancer name
   * @returns {boolean} - Whether the enhancer was removed
   */
  unregister(name) {
    // Remove from all pipelines
    for (const pipeline of this.pipelines.values()) {
      pipeline.unregister(name);
    }
    
    return this.enhancers.delete(name);
  }

  /**
   * Get an enhancer by name
   * @param {string} name - Enhancer name
   * @returns {BaseEnhancer|undefined} - The enhancer instance
   */
  get(name) {
    const registration = this.enhancers.get(name);
    return registration?.instance;
  }

  /**
   * Get all registered enhancers
   * @param {Object} filter - Filter options
   * @returns {Array<BaseEnhancer>} - Array of enhancers
   */
  getAll(filter = {}) {
    let enhancers = Array.from(this.enhancers.values());

    // Apply filters
    if (filter.enabled !== undefined) {
      enhancers = enhancers.filter(e => e.instance.enabled === filter.enabled);
    }

    if (filter.tags && filter.tags.length > 0) {
      enhancers = enhancers.filter(e => 
        filter.tags.some(tag => e.instance.hasTag(tag))
      );
    }

    if (filter.source) {
      enhancers = enhancers.filter(e => e.source === filter.source);
    }

    return enhancers.map(e => e.instance);
  }

  /**
   * Create a new pipeline with selected enhancers
   * @param {string} name - Pipeline name
   * @param {Object} options - Pipeline options
   * @returns {EnhancerPipeline} - The created pipeline
   */
  createPipeline(name, options = {}) {
    if (this.pipelines.has(name)) {
      throw new Error(`Pipeline '${name}' already exists`);
    }

    const pipelineOptions = {
      ...this.config.pipelineDefaults,
      ...options
    };

    const pipeline = new EnhancerPipeline(pipelineOptions);
    
    // Add enhancers to pipeline
    const enhancerNames = options.enhancers || [];
    const useAllIfEmpty = options.useAllIfEmpty !== false;

    if (enhancerNames.length === 0 && useAllIfEmpty) {
      // Add all enabled enhancers
      for (const registration of this.enhancers.values()) {
        if (registration.instance.enabled) {
          pipeline.register(registration.instance);
        }
      }
    } else {
      // Add specific enhancers
      for (const enhancerName of enhancerNames) {
        const enhancer = this.get(enhancerName);
        if (enhancer) {
          pipeline.register(enhancer);
        } else {
          throw new Error(`Enhancer '${enhancerName}' not found`);
        }
      }
    }

    this.pipelines.set(name, pipeline);
    return pipeline;
  }

  /**
   * Get an existing pipeline
   * @param {string} name - Pipeline name
   * @returns {EnhancerPipeline|undefined} - The pipeline
   */
  getPipeline(name) {
    return this.pipelines.get(name);
  }

  /**
   * Remove a pipeline
   * @param {string} name - Pipeline name
   * @returns {boolean} - Whether the pipeline was removed
   */
  removePipeline(name) {
    return this.pipelines.delete(name);
  }

  /**
   * Discover enhancers in specified paths
   * @returns {Promise<number>} - Number of enhancers discovered
   */
  async discoverEnhancers() {
    let discoveredCount = 0;

    for (const discoveryPath of this.config.discoveryPaths) {
      const fullPath = path.join(__dirname, discoveryPath);
      
      try {
        const files = await this._getEnhancerFiles(fullPath);
        
        for (const file of files) {
          try {
            const module = await import(file);
            const enhancers = this._extractEnhancers(module);
            
            for (const EnhancerClass of enhancers) {
              try {
                this.register(EnhancerClass, {
                  source: 'discovery',
                  discoveryPath: file
                });
                discoveredCount++;
              } catch (error) {
                // Skip enhancers that fail to register
                console.warn(`Failed to register enhancer from ${file}:`, error.message);
              }
            }
          } catch (error) {
            console.warn(`Failed to load enhancer module ${file}:`, error.message);
          }
        }
      } catch (error) {
        console.warn(`Failed to discover enhancers in ${fullPath}:`, error.message);
      }
    }

    return discoveredCount;
  }

  /**
   * Get enhancer statistics
   * @returns {Object} - Registry statistics
   */
  getStats() {
    const stats = {
      totalEnhancers: this.enhancers.size,
      enabledEnhancers: 0,
      bySource: {},
      byTag: {},
      pipelines: this.pipelines.size
    };

    for (const registration of this.enhancers.values()) {
      if (registration.instance.enabled) {
        stats.enabledEnhancers++;
      }

      // Count by source
      stats.bySource[registration.source] = (stats.bySource[registration.source] || 0) + 1;

      // Count by tags
      for (const tag of registration.instance.getTags()) {
        stats.byTag[tag] = (stats.byTag[tag] || 0) + 1;
      }
    }

    return stats;
  }

  /**
   * Export registry configuration
   * @returns {Object} - Exportable configuration
   */
  export() {
    const config = {
      enhancers: {},
      pipelines: {}
    };

    // Export enhancer configurations
    for (const [name, registration] of this.enhancers) {
      config.enhancers[name] = {
        enabled: registration.instance.enabled,
        config: registration.instance.config,
        source: registration.source
      };
    }

    // Export pipeline configurations
    for (const [name, pipeline] of this.pipelines) {
      config.pipelines[name] = {
        config: pipeline.config,
        enhancers: Array.from(pipeline.getEnhancers().keys())
      };
    }

    return config;
  }

  /**
   * Import registry configuration
   * @param {Object} config - Configuration to import
   */
  import(config) {
    // Update enhancer configurations
    if (config.enhancers) {
      for (const [name, enhancerConfig] of Object.entries(config.enhancers)) {
        const enhancer = this.get(name);
        if (enhancer) {
          enhancer.setEnabled(enhancerConfig.enabled);
          enhancer.updateConfig(enhancerConfig.config);
        }
      }
    }

    // Recreate pipelines
    if (config.pipelines) {
      for (const [name, pipelineConfig] of Object.entries(config.pipelines)) {
        try {
          this.createPipeline(name, {
            ...pipelineConfig.config,
            enhancers: pipelineConfig.enhancers
          });
        } catch (error) {
          console.warn(`Failed to import pipeline '${name}':`, error.message);
        }
      }
    }
  }

  // Private methods

  /**
   * Get enhancer files from a directory
   * @param {string} dir - Directory path
   * @returns {Promise<Array>} - Array of file paths
   * @private
   */
  async _getEnhancerFiles(dir) {
    const files = [];
    
    try {
      const entries = await fs.readdir(dir, { withFileTypes: true });
      
      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        
        if (entry.isDirectory()) {
          // Recursively search subdirectories
          const subFiles = await this._getEnhancerFiles(fullPath);
          files.push(...subFiles);
        } else if (entry.isFile() && entry.name.endsWith('-enhancer.js')) {
          files.push(fullPath);
        }
      }
    } catch (error) {
      // Directory might not exist
    }

    return files;
  }

  /**
   * Extract enhancer classes from a module
   * @param {Object} module - Imported module
   * @returns {Array} - Array of enhancer classes
   * @private
   */
  _extractEnhancers(module) {
    const enhancers = [];

    for (const exportName of Object.keys(module)) {
      const exported = module[exportName];
      
      // Check if it's a class that extends BaseEnhancer
      if (typeof exported === 'function' && 
          exported.prototype instanceof BaseEnhancer) {
        enhancers.push(exported);
      }
    }

    return enhancers;
  }
}

// Create default registry instance
export const defaultRegistry = new EnhancerRegistry();
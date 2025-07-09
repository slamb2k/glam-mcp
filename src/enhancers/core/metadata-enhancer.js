/**
 * Metadata Enhancer
 * Adds contextual metadata to responses
 */

import { BaseEnhancer, EnhancerPriority } from '../base-enhancer.js';
import os from 'os';

/**
 * Enhancer that adds metadata to responses
 */
export class MetadataEnhancer extends BaseEnhancer {
  constructor(options = {}) {
    super({
      name: 'MetadataEnhancer',
      priority: EnhancerPriority.HIGH,
      description: 'Adds contextual metadata to responses',
      version: '1.0.0',
      tags: ['metadata', 'context'],
      config: {
        includeSystemInfo: options.includeSystemInfo !== false,
        includeProcessInfo: options.includeProcessInfo !== false,
        includeTimestamps: options.includeTimestamps !== false,
        customMetadata: options.customMetadata || {},
        ...options
      }
    });
  }

  /**
   * Enhance response with metadata
   * @param {EnhancedResponse} response - The response to enhance
   * @param {Object} context - Additional context
   * @returns {Promise<EnhancedResponse>} - Enhanced response
   * @protected
   */
  async _doEnhance(response, context) {
    // Add timestamps
    if (this.config.includeTimestamps) {
      response.addMetadata('enhancedAt', new Date().toISOString());
      
      if (context.operationStartTime) {
        const duration = Date.now() - context.operationStartTime;
        response.addMetadata('operationDuration', duration);
      }
    }

    // Add system information
    if (this.config.includeSystemInfo) {
      response.addMetadata('system', {
        platform: os.platform(),
        hostname: os.hostname(),
        nodeVersion: process.version,
        arch: os.arch()
      });
    }

    // Add process information
    if (this.config.includeProcessInfo) {
      const memoryUsage = process.memoryUsage();
      response.addMetadata('process', {
        pid: process.pid,
        uptime: Math.round(process.uptime()),
        memory: {
          heapUsed: Math.round(memoryUsage.heapUsed / 1024 / 1024) + 'MB',
          heapTotal: Math.round(memoryUsage.heapTotal / 1024 / 1024) + 'MB',
          rss: Math.round(memoryUsage.rss / 1024 / 1024) + 'MB'
        }
      });
    }

    // Add context metadata
    if (context.operation) {
      response.addMetadata('operation', context.operation);
    }

    if (context.user) {
      response.addMetadata('user', context.user);
    }

    if (context.session) {
      response.addMetadata('sessionId', context.session.id);
    }

    // Add custom metadata
    for (const [key, value] of Object.entries(this.config.customMetadata)) {
      response.addMetadata(key, typeof value === 'function' ? value(context) : value);
    }

    // Add source information
    if (context.source) {
      response.addMetadata('source', {
        tool: context.source.tool,
        version: context.source.version,
        component: context.source.component
      });
    }

    return response;
  }
}
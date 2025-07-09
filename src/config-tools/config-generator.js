/**
 * Core configuration generator for various MCP client platforms
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export class ConfigGenerator {
  constructor() {
    this.platforms = new Map();
    this.commonConfig = {
      name: 'glam-mcp',
      version: '2.0.0',
      description: 'Git-Like Automation Manager for MCP'
    };
  }

  /**
   * Register a platform-specific generator
   */
  registerPlatform(name, generator) {
    this.platforms.set(name, generator);
  }

  /**
   * Generate configuration for a specific platform
   */
  async generate(platform, options = {}) {
    const generator = this.platforms.get(platform);
    if (!generator) {
      throw new Error(`Unknown platform: ${platform}. Available: ${Array.from(this.platforms.keys()).join(', ')}`);
    }

    // Merge common config with platform-specific options
    const config = {
      ...this.commonConfig,
      ...options
    };

    return await generator.generate(config);
  }

  /**
   * Validate configuration for a platform
   */
  async validate(platform, config) {
    const generator = this.platforms.get(platform);
    if (!generator) {
      throw new Error(`Unknown platform: ${platform}`);
    }

    if (!generator.validate) {
      return { valid: true, message: 'No validation available for this platform' };
    }

    return await generator.validate(config);
  }

  /**
   * Test connection for a platform
   */
  async testConnection(platform, config) {
    const generator = this.platforms.get(platform);
    if (!generator) {
      throw new Error(`Unknown platform: ${platform}`);
    }

    if (!generator.testConnection) {
      return { success: true, message: 'No connection test available for this platform' };
    }

    return await generator.testConnection(config);
  }

  /**
   * Get available platforms
   */
  getAvailablePlatforms() {
    return Array.from(this.platforms.keys()).map(name => {
      const generator = this.platforms.get(name);
      return {
        name,
        description: generator.description || 'No description available',
        configFormat: generator.configFormat || 'json'
      };
    });
  }

  /**
   * Save configuration to file
   */
  async saveConfig(platform, config, outputPath) {
    const generator = this.platforms.get(platform);
    if (!generator) {
      throw new Error(`Unknown platform: ${platform}`);
    }

    const format = generator.configFormat || 'json';
    let content;

    switch (format) {
      case 'json':
        content = JSON.stringify(config, null, 2);
        break;
      case 'yaml':
        // Would need a YAML library in production
        content = this.toYAML(config);
        break;
      default:
        content = JSON.stringify(config, null, 2);
    }

    await fs.promises.writeFile(outputPath, content, 'utf8');
    return { path: outputPath, format };
  }

  /**
   * Simple YAML converter (basic implementation)
   */
  toYAML(obj, indent = 0) {
    let yaml = '';
    const spaces = '  '.repeat(indent);

    for (const [key, value] of Object.entries(obj)) {
      if (value === null || value === undefined) {
        yaml += `${spaces}${key}: null\n`;
      } else if (typeof value === 'object' && !Array.isArray(value)) {
        yaml += `${spaces}${key}:\n${this.toYAML(value, indent + 1)}`;
      } else if (Array.isArray(value)) {
        yaml += `${spaces}${key}:\n`;
        value.forEach(item => {
          if (typeof item === 'object') {
            yaml += `${spaces}- \n${this.toYAML(item, indent + 2)}`;
          } else {
            yaml += `${spaces}- ${item}\n`;
          }
        });
      } else {
        yaml += `${spaces}${key}: ${value}\n`;
      }
    }

    return yaml;
  }
}

// Create singleton instance
export const configGenerator = new ConfigGenerator();
/**
 * Configuration generator for Claude Desktop
 */

import os from 'os';
import path from 'path';
import fs from 'fs';

export class ClaudeDesktopGenerator {
  constructor() {
    this.description = 'Configuration generator for Claude Desktop MCP integration';
    this.configFormat = 'json';
  }

  /**
   * Get the Claude Desktop config path for the current platform
   */
  getConfigPath() {
    const platform = process.platform;
    const homeDir = os.homedir();

    switch (platform) {
      case 'darwin': // macOS
        return path.join(homeDir, 'Library', 'Application Support', 'Claude', 'claude_desktop_config.json');
      case 'win32': // Windows
        return path.join(process.env.APPDATA || path.join(homeDir, 'AppData', 'Roaming'), 'Claude', 'claude_desktop_config.json');
      case 'linux':
        return path.join(homeDir, '.config', 'claude', 'claude_desktop_config.json');
      default:
        throw new Error(`Unsupported platform: ${platform}`);
    }
  }

  /**
   * Generate Claude Desktop configuration
   */
  async generate(options = {}) {
    const {
      serverPath = null,
      useNpx = true,
      logLevel = 'info',
      env = {},
      ...extraOptions
    } = options;

    let command, args;

    if (useNpx) {
      // Use npx for global installation
      command = 'npx';
      args = ['glam-mcp'];
    } else if (serverPath) {
      // Use specific path
      command = 'node';
      args = [path.join(serverPath, 'src', 'index.js')];
    } else {
      // Try to detect installation
      try {
        const { execSync } = await import('child_process');
        execSync('npx glam-mcp --version', { stdio: 'ignore' });
        command = 'npx';
        args = ['glam-mcp'];
      } catch {
        throw new Error('glam-mcp not found. Please provide serverPath or install globally with npm install -g glam-mcp');
      }
    }

    const config = {
      mcpServers: {
        glam: {
          command,
          args,
          env: {
            GLAM_LOG_LEVEL: logLevel,
            ...env
          },
          ...extraOptions
        }
      }
    };

    return config;
  }

  /**
   * Validate Claude Desktop configuration
   */
  async validate(config) {
    const errors = [];

    // Check basic structure
    if (!config.mcpServers) {
      errors.push('Missing mcpServers property');
    } else if (!config.mcpServers.glam) {
      errors.push('Missing glam server configuration');
    } else {
      const glamConfig = config.mcpServers.glam;
      
      if (!glamConfig.command) {
        errors.push('Missing command property');
      }
      
      if (!glamConfig.args || !Array.isArray(glamConfig.args)) {
        errors.push('Missing or invalid args property (must be array)');
      }

      // Validate command exists
      if (glamConfig.command === 'node' && glamConfig.args && glamConfig.args[0]) {
        if (!fs.existsSync(glamConfig.args[0])) {
          errors.push(`Server file not found: ${glamConfig.args[0]}`);
        }
      }
    }

    return {
      valid: errors.length === 0,
      errors,
      message: errors.length === 0 ? 'Configuration is valid' : `Found ${errors.length} error(s)`
    };
  }

  /**
   * Test connection to glam-mcp
   */
  async testConnection(config) {
    try {
      const { spawn } = await import('child_process');
      const glamConfig = config.mcpServers.glam;
      
      return new Promise((resolve) => {
        const proc = spawn(glamConfig.command, [...glamConfig.args, '--version'], {
          env: { ...process.env, ...glamConfig.env },
          timeout: 5000
        });

        let output = '';
        let error = '';

        proc.stdout.on('data', (data) => {
          output += data.toString();
        });

        proc.stderr.on('data', (data) => {
          error += data.toString();
        });

        proc.on('close', (code) => {
          if (code === 0) {
            resolve({
              success: true,
              message: 'Successfully connected to glam-mcp',
              version: output.trim()
            });
          } else {
            resolve({
              success: false,
              message: 'Failed to connect to glam-mcp',
              error: error || `Process exited with code ${code}`
            });
          }
        });

        proc.on('error', (err) => {
          resolve({
            success: false,
            message: 'Failed to start glam-mcp',
            error: err.message
          });
        });
      });
    } catch (error) {
      return {
        success: false,
        message: 'Failed to test connection',
        error: error.message
      };
    }
  }

  /**
   * Merge with existing Claude Desktop configuration
   */
  async mergeWithExisting(newConfig) {
    const configPath = this.getConfigPath();
    let existingConfig = {};

    try {
      if (fs.existsSync(configPath)) {
        const content = await fs.promises.readFile(configPath, 'utf8');
        existingConfig = JSON.parse(content);
      }
    } catch (error) {
      console.warn('Could not read existing config:', error.message);
    }

    // Merge configurations
    const mergedConfig = {
      ...existingConfig,
      mcpServers: {
        ...existingConfig.mcpServers,
        ...newConfig.mcpServers
      }
    };

    return mergedConfig;
  }

  /**
   * Get installation instructions
   */
  getInstructions() {
    const configPath = this.getConfigPath();
    
    return `
Claude Desktop Configuration Instructions
========================================

1. Configuration file location:
   ${configPath}

2. Make sure Claude Desktop is closed before editing the configuration.

3. Create the directory if it doesn't exist:
   ${path.dirname(configPath)}

4. Add or update the configuration in the file.

5. Restart Claude Desktop to load the new configuration.

6. Verify the connection by asking Claude:
   "Can you list the available glam-mcp tools?"

Troubleshooting:
- If glam-mcp doesn't appear, check Claude Desktop logs
- Ensure the path to glam-mcp is correct
- Verify Node.js is installed and in PATH
- Try using absolute paths if relative paths don't work
`;
  }
}

export const claudeDesktopGenerator = new ClaudeDesktopGenerator();
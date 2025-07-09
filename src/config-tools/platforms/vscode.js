/**
 * Configuration generator for VS Code extensions that support MCP
 */

import os from 'os';
import path from 'path';
import fs from 'fs';

export class VSCodeGenerator {
  constructor() {
    this.description = 'Configuration generator for VS Code MCP extensions (Cline, Continue, etc.)';
    this.configFormat = 'json';
  }

  /**
   * Generate VS Code extension configuration
   */
  async generate(options = {}) {
    const {
      extensionType = 'cline', // cline, continue, etc.
      serverPath = null,
      useNpx = true,
      logLevel = 'info',
      workspaceFolder = process.cwd(),
      env = {},
      ...extraOptions
    } = options;

    let command, args;

    if (useNpx) {
      command = 'npx';
      args = ['glam-mcp'];
    } else if (serverPath) {
      command = 'node';
      args = [path.join(serverPath, 'src', 'index.js')];
    } else {
      command = 'npx';
      args = ['glam-mcp'];
    }

    // Generate configuration based on extension type
    switch (extensionType) {
      case 'cline':
        return this.generateClineConfig(command, args, env, logLevel, extraOptions);
      case 'continue':
        return this.generateContinueConfig(command, args, env, logLevel, extraOptions);
      case 'cursor':
        return this.generateCursorConfig(command, args, env, logLevel, extraOptions);
      default:
        return this.generateGenericConfig(command, args, env, logLevel, extraOptions);
    }
  }

  /**
   * Generate Cline-specific configuration
   */
  generateClineConfig(command, args, env, logLevel, extraOptions) {
    return {
      "cline.mcpServers": {
        "glam": {
          "command": command,
          "args": args,
          "env": {
            "GLAM_LOG_LEVEL": logLevel,
            ...env
          },
          "cwd": process.cwd(),
          ...extraOptions
        }
      }
    };
  }

  /**
   * Generate Continue-specific configuration
   */
  generateContinueConfig(command, args, env, logLevel, extraOptions) {
    return {
      "continue.mcpServers": [
        {
          "name": "glam",
          "command": command,
          "args": args,
          "env": {
            "GLAM_LOG_LEVEL": logLevel,
            ...env
          },
          ...extraOptions
        }
      ]
    };
  }

  /**
   * Generate Cursor-specific configuration
   */
  generateCursorConfig(command, args, env, logLevel, extraOptions) {
    return {
      "cursor.mcpServers": {
        "glam": {
          "command": command,
          "args": args,
          "environment": {
            "GLAM_LOG_LEVEL": logLevel,
            ...env
          },
          ...extraOptions
        }
      }
    };
  }

  /**
   * Generate generic MCP configuration
   */
  generateGenericConfig(command, args, env, logLevel, extraOptions) {
    return {
      "mcp.servers": {
        "glam": {
          "command": command,
          "args": args,
          "env": {
            "GLAM_LOG_LEVEL": logLevel,
            ...env
          },
          ...extraOptions
        }
      }
    };
  }

  /**
   * Get VS Code settings.json path
   */
  getSettingsPath(scope = 'workspace') {
    if (scope === 'workspace') {
      return path.join(process.cwd(), '.vscode', 'settings.json');
    } else {
      // User settings
      const platform = process.platform;
      const homeDir = os.homedir();
      
      switch (platform) {
        case 'darwin':
          return path.join(homeDir, 'Library', 'Application Support', 'Code', 'User', 'settings.json');
        case 'win32':
          return path.join(process.env.APPDATA || path.join(homeDir, 'AppData', 'Roaming'), 'Code', 'User', 'settings.json');
        case 'linux':
          return path.join(homeDir, '.config', 'Code', 'User', 'settings.json');
        default:
          throw new Error(`Unsupported platform: ${platform}`);
      }
    }
  }

  /**
   * Validate VS Code configuration
   */
  async validate(config) {
    const errors = [];
    
    // Check for at least one known MCP configuration
    const knownKeys = [
      'cline.mcpServers',
      'continue.mcpServers',
      'cursor.mcpServers',
      'mcp.servers'
    ];
    
    const hasValidKey = knownKeys.some(key => config[key]);
    
    if (!hasValidKey) {
      errors.push('No recognized MCP server configuration found');
    }

    // Validate Cline config
    if (config['cline.mcpServers']) {
      if (!config['cline.mcpServers'].glam) {
        errors.push('Missing glam server in cline.mcpServers');
      } else {
        const glamConfig = config['cline.mcpServers'].glam;
        if (!glamConfig.command) errors.push('Missing command in Cline config');
        if (!glamConfig.args || !Array.isArray(glamConfig.args)) errors.push('Invalid args in Cline config');
      }
    }

    // Validate Continue config
    if (config['continue.mcpServers']) {
      if (!Array.isArray(config['continue.mcpServers'])) {
        errors.push('continue.mcpServers must be an array');
      } else {
        const glamServer = config['continue.mcpServers'].find(s => s.name === 'glam');
        if (!glamServer) {
          errors.push('Missing glam server in continue.mcpServers');
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
   * Merge with existing VS Code settings
   */
  async mergeWithExisting(newConfig, settingsPath) {
    let existingConfig = {};

    try {
      if (fs.existsSync(settingsPath)) {
        const content = await fs.promises.readFile(settingsPath, 'utf8');
        // Remove comments for JSON parsing
        const jsonContent = content.replace(/\/\*[\s\S]*?\*\/|\/\/.*/g, '');
        existingConfig = JSON.parse(jsonContent);
      }
    } catch (error) {
      console.warn('Could not read existing settings:', error.message);
    }

    // Merge configurations
    const mergedConfig = {
      ...existingConfig,
      ...newConfig
    };

    return mergedConfig;
  }

  /**
   * Get installation instructions for different extensions
   */
  getInstructions(extensionType = 'generic') {
    const workspaceSettings = this.getSettingsPath('workspace');
    const userSettings = this.getSettingsPath('user');
    
    const extensionInstructions = {
      cline: `
Cline Extension Configuration
=============================

1. Install the Cline extension from VS Code marketplace

2. Add configuration to VS Code settings:
   - Workspace settings (recommended): ${workspaceSettings}
   - User settings: ${userSettings}

3. Restart VS Code or reload the window (Cmd/Ctrl + R)

4. Open Cline and verify glam-mcp is available
`,
      continue: `
Continue Extension Configuration
================================

1. Install the Continue extension from VS Code marketplace

2. Add configuration to VS Code settings:
   - Workspace settings (recommended): ${workspaceSettings}
   - User settings: ${userSettings}

3. Restart VS Code or reload the window

4. Open Continue panel and check server connectivity
`,
      cursor: `
Cursor Configuration
====================

1. Open Cursor settings (Cmd/Ctrl + ,)

2. Search for "MCP" in settings

3. Add the glam server configuration

4. Restart Cursor to apply changes

5. Verify by opening the AI panel
`,
      generic: `
Generic MCP Extension Configuration
===================================

1. Install an MCP-compatible extension

2. Add configuration to VS Code settings:
   - Workspace settings: ${workspaceSettings}
   - User settings: ${userSettings}

3. The configuration key depends on your extension:
   - Cline: cline.mcpServers
   - Continue: continue.mcpServers
   - Cursor: cursor.mcpServers
   - Generic: mcp.servers

4. Restart VS Code and verify the connection
`
    };

    return extensionInstructions[extensionType] || extensionInstructions.generic;
  }
}

export const vscodeGenerator = new VSCodeGenerator();
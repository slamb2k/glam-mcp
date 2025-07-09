/**
 * Configuration tools for generating MCP client configurations
 */

import { configGenerator } from '../config-tools/config-generator.js';
import '../config-tools/platforms/index.js'; // Register platforms
import { createResponse } from '../utils/responses.js';
import { ToolCategories } from '../core/tool-registry.js';
import fs from 'fs';
import path from 'path';

export function registerConfigTools(server) {
  // List available platforms
  server.addTool({
    name: "config_list_platforms",
    description: "List available MCP client platforms for configuration. Use this to see what platforms glam-mcp can generate configurations for.",
    inputSchema: {
      type: "object",
      properties: {}
    },
    handler: async () => {
      try {
        const platforms = configGenerator.getAvailablePlatforms();
        
        return createResponse(
          true,
          {
            platforms,
            count: platforms.length
          },
          `Found ${platforms.length} supported platforms`
        );
      } catch (error) {
        return createResponse(false, null, `Failed to list platforms: ${error.message}`);
      }
    },
    metadata: {
      category: ToolCategories.UTILITY,
      tags: ['config', 'platforms', 'setup']
    }
  });

  // Generate configuration
  server.addTool({
    name: "config_generate",
    description: "Generate MCP client configuration for a specific platform. Use this to create configuration files for Claude Desktop, VS Code extensions, or other MCP clients.",
    inputSchema: {
      type: "object",
      properties: {
        platform: {
          type: "string",
          description: "Platform to generate config for (claude-desktop, vscode, cline, continue, cursor)",
          enum: ["claude-desktop", "vscode", "cline", "continue", "cursor"]
        },
        use_npx: {
          type: "boolean",
          description: "Use npx to run glam-mcp (default: true)",
          default: true
        },
        server_path: {
          type: "string",
          description: "Path to glam-mcp installation (if not using npx)"
        },
        log_level: {
          type: "string",
          description: "Log level for glam-mcp",
          enum: ["debug", "info", "warn", "error"],
          default: "info"
        },
        extension_type: {
          type: "string",
          description: "VS Code extension type (for vscode platform)",
          enum: ["cline", "continue", "cursor", "generic"]
        },
        output_path: {
          type: "string",
          description: "Path to save the configuration file"
        }
      },
      required: ["platform"]
    },
    handler: async ({ platform, use_npx = true, server_path, log_level = "info", extension_type, output_path }) => {
      try {
        // Generate configuration
        const config = await configGenerator.generate(platform, {
          useNpx: use_npx,
          serverPath: server_path,
          logLevel: log_level,
          extensionType: extension_type || platform
        });

        // Save if output path provided
        let savedPath = null;
        if (output_path) {
          await configGenerator.saveConfig(platform, config, output_path);
          savedPath = output_path;
        }

        // Get instructions
        const generator = configGenerator.platforms.get(platform);
        const instructions = generator.getInstructions ? generator.getInstructions(extension_type) : null;

        return createResponse(
          true,
          {
            platform,
            config,
            savedPath,
            instructions,
            configFormat: generator.configFormat || 'json'
          },
          savedPath 
            ? `Configuration generated and saved to ${savedPath}`
            : `Configuration generated for ${platform}`
        );
      } catch (error) {
        return createResponse(false, null, `Failed to generate configuration: ${error.message}`);
      }
    },
    metadata: {
      category: ToolCategories.UTILITY,
      tags: ['config', 'generate', 'setup']
    }
  });

  // Validate configuration
  server.addTool({
    name: "config_validate",
    description: "Validate an MCP client configuration. Use this to check if a configuration file is correctly formatted and has all required fields.",
    inputSchema: {
      type: "object",
      properties: {
        platform: {
          type: "string",
          description: "Platform to validate for",
          enum: ["claude-desktop", "vscode", "cline", "continue", "cursor"]
        },
        config_path: {
          type: "string",
          description: "Path to configuration file to validate"
        },
        config_content: {
          type: "object",
          description: "Configuration content to validate (if not reading from file)"
        }
      },
      required: ["platform"],
      oneOf: [
        { required: ["config_path"] },
        { required: ["config_content"] }
      ]
    },
    handler: async ({ platform, config_path, config_content }) => {
      try {
        let config = config_content;
        
        // Read config from file if path provided
        if (config_path && !config_content) {
          const content = await fs.promises.readFile(config_path, 'utf8');
          config = JSON.parse(content);
        }

        const result = await configGenerator.validate(platform, config);

        return createResponse(
          result.valid,
          {
            valid: result.valid,
            errors: result.errors || [],
            message: result.message
          },
          result.message
        );
      } catch (error) {
        return createResponse(false, null, `Validation failed: ${error.message}`);
      }
    },
    metadata: {
      category: ToolCategories.UTILITY,
      tags: ['config', 'validate', 'check']
    }
  });

  // Test connection
  server.addTool({
    name: "config_test_connection",
    description: "Test connection to glam-mcp using a configuration. Use this to verify that a configuration can successfully connect to the MCP server.",
    inputSchema: {
      type: "object",
      properties: {
        platform: {
          type: "string",
          description: "Platform configuration to test",
          enum: ["claude-desktop", "vscode", "cline", "continue", "cursor"]
        },
        config_path: {
          type: "string",
          description: "Path to configuration file"
        },
        config_content: {
          type: "object",
          description: "Configuration content to test (if not reading from file)"
        }
      },
      required: ["platform"],
      oneOf: [
        { required: ["config_path"] },
        { required: ["config_content"] }
      ]
    },
    handler: async ({ platform, config_path, config_content }) => {
      try {
        let config = config_content;
        
        // Read config from file if path provided
        if (config_path && !config_content) {
          const content = await fs.promises.readFile(config_path, 'utf8');
          config = JSON.parse(content);
        }

        const result = await configGenerator.testConnection(platform, config);

        return createResponse(
          result.success,
          {
            success: result.success,
            message: result.message,
            version: result.version,
            error: result.error
          },
          result.message
        );
      } catch (error) {
        return createResponse(false, null, `Connection test failed: ${error.message}`);
      }
    },
    metadata: {
      category: ToolCategories.UTILITY,
      tags: ['config', 'test', 'connection']
    }
  });

  // Get platform-specific instructions
  server.addTool({
    name: "config_get_instructions",
    description: "Get detailed setup instructions for a specific platform. Use this to learn how to properly configure MCP clients.",
    inputSchema: {
      type: "object",
      properties: {
        platform: {
          type: "string",
          description: "Platform to get instructions for",
          enum: ["claude-desktop", "vscode", "cline", "continue", "cursor"]
        },
        extension_type: {
          type: "string",
          description: "VS Code extension type (for vscode platform)",
          enum: ["cline", "continue", "cursor", "generic"]
        }
      },
      required: ["platform"]
    },
    handler: async ({ platform, extension_type }) => {
      try {
        const generator = configGenerator.platforms.get(platform);
        
        if (!generator) {
          return createResponse(false, null, `Unknown platform: ${platform}`);
        }

        const instructions = generator.getInstructions 
          ? generator.getInstructions(extension_type || platform)
          : 'No instructions available for this platform';

        // Get config path if available
        let configPath = null;
        if (generator.getConfigPath) {
          try {
            configPath = generator.getConfigPath();
          } catch (e) {
            // Ignore errors getting config path
          }
        }

        return createResponse(
          true,
          {
            platform,
            instructions,
            configPath,
            extensionType: extension_type
          },
          `Retrieved instructions for ${platform}`
        );
      } catch (error) {
        return createResponse(false, null, `Failed to get instructions: ${error.message}`);
      }
    },
    metadata: {
      category: ToolCategories.UTILITY,
      tags: ['config', 'instructions', 'help']
    }
  });

  // Auto-detect and generate configuration
  server.addTool({
    name: "config_auto_setup",
    description: "Automatically detect the current environment and generate appropriate configuration. Use this for quick setup.",
    inputSchema: {
      type: "object",
      properties: {
        save: {
          type: "boolean",
          description: "Save generated configurations to appropriate locations",
          default: false
        },
        platforms: {
          type: "array",
          items: { type: "string" },
          description: "Specific platforms to set up (default: all detected)"
        }
      }
    },
    handler: async ({ save = false, platforms = [] }) => {
      try {
        const results = [];
        const detectedPlatforms = [];

        // Detect Claude Desktop
        const claudeGen = configGenerator.platforms.get('claude-desktop');
        try {
          const configPath = claudeGen.getConfigPath();
          if (fs.existsSync(path.dirname(configPath))) {
            detectedPlatforms.push('claude-desktop');
          }
        } catch (e) {
          // Not available on this platform
        }

        // Detect VS Code
        if (fs.existsSync('.vscode') || process.env.VSCODE_CLI) {
          detectedPlatforms.push('vscode');
        }

        // Filter to requested platforms if specified
        const targetPlatforms = platforms.length > 0 
          ? platforms.filter(p => detectedPlatforms.includes(p))
          : detectedPlatforms;

        // Generate configurations
        for (const platform of targetPlatforms) {
          const config = await configGenerator.generate(platform, {
            useNpx: true,
            logLevel: 'info'
          });

          let savedPath = null;
          if (save) {
            if (platform === 'claude-desktop') {
              const gen = configGenerator.platforms.get(platform);
              const merged = await gen.mergeWithExisting(config);
              const configPath = gen.getConfigPath();
              await fs.promises.mkdir(path.dirname(configPath), { recursive: true });
              await fs.promises.writeFile(configPath, JSON.stringify(merged, null, 2));
              savedPath = configPath;
            } else if (platform === 'vscode') {
              savedPath = path.join('.vscode', 'settings.json');
              await fs.promises.mkdir('.vscode', { recursive: true });
              await configGenerator.saveConfig(platform, config, savedPath);
            }
          }

          results.push({
            platform,
            config,
            savedPath,
            detected: true
          });
        }

        return createResponse(
          true,
          {
            detectedPlatforms,
            configuredPlatforms: results,
            saved: save
          },
          `Auto-detected ${detectedPlatforms.length} platform(s) and generated ${results.length} configuration(s)`
        );
      } catch (error) {
        return createResponse(false, null, `Auto-setup failed: ${error.message}`);
      }
    },
    metadata: {
      category: ToolCategories.UTILITY,
      tags: ['config', 'auto', 'setup', 'detect']
    }
  });
}
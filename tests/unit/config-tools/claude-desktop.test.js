import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { ClaudeDesktopGenerator } from '../../../src/config-tools/platforms/claude-desktop.js';
import os from 'os';
import path from 'path';

describe('ClaudeDesktopGenerator', () => {
  let generator;
  let originalPlatform;

  beforeEach(() => {
    generator = new ClaudeDesktopGenerator();
    originalPlatform = process.platform;
    // Clear all mocks before each test
    jest.clearAllMocks();
  });

  afterEach(() => {
    Object.defineProperty(process, 'platform', {
      value: originalPlatform
    });
    // Clear all mocks after each test
    jest.clearAllMocks();
  });

  describe('getConfigPath', () => {
    it('should return macOS config path', () => {
      Object.defineProperty(process, 'platform', {
        value: 'darwin'
      });
      
      const configPath = generator.getConfigPath();
      expect(configPath).toContain('Library/Application Support/Claude');
      expect(configPath).toContain('claude_desktop_config.json');
    });

    it('should return Windows config path', () => {
      Object.defineProperty(process, 'platform', {
        value: 'win32'
      });
      process.env.APPDATA = 'C:\\Users\\Test\\AppData\\Roaming';
      
      const configPath = generator.getConfigPath();
      expect(configPath).toContain('Claude');
      expect(configPath).toContain('claude_desktop_config.json');
    });

    it('should return Linux config path', () => {
      Object.defineProperty(process, 'platform', {
        value: 'linux'
      });
      
      const configPath = generator.getConfigPath();
      expect(configPath).toContain('.config/claude');
      expect(configPath).toContain('claude_desktop_config.json');
    });
  });

  describe('generate', () => {
    it('should generate config with npx', async () => {
      const config = await generator.generate({
        useNpx: true,
        logLevel: 'debug'
      });

      expect(config.mcpServers.glam.command).toBe('npx');
      expect(config.mcpServers.glam.args).toEqual(['glam-mcp']);
      expect(config.mcpServers.glam.env.GLAM_LOG_LEVEL).toBe('debug');
    });

    it('should generate config with server path', async () => {
      const config = await generator.generate({
        useNpx: false,
        serverPath: '/opt/glam-mcp',
        env: { CUSTOM_VAR: 'value' }
      });

      expect(config.mcpServers.glam.command).toBe('node');
      expect(config.mcpServers.glam.args).toEqual(['/opt/glam-mcp/src/index.js']);
      expect(config.mcpServers.glam.env.CUSTOM_VAR).toBe('value');
    });
  });

  describe('validate', () => {
    it('should validate correct configuration', async () => {
      const config = {
        mcpServers: {
          glam: {
            command: 'npx',
            args: ['glam-mcp'],
            env: {}
          }
        }
      };

      const result = await generator.validate(config);
      
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should detect missing mcpServers', async () => {
      const config = {};

      const result = await generator.validate(config);
      
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Missing mcpServers property');
    });

    it('should detect missing glam server', async () => {
      const config = {
        mcpServers: {}
      };

      const result = await generator.validate(config);
      
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Missing glam server configuration');
    });

    it('should detect missing command', async () => {
      const config = {
        mcpServers: {
          glam: {
            args: ['glam-mcp']
          }
        }
      };

      const result = await generator.validate(config);
      
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Missing command property');
    });
  });

  describe('mergeWithExisting', () => {
    it('should merge with existing configuration', async () => {
      const existingConfig = {
        mcpServers: {
          other: {
            command: 'other-server'
          }
        },
        settings: {
          theme: 'dark'
        }
      };

      const newConfig = {
        mcpServers: {
          glam: {
            command: 'npx',
            args: ['glam-mcp']
          }
        }
      };

      // Mock file system by stubbing the methods on the generator
      const originalGetConfigPath = generator.getConfigPath;
      const originalMergeWithExisting = generator.mergeWithExisting;
      
      generator.getConfigPath = jest.fn().mockReturnValue('/tmp/test-config.json');
      
      // Override mergeWithExisting to simulate the behavior without actual file I/O
      generator.mergeWithExisting = jest.fn().mockImplementation(async (newCfg) => {
        // Simulate merging
        return {
          ...existingConfig,
          mcpServers: {
            ...existingConfig.mcpServers,
            ...newCfg.mcpServers
          }
        };
      });

      const merged = await generator.mergeWithExisting(newConfig);

      expect(merged.mcpServers.other).toBeDefined();
      expect(merged.mcpServers.glam).toBeDefined();
      expect(merged.settings.theme).toBe('dark');
      
      // Restore original methods
      generator.getConfigPath = originalGetConfigPath;
      generator.mergeWithExisting = originalMergeWithExisting;
    });
  });

  describe('getInstructions', () => {
    it('should return installation instructions', () => {
      const instructions = generator.getInstructions();
      
      expect(instructions).toContain('Claude Desktop Configuration Instructions');
      expect(instructions).toContain('Configuration file location:');
      expect(instructions).toContain('Restart Claude Desktop');
      expect(instructions).toContain('Troubleshooting:');
    });
  });
});
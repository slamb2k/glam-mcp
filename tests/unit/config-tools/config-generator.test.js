import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { ConfigGenerator } from '../../../src/config-tools/config-generator.js';

describe('ConfigGenerator', () => {
  let generator;

  beforeEach(() => {
    generator = new ConfigGenerator();
  });

  describe('platform registration', () => {
    it('should register a platform', () => {
      const mockGenerator = {
        generate: jest.fn(),
        validate: jest.fn(),
        description: 'Test platform'
      };

      generator.registerPlatform('test', mockGenerator);
      
      const platforms = generator.getAvailablePlatforms();
      expect(platforms).toHaveLength(1);
      expect(platforms[0].name).toBe('test');
      expect(platforms[0].description).toBe('Test platform');
    });

    it('should throw error for unknown platform', async () => {
      await expect(generator.generate('unknown')).rejects.toThrow('Unknown platform: unknown');
    });
  });

  describe('configuration generation', () => {
    it('should generate configuration for registered platform', async () => {
      const mockConfig = { server: 'test-config' };
      const mockGenerator = {
        generate: jest.fn().mockResolvedValue(mockConfig)
      };

      generator.registerPlatform('test', mockGenerator);
      
      const result = await generator.generate('test', { custom: 'option' });
      
      expect(mockGenerator.generate).toHaveBeenCalledWith({
        name: 'glam-mcp',
        version: '2.0.0',
        description: 'Git Learning & Automation Module for MCP',
        custom: 'option'
      });
      expect(result).toEqual(mockConfig);
    });
  });

  describe('configuration validation', () => {
    it('should validate configuration', async () => {
      const mockValidation = { valid: true, message: 'Valid' };
      const mockGenerator = {
        validate: jest.fn().mockResolvedValue(mockValidation)
      };

      generator.registerPlatform('test', mockGenerator);
      
      const config = { test: 'config' };
      const result = await generator.validate('test', config);
      
      expect(mockGenerator.validate).toHaveBeenCalledWith(config);
      expect(result).toEqual(mockValidation);
    });

    it('should return default validation if platform has no validator', async () => {
      const mockGenerator = {
        generate: jest.fn()
        // No validate method
      };

      generator.registerPlatform('test', mockGenerator);
      
      const result = await generator.validate('test', {});
      
      expect(result.valid).toBe(true);
      expect(result.message).toContain('No validation available');
    });
  });

  describe('connection testing', () => {
    it('should test connection', async () => {
      const mockResult = { success: true, message: 'Connected' };
      const mockGenerator = {
        testConnection: jest.fn().mockResolvedValue(mockResult)
      };

      generator.registerPlatform('test', mockGenerator);
      
      const config = { test: 'config' };
      const result = await generator.testConnection('test', config);
      
      expect(mockGenerator.testConnection).toHaveBeenCalledWith(config);
      expect(result).toEqual(mockResult);
    });
  });

  describe('configuration saving', () => {
    it('should save configuration as JSON', async () => {
      const mockFs = {
        promises: {
          writeFile: jest.fn().mockResolvedValue()
        }
      };
      
      jest.spyOn(generator, 'saveConfig').mockImplementation(async (platform, config, path) => {
        await mockFs.promises.writeFile(path, JSON.stringify(config, null, 2), 'utf8');
        return { path, format: 'json' };
      });

      const mockGenerator = {
        configFormat: 'json'
      };
      generator.registerPlatform('test', mockGenerator);

      const config = { test: 'config' };
      const result = await generator.saveConfig('test', config, '/tmp/test.json');
      
      expect(result.path).toBe('/tmp/test.json');
      expect(result.format).toBe('json');
    });
  });

  describe('YAML conversion', () => {
    it('should convert simple object to YAML', () => {
      const obj = {
        name: 'test',
        version: '1.0.0',
        enabled: true
      };

      const yaml = generator.toYAML(obj);
      
      expect(yaml).toContain('name: test');
      expect(yaml).toContain('version: 1.0.0');
      expect(yaml).toContain('enabled: true');
    });

    it('should convert nested objects to YAML', () => {
      const obj = {
        server: {
          name: 'glam',
          config: {
            port: 3000
          }
        }
      };

      const yaml = generator.toYAML(obj);
      
      expect(yaml).toContain('server:');
      expect(yaml).toContain('  name: glam');
      expect(yaml).toContain('  config:');
      expect(yaml).toContain('    port: 3000');
    });

    it('should convert arrays to YAML', () => {
      const obj = {
        args: ['node', 'server.js'],
        ports: [3000, 3001]
      };

      const yaml = generator.toYAML(obj);
      
      expect(yaml).toContain('args:');
      expect(yaml).toContain('- node');
      expect(yaml).toContain('- server.js');
      expect(yaml).toContain('ports:');
      expect(yaml).toContain('- 3000');
    });
  });
});
import { jest } from '@jest/globals';
import { BaseEnhancer, EnhancerPriority } from '../../src/enhancers/base-enhancer.js';
import { EnhancedResponse } from '../../src/core/enhanced-response.js';

describe('BaseEnhancer', () => {
  class TestEnhancer extends BaseEnhancer {
    constructor(options = {}) {
      super({
        name: 'TestEnhancer',
        priority: EnhancerPriority.MEDIUM,
        description: 'Test enhancer',
        config: { failSilently: false },
        ...options
      });
    }

    async _doEnhance(response, context) {
      response.addMetadata('enhanced', true);
      return response;
    }
  }

  let enhancer;
  let response;

  beforeEach(() => {
    enhancer = new TestEnhancer();
    response = new EnhancedResponse({
      message: 'Test response'
    });
  });

  describe('constructor', () => {
    it('should initialize with default values', () => {
      expect(enhancer.name).toBe('TestEnhancer');
      expect(enhancer.priority).toBe(EnhancerPriority.MEDIUM);
      expect(enhancer.enabled).toBe(true);
    });

    it('should accept custom configuration', () => {
      const custom = new TestEnhancer({
        enabled: false,
        config: { custom: 'value' }
      });
      
      expect(custom.enabled).toBe(false);
      expect(custom.config.custom).toBe('value');
    });
  });

  describe('enhance', () => {
    it('should enhance response when enabled', async () => {
      const enhanced = await enhancer.enhance(response);
      
      expect(enhanced.metadata.enhanced).toBe(true);
    });

    it('should skip enhancement when disabled', async () => {
      enhancer.setEnabled(false);
      const enhanced = await enhancer.enhance(response);
      
      expect(enhanced.metadata.enhanced).toBeUndefined();
    });

    it('should validate response before enhancement', async () => {
      const invalid = { not: 'a response' };
      
      await expect(enhancer.enhance(invalid)).rejects.toThrow('Invalid response object');
    });
  });

  describe('canEnhance', () => {
    it('should return true when enabled and valid', () => {
      expect(enhancer.canEnhance(response)).toBe(true);
    });

    it('should return false when disabled', () => {
      enhancer.setEnabled(false);
      expect(enhancer.canEnhance(response)).toBe(false);
    });

    it('should call custom canEnhance if provided', () => {
      class CustomEnhancer extends TestEnhancer {
        canEnhance(response, context) {
          return context?.shouldEnhance === true;
        }
      }
      
      const custom = new CustomEnhancer();
      expect(custom.canEnhance(response, { shouldEnhance: true })).toBe(true);
      expect(custom.canEnhance(response, { shouldEnhance: false })).toBe(false);
    });
  });

  describe('configuration', () => {
    it('should update configuration', () => {
      enhancer.updateConfig({ newOption: 'value' });
      
      expect(enhancer.config.newOption).toBe('value');
    });

    it('should get configuration', () => {
      const config = enhancer.getConfig();
      
      expect(config).toEqual(enhancer.config);
    });
  });

  describe('tags', () => {
    it('should manage tags', () => {
      enhancer.addTag('custom');
      
      expect(enhancer.hasTag('custom')).toBe(true);
      expect(enhancer.getTags()).toContain('custom');
      
      enhancer.removeTag('custom');
      expect(enhancer.hasTag('custom')).toBe(false);
    });
  });

  describe('dependencies', () => {
    it('should manage dependencies', () => {
      enhancer.addDependency('OtherEnhancer');
      
      expect(enhancer.hasDependency('OtherEnhancer')).toBe(true);
      expect(enhancer.getDependencies()).toContain('OtherEnhancer');
      
      enhancer.removeDependency('OtherEnhancer');
      expect(enhancer.hasDependency('OtherEnhancer')).toBe(false);
    });
  });
});
import { jest } from '@jest/globals';
import { EnhancerPipeline } from '../../src/enhancers/enhancer-pipeline.js';
import { BaseEnhancer, EnhancerPriority } from '../../src/enhancers/base-enhancer.js';
import { EnhancedResponse } from '../../src/core/enhanced-response.js';

describe('EnhancerPipeline', () => {
  class TestEnhancer extends BaseEnhancer {
    constructor(name, priority = EnhancerPriority.MEDIUM) {
      super({
        name,
        priority,
        description: `Test enhancer ${name}`,
        config: { failSilently: false }
      });
    }

    async _doEnhance(response, context) {
      response.addMetadata(`enhanced.${this.name}`, true);
      // Add small delay to ensure order is measurable
      await new Promise(resolve => setTimeout(resolve, 1));
      response.addMetadata(`enhanced.order.${this.name}`, Date.now());
      return response;
    }
  }

  class SlowEnhancer extends TestEnhancer {
    constructor(name, delay = 100) {
      super(name);
      this.delay = delay;
    }

    async _doEnhance(response, context) {
      await new Promise(resolve => setTimeout(resolve, this.delay));
      return super._doEnhance(response, context);
    }
  }

  let pipeline;
  let response;

  beforeEach(() => {
    pipeline = new EnhancerPipeline();
    response = new EnhancedResponse({
      message: 'Test response'
    });
  });

  describe('registration', () => {
    it('should register enhancers', () => {
      const enhancer = new TestEnhancer('test1');
      pipeline.register(enhancer);
      
      expect(pipeline.getEnhancer('test1')).toBe(enhancer);
    });

    it('should reject non-BaseEnhancer instances', () => {
      expect(() => pipeline.register({})).toThrow('Enhancer must extend BaseEnhancer');
    });

    it('should unregister enhancers', () => {
      const enhancer = new TestEnhancer('test1');
      pipeline.register(enhancer);
      
      expect(pipeline.unregister('test1')).toBe(true);
      expect(pipeline.getEnhancer('test1')).toBeUndefined();
    });
  });

  describe('sequential processing', () => {
    it('should process enhancers in priority order', async () => {
      const high = new TestEnhancer('high', EnhancerPriority.HIGH);
      const medium = new TestEnhancer('medium', EnhancerPriority.MEDIUM);
      const low = new TestEnhancer('low', EnhancerPriority.LOW);
      
      pipeline.register(low);
      pipeline.register(high);
      pipeline.register(medium);
      
      const enhanced = await pipeline.process(response);
      
      expect(enhanced.metadata['enhanced.high']).toBe(true);
      expect(enhanced.metadata['enhanced.medium']).toBe(true);
      expect(enhanced.metadata['enhanced.low']).toBe(true);
      
      // Check order - high should be first, low should be last
      const highTime = enhanced.metadata['enhanced.order.high'];
      const mediumTime = enhanced.metadata['enhanced.order.medium'];
      const lowTime = enhanced.metadata['enhanced.order.low'];
      
      expect(highTime).toBeLessThan(mediumTime);
      expect(mediumTime).toBeLessThan(lowTime);
    });

    it('should respect dependencies', async () => {
      const first = new TestEnhancer('first');
      const second = new TestEnhancer('second');
      second.addDependency('first');
      
      pipeline.register(second);
      pipeline.register(first);
      
      const enhanced = await pipeline.process(response);
      
      const firstTime = enhanced.metadata['enhanced.order.first'];
      const secondTime = enhanced.metadata['enhanced.order.second'];
      
      expect(firstTime).toBeLessThan(secondTime);
    });

    it('should detect circular dependencies', async () => {
      pipeline.updateConfig({ continueOnError: false });
      
      const e1 = new TestEnhancer('e1');
      const e2 = new TestEnhancer('e2');
      e1.addDependency('e2');
      e2.addDependency('e1');
      
      pipeline.register(e1);
      pipeline.register(e2);
      
      await expect(pipeline.process(response)).rejects.toThrow('Circular dependency detected');
    });
  });

  describe('parallel processing', () => {
    it('should process independent enhancers in parallel', async () => {
      pipeline.updateConfig({ parallel: true });
      
      const slow1 = new SlowEnhancer('slow1', 100);
      const slow2 = new SlowEnhancer('slow2', 100);
      const slow3 = new SlowEnhancer('slow3', 100);
      
      pipeline.register(slow1);
      pipeline.register(slow2);
      pipeline.register(slow3);
      
      const startTime = Date.now();
      const enhanced = await pipeline.process(response);
      const duration = Date.now() - startTime;
      
      // Should complete in ~100ms, not 300ms
      expect(duration).toBeLessThan(200);
      
      expect(enhanced.metadata['enhanced.slow1']).toBe(true);
      expect(enhanced.metadata['enhanced.slow2']).toBe(true);
      expect(enhanced.metadata['enhanced.slow3']).toBe(true);
    });

    it('should respect concurrency limit', async () => {
      pipeline.updateConfig({ 
        parallel: true,
        maxConcurrent: 2
      });
      
      // Track concurrent executions
      let currentConcurrent = 0;
      let maxConcurrent = 0;
      
      class TrackingEnhancer extends BaseEnhancer {
        constructor(name) {
          super({ name });
        }
        
        async _doEnhance(response) {
          currentConcurrent++;
          maxConcurrent = Math.max(maxConcurrent, currentConcurrent);
          await new Promise(resolve => setTimeout(resolve, 50));
          currentConcurrent--;
          return response;
        }
      }
      
      for (let i = 1; i <= 5; i++) {
        pipeline.register(new TrackingEnhancer(`track${i}`));
      }
      
      await pipeline.process(response);
      
      expect(maxConcurrent).toBeLessThanOrEqual(2);
    });
  });

  describe('error handling', () => {
    class ErrorEnhancer extends TestEnhancer {
      async _doEnhance() {
        throw new Error('Enhancement failed');
      }
    }

    it('should continue on error when configured', async () => {
      pipeline.updateConfig({ continueOnError: true });
      
      pipeline.register(new TestEnhancer('before'));
      pipeline.register(new ErrorEnhancer('error'));
      pipeline.register(new TestEnhancer('after'));
      
      const enhanced = await pipeline.process(response);
      
      expect(enhanced.metadata['enhanced.before']).toBe(true);
      expect(enhanced.metadata['enhanced.after']).toBe(true);
      expect(enhanced.metadata['enhanced.error']).toBeUndefined();
    });

    it('should stop on error when configured', async () => {
      pipeline.updateConfig({ continueOnError: false });
      
      pipeline.register(new TestEnhancer('before'));
      pipeline.register(new ErrorEnhancer('error'));
      
      await expect(pipeline.process(response)).rejects.toThrow('Enhancement failed');
    });

    it('should handle timeout', async () => {
      pipeline.updateConfig({ timeout: 50, continueOnError: false });
      
      pipeline.register(new SlowEnhancer('slow', 100));
      
      await expect(pipeline.process(response)).rejects.toThrow('timed out');
    });
  });

  describe('statistics', () => {
    it('should track execution statistics', async () => {
      const enhancer = new TestEnhancer('test');
      pipeline.register(enhancer);
      
      await pipeline.process(response);
      await pipeline.process(response);
      
      const stats = pipeline.getStats();
      
      expect(stats.totalExecutions).toBe(2);
      expect(stats.totalErrors).toBe(0);
      expect(stats.enhancers.test.executions).toBe(2);
      expect(stats.enhancers.test.averageDuration).toBeGreaterThan(0);
    });

    it('should track error statistics', async () => {
      pipeline.updateConfig({ continueOnError: true });
      
      class SometimesErrorEnhancer extends TestEnhancer {
        constructor() {
          super('sometimes');
          this.count = 0;
        }
        
        async _doEnhance(response) {
          this.count++;
          if (this.count % 2 === 0) {
            throw new Error('Periodic error');
          }
          return super._doEnhance(response);
        }
      }
      
      pipeline.register(new SometimesErrorEnhancer());
      
      await pipeline.process(response);
      await pipeline.process(response);
      await pipeline.process(response);
      
      const stats = pipeline.getStats();
      
      expect(stats.enhancers.sometimes.executions).toBe(3);
      expect(stats.enhancers.sometimes.errors).toBe(1);
      expect(stats.enhancers.sometimes.errorRate).toBe('33.33%');
    });

    it('should reset statistics', () => {
      pipeline.register(new TestEnhancer('test'));
      
      pipeline.process(response);
      pipeline.resetStats();
      
      const stats = pipeline.getStats();
      
      expect(stats.totalExecutions).toBe(0);
      expect(stats.enhancers.test.executions).toBe(0);
    });
  });

  describe('conditional enhancement', () => {
    class ConditionalEnhancer extends TestEnhancer {
      canEnhance(response, context) {
        return context?.shouldEnhance === true;
      }
    }

    it('should skip enhancers that cannot enhance', async () => {
      const conditional = new ConditionalEnhancer('conditional');
      pipeline.register(conditional);
      
      const enhanced = await pipeline.process(response, { shouldEnhance: false });
      
      expect(enhanced.metadata['enhanced.conditional']).toBeUndefined();
    });

    it('should include enhancers that can enhance', async () => {
      const conditional = new ConditionalEnhancer('conditional');
      pipeline.register(conditional);
      
      const enhanced = await pipeline.process(response, { shouldEnhance: true });
      
      expect(enhanced.metadata['enhanced.conditional']).toBe(true);
    });
  });
});
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { PredictiveEngine } from '../src/mcp/predictive-engine.js';
import { Subject } from 'rxjs';

// Mock dependencies
vi.mock('../src/mcp/context-engine.js', () => ({
  default: {
    contextUpdates$: new Subject(),
    inferenceUpdates$: new Subject(),
    getSnapshot: vi.fn(() => ({
      git: { currentBranch: 'feature/test' },
      workflow: { type: 'featureDevelopment' }
    })),
    trackUserActivity: vi.fn()
  }
}));

vi.mock('../src/mcp/state-manager.js', () => ({
  default: {
    getState: vi.fn(),
    setState: vi.fn(),
    generateId: vi.fn(() => 'test-id')
  }
}));

describe('PredictiveEngine', () => {
  let engine;

  beforeEach(() => {
    engine = new PredictiveEngine();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('initialization', () => {
    it('should initialize with default configuration', () => {
      expect(engine.config.maxPredictions).toBe(5);
      expect(engine.config.minConfidence).toBe(0.3);
      expect(engine.config.historySize).toBe(1000);
    });

    it('should have all model types', () => {
      expect(engine.models.command).toBeDefined();
      expect(engine.models.workflow).toBeDefined();
      expect(engine.models.file).toBeDefined();
      expect(engine.models.completion).toBeDefined();
    });
  });

  describe('generatePredictions', () => {
    it('should generate predictions from all models', () => {
      const predictions = engine.generatePredictions('test');
      expect(Array.isArray(predictions)).toBe(true);
    });

    it('should filter by minimum confidence', () => {
      engine.config.minConfidence = 0.8;
      
      // Mock model predictions
      engine.models.command.predict = vi.fn(() => [
        { value: 'high-conf', confidence: 0.9 },
        { value: 'low-conf', confidence: 0.2 }
      ]);
      
      const predictions = engine.generatePredictions('test');
      expect(predictions.length).toBe(1);
      expect(predictions[0].value).toBe('high-conf');
    });

    it('should limit number of predictions', () => {
      engine.config.maxPredictions = 2;
      
      // Mock model predictions
      Object.values(engine.models).forEach(model => {
        model.predict = vi.fn(() => [
          { value: 'pred1', confidence: 0.8 },
          { value: 'pred2', confidence: 0.7 }
        ]);
      });
      
      const predictions = engine.generatePredictions('test');
      expect(predictions.length).toBeLessThanOrEqual(2);
    });
  });

  describe('learning', () => {
    it('should learn from user actions', async () => {
      const action = {
        type: 'command',
        value: 'npm test',
        context: { branch: 'feature/test' },
        result: 'success'
      };
      
      await engine.learn(action);
      
      expect(engine.history.commands.length).toBe(1);
      expect(engine.history.commands[0].value).toBe('npm test');
    });

    it('should update patterns from actions', async () => {
      const action = {
        type: 'command',
        value: 'npm test',
        context: { branch: 'feature/test' }
      };
      
      await engine.learn(action);
      
      expect(engine.history.patterns.has('testing')).toBe(true);
      expect(engine.history.patterns.has('feature-development')).toBe(true);
    });

    it('should trim history when exceeding size limit', async () => {
      engine.config.historySize = 5;
      
      // Add more than limit
      for (let i = 0; i < 10; i++) {
        await engine.learn({
          type: 'command',
          value: `command${i}`,
          context: {}
        });
      }
      
      expect(engine.history.commands.length).toBe(5);
      expect(engine.history.commands[0].value).toBe('command5');
    });
  });

  describe('enhancePredictionsWithContext', () => {
    it('should boost confidence for matching workflow', () => {
      const predictions = [
        { value: 'test1', confidence: 0.5, workflow: 'featureDevelopment' },
        { value: 'test2', confidence: 0.5, workflow: 'bugFixing' }
      ];
      
      const context = { workflow: { type: 'featureDevelopment' } };
      const enhanced = engine.enhancePredictionsWithContext(predictions, context);
      
      expect(enhanced[0].confidence).toBeGreaterThan(0.5);
      expect(enhanced[1].confidence).toBe(0.5);
    });

    it('should add context metadata', () => {
      const predictions = [{ value: 'test', confidence: 0.5 }];
      const context = { 
        git: { currentBranch: 'main' },
        workflow: { type: 'testing' }
      };
      
      const enhanced = engine.enhancePredictionsWithContext(predictions, context);
      
      expect(enhanced[0].context.currentBranch).toBe('main');
      expect(enhanced[0].context.workflowType).toBe('testing');
    });
  });

  describe('pattern extraction', () => {
    it('should extract time-based patterns', () => {
      const morning = new Date();
      morning.setHours(10);
      vi.setSystemTime(morning);
      
      const patterns = engine.extractPatterns({ value: 'start work' });
      expect(patterns).toContain('morning-work');
    });

    it('should extract action-based patterns', () => {
      const patterns = engine.extractPatterns({ value: 'npm test' });
      expect(patterns).toContain('testing');
      
      const commitPatterns = engine.extractPatterns({ value: 'git commit -m "fix"' });
      expect(commitPatterns).toContain('committing');
    });

    it('should extract context-based patterns', () => {
      const patterns = engine.extractPatterns({
        value: 'work',
        context: { branch: 'feature/new-feature' }
      });
      expect(patterns).toContain('feature-development');
      
      const bugPatterns = engine.extractPatterns({
        value: 'work',
        context: { branch: 'fix/bug-123' }
      });
      expect(bugPatterns).toContain('bug-fixing');
    });
  });

  describe('confidence calculation', () => {
    it('should calculate confidence based on data', () => {
      // Add some history
      engine.history.commands = Array(50).fill({ value: 'test' });
      engine.history.patterns.set('testing', 10);
      engine.history.patterns.set('committing', 5);
      
      const confidence = engine.calculateConfidence();
      expect(confidence).toBeGreaterThan(0);
      expect(confidence).toBeLessThanOrEqual(1);
    });

    it('should return 0 confidence with no data', () => {
      const confidence = engine.calculateConfidence();
      expect(confidence).toBe(0);
    });
  });

  describe('statistics', () => {
    it('should return comprehensive statistics', async () => {
      // Add some data
      await engine.learn({
        type: 'command',
        value: 'npm test',
        context: {}
      });
      
      const stats = engine.getStatistics();
      
      expect(stats.historySize).toBeDefined();
      expect(stats.historySize.commands).toBe(1);
      expect(stats.patterns).toBeDefined();
      expect(stats.confidence).toBeDefined();
      expect(stats.modelStats).toBeDefined();
    });
  });

  describe('reset', () => {
    it('should clear all learning data', async () => {
      // Add some data
      await engine.learn({
        type: 'command',
        value: 'test',
        context: {}
      });
      
      expect(engine.history.commands.length).toBe(1);
      
      // Reset
      await engine.reset();
      
      expect(engine.history.commands.length).toBe(0);
      expect(engine.history.patterns.size).toBe(0);
      expect(engine.confidence$.value).toBe(0);
    });
  });
});
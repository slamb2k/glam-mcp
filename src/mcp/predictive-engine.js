import { EventEmitter } from 'events';
import { Subject, BehaviorSubject, combineLatest } from 'rxjs';
import { debounceTime, distinctUntilChanged, map } from 'rxjs/operators';
import contextEngine from './context-engine.js';
import stateManager from './state-manager.js';
import logger from '../utils/logger.js';

/**
 * Predictive Engine
 * Machine learning-based system for predicting user actions and providing suggestions
 */
export class PredictiveEngine extends EventEmitter {
  constructor() {
    super();
    
    // State observables
    this.predictions$ = new BehaviorSubject([]);
    this.userInput$ = new Subject();
    this.confidence$ = new BehaviorSubject(0);
    
    // Prediction models
    this.models = {
      command: new CommandPredictionModel(),
      workflow: new WorkflowPredictionModel(),
      file: new FilePredictionModel(),
      completion: new CompletionPredictionModel()
    };
    
    // Historical data
    this.history = {
      commands: [],
      workflows: [],
      files: [],
      patterns: new Map()
    };
    
    // Configuration
    this.config = {
      maxPredictions: 5,
      minConfidence: 0.3,
      learningRate: 0.1,
      historySize: 1000,
      debounceMs: 100
    };
    
    this.initialize();
  }

  /**
   * Initialize predictive engine
   */
  async initialize() {
    try {
      // Load historical data
      await this.loadHistory();
      
      // Set up reactive pipelines
      this.setupPredictionPipeline();
      
      // Subscribe to context changes
      this.subscribeToContext();
      
      logger.info('Predictive Engine initialized');
    } catch (error) {
      logger.error('Failed to initialize Predictive Engine:', error);
    }
  }

  /**
   * Set up prediction pipeline
   */
  setupPredictionPipeline() {
    // Main prediction pipeline
    this.userInput$
      .pipe(
        debounceTime(this.config.debounceMs),
        distinctUntilChanged(),
        map(input => this.generatePredictions(input))
      )
      .subscribe(predictions => {
        this.predictions$.next(predictions);
        this.emit('predictions', predictions);
      });
    
    // Combine predictions with context
    combineLatest([
      this.predictions$,
      contextEngine.contextUpdates$
    ])
      .pipe(
        map(([predictions, context]) => 
          this.enhancePredictionsWithContext(predictions, context)
        )
      )
      .subscribe(enhanced => {
        this.emit('enhanced-predictions', enhanced);
      });
  }

  /**
   * Subscribe to context changes
   */
  subscribeToContext() {
    contextEngine.contextUpdates$.subscribe(context => {
      this.updateModels(context);
    });
    
    contextEngine.inferenceUpdates$.subscribe(inference => {
      this.updatePatterns(inference);
    });
  }

  /**
   * Generate predictions based on input
   */
  generatePredictions(input) {
    const predictions = [];
    
    // Get predictions from each model
    for (const [type, model] of Object.entries(this.models)) {
      const modelPredictions = model.predict(input, this.history);
      
      predictions.push(...modelPredictions.map(p => ({
        ...p,
        type,
        timestamp: Date.now()
      })));
    }
    
    // Sort by confidence
    predictions.sort((a, b) => b.confidence - a.confidence);
    
    // Filter by minimum confidence
    const filtered = predictions.filter(p => p.confidence >= this.config.minConfidence);
    
    // Limit number of predictions
    return filtered.slice(0, this.config.maxPredictions);
  }

  /**
   * Enhance predictions with context
   */
  enhancePredictionsWithContext(predictions, context) {
    return predictions.map(prediction => {
      const enhanced = { ...prediction };
      
      // Boost confidence based on context relevance
      if (context.workflow && prediction.workflow === context.workflow.type) {
        enhanced.confidence *= 1.2;
      }
      
      // Add context-specific metadata
      enhanced.context = {
        currentBranch: context.git?.currentBranch,
        workflowType: context.workflow?.type,
        recentFiles: context.recentFiles?.slice(0, 3)
      };
      
      // Adjust based on recent activity
      if (this.isRecentlyUsed(prediction)) {
        enhanced.confidence *= 0.9; // Slightly lower confidence for recent items
        enhanced.metadata = { ...enhanced.metadata, recent: true };
      }
      
      return enhanced;
    });
  }

  /**
   * Check if prediction was recently used
   */
  isRecentlyUsed(prediction, windowMs = 300000) { // 5 minutes
    const recentCommands = this.history.commands
      .filter(cmd => Date.now() - cmd.timestamp < windowMs);
    
    return recentCommands.some(cmd => 
      cmd.command === prediction.value || 
      cmd.result === prediction.value
    );
  }

  /**
   * Update models with new context
   */
  updateModels(context) {
    Object.values(this.models).forEach(model => {
      model.updateContext(context);
    });
  }

  /**
   * Update patterns from inference
   */
  updatePatterns(inference) {
    // Extract patterns from inference
    if (inference.patterns) {
      inference.patterns.forEach(pattern => {
        const count = this.history.patterns.get(pattern.type) || 0;
        this.history.patterns.set(pattern.type, count + 1);
      });
    }
    
    // Update model weights based on patterns
    this.adjustModelWeights();
  }

  /**
   * Adjust model weights based on patterns
   */
  adjustModelWeights() {
    const totalPatterns = Array.from(this.history.patterns.values())
      .reduce((sum, count) => sum + count, 0);
    
    if (totalPatterns === 0) return;
    
    // Calculate weights for each model
    const weights = {
      command: (this.history.patterns.get('command') || 0) / totalPatterns,
      workflow: (this.history.patterns.get('workflow') || 0) / totalPatterns,
      file: (this.history.patterns.get('file') || 0) / totalPatterns,
      completion: (this.history.patterns.get('completion') || 0) / totalPatterns
    };
    
    // Update model weights
    Object.entries(weights).forEach(([type, weight]) => {
      if (this.models[type]) {
        this.models[type].setWeight(weight);
      }
    });
  }

  /**
   * Learn from user action
   */
  async learn(action) {
    try {
      // Add to history
      this.addToHistory(action);
      
      // Update models
      Object.values(this.models).forEach(model => {
        model.learn(action);
      });
      
      // Update patterns
      this.updatePatternFromAction(action);
      
      // Persist learning
      await this.saveHistory();
      
      // Calculate overall confidence
      const confidence = this.calculateConfidence();
      this.confidence$.next(confidence);
      
    } catch (error) {
      logger.error('Learning error:', error);
    }
  }

  /**
   * Add action to history
   */
  addToHistory(action) {
    const { type, value, context, result } = action;
    
    const historyItem = {
      type,
      value,
      context,
      result,
      timestamp: Date.now()
    };
    
    // Add to appropriate history
    switch (type) {
      case 'command':
        this.history.commands.push(historyItem);
        break;
      case 'workflow':
        this.history.workflows.push(historyItem);
        break;
      case 'file':
        this.history.files.push(historyItem);
        break;
    }
    
    // Trim history if needed
    this.trimHistory();
  }

  /**
   * Update pattern from action
   */
  updatePatternFromAction(action) {
    const patterns = this.extractPatterns(action);
    
    patterns.forEach(pattern => {
      const count = this.history.patterns.get(pattern) || 0;
      this.history.patterns.set(pattern, count + 1);
    });
  }

  /**
   * Extract patterns from action
   */
  extractPatterns(action) {
    const patterns = [];
    
    // Time-based patterns
    const hour = new Date().getHours();
    if (hour >= 9 && hour < 12) patterns.push('morning-work');
    else if (hour >= 14 && hour < 18) patterns.push('afternoon-work');
    else if (hour >= 18) patterns.push('evening-work');
    
    // Action-based patterns
    if (action.value?.includes('test')) patterns.push('testing');
    if (action.value?.includes('commit')) patterns.push('committing');
    if (action.value?.includes('push')) patterns.push('pushing');
    if (action.value?.includes('review')) patterns.push('reviewing');
    
    // Context-based patterns
    if (action.context?.branch?.includes('feature')) patterns.push('feature-development');
    if (action.context?.branch?.includes('fix')) patterns.push('bug-fixing');
    
    return patterns;
  }

  /**
   * Trim history to configured size
   */
  trimHistory() {
    const trim = (arr, size) => {
      if (arr.length > size) {
        arr.splice(0, arr.length - size);
      }
    };
    
    trim(this.history.commands, this.config.historySize);
    trim(this.history.workflows, this.config.historySize);
    trim(this.history.files, this.config.historySize);
  }

  /**
   * Calculate overall confidence
   */
  calculateConfidence() {
    const totalActions = 
      this.history.commands.length + 
      this.history.workflows.length + 
      this.history.files.length;
    
    if (totalActions === 0) return 0;
    
    // Base confidence on amount of data
    const dataConfidence = Math.min(totalActions / 100, 1);
    
    // Pattern confidence
    const patternCount = this.history.patterns.size;
    const patternConfidence = Math.min(patternCount / 20, 1);
    
    // Model confidence (average)
    const modelConfidences = Object.values(this.models)
      .map(m => m.getConfidence());
    const avgModelConfidence = modelConfidences.reduce((a, b) => a + b, 0) / modelConfidences.length;
    
    // Weighted average
    return (dataConfidence * 0.3 + patternConfidence * 0.3 + avgModelConfidence * 0.4);
  }

  /**
   * Get predictions for input
   */
  predict(input) {
    this.userInput$.next(input);
    return this.predictions$.value;
  }

  /**
   * Get current predictions
   */
  getCurrentPredictions() {
    return this.predictions$.value;
  }

  /**
   * Get prediction confidence
   */
  getConfidence() {
    return this.confidence$.value;
  }

  /**
   * Load history from storage
   */
  async loadHistory() {
    try {
      const data = await stateManager.getState('predictive_history');
      if (data) {
        this.history = data;
      }
    } catch (error) {
      logger.warn('Could not load predictive history:', error);
    }
  }

  /**
   * Save history to storage
   */
  async saveHistory() {
    try {
      await stateManager.setState('predictive_history', this.history);
    } catch (error) {
      logger.error('Failed to save predictive history:', error);
    }
  }

  /**
   * Reset learning data
   */
  async reset() {
    this.history = {
      commands: [],
      workflows: [],
      files: [],
      patterns: new Map()
    };
    
    Object.values(this.models).forEach(model => model.reset());
    
    this.predictions$.next([]);
    this.confidence$.next(0);
    
    await this.saveHistory();
  }

  /**
   * Get statistics
   */
  getStatistics() {
    return {
      historySize: {
        commands: this.history.commands.length,
        workflows: this.history.workflows.length,
        files: this.history.files.length
      },
      patterns: Object.fromEntries(this.history.patterns),
      confidence: this.confidence$.value,
      modelStats: Object.fromEntries(
        Object.entries(this.models).map(([name, model]) => [
          name,
          model.getStatistics()
        ])
      )
    };
  }
}

/**
 * Command Prediction Model
 */
class CommandPredictionModel {
  constructor() {
    this.weight = 0.25;
    this.commands = new Map();
    this.sequences = new Map();
  }

  predict(input, history) {
    const predictions = [];
    
    // Direct command matching
    for (const [command, data] of this.commands) {
      if (command.toLowerCase().includes(input.toLowerCase())) {
        predictions.push({
          value: command,
          confidence: data.frequency * this.weight,
          description: data.description,
          metadata: { usage: data.count }
        });
      }
    }
    
    // Sequence prediction
    const recentCommands = history.commands.slice(-3).map(c => c.value);
    const sequenceKey = recentCommands.join(' -> ');
    
    if (this.sequences.has(sequenceKey)) {
      const nextCommands = this.sequences.get(sequenceKey);
      nextCommands.forEach(({ command, probability }) => {
        predictions.push({
          value: command,
          confidence: probability * this.weight * 1.2,
          description: 'Based on command sequence',
          metadata: { sequence: true }
        });
      });
    }
    
    return predictions;
  }

  learn(action) {
    if (action.type !== 'command') return;
    
    // Update command frequency
    const data = this.commands.get(action.value) || {
      count: 0,
      frequency: 0,
      description: action.description || ''
    };
    
    data.count++;
    data.frequency = Math.min(data.count / 100, 1);
    
    this.commands.set(action.value, data);
    
    // Update sequences
    if (action.context?.previousCommands) {
      const sequence = action.context.previousCommands.join(' -> ');
      const nextCommands = this.sequences.get(sequence) || [];
      
      const existing = nextCommands.find(n => n.command === action.value);
      if (existing) {
        existing.count++;
      } else {
        nextCommands.push({ command: action.value, count: 1 });
      }
      
      // Calculate probabilities
      const total = nextCommands.reduce((sum, n) => sum + n.count, 0);
      nextCommands.forEach(n => {
        n.probability = n.count / total;
      });
      
      this.sequences.set(sequence, nextCommands);
    }
  }

  updateContext(context) {
    // Update based on context changes
  }

  setWeight(weight) {
    this.weight = weight;
  }

  getConfidence() {
    return this.commands.size > 0 ? 0.7 : 0;
  }

  getStatistics() {
    return {
      commands: this.commands.size,
      sequences: this.sequences.size,
      weight: this.weight
    };
  }

  reset() {
    this.commands.clear();
    this.sequences.clear();
  }
}

/**
 * Workflow Prediction Model
 */
class WorkflowPredictionModel {
  constructor() {
    this.weight = 0.25;
    this.workflows = new Map();
    this.transitions = new Map();
  }

  predict(input, history) {
    const predictions = [];
    const currentContext = contextEngine.getSnapshot();
    
    // Predict next workflow steps
    if (currentContext.workflow) {
      const workflowType = currentContext.workflow.type;
      const transitions = this.transitions.get(workflowType) || [];
      
      transitions.forEach(({ next, probability, condition }) => {
        if (!condition || condition(currentContext)) {
          predictions.push({
            value: next,
            confidence: probability * this.weight,
            description: `Next step in ${workflowType} workflow`,
            metadata: { workflow: true }
          });
        }
      });
    }
    
    // Suggest workflows based on input
    for (const [workflow, data] of this.workflows) {
      if (workflow.toLowerCase().includes(input.toLowerCase())) {
        predictions.push({
          value: `Start ${workflow} workflow`,
          confidence: data.frequency * this.weight,
          description: data.description,
          metadata: { startWorkflow: workflow }
        });
      }
    }
    
    return predictions;
  }

  learn(action) {
    if (action.type !== 'workflow') return;
    
    // Update workflow frequency
    const data = this.workflows.get(action.value) || {
      count: 0,
      frequency: 0,
      description: action.description || ''
    };
    
    data.count++;
    data.frequency = Math.min(data.count / 50, 1);
    
    this.workflows.set(action.value, data);
    
    // Learn transitions
    if (action.context?.previousWorkflow && action.context?.currentWorkflow) {
      const key = action.context.previousWorkflow;
      const transitions = this.transitions.get(key) || [];
      
      const existing = transitions.find(t => t.next === action.context.currentWorkflow);
      if (existing) {
        existing.count++;
      } else {
        transitions.push({
          next: action.context.currentWorkflow,
          count: 1,
          condition: action.context.condition
        });
      }
      
      // Update probabilities
      const total = transitions.reduce((sum, t) => sum + t.count, 0);
      transitions.forEach(t => {
        t.probability = t.count / total;
      });
      
      this.transitions.set(key, transitions);
    }
  }

  updateContext(context) {
    // Update based on context
  }

  setWeight(weight) {
    this.weight = weight;
  }

  getConfidence() {
    return this.workflows.size > 0 ? 0.6 : 0;
  }

  getStatistics() {
    return {
      workflows: this.workflows.size,
      transitions: this.transitions.size,
      weight: this.weight
    };
  }

  reset() {
    this.workflows.clear();
    this.transitions.clear();
  }
}

/**
 * File Prediction Model
 */
class FilePredictionModel {
  constructor() {
    this.weight = 0.25;
    this.files = new Map();
    this.associations = new Map();
  }

  predict(input, history) {
    const predictions = [];
    const currentFile = contextEngine.getSnapshot().currentFile;
    
    // Predict based on file associations
    if (currentFile) {
      const associated = this.associations.get(currentFile) || [];
      associated.forEach(({ file, score }) => {
        predictions.push({
          value: file,
          confidence: score * this.weight,
          description: 'Associated file',
          metadata: { association: true }
        });
      });
    }
    
    // Direct file matching
    for (const [file, data] of this.files) {
      if (file.toLowerCase().includes(input.toLowerCase())) {
        predictions.push({
          value: file,
          confidence: data.frequency * this.weight,
          description: 'Recently used file',
          metadata: { 
            lastAccessed: data.lastAccessed,
            accessCount: data.count
          }
        });
      }
    }
    
    return predictions;
  }

  learn(action) {
    if (action.type !== 'file') return;
    
    // Update file access data
    const data = this.files.get(action.value) || {
      count: 0,
      frequency: 0,
      lastAccessed: Date.now()
    };
    
    data.count++;
    data.frequency = Math.min(data.count / 20, 1);
    data.lastAccessed = Date.now();
    
    this.files.set(action.value, data);
    
    // Learn file associations
    if (action.context?.previousFile) {
      const associations = this.associations.get(action.context.previousFile) || [];
      
      const existing = associations.find(a => a.file === action.value);
      if (existing) {
        existing.count++;
      } else {
        associations.push({
          file: action.value,
          count: 1
        });
      }
      
      // Calculate scores
      const total = associations.reduce((sum, a) => sum + a.count, 0);
      associations.forEach(a => {
        a.score = a.count / total;
      });
      
      // Sort by score
      associations.sort((a, b) => b.score - a.score);
      
      this.associations.set(action.context.previousFile, associations.slice(0, 10));
    }
  }

  updateContext(context) {
    // Update based on context
  }

  setWeight(weight) {
    this.weight = weight;
  }

  getConfidence() {
    return this.files.size > 0 ? 0.8 : 0;
  }

  getStatistics() {
    return {
      files: this.files.size,
      associations: this.associations.size,
      weight: this.weight
    };
  }

  reset() {
    this.files.clear();
    this.associations.clear();
  }
}

/**
 * Completion Prediction Model
 */
class CompletionPredictionModel {
  constructor() {
    this.weight = 0.25;
    this.completions = new Map();
    this.prefixes = new Map();
  }

  predict(input, history) {
    const predictions = [];
    
    // Prefix-based completions
    const inputLower = input.toLowerCase();
    
    for (const [prefix, completions] of this.prefixes) {
      if (inputLower.startsWith(prefix)) {
        completions.forEach(({ completion, score }) => {
          predictions.push({
            value: input + completion.slice(prefix.length),
            confidence: score * this.weight,
            description: 'Auto-completion',
            metadata: { completion: true }
          });
        });
      }
    }
    
    // Full text completions
    for (const [text, data] of this.completions) {
      if (text.toLowerCase().startsWith(inputLower) && text !== input) {
        predictions.push({
          value: text,
          confidence: data.frequency * this.weight * 0.8,
          description: 'Previous input',
          metadata: { historical: true }
        });
      }
    }
    
    return predictions;
  }

  learn(action) {
    if (!action.value || typeof action.value !== 'string') return;
    
    // Store full completions
    const data = this.completions.get(action.value) || {
      count: 0,
      frequency: 0
    };
    
    data.count++;
    data.frequency = Math.min(data.count / 10, 1);
    
    this.completions.set(action.value, data);
    
    // Build prefix tree
    const words = action.value.split(/\s+/);
    
    for (let i = 0; i < words.length; i++) {
      for (let j = 1; j <= words[i].length && j <= 5; j++) {
        const prefix = words.slice(0, i).join(' ') + 
          (i > 0 ? ' ' : '') + 
          words[i].substring(0, j);
        
        const completions = this.prefixes.get(prefix.toLowerCase()) || [];
        const completion = action.value;
        
        const existing = completions.find(c => c.completion === completion);
        if (existing) {
          existing.count++;
        } else {
          completions.push({
            completion,
            count: 1
          });
        }
        
        // Update scores
        const total = completions.reduce((sum, c) => sum + c.count, 0);
        completions.forEach(c => {
          c.score = c.count / total;
        });
        
        // Keep top completions
        completions.sort((a, b) => b.score - a.score);
        this.prefixes.set(prefix.toLowerCase(), completions.slice(0, 5));
      }
    }
  }

  updateContext(context) {
    // Update based on context
  }

  setWeight(weight) {
    this.weight = weight;
  }

  getConfidence() {
    return this.completions.size > 0 ? 0.9 : 0;
  }

  getStatistics() {
    return {
      completions: this.completions.size,
      prefixes: this.prefixes.size,
      weight: this.weight
    };
  }

  reset() {
    this.completions.clear();
    this.prefixes.clear();
  }
}

// Export singleton instance
export default new PredictiveEngine();
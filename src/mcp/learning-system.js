import { EventEmitter } from 'events';
import fs from 'fs-extra';
import path from 'path';
import crypto from 'crypto';
import { Subject, BehaviorSubject, interval } from 'rxjs';
import { debounceTime, map } from 'rxjs/operators';
import contextEngine from './context-engine.js';
import stateManager from './state-manager.js';
import predictiveEngine from './predictive-engine.js';
import logger from '../utils/logger.js';

/**
 * Learning System Foundation
 * Core infrastructure for learning from user patterns and improving over time
 */
export class LearningSystem extends EventEmitter {
  constructor() {
    super();
    
    // State
    this.isInitialized = false;
    this.privacyMode = 'balanced'; // 'strict', 'balanced', 'permissive'
    
    // Data collection
    this.dataSources = new Map();
    this.collectors = new Map();
    this.dataStream$ = new Subject();
    
    // Feature extraction
    this.featureExtractors = new Map();
    this.features$ = new BehaviorSubject([]);
    
    // Machine learning
    this.models = new Map();
    this.trainingQueue = [];
    this.isTraining = false;
    
    // Storage
    this.dataStore = null;
    this.modelStore = null;
    
    // Monitoring
    this.metrics$ = new BehaviorSubject({
      dataPoints: 0,
      modelsTraining: 0,
      accuracy: 0,
      lastUpdate: null
    });
    
    // Configuration
    this.config = {
      dataRetentionDays: 30,
      minDataForTraining: 100,
      trainingInterval: 3600000, // 1 hour
      privacySettings: {
        strict: {
          collectPersonalData: false,
          anonymizeData: true,
          requireConsent: true
        },
        balanced: {
          collectPersonalData: true,
          anonymizeData: true,
          requireConsent: false
        },
        permissive: {
          collectPersonalData: true,
          anonymizeData: false,
          requireConsent: false
        }
      }
    };
  }

  /**
   * Initialize learning system
   */
  async initialize() {
    if (this.isInitialized) return;
    
    try {
      // Initialize storage
      await this.initializeStorage();
      
      // Register data sources
      await this.registerDataSources();
      
      // Initialize feature extractors
      this.initializeFeatureExtractors();
      
      // Load existing models
      await this.loadModels();
      
      // Set up data pipeline
      this.setupDataPipeline();
      
      // Start monitoring
      this.startMonitoring();
      
      // Schedule training
      this.scheduleTraining();
      
      this.isInitialized = true;
      logger.info('Learning System initialized');
      
    } catch (error) {
      logger.error('Failed to initialize Learning System:', error);
      throw error;
    }
  }

  /**
   * Initialize storage
   */
  async initializeStorage() {
    const storageDir = path.join(process.cwd(), '.slambed', 'learning');
    await fs.ensureDir(storageDir);
    
    // Initialize data store
    this.dataStore = {
      path: path.join(storageDir, 'data'),
      async save(key, data) {
        const filePath = path.join(this.path, `${key}.json`);
        await fs.ensureDir(path.dirname(filePath));
        await fs.writeJson(filePath, data, { spaces: 2 });
      },
      async load(key) {
        const filePath = path.join(this.path, `${key}.json`);
        if (await fs.pathExists(filePath)) {
          return await fs.readJson(filePath);
        }
        return null;
      },
      async list() {
        if (!await fs.pathExists(this.path)) return [];
        const files = await fs.readdir(this.path);
        return files.filter(f => f.endsWith('.json')).map(f => f.replace('.json', ''));
      }
    };
    
    // Initialize model store
    this.modelStore = {
      path: path.join(storageDir, 'models'),
      async save(modelId, model) {
        const filePath = path.join(this.path, `${modelId}.model`);
        await fs.ensureDir(path.dirname(filePath));
        await fs.writeFile(filePath, JSON.stringify(model));
      },
      async load(modelId) {
        const filePath = path.join(this.path, `${modelId}.model`);
        if (await fs.pathExists(filePath)) {
          const data = await fs.readFile(filePath, 'utf8');
          return JSON.parse(data);
        }
        return null;
      }
    };
  }

  /**
   * Register data sources
   */
  async registerDataSources() {
    // Command execution data
    this.registerDataSource('commands', {
      type: 'event',
      privacy: 'low',
      collector: () => {
        contextEngine.contextUpdates$.subscribe(update => {
          if (update.type === 'activity' && update.data.type === 'command') {
            this.collectData('commands', {
              command: update.data.value,
              context: update.data.context,
              timestamp: Date.now()
            });
          }
        });
      }
    });
    
    // File access patterns
    this.registerDataSource('file-access', {
      type: 'event',
      privacy: 'medium',
      collector: () => {
        contextEngine.contextUpdates$.subscribe(update => {
          if (update.type === 'file' && update.data.action === 'open') {
            this.collectData('file-access', {
              file: this.anonymizePath(update.data.path),
              action: update.data.action,
              timestamp: Date.now()
            });
          }
        });
      }
    });
    
    // Workflow patterns
    this.registerDataSource('workflows', {
      type: 'event',
      privacy: 'low',
      collector: async () => {
        const workflowOrchestrator = await import('./workflow-orchestrator.js');
        workflowOrchestrator.default.on('workflow:complete', (data) => {
          this.collectData('workflows', {
            workflow: data.workflow.name,
            duration: data.duration,
            success: true,
            timestamp: Date.now()
          });
        });
      }
    });
    
    // Error patterns
    this.registerDataSource('errors', {
      type: 'event',
      privacy: 'high',
      collector: () => {
        process.on('uncaughtException', (error) => {
          this.collectData('errors', {
            type: 'uncaught',
            message: this.sanitizeError(error.message),
            stack: this.sanitizeError(error.stack),
            timestamp: Date.now()
          });
        });
      }
    });
    
    // Performance metrics
    this.registerDataSource('performance', {
      type: 'periodic',
      interval: 60000, // 1 minute
      privacy: 'low',
      collector: () => {
        const usage = process.memoryUsage();
        this.collectData('performance', {
          memory: {
            heapUsed: usage.heapUsed,
            heapTotal: usage.heapTotal,
            rss: usage.rss
          },
          cpu: process.cpuUsage(),
          uptime: process.uptime(),
          timestamp: Date.now()
        });
      }
    });
    
    // User preferences
    this.registerDataSource('preferences', {
      type: 'state',
      privacy: 'medium',
      collector: async () => {
        const preferences = await stateManager.getState('user_preferences') || {};
        this.collectData('preferences', {
          ...preferences,
          timestamp: Date.now()
        });
      }
    });
  }

  /**
   * Register a data source
   */
  registerDataSource(name, config) {
    this.dataSources.set(name, config);
    
    // Set up collector based on type
    switch (config.type) {
      case 'event':
        if (config.collector) {
          config.collector();
        }
        break;
        
      case 'periodic':
        if (config.collector && config.interval) {
          setInterval(() => {
            if (this.shouldCollect(config.privacy)) {
              config.collector();
            }
          }, config.interval);
        }
        break;
        
      case 'state':
        // State-based collectors are called on-demand
        break;
    }
    
    logger.info(`Registered data source: ${name}`);
  }

  /**
   * Check if data should be collected based on privacy settings
   */
  shouldCollect(privacyLevel) {
    const settings = this.config.privacySettings[this.privacyMode];
    
    switch (privacyLevel) {
      case 'low':
        return true;
      case 'medium':
        return settings.collectPersonalData || settings.anonymizeData;
      case 'high':
        return settings.collectPersonalData && !settings.requireConsent;
      default:
        return false;
    }
  }

  /**
   * Collect data
   */
  collectData(source, data) {
    if (!this.shouldCollect(this.dataSources.get(source)?.privacy)) {
      return;
    }
    
    const collectionItem = {
      id: this.generateId(),
      source,
      data: this.applyPrivacy(data),
      timestamp: Date.now()
    };
    
    // Emit to stream
    this.dataStream$.next(collectionItem);
    
    // Store if needed
    this.storeData(collectionItem);
  }

  /**
   * Apply privacy settings to data
   */
  applyPrivacy(data) {
    const settings = this.config.privacySettings[this.privacyMode];
    
    if (!settings.collectPersonalData || settings.anonymizeData) {
      return this.anonymizeData(data);
    }
    
    return data;
  }

  /**
   * Anonymize data
   */
  anonymizeData(data) {
    const anonymized = { ...data };
    
    // Anonymize paths
    if (anonymized.file || anonymized.path) {
      const pathField = anonymized.file ? 'file' : 'path';
      anonymized[pathField] = this.anonymizePath(anonymized[pathField]);
    }
    
    // Anonymize user-specific data
    if (anonymized.user) {
      anonymized.user = this.hashString(anonymized.user);
    }
    
    // Remove sensitive fields
    delete anonymized.password;
    delete anonymized.token;
    delete anonymized.apiKey;
    
    return anonymized;
  }

  /**
   * Anonymize file path
   */
  anonymizePath(filePath) {
    if (!filePath) return filePath;
    
    const parts = filePath.split(path.sep);
    const fileName = parts.pop();
    const ext = path.extname(fileName);
    
    return `**/${this.hashString(fileName.replace(ext, ''), 8)}${ext}`;
  }

  /**
   * Sanitize error messages
   */
  sanitizeError(message) {
    if (!message) return '';
    
    // Remove file paths
    message = message.replace(/\/[^\s]+/g, '/<path>');
    
    // Remove potential sensitive data
    message = message.replace(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g, '<email>');
    message = message.replace(/\b\d{4,}\b/g, '<number>');
    
    return message;
  }

  /**
   * Initialize feature extractors
   */
  initializeFeatureExtractors() {
    // Command frequency extractor
    this.registerFeatureExtractor('command-frequency', {
      sources: ['commands'],
      extract: (data) => {
        const commands = data.filter(d => d.source === 'commands');
        const frequency = {};
        
        commands.forEach(cmd => {
          const command = cmd.data.command;
          frequency[command] = (frequency[command] || 0) + 1;
        });
        
        return Object.entries(frequency).map(([command, count]) => ({
          feature: 'command_frequency',
          value: command,
          score: count / commands.length
        }));
      }
    });
    
    // Time pattern extractor
    this.registerFeatureExtractor('time-patterns', {
      sources: ['commands', 'file-access'],
      extract: (data) => {
        const hourCounts = new Array(24).fill(0);
        
        data.forEach(item => {
          const hour = new Date(item.timestamp).getHours();
          hourCounts[hour]++;
        });
        
        const total = hourCounts.reduce((a, b) => a + b, 0);
        
        return hourCounts.map((count, hour) => ({
          feature: 'hour_activity',
          value: hour,
          score: total > 0 ? count / total : 0
        }));
      }
    });
    
    // Workflow sequence extractor
    this.registerFeatureExtractor('workflow-sequences', {
      sources: ['workflows'],
      extract: (data) => {
        const workflows = data.filter(d => d.source === 'workflows');
        const sequences = [];
        
        for (let i = 1; i < workflows.length; i++) {
          const prev = workflows[i - 1].data.workflow;
          const curr = workflows[i].data.workflow;
          sequences.push(`${prev}->${curr}`);
        }
        
        const sequenceCounts = {};
        sequences.forEach(seq => {
          sequenceCounts[seq] = (sequenceCounts[seq] || 0) + 1;
        });
        
        return Object.entries(sequenceCounts).map(([sequence, count]) => ({
          feature: 'workflow_sequence',
          value: sequence,
          score: count / sequences.length
        }));
      }
    });
    
    // Error pattern extractor
    this.registerFeatureExtractor('error-patterns', {
      sources: ['errors'],
      extract: (data) => {
        const errors = data.filter(d => d.source === 'errors');
        const patterns = {};
        
        errors.forEach(err => {
          const type = err.data.type || 'unknown';
          patterns[type] = (patterns[type] || 0) + 1;
        });
        
        return Object.entries(patterns).map(([type, count]) => ({
          feature: 'error_pattern',
          value: type,
          score: count / errors.length
        }));
      }
    });
  }

  /**
   * Register feature extractor
   */
  registerFeatureExtractor(name, config) {
    this.featureExtractors.set(name, config);
    logger.info(`Registered feature extractor: ${name}`);
  }

  /**
   * Extract features from data
   */
  async extractFeatures(data) {
    const allFeatures = [];
    
    for (const [name, extractor] of this.featureExtractors) {
      try {
        const relevantData = data.filter(d => 
          extractor.sources.includes(d.source)
        );
        
        if (relevantData.length > 0) {
          const features = await extractor.extract(relevantData);
          allFeatures.push(...features);
        }
      } catch (error) {
        logger.error(`Feature extraction error (${name}):`, error);
      }
    }
    
    return allFeatures;
  }

  /**
   * Set up data pipeline
   */
  setupDataPipeline() {
    // Process data stream
    this.dataStream$
      .pipe(
        // Batch data
        debounceTime(5000),
        // Extract features
        map(async () => {
          const recentData = await this.getRecentData();
          return await this.extractFeatures(recentData);
        })
      )
      .subscribe(async (featuresPromise) => {
        const features = await featuresPromise;
        this.features$.next(features);
        
        // Trigger training if needed
        if (this.shouldTrain(features)) {
          this.queueTraining();
        }
      });
  }

  /**
   * Get recent data for processing
   */
  async getRecentData(hours = 24) {
    const cutoff = Date.now() - (hours * 60 * 60 * 1000);
    const allData = [];
    
    // Load recent data from store
    const keys = await this.dataStore.list();
    
    for (const key of keys) {
      const data = await this.dataStore.load(key);
      if (data && data.timestamp > cutoff) {
        allData.push(data);
      }
    }
    
    return allData;
  }

  /**
   * Check if training should be triggered
   */
  shouldTrain(features) {
    const metrics = this.metrics$.value;
    
    // Check if enough data
    if (features.length < this.config.minDataForTraining) {
      return false;
    }
    
    // Check if models need update
    const lastUpdate = metrics.lastUpdate || 0;
    const timeSinceUpdate = Date.now() - lastUpdate;
    
    return timeSinceUpdate > this.config.trainingInterval;
  }

  /**
   * Queue training job
   */
  queueTraining() {
    if (this.isTraining) return;
    
    this.trainingQueue.push({
      id: this.generateId(),
      timestamp: Date.now(),
      status: 'queued'
    });
    
    this.processTrainingQueue();
  }

  /**
   * Process training queue
   */
  async processTrainingQueue() {
    if (this.isTraining || this.trainingQueue.length === 0) return;
    
    this.isTraining = true;
    const job = this.trainingQueue.shift();
    
    try {
      job.status = 'training';
      
      // Get training data
      const data = await this.getRecentData(7 * 24); // 1 week
      const features = await this.extractFeatures(data);
      
      // Train models
      for (const [name, model] of this.models) {
        await this.trainModel(name, model, features);
      }
      
      // Update metrics
      const metrics = this.metrics$.value;
      metrics.lastUpdate = Date.now();
      metrics.dataPoints = data.length;
      this.metrics$.next(metrics);
      
      job.status = 'completed';
      
      // Notify predictive engine
      predictiveEngine.updateFromLearning(features);
      
    } catch (error) {
      logger.error('Training error:', error);
      job.status = 'failed';
      job.error = error.message;
    } finally {
      this.isTraining = false;
      
      // Process next job
      if (this.trainingQueue.length > 0) {
        setTimeout(() => this.processTrainingQueue(), 1000);
      }
    }
  }

  /**
   * Train a model
   */
  async trainModel(name, model, features) {
    // This is a simplified training implementation
    // In a real system, this would use proper ML algorithms
    
    try {
      // Update model with new features
      model.features = features;
      model.lastTrained = Date.now();
      model.dataPoints = features.length;
      
      // Simple accuracy calculation (mock)
      model.accuracy = 0.75 + Math.random() * 0.2;
      
      // Save model
      await this.modelStore.save(name, model);
      
      logger.info(`Model trained: ${name} (accuracy: ${model.accuracy.toFixed(2)})`);
      
    } catch (error) {
      logger.error(`Failed to train model ${name}:`, error);
      throw error;
    }
  }

  /**
   * Load existing models
   */
  async loadModels() {
    // Load basic models
    const models = [
      {
        name: 'command-predictor',
        type: 'frequency',
        features: []
      },
      {
        name: 'workflow-predictor',
        type: 'sequence',
        features: []
      },
      {
        name: 'error-predictor',
        type: 'pattern',
        features: []
      }
    ];
    
    for (const modelDef of models) {
      const saved = await this.modelStore.load(modelDef.name);
      this.models.set(modelDef.name, saved || modelDef);
    }
  }

  /**
   * Start monitoring
   */
  startMonitoring() {
    // Update metrics periodically
    interval(30000).subscribe(async () => {
      const data = await this.getRecentData(1); // Last hour
      const metrics = this.metrics$.value;
      
      metrics.dataPoints = data.length;
      metrics.modelsTraining = this.isTraining ? 1 : 0;
      
      // Calculate average model accuracy
      let totalAccuracy = 0;
      let modelCount = 0;
      
      for (const model of this.models.values()) {
        if (model.accuracy) {
          totalAccuracy += model.accuracy;
          modelCount++;
        }
      }
      
      metrics.accuracy = modelCount > 0 ? totalAccuracy / modelCount : 0;
      
      this.metrics$.next(metrics);
    });
    
    // Clean old data periodically
    interval(86400000).subscribe(() => this.cleanOldData()); // Daily
  }

  /**
   * Schedule training
   */
  scheduleTraining() {
    // Schedule regular training
    setInterval(() => {
      this.queueTraining();
    }, this.config.trainingInterval);
  }

  /**
   * Store data
   */
  async storeData(item) {
    try {
      const dateKey = new Date().toISOString().split('T')[0];
      const key = `${item.source}/${dateKey}`;
      
      const existing = await this.dataStore.load(key) || [];
      existing.push(item);
      
      await this.dataStore.save(key, existing);
    } catch (error) {
      logger.error('Failed to store data:', error);
    }
  }

  /**
   * Clean old data
   */
  async cleanOldData() {
    const cutoff = Date.now() - (this.config.dataRetentionDays * 24 * 60 * 60 * 1000);
    const keys = await this.dataStore.list();
    
    for (const key of keys) {
      const data = await this.dataStore.load(key);
      if (data && Array.isArray(data)) {
        const filtered = data.filter(item => item.timestamp > cutoff);
        
        if (filtered.length === 0) {
          // Delete empty file
          const filePath = path.join(this.dataStore.path, `${key}.json`);
          await fs.remove(filePath);
        } else if (filtered.length < data.length) {
          // Update with filtered data
          await this.dataStore.save(key, filtered);
        }
      }
    }
    
    logger.info('Cleaned old learning data');
  }

  /**
   * Get learning insights
   */
  async getInsights() {
    const features = this.features$.value;
    const metrics = this.metrics$.value;
    const models = {};
    
    for (const [name, model] of this.models) {
      models[name] = {
        accuracy: model.accuracy || 0,
        lastTrained: model.lastTrained,
        dataPoints: model.dataPoints || 0
      };
    }
    
    // Generate insights
    const insights = {
      topCommands: features
        .filter(f => f.feature === 'command_frequency')
        .sort((a, b) => b.score - a.score)
        .slice(0, 5),
      
      peakHours: features
        .filter(f => f.feature === 'hour_activity')
        .sort((a, b) => b.score - a.score)
        .slice(0, 3)
        .map(f => f.value),
      
      commonWorkflows: features
        .filter(f => f.feature === 'workflow_sequence')
        .sort((a, b) => b.score - a.score)
        .slice(0, 3),
      
      errorPatterns: features
        .filter(f => f.feature === 'error_pattern')
        .sort((a, b) => b.score - a.score),
      
      systemHealth: {
        dataCollection: metrics.dataPoints > 0 ? 'active' : 'inactive',
        modelAccuracy: (metrics.accuracy * 100).toFixed(1) + '%',
        lastTraining: metrics.lastUpdate ? new Date(metrics.lastUpdate).toISOString() : 'never'
      }
    };
    
    return {
      insights,
      metrics,
      models,
      privacy: this.privacyMode
    };
  }

  /**
   * Update privacy mode
   */
  setPrivacyMode(mode) {
    if (!['strict', 'balanced', 'permissive'].includes(mode)) {
      throw new Error(`Invalid privacy mode: ${mode}`);
    }
    
    this.privacyMode = mode;
    logger.info(`Privacy mode set to: ${mode}`);
    
    // Emit privacy change event
    this.emit('privacy-changed', mode);
  }

  /**
   * Generate unique ID
   */
  generateId() {
    return crypto.randomBytes(16).toString('hex');
  }

  /**
   * Hash string
   */
  hashString(str, length = 16) {
    return crypto
      .createHash('sha256')
      .update(str)
      .digest('hex')
      .substring(0, length);
  }

  /**
   * Export learning data
   */
  async exportData(format = 'json') {
    const data = await this.getRecentData(30 * 24); // 30 days
    const insights = await this.getInsights();
    
    const exportData = {
      metadata: {
        exported: new Date().toISOString(),
        privacy: this.privacyMode,
        dataPoints: data.length
      },
      insights,
      data: this.privacyMode === 'strict' ? [] : data
    };
    
    if (format === 'json') {
      return JSON.stringify(exportData, null, 2);
    }
    
    throw new Error(`Unsupported export format: ${format}`);
  }
}

// Export singleton instance with lazy initialization
let instance = null;
const getLearningSystem = () => {
  if (!instance && process.env.MCP_MODE !== 'true') {
    instance = new LearningSystem();
  }
  return instance || {
    setPrivacyMode: () => {},
    recordUsage: () => {},
    recordPattern: () => {},
    getInsights: () => ({ patterns: {}, suggestions: [] }),
    exportData: () => ({}),
    clearData: () => {}
  };
};

export default getLearningSystem();
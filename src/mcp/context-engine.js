import { Subject, BehaviorSubject, debounceTime } from 'rxjs';
import fs from 'fs-extra';
import path from 'path';
import { simpleGit } from 'simple-git';
import logger from '../utils/logger.js';
import { ContextInferenceEngine } from './context-inference.js';
import { ContextPersistence } from './context-persistence.js';

/**
 * Context Data Structure
 * Represents various types of context information
 */
class ContextData {
  constructor() {
    this.git = {
      currentBranch: null,
      branches: [],
      commits: [],
      status: null,
      remotes: [],
      conflicts: [],
      lastUpdate: null
    };
    
    this.project = {
      structure: {},
      files: [],
      dependencies: {},
      scripts: {},
      lastUpdate: null
    };
    
    this.user = {
      activities: [],
      patterns: {},
      preferences: {},
      lastAction: null
    };
    
    this.team = {
      members: [],
      activities: [],
      currentTasks: []
    };
    
    this.cache = new Map();
    this.metadata = {
      version: '1.0.0',
      lastUpdated: new Date().toISOString(),
      updateCount: 0
    };
  }

  /**
   * Update a specific context path
   */
  update(path, value) {
    const keys = path.split('.');
    let current = this;
    
    for (let i = 0; i < keys.length - 1; i++) {
      if (!current[keys[i]]) {
        current[keys[i]] = {};
      }
      current = current[keys[i]];
    }
    
    current[keys[keys.length - 1]] = value;
    this.metadata.lastUpdated = new Date().toISOString();
    this.metadata.updateCount++;
  }

  /**
   * Get a specific context value
   */
  get(path, defaultValue = null) {
    const keys = path.split('.');
    let current = this;
    
    for (const key of keys) {
      if (current && typeof current === 'object' && key in current) {
        current = current[key];
      } else {
        return defaultValue;
      }
    }
    
    return current;
  }

  /**
   * Clear the cache
   */
  clearCache() {
    this.cache.clear();
  }

  /**
   * Get a cached value or compute it
   */
  getCached(key, computeFn) {
    if (this.cache.has(key)) {
      return this.cache.get(key);
    }
    
    const value = computeFn();
    this.cache.set(key, value);
    return value;
  }
}

/**
 * Context Engine - Core component for tracking and managing context
 */
export class ContextEngine {
  constructor(projectRoot = process.cwd()) {
    this.projectRoot = projectRoot;
    this.data = new ContextData();
    this.git = simpleGit(projectRoot);
    
    // RxJS subjects for reactive updates
    this.contextUpdates$ = new Subject();
    this.gitState$ = new BehaviorSubject(this.data.git);
    this.projectState$ = new BehaviorSubject(this.data.project);
    this.userActivity$ = new Subject();
    
    // Debounced updates for performance
    this.debouncedGitUpdate$ = this.gitState$.pipe(
      debounceTime(1000)
    );
    
    this.debouncedProjectUpdate$ = this.projectState$.pipe(
      debounceTime(2000)
    );
    
    // Initialize inference engine
    this.inferenceEngine = new ContextInferenceEngine(this);
    
    // Initialize persistence
    this.persistence = new ContextPersistence();
    
    this.initialize();
  }

  /**
   * Initialize the context engine
   */
  async initialize() {
    try {
      logger.info('Initializing Context Engine...');
      
      // Initialize persistence
      await this.persistence.initialize();
      
      // Initial context gathering
      await Promise.all([
        this.updateGitContext(),
        this.updateProjectContext()
      ]);
      
      // Set up file watchers
      this.setupWatchers();
      
      // Set up persistence interval
      this.setupPersistence();
      
      logger.info('Context Engine initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize Context Engine:', error);
      throw error;
    }
  }

  /**
   * Update git-related context
   */
  async updateGitContext() {
    try {
      const [status, branches, log, remotes] = await Promise.all([
        this.git.status(),
        this.git.branch(),
        this.git.log({ maxCount: 50 }),
        this.git.getRemotes(true)
      ]);
      
      this.data.update('git.status', status);
      this.data.update('git.currentBranch', status.current);
      this.data.update('git.branches', Object.keys(branches.branches));
      this.data.update('git.commits', log.all);
      this.data.update('git.remotes', remotes);
      this.data.update('git.conflicts', status.conflicted);
      this.data.update('git.lastUpdate', new Date().toISOString());
      
      this.gitState$.next(this.data.git);
      this.contextUpdates$.next({ type: 'git', data: this.data.git });
      
      // Persist git state
      await this.persistence.saveGitState({
        currentBranch: this.data.git.currentBranch,
        lastCommit: this.data.git.commits[0]?.hash,
        status: this.data.git.status
      });
    } catch (error) {
      logger.error('Error updating git context:', error);
    }
  }

  /**
   * Update project structure context
   */
  async updateProjectContext() {
    try {
      // Read package.json
      const packageJsonPath = path.join(this.projectRoot, 'package.json');
      let packageData = {};
      
      if (await fs.pathExists(packageJsonPath)) {
        packageData = await fs.readJson(packageJsonPath);
        this.data.update('project.dependencies', packageData.dependencies || {});
        this.data.update('project.scripts', packageData.scripts || {});
      }
      
      // Build project structure
      const structure = await this.buildProjectStructure(this.projectRoot);
      this.data.update('project.structure', structure);
      
      // Get file list
      const files = await this.getProjectFiles();
      this.data.update('project.files', files);
      this.data.update('project.lastUpdate', new Date().toISOString());
      
      this.projectState$.next(this.data.project);
      this.contextUpdates$.next({ type: 'project', data: this.data.project });
    } catch (error) {
      logger.error('Error updating project context:', error);
    }
  }

  /**
   * Build project directory structure
   */
  async buildProjectStructure(dir, prefix = '') {
    const structure = {};
    const items = await fs.readdir(dir);
    
    for (const item of items) {
      // Skip common ignored directories
      if (['.git', 'node_modules', '.env', 'dist', 'build'].includes(item)) {
        continue;
      }
      
      const fullPath = path.join(dir, item);
      const stat = await fs.stat(fullPath);
      
      if (stat.isDirectory()) {
        structure[item] = {
          type: 'directory',
          children: await this.buildProjectStructure(fullPath, prefix + '  ')
        };
      } else {
        structure[item] = {
          type: 'file',
          size: stat.size,
          modified: stat.mtime
        };
      }
    }
    
    return structure;
  }

  /**
   * Get list of project files
   */
  async getProjectFiles(dir = this.projectRoot, baseDir = this.projectRoot) {
    const files = [];
    const items = await fs.readdir(dir);
    
    for (const item of items) {
      if (['.git', 'node_modules', 'dist', 'build'].includes(item)) {
        continue;
      }
      
      const fullPath = path.join(dir, item);
      const stat = await fs.stat(fullPath);
      
      if (stat.isDirectory()) {
        const subFiles = await this.getProjectFiles(fullPath, baseDir);
        files.push(...subFiles);
      } else {
        files.push({
          path: path.relative(baseDir, fullPath),
          size: stat.size,
          modified: stat.mtime
        });
      }
    }
    
    return files;
  }

  /**
   * Set up file system watchers
   */
  setupWatchers() {
    // Watch for git changes
    const gitDir = path.join(this.projectRoot, '.git');
    if (fs.existsSync(gitDir)) {
      fs.watch(gitDir, { recursive: true }, (eventType, filename) => {
        if (filename && !filename.includes('index.lock')) {
          this.updateGitContext();
        }
      });
    }
    
    // Watch for project file changes
    fs.watch(this.projectRoot, { recursive: true }, (eventType, filename) => {
      if (filename && !filename.includes('node_modules') && !filename.includes('.git')) {
        this.updateProjectContext();
      }
    });
  }

  /**
   * Track user activity
   */
  async trackUserActivity(activity) {
    const activityRecord = {
      ...activity,
      timestamp: new Date().toISOString()
    };
    
    this.data.user.activities.push(activityRecord);
    this.data.user.lastAction = activityRecord;
    
    // Keep only last 100 activities
    if (this.data.user.activities.length > 100) {
      this.data.user.activities = this.data.user.activities.slice(-100);
    }
    
    this.userActivity$.next(activityRecord);
    this.contextUpdates$.next({ type: 'user', data: activityRecord });
    
    // Persist user activity
    await this.persistence.saveUserActivity({
      type: activityRecord.type,
      description: activityRecord.description,
      context: activityRecord,
      timestamp: activityRecord.timestamp
    });
  }

  /**
   * Query context data
   */
  query(path, options = {}) {
    const value = this.data.get(path);
    
    if (options.cached && value !== null) {
      return this.data.getCached(path, () => value);
    }
    
    return value;
  }

  /**
   * Get current context snapshot
   */
  getSnapshot() {
    return {
      git: { ...this.data.git },
      project: { ...this.data.project },
      user: { ...this.data.user },
      team: { ...this.data.team },
      metadata: { ...this.data.metadata }
    };
  }

  /**
   * Subscribe to context updates
   */
  subscribe(callback, filter = null) {
    let stream = this.contextUpdates$;
    
    if (filter) {
      stream = stream.pipe(
        filter(update => update.type === filter)
      );
    }
    
    return stream.subscribe(callback);
  }

  /**
   * Get context for a specific tool or operation
   */
  getToolContext(_toolName) {
    return {
      git: this.data.git,
      project: {
        dependencies: this.data.project.dependencies,
        scripts: this.data.project.scripts,
        structure: this.data.project.structure
      },
      recent: this.data.user.activities.slice(-10)
    };
  }

  /**
   * Clear all context data
   */
  clear() {
    this.data = new ContextData();
    this.gitState$.next(this.data.git);
    this.projectState$.next(this.data.project);
  }

  /**
   * Get inferred context
   */
  async getInferredContext() {
    const snapshot = this.getSnapshot();
    return await this.inferenceEngine.infer(snapshot);
  }

  /**
   * Get specific inference
   */
  getInference(aspect, rule) {
    return this.inferenceEngine.getInference(aspect, rule);
  }

  /**
   * Set up persistence
   */
  setupPersistence() {
    // Save context snapshot every 5 minutes
    setInterval(async () => {
      try {
        const snapshot = this.getSnapshot();
        await this.persistence.saveSnapshot('full', snapshot);
        
        // Save inferences
        const inferences = await this.getInferredContext();
        await this.persistence.saveInference('full', inferences);
      } catch (error) {
        logger.error('Error persisting context:', error);
      }
    }, 5 * 60 * 1000);
    
    // Clean old data daily
    setInterval(async () => {
      try {
        await this.persistence.cleanOldData(30);
      } catch (error) {
        logger.error('Error cleaning old data:', error);
      }
    }, 24 * 60 * 60 * 1000);
  }

  /**
   * Get historical context
   */
  async getHistoricalContext(options = {}) {
    const history = {
      snapshots: await this.persistence.getRecentSnapshots(options.type, options.limit),
      activities: await this.persistence.getUserActivityHistory(options.activityLimit),
      gitStates: await this.persistence.getGitStateHistory(options.branch),
      inferences: await this.persistence.getInferenceHistory(options.inferenceType)
    };
    
    return history;
  }

  /**
   * Dispose of resources
   */
  async dispose() {
    this.contextUpdates$.complete();
    this.gitState$.complete();
    this.projectState$.complete();
    this.userActivity$.complete();
    
    if (this.persistence) {
      await this.persistence.close();
    }
  }
}

// Export singleton instance with lazy initialization
let instance = null;
const getContextEngine = () => {
  if (!instance && process.env.MCP_MODE !== 'true') {
    instance = new ContextEngine();
  }
  return instance || {
    query: () => null,
    data: { update: () => {}, getCached: () => null },
    updateGitContext: async () => {},
    getInferredContext: async () => ({ projectState: {} })
  };
};

export default getContextEngine();
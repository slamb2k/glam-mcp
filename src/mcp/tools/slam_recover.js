import chalk from 'chalk';
import { EventEmitter } from 'events';
import fs from 'fs-extra';
import path from 'path';
import crypto from 'crypto';
import { Subject, BehaviorSubject } from 'rxjs';
import { filter, debounceTime } from 'rxjs/operators';
import stateManager from '../state-manager.js';
import contextEngine from '../context-engine.js';
import workflowOrchestrator from '../workflow-orchestrator.js';
import gitHelpers from '../../utils/git-helpers-mcp.js';
import logger from '../../utils/logger.js';

/**
 * SLAM Recover - Time Machine Tool
 * Advanced undo and recovery operations with state snapshots
 */
export class SlamRecoverTool extends EventEmitter {
  constructor() {
    super();
    
    // State
    this.isTracking = false;
    this.trackingStarted = null;
    
    // Action history
    this.actionHistory = [];
    this.actionLog$ = new Subject();
    this.currentSnapshot = null;
    
    // Snapshots
    this.snapshots = new Map();
    this.snapshotInterval = null;
    
    // Recovery state
    this.recoveryPoints = new Map();
    this.activeBranches = new Set();
    
    // Configuration
    this.config = {
      maxHistorySize: 1000,
      snapshotInterval: 300000, // 5 minutes
      maxSnapshots: 50,
      compressionEnabled: true,
      autoGC: true,
      gcThreshold: 0.8 // Run GC when 80% full
    };
    
    // Storage paths
    this.storagePath = path.join(process.cwd(), '.slambed', 'recovery');
    this.historyPath = path.join(this.storagePath, 'history');
    this.snapshotsPath = path.join(this.storagePath, 'snapshots');
  }

  /**
   * Start tracking actions for recovery
   */
  async startTracking() {
    if (this.isTracking) {
      return {
        success: false,
        message: 'Recovery tracking is already active'
      };
    }
    
    try {
      // Initialize storage
      await this.initializeStorage();
      
      // Load existing history
      await this.loadHistory();
      
      // Set up action tracking
      this.setupActionTracking();
      
      // Start snapshot system
      this.startSnapshotSystem();
      
      // Create initial snapshot
      await this.createSnapshot('tracking-started');
      
      this.isTracking = true;
      this.trackingStarted = Date.now();
      
      return {
        success: true,
        message: 'Recovery tracking started',
        startTime: new Date(this.trackingStarted).toISOString()
      };
    } catch (error) {
      logger.error('Error starting recovery tracking:', error);
      throw error;
    }
  }

  /**
   * Stop tracking actions
   */
  async stopTracking() {
    if (!this.isTracking) {
      return {
        success: false,
        message: 'Recovery tracking is not active'
      };
    }
    
    try {
      // Save current state
      await this.saveHistory();
      
      // Stop snapshot system
      this.stopSnapshotSystem();
      
      // Clean up tracking
      this.cleanupTracking();
      
      this.isTracking = false;
      const duration = Date.now() - this.trackingStarted;
      
      return {
        success: true,
        message: 'Recovery tracking stopped',
        duration: Math.round(duration / 1000),
        actionsTracked: this.actionHistory.length
      };
    } catch (error) {
      logger.error('Error stopping recovery tracking:', error);
      throw error;
    }
  }

  /**
   * Get recovery history and status
   */
  async getHistory(limit = 20) {
    try {
      const recent = this.actionHistory.slice(-limit).reverse();
      const snapshots = Array.from(this.snapshots.values())
        .sort((a, b) => b.timestamp - a.timestamp)
        .slice(0, 10);
      
      return {
        success: true,
        status: {
          tracking: this.isTracking,
          startTime: this.trackingStarted ? new Date(this.trackingStarted).toISOString() : null,
          totalActions: this.actionHistory.length,
          totalSnapshots: this.snapshots.size,
          storageUsed: await this.getStorageSize()
        },
        recentActions: recent,
        availableSnapshots: snapshots,
        recoveryPoints: Array.from(this.recoveryPoints.values())
      };
    } catch (error) {
      logger.error('Error getting recovery history:', error);
      throw error;
    }
  }

  /**
   * Create a recovery point
   */
  async createRecoveryPoint(name, description = '') {
    try {
      const snapshot = await this.createSnapshot(`recovery-point: ${name}`);
      const recoveryPoint = {
        id: stateManager.generateId(),
        name,
        description,
        snapshotId: snapshot.id,
        timestamp: Date.now(),
        actionIndex: this.actionHistory.length - 1,
        context: await contextEngine.getSnapshot()
      };
      
      this.recoveryPoints.set(recoveryPoint.id, recoveryPoint);
      await this.saveRecoveryPoints();
      
      return {
        success: true,
        recoveryPoint,
        message: `Recovery point "${name}" created`
      };
    } catch (error) {
      logger.error('Error creating recovery point:', error);
      throw error;
    }
  }

  /**
   * Recover to a specific point in time
   */
  async recoverToPoint(pointId, options = {}) {
    try {
      const recoveryPoint = this.recoveryPoints.get(pointId);
      if (!recoveryPoint) {
        return {
          success: false,
          message: 'Recovery point not found'
        };
      }
      
      // Create backup of current state
      const backupPoint = await this.createRecoveryPoint('pre-recovery-backup', 'Automatic backup before recovery');
      
      // Load snapshot
      const snapshot = this.snapshots.get(recoveryPoint.snapshotId);
      if (!snapshot) {
        return {
          success: false,
          message: 'Snapshot not found for recovery point'
        };
      }
      
      // Perform recovery
      const recoveryResult = await this.performRecovery(snapshot, recoveryPoint, options);
      
      if (recoveryResult.success) {
        // Log recovery action
        this.logAction({
          type: 'recovery',
          target: pointId,
          backup: backupPoint.recoveryPoint.id,
          timestamp: Date.now()
        });
      }
      
      return recoveryResult;
    } catch (error) {
      logger.error('Error recovering to point:', error);
      throw error;
    }
  }

  /**
   * Undo last N actions
   */
  async undoActions(count = 1, options = {}) {
    try {
      if (count > this.actionHistory.length) {
        return {
          success: false,
          message: `Cannot undo ${count} actions, only ${this.actionHistory.length} available`
        };
      }
      
      const targetIndex = this.actionHistory.length - count;
      const targetAction = this.actionHistory[targetIndex];
      
      // Find nearest snapshot
      const snapshot = await this.findNearestSnapshot(targetAction.timestamp);
      if (!snapshot) {
        return {
          success: false,
          message: 'No suitable snapshot found for undo operation'
        };
      }
      
      // Create backup
      const backupPoint = await this.createRecoveryPoint('pre-undo-backup', `Backup before undoing ${count} actions`);
      
      // Perform undo
      const undoResult = await this.performUndo(snapshot, targetIndex, options);
      
      if (undoResult.success) {
        // Log undo action
        this.logAction({
          type: 'undo',
          count,
          targetIndex,
          backup: backupPoint.recoveryPoint.id,
          timestamp: Date.now()
        });
      }
      
      return undoResult;
    } catch (error) {
      logger.error('Error undoing actions:', error);
      throw error;
    }
  }

  /**
   * Preview changes before recovery
   */
  async previewRecovery(pointId) {
    try {
      const recoveryPoint = this.recoveryPoints.get(pointId);
      if (!recoveryPoint) {
        return {
          success: false,
          message: 'Recovery point not found'
        };
      }
      
      const currentState = await this.getCurrentState();
      const targetSnapshot = this.snapshots.get(recoveryPoint.snapshotId);
      
      if (!targetSnapshot) {
        return {
          success: false,
          message: 'Snapshot not found for recovery point'
        };
      }
      
      const diff = await this.generateStateDiff(currentState, targetSnapshot.state);
      const conflicts = await this.detectConflicts(currentState, targetSnapshot.state);
      
      return {
        success: true,
        preview: {
          recoveryPoint,
          changes: diff,
          conflicts,
          affectedFiles: diff.files || [],
          riskLevel: this.assessRecoveryRisk(diff, conflicts)
        }
      };
    } catch (error) {
      logger.error('Error previewing recovery:', error);
      throw error;
    }
  }

  /**
   * Initialize storage directories
   */
  async initializeStorage() {
    await fs.ensureDir(this.storagePath);
    await fs.ensureDir(this.historyPath);
    await fs.ensureDir(this.snapshotsPath);
  }

  /**
   * Setup action tracking
   */
  setupActionTracking() {
    // Track context changes
    contextEngine.contextUpdates$
      .pipe(
        filter(() => this.isTracking),
        debounceTime(100)
      )
      .subscribe(update => {
        this.logAction({
          type: 'context-change',
          data: update,
          timestamp: Date.now()
        });
      });
    
    // Track workflow changes
    workflowOrchestrator.on('workflow:started', (data) => {
      if (this.isTracking) {
        this.logAction({
          type: 'workflow-started',
          workflow: data.name,
          timestamp: Date.now()
        });
      }
    });
    
    workflowOrchestrator.on('workflow:completed', (data) => {
      if (this.isTracking) {
        this.logAction({
          type: 'workflow-completed',
          workflow: data.name,
          duration: data.duration,
          timestamp: Date.now()
        });
      }
    });
    
    // Track file changes (if available)
    if (fs.watch) {
      this.watchProjectFiles();
    }
  }

  /**
   * Watch project files for changes
   */
  watchProjectFiles() {
    const projectPath = process.cwd();
    const ignorePaths = ['.git', 'node_modules', '.slambed'];
    
    try {
      const watcher = fs.watch(projectPath, { recursive: true }, (eventType, filename) => {
        if (!this.isTracking || !filename) return;
        
        // Ignore certain paths
        if (ignorePaths.some(ignore => filename.includes(ignore))) return;
        
        this.logAction({
          type: 'file-change',
          event: eventType,
          file: filename,
          timestamp: Date.now()
        });
      });
      
      this.fileWatcher = watcher;
    } catch (error) {
      logger.warn('File watching not available:', error.message);
    }
  }

  /**
   * Log an action to history
   */
  logAction(action) {
    if (!this.isTracking) return;
    
    // Add unique ID and sequence
    action.id = stateManager.generateId();
    action.sequence = this.actionHistory.length;
    
    this.actionHistory.push(action);
    this.actionLog$.next(action);
    
    // Check if we need garbage collection
    if (this.actionHistory.length > this.config.maxHistorySize * this.config.gcThreshold) {
      this.scheduleGarbageCollection();
    }
    
    this.emit('action-logged', action);
  }

  /**
   * Start snapshot system
   */
  startSnapshotSystem() {
    this.snapshotInterval = setInterval(() => {
      if (this.isTracking) {
        this.createSnapshot('periodic').catch(error => {
          logger.error('Error creating periodic snapshot:', error);
        });
      }
    }, this.config.snapshotInterval);
  }

  /**
   * Stop snapshot system
   */
  stopSnapshotSystem() {
    if (this.snapshotInterval) {
      clearInterval(this.snapshotInterval);
      this.snapshotInterval = null;
    }
  }

  /**
   * Create a state snapshot
   */
  async createSnapshot(reason = 'manual') {
    try {
      const state = await this.getCurrentState();
      const snapshot = {
        id: stateManager.generateId(),
        reason,
        timestamp: Date.now(),
        state,
        actionIndex: this.actionHistory.length - 1,
        checksum: this.calculateChecksum(state)
      };
      
      // Compress if enabled
      if (this.config.compressionEnabled) {
        snapshot.compressed = true;
        snapshot.state = await this.compressState(state);
      }
      
      this.snapshots.set(snapshot.id, snapshot);
      
      // Save to disk
      await this.saveSnapshot(snapshot);
      
      // Cleanup old snapshots
      await this.cleanupSnapshots();
      
      this.emit('snapshot-created', snapshot);
      
      return snapshot;
    } catch (error) {
      logger.error('Error creating snapshot:', error);
      throw error;
    }
  }

  /**
   * Get current system state
   */
  async getCurrentState() {
    const context = await contextEngine.getSnapshot();
    const gitStatus = await gitHelpers.getComprehensiveStatus();
    
    return {
      timestamp: Date.now(),
      context,
      git: gitStatus,
      workingDirectory: process.cwd(),
      environment: {
        nodeVersion: process.version,
        platform: process.platform
      }
    };
  }

  /**
   * Perform recovery operation
   */
  async performRecovery(snapshot, recoveryPoint, options = {}) {
    try {
      let state = snapshot.state;
      
      // Decompress if needed
      if (snapshot.compressed) {
        state = await this.decompressState(state);
      }
      
      // Check for conflicts
      const currentState = await this.getCurrentState();
      const conflicts = await this.detectConflicts(currentState, state);
      
      if (conflicts.length > 0 && !options.forceRecover) {
        return {
          success: false,
          message: 'Conflicts detected. Use forceRecover option to proceed.',
          conflicts
        };
      }
      
      // Perform git recovery if applicable
      if (state.git && options.recoverGit !== false) {
        await this.recoverGitState(state.git, options);
      }
      
      // Recover context
      if (state.context && options.recoverContext !== false) {
        await this.recoverContextState(state.context, options);
      }
      
      return {
        success: true,
        message: `Recovered to "${recoveryPoint.name}"`,
        recoveredState: state,
        conflicts: conflicts.length > 0 ? conflicts : undefined
      };
    } catch (error) {
      logger.error('Error performing recovery:', error);
      return {
        success: false,
        message: 'Recovery failed: ' + error.message
      };
    }
  }

  /**
   * Perform undo operation
   */
  async performUndo(snapshot, targetIndex, options = {}) {
    try {
      // Replay actions from snapshot to target index
      const actionsToReplay = this.actionHistory.slice(snapshot.actionIndex + 1, targetIndex);
      
      let state = snapshot.state;
      if (snapshot.compressed) {
        state = await this.decompressState(state);
      }
      
      // Apply snapshot state
      await this.applyState(state);
      
      // Replay actions
      for (const action of actionsToReplay) {
        await this.replayAction(action, options);
      }
      
      return {
        success: true,
        message: `Undid ${this.actionHistory.length - targetIndex} actions`,
        targetIndex,
        actionsUndone: this.actionHistory.length - targetIndex
      };
    } catch (error) {
      logger.error('Error performing undo:', error);
      return {
        success: false,
        message: 'Undo failed: ' + error.message
      };
    }
  }

  /**
   * Detect conflicts between states
   */
  async detectConflicts(currentState, targetState) {
    const conflicts = [];
    
    // Check git conflicts
    if (currentState.git && targetState.git) {
      if (currentState.git.current !== targetState.git.current) {
        conflicts.push({
          type: 'git-branch',
          current: currentState.git.current,
          target: targetState.git.current
        });
      }
      
      if (currentState.git.status?.files?.length > 0) {
        conflicts.push({
          type: 'uncommitted-changes',
          files: currentState.git.status.files
        });
      }
    }
    
    // Check file system conflicts
    // This would be expanded based on specific state structure
    
    return conflicts;
  }

  /**
   * Generate diff between states
   */
  async generateStateDiff(currentState, targetState) {
    const diff = {
      timestamp: Date.now(),
      files: [],
      git: {},
      context: {}
    };
    
    // Compare git states
    if (currentState.git && targetState.git) {
      if (currentState.git.current !== targetState.git.current) {
        diff.git.branch = {
          from: currentState.git.current,
          to: targetState.git.current
        };
      }
    }
    
    // Compare file states
    // This would be expanded with actual file comparison
    
    return diff;
  }

  /**
   * Find nearest snapshot to timestamp
   */
  async findNearestSnapshot(timestamp) {
    let nearest = null;
    let minDiff = Infinity;
    
    for (const snapshot of this.snapshots.values()) {
      const diff = Math.abs(snapshot.timestamp - timestamp);
      if (diff < minDiff && snapshot.timestamp <= timestamp) {
        minDiff = diff;
        nearest = snapshot;
      }
    }
    
    return nearest;
  }

  /**
   * Calculate checksum for state
   */
  calculateChecksum(state) {
    const content = JSON.stringify(state);
    return crypto.createHash('sha256').update(content).digest('hex');
  }

  /**
   * Compress state data
   */
  async compressState(state) {
    // Simplified compression - in real implementation would use zlib
    return JSON.stringify(state);
  }

  /**
   * Decompress state data
   */
  async decompressState(compressedState) {
    // Simplified decompression
    return JSON.parse(compressedState);
  }

  /**
   * Apply state to current system
   */
  async applyState(state) {
    // This would apply the state to the actual system
    logger.info('Applying state (simulation)');
  }

  /**
   * Replay a single action
   */
  async replayAction(action, options = {}) {
    // This would replay the specific action
    logger.info(`Replaying action: ${action.type}`);
  }

  /**
   * Assess recovery risk level
   */
  assessRecoveryRisk(diff, conflicts) {
    if (conflicts.length > 0) return 'high';
    if (diff.git?.branch || diff.files?.length > 10) return 'medium';
    return 'low';
  }

  /**
   * Recover git state
   */
  async recoverGitState(gitState, options = {}) {
    // This would recover git state
    logger.info('Recovering git state (simulation)');
  }

  /**
   * Recover context state
   */
  async recoverContextState(contextState, options = {}) {
    // This would recover context state
    logger.info('Recovering context state (simulation)');
  }

  /**
   * Save snapshot to disk
   */
  async saveSnapshot(snapshot) {
    const filepath = path.join(this.snapshotsPath, `${snapshot.id}.json`);
    await fs.writeJson(filepath, snapshot, { spaces: 2 });
  }

  /**
   * Load history from disk
   */
  async loadHistory() {
    try {
      const historyFile = path.join(this.historyPath, 'actions.json');
      if (await fs.pathExists(historyFile)) {
        this.actionHistory = await fs.readJson(historyFile);
      }
      
      const snapshotsDir = this.snapshotsPath;
      if (await fs.pathExists(snapshotsDir)) {
        const files = await fs.readdir(snapshotsDir);
        for (const file of files) {
          if (file.endsWith('.json')) {
            const snapshot = await fs.readJson(path.join(snapshotsDir, file));
            this.snapshots.set(snapshot.id, snapshot);
          }
        }
      }
      
      await this.loadRecoveryPoints();
    } catch (error) {
      logger.error('Error loading history:', error);
    }
  }

  /**
   * Save history to disk
   */
  async saveHistory() {
    try {
      const historyFile = path.join(this.historyPath, 'actions.json');
      await fs.writeJson(historyFile, this.actionHistory, { spaces: 2 });
      
      await this.saveRecoveryPoints();
    } catch (error) {
      logger.error('Error saving history:', error);
    }
  }

  /**
   * Load recovery points
   */
  async loadRecoveryPoints() {
    try {
      const recoveryFile = path.join(this.storagePath, 'recovery-points.json');
      if (await fs.pathExists(recoveryFile)) {
        const points = await fs.readJson(recoveryFile);
        points.forEach(point => {
          this.recoveryPoints.set(point.id, point);
        });
      }
    } catch (error) {
      logger.error('Error loading recovery points:', error);
    }
  }

  /**
   * Save recovery points
   */
  async saveRecoveryPoints() {
    try {
      const recoveryFile = path.join(this.storagePath, 'recovery-points.json');
      const points = Array.from(this.recoveryPoints.values());
      await fs.writeJson(recoveryFile, points, { spaces: 2 });
    } catch (error) {
      logger.error('Error saving recovery points:', error);
    }
  }

  /**
   * Cleanup old snapshots
   */
  async cleanupSnapshots() {
    if (this.snapshots.size <= this.config.maxSnapshots) return;
    
    const snapshots = Array.from(this.snapshots.values())
      .sort((a, b) => a.timestamp - b.timestamp);
    
    const toRemove = snapshots.slice(0, snapshots.length - this.config.maxSnapshots);
    
    for (const snapshot of toRemove) {
      this.snapshots.delete(snapshot.id);
      const filepath = path.join(this.snapshotsPath, `${snapshot.id}.json`);
      await fs.remove(filepath).catch(() => {}); // Ignore errors
    }
  }

  /**
   * Schedule garbage collection
   */
  scheduleGarbageCollection() {
    if (!this.config.autoGC) return;
    
    setTimeout(() => {
      this.runGarbageCollection();
    }, 5000); // Run GC after 5 seconds
  }

  /**
   * Run garbage collection
   */
  async runGarbageCollection() {
    try {
      const originalSize = this.actionHistory.length;
      const keepCount = Math.floor(this.config.maxHistorySize * 0.7);
      
      if (originalSize > keepCount) {
        this.actionHistory = this.actionHistory.slice(-keepCount);
        await this.saveHistory();
        
        logger.info(`Garbage collection: reduced history from ${originalSize} to ${this.actionHistory.length} actions`);
      }
    } catch (error) {
      logger.error('Error during garbage collection:', error);
    }
  }

  /**
   * Get storage size
   */
  async getStorageSize() {
    try {
      let totalSize = 0;
      
      const calculateDirSize = async (dirPath) => {
        if (!(await fs.pathExists(dirPath))) return 0;
        
        const files = await fs.readdir(dirPath);
        let size = 0;
        
        for (const file of files) {
          const filePath = path.join(dirPath, file);
          const stats = await fs.stat(filePath);
          size += stats.size;
        }
        
        return size;
      };
      
      totalSize += await calculateDirSize(this.historyPath);
      totalSize += await calculateDirSize(this.snapshotsPath);
      
      return Math.round(totalSize / 1024); // Return in KB
    } catch (error) {
      logger.error('Error calculating storage size:', error);
      return 0;
    }
  }

  /**
   * Clean up tracking
   */
  cleanupTracking() {
    if (this.fileWatcher) {
      this.fileWatcher.close();
      this.fileWatcher = null;
    }
  }

  /**
   * Format history for display
   */
  formatHistory(history) {
    const lines = [];
    
    lines.push(chalk.bold.blue('⏰ Recovery History'));
    lines.push('');
    
    if (history.status.tracking) {
      lines.push(chalk.green('🟢 Tracking Active'));
      lines.push(`  ${chalk.gray('•')} Started: ${chalk.cyan(new Date(history.status.startTime).toLocaleString())}`);
    } else {
      lines.push(chalk.gray('⚫ Tracking Inactive'));
    }
    
    lines.push(`  ${chalk.gray('•')} Total Actions: ${chalk.cyan(history.status.totalActions)}`);
    lines.push(`  ${chalk.gray('•')} Snapshots: ${chalk.cyan(history.status.totalSnapshots)}`);
    lines.push(`  ${chalk.gray('•')} Storage Used: ${chalk.cyan(history.status.storageUsed + ' KB')}`);
    lines.push('');
    
    if (history.recoveryPoints.length > 0) {
      lines.push(chalk.white('📍 Recovery Points:'));
      history.recoveryPoints.forEach(point => {
        const time = new Date(point.timestamp).toLocaleString();
        lines.push(`  ${chalk.gray('•')} ${chalk.cyan(point.name)} (${time})`);
        if (point.description) {
          lines.push(`    ${chalk.gray(point.description)}`);
        }
      });
      lines.push('');
    }
    
    if (history.recentActions.length > 0) {
      lines.push(chalk.white('📝 Recent Actions:'));
      history.recentActions.slice(0, 10).forEach(action => {
        const time = new Date(action.timestamp).toLocaleTimeString();
        lines.push(`  ${chalk.gray(time)} ${chalk.cyan(action.type)}`);
      });
    }
    
    return lines.join('\n');
  }
}

// Export singleton instance
const slamRecover = new SlamRecoverTool();

/**
 * Main slam_recover function
 */
export async function slam_recover(action = 'status', options = {}) {
  switch (action) {
    case 'start':
      const startResult = await slamRecover.startTracking();
      startResult.output = startResult.success 
        ? chalk.green('✓ Recovery tracking started')
        : chalk.red(`❌ ${startResult.message}`);
      return startResult;
      
    case 'stop':
      const stopResult = await slamRecover.stopTracking();
      stopResult.output = stopResult.success
        ? chalk.yellow('⏹️ Recovery tracking stopped')
        : chalk.red(`❌ ${stopResult.message}`);
      return stopResult;
      
    case 'status':
    case 'history':
      const historyResult = await slamRecover.getHistory(options.limit);
      if (historyResult.success) {
        historyResult.output = slamRecover.formatHistory(historyResult);
      }
      return historyResult;
      
    case 'save':
      if (!options.name) {
        throw new Error('Recovery point name is required');
      }
      const saveResult = await slamRecover.createRecoveryPoint(options.name, options.description);
      saveResult.output = chalk.green(`✓ Recovery point "${options.name}" created`);
      return saveResult;
      
    case 'recover':
      if (!options.pointId) {
        throw new Error('Recovery point ID is required');
      }
      const recoverResult = await slamRecover.recoverToPoint(options.pointId, options);
      recoverResult.output = recoverResult.success
        ? chalk.green(`✓ ${recoverResult.message}`)
        : chalk.red(`❌ ${recoverResult.message}`);
      return recoverResult;
      
    case 'undo':
      const count = options.count || 1;
      const undoResult = await slamRecover.undoActions(count, options);
      undoResult.output = undoResult.success
        ? chalk.green(`✓ Undid ${count} action(s)`)
        : chalk.red(`❌ ${undoResult.message}`);
      return undoResult;
      
    case 'preview':
      if (!options.pointId) {
        throw new Error('Recovery point ID is required for preview');
      }
      const previewResult = await slamRecover.previewRecovery(options.pointId);
      if (previewResult.success) {
        const preview = previewResult.preview;
        previewResult.output = [
          `Recovery Preview for "${preview.recoveryPoint.name}":`,
          `Risk Level: ${preview.riskLevel}`,
          `Affected Files: ${preview.affectedFiles.length}`,
          `Conflicts: ${preview.conflicts.length}`
        ].join('\n');
      }
      return previewResult;
      
    default:
      throw new Error(`Unknown action: ${action}`);
  }
}

export default slamRecover;
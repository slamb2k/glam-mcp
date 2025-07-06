import chalk from 'chalk';
import { EventEmitter } from 'events';
import { Subject, BehaviorSubject } from 'rxjs';
import { filter, map, debounceTime } from 'rxjs/operators';
import stateManager from '../state-manager.js';
import contextEngine from '../context-engine.js';
import workflowOrchestrator from '../workflow-orchestrator.js';
import logger from '../../utils/logger.js';

/**
 * SLAM Collaborate - Team Collaboration Tool
 * Real-time team synchronization and collaboration features
 */
export class SlamCollaborateTool extends EventEmitter {
  constructor() {
    super();
    
    // State
    this.isActive = false;
    this.teamId = null;
    this.userId = null;
    this.connections = new Map();
    
    // Real-time streams
    this.teamUpdates$ = new Subject();
    this.presence$ = new BehaviorSubject(new Map());
    this.conflicts$ = new Subject();
    this.chatMessages$ = new Subject();
    
    // Team data
    this.teamMembers = new Map();
    this.activeFiles = new Map();
    this.sharedTasks = new Map();
    this.chatHistory = [];
    
    // Conflict detection
    this.fileWatchers = new Map();
    this.lockManager = new Map();
    
    // Configuration
    this.config = {
      heartbeatInterval: 5000,
      conflictThreshold: 1000, // ms
      maxChatHistory: 100,
      retryAttempts: 3
    };
  }

  /**
   * Join a team collaboration session
   */
  async joinTeam(teamId, userId = 'default', options = {}) {
    try {
      this.teamId = teamId;
      this.userId = userId;
      
      // Load team data
      const teamData = await this.loadTeamData(teamId);
      
      // Initialize presence
      await this.initializePresence();
      
      // Set up conflict detection
      await this.setupConflictDetection();
      
      // Load shared resources
      await this.loadSharedResources();
      
      // Announce presence
      await this.announcePresence('joined');
      
      this.isActive = true;
      
      return {
        success: true,
        team: {
          id: teamId,
          members: Array.from(this.teamMembers.values()),
          activeFiles: Array.from(this.activeFiles.keys()),
          sharedTasks: Array.from(this.sharedTasks.values())
        },
        message: `Joined team "${teamId}" as ${userId}`
      };
    } catch (error) {
      logger.error('Error joining team:', error);
      throw error;
    }
  }

  /**
   * Leave team collaboration session
   */
  async leaveTeam() {
    try {
      if (!this.isActive) {
        return {
          success: false,
          message: 'Not currently in a team session'
        };
      }
      
      // Announce departure
      await this.announcePresence('left');
      
      // Release file locks
      await this.releaseAllLocks();
      
      // Clean up watchers
      this.cleanupWatchers();
      
      // Reset state
      this.reset();
      
      return {
        success: true,
        message: 'Left team collaboration session'
      };
    } catch (error) {
      logger.error('Error leaving team:', error);
      throw error;
    }
  }

  /**
   * Get team status and activity
   */
  async getTeamStatus() {
    try {
      if (!this.isActive) {
        return {
          success: false,
          message: 'Not currently in a team session'
        };
      }
      
      const presence = this.presence$.value;
      const conflicts = await this.getActiveConflicts();
      const recentActivity = await this.getRecentActivity();
      
      return {
        success: true,
        team: {
          id: this.teamId,
          activeMembers: presence.size,
          members: Array.from(presence.values()),
          conflicts: conflicts.length,
          activeConflicts: conflicts,
          recentActivity,
          lockedFiles: Array.from(this.lockManager.keys()),
          sharedTasks: Array.from(this.sharedTasks.values()).filter(t => t.status !== 'completed')
        }
      };
    } catch (error) {
      logger.error('Error getting team status:', error);
      throw error;
    }
  }

  /**
   * Share current work with team
   */
  async shareWork(options = {}) {
    try {
      if (!this.isActive) {
        return {
          success: false,
          message: 'Not currently in a team session'
        };
      }
      
      const context = await contextEngine.getSnapshot();
      const workItem = {
        id: stateManager.generateId(),
        userId: this.userId,
        type: options.type || 'work-session',
        context: {
          currentFile: context.currentFile,
          branch: context.git?.currentBranch,
          recentActivity: context.recentActivity?.slice(0, 5),
          workflowState: context.workflow
        },
        description: options.description || 'Sharing current work',
        timestamp: Date.now()
      };
      
      // Broadcast to team
      this.teamUpdates$.next({
        type: 'work-shared',
        data: workItem,
        from: this.userId
      });
      
      // Store in team history
      await this.addToTeamActivity(workItem);
      
      return {
        success: true,
        workItem,
        message: 'Work shared with team'
      };
    } catch (error) {
      logger.error('Error sharing work:', error);
      throw error;
    }
  }

  /**
   * Request help from team
   */
  async requestHelp(message, options = {}) {
    try {
      if (!this.isActive) {
        return {
          success: false,
          message: 'Not currently in a team session'
        };
      }
      
      const context = await contextEngine.getSnapshot();
      const helpRequest = {
        id: stateManager.generateId(),
        userId: this.userId,
        type: 'help-request',
        message,
        context: {
          currentFile: context.currentFile,
          branch: context.git?.currentBranch,
          error: options.error,
          urgency: options.urgency || 'medium'
        },
        timestamp: Date.now()
      };
      
      // Broadcast help request
      this.teamUpdates$.next({
        type: 'help-requested',
        data: helpRequest,
        from: this.userId
      });
      
      // Store in team history
      await this.addToTeamActivity(helpRequest);
      
      return {
        success: true,
        helpRequest,
        message: 'Help request sent to team'
      };
    } catch (error) {
      logger.error('Error requesting help:', error);
      throw error;
    }
  }

  /**
   * Offer help to team member
   */
  async offerHelp(targetUserId, message = 'I can help with that') {
    try {
      if (!this.isActive) {
        return {
          success: false,
          message: 'Not currently in a team session'
        };
      }
      
      const helpOffer = {
        id: stateManager.generateId(),
        from: this.userId,
        to: targetUserId,
        type: 'help-offer',
        message,
        timestamp: Date.now()
      };
      
      // Send to specific user
      this.teamUpdates$.next({
        type: 'help-offered',
        data: helpOffer,
        from: this.userId,
        to: targetUserId
      });
      
      return {
        success: true,
        helpOffer,
        message: `Help offered to ${targetUserId}`
      };
    } catch (error) {
      logger.error('Error offering help:', error);
      throw error;
    }
  }

  /**
   * Send chat message to team
   */
  async sendMessage(message, options = {}) {
    try {
      if (!this.isActive) {
        return {
          success: false,
          message: 'Not currently in a team session'
        };
      }
      
      const chatMessage = {
        id: stateManager.generateId(),
        userId: this.userId,
        message,
        type: options.type || 'text',
        mentions: options.mentions || [],
        timestamp: Date.now()
      };
      
      // Add to chat history
      this.chatHistory.push(chatMessage);
      if (this.chatHistory.length > this.config.maxChatHistory) {
        this.chatHistory.shift();
      }
      
      // Broadcast message
      this.chatMessages$.next(chatMessage);
      
      // Store persistently
      await this.saveChatMessage(chatMessage);
      
      return {
        success: true,
        message: 'Message sent to team',
        chatMessage
      };
    } catch (error) {
      logger.error('Error sending message:', error);
      throw error;
    }
  }

  /**
   * Get chat history
   */
  async getChatHistory(limit = 20) {
    try {
      const history = await this.loadChatHistory(limit);
      return {
        success: true,
        messages: history
      };
    } catch (error) {
      logger.error('Error getting chat history:', error);
      throw error;
    }
  }

  /**
   * Lock file for exclusive editing
   */
  async lockFile(filePath, reason = 'editing') {
    try {
      if (!this.isActive) {
        return {
          success: false,
          message: 'Not currently in a team session'
        };
      }
      
      // Check if already locked
      const existingLock = this.lockManager.get(filePath);
      if (existingLock && existingLock.userId !== this.userId) {
        return {
          success: false,
          message: `File is locked by ${existingLock.userId}`,
          lockedBy: existingLock
        };
      }
      
      const lock = {
        filePath,
        userId: this.userId,
        reason,
        timestamp: Date.now(),
        expires: Date.now() + (10 * 60 * 1000) // 10 minutes
      };
      
      this.lockManager.set(filePath, lock);
      
      // Broadcast lock
      this.teamUpdates$.next({
        type: 'file-locked',
        data: lock,
        from: this.userId
      });
      
      return {
        success: true,
        lock,
        message: `File locked: ${filePath}`
      };
    } catch (error) {
      logger.error('Error locking file:', error);
      throw error;
    }
  }

  /**
   * Release file lock
   */
  async unlockFile(filePath) {
    try {
      if (!this.isActive) {
        return {
          success: false,
          message: 'Not currently in a team session'
        };
      }
      
      const lock = this.lockManager.get(filePath);
      if (!lock) {
        return {
          success: false,
          message: 'File is not locked'
        };
      }
      
      if (lock.userId !== this.userId) {
        return {
          success: false,
          message: 'File is locked by another user'
        };
      }
      
      this.lockManager.delete(filePath);
      
      // Broadcast unlock
      this.teamUpdates$.next({
        type: 'file-unlocked',
        data: { filePath, userId: this.userId },
        from: this.userId
      });
      
      return {
        success: true,
        message: `File unlocked: ${filePath}`
      };
    } catch (error) {
      logger.error('Error unlocking file:', error);
      throw error;
    }
  }

  /**
   * Create shared task
   */
  async createSharedTask(task) {
    try {
      if (!this.isActive) {
        return {
          success: false,
          message: 'Not currently in a team session'
        };
      }
      
      const sharedTask = {
        id: stateManager.generateId(),
        title: task.title,
        description: task.description,
        assignee: task.assignee || null,
        priority: task.priority || 'medium',
        status: 'pending',
        createdBy: this.userId,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        comments: [],
        teamId: this.teamId
      };
      
      this.sharedTasks.set(sharedTask.id, sharedTask);
      
      // Broadcast task creation
      this.teamUpdates$.next({
        type: 'task-created',
        data: sharedTask,
        from: this.userId
      });
      
      // Persist task
      await this.saveSharedTask(sharedTask);
      
      return {
        success: true,
        task: sharedTask,
        message: 'Shared task created'
      };
    } catch (error) {
      logger.error('Error creating shared task:', error);
      throw error;
    }
  }

  /**
   * Update shared task
   */
  async updateSharedTask(taskId, updates) {
    try {
      if (!this.isActive) {
        return {
          success: false,
          message: 'Not currently in a team session'
        };
      }
      
      const task = this.sharedTasks.get(taskId);
      if (!task) {
        return {
          success: false,
          message: 'Task not found'
        };
      }
      
      // Apply updates
      Object.assign(task, updates, {
        updatedAt: Date.now(),
        updatedBy: this.userId
      });
      
      this.sharedTasks.set(taskId, task);
      
      // Broadcast update
      this.teamUpdates$.next({
        type: 'task-updated',
        data: { taskId, updates, task },
        from: this.userId
      });
      
      // Persist changes
      await this.saveSharedTask(task);
      
      return {
        success: true,
        task,
        message: 'Shared task updated'
      };
    } catch (error) {
      logger.error('Error updating shared task:', error);
      throw error;
    }
  }

  /**
   * Get shared tasks
   */
  async getSharedTasks(status = null) {
    try {
      let tasks = Array.from(this.sharedTasks.values());
      
      if (status) {
        tasks = tasks.filter(task => task.status === status);
      }
      
      return {
        success: true,
        tasks: tasks.sort((a, b) => b.updatedAt - a.updatedAt)
      };
    } catch (error) {
      logger.error('Error getting shared tasks:', error);
      throw error;
    }
  }

  /**
   * Initialize presence tracking
   */
  async initializePresence() {
    const userInfo = {
      id: this.userId,
      name: this.userId,
      status: 'active',
      currentFile: null,
      lastActivity: Date.now(),
      capabilities: ['edit', 'review', 'chat']
    };
    
    this.teamMembers.set(this.userId, userInfo);
    
    // Update presence periodically
    setInterval(() => {
      this.updatePresence();
    }, this.config.heartbeatInterval);
  }

  /**
   * Update user presence
   */
  async updatePresence() {
    const context = await contextEngine.getSnapshot();
    const userInfo = this.teamMembers.get(this.userId);
    
    if (userInfo) {
      userInfo.currentFile = context.currentFile;
      userInfo.lastActivity = Date.now();
      
      this.teamMembers.set(this.userId, userInfo);
      
      // Broadcast presence update
      this.presence$.next(this.teamMembers);
    }
  }

  /**
   * Announce presence change
   */
  async announcePresence(action) {
    this.teamUpdates$.next({
      type: 'presence-changed',
      data: {
        userId: this.userId,
        action,
        timestamp: Date.now()
      },
      from: this.userId
    });
  }

  /**
   * Setup conflict detection
   */
  async setupConflictDetection() {
    // Monitor file changes
    contextEngine.contextUpdates$
      .pipe(
        filter(update => update.type === 'file' && this.isActive),
        debounceTime(this.config.conflictThreshold)
      )
      .subscribe(update => {
        this.checkForConflicts(update.data.path);
      });
  }

  /**
   * Check for file conflicts
   */
  async checkForConflicts(filePath) {
    const activeUsers = Array.from(this.teamMembers.values())
      .filter(user => user.currentFile === filePath && user.id !== this.userId);
    
    if (activeUsers.length > 0) {
      const conflict = {
        id: stateManager.generateId(),
        filePath,
        users: [this.userId, ...activeUsers.map(u => u.id)],
        type: 'concurrent-editing',
        timestamp: Date.now()
      };
      
      this.conflicts$.next(conflict);
      
      // Notify team
      this.teamUpdates$.next({
        type: 'conflict-detected',
        data: conflict,
        from: this.userId
      });
    }
  }

  /**
   * Get active conflicts
   */
  async getActiveConflicts() {
    // This would typically query a persistent store
    // For now, return empty array
    return [];
  }

  /**
   * Get recent team activity
   */
  async getRecentActivity(hours = 24) {
    const activity = await stateManager.getState(`team_activity_${this.teamId}`) || [];
    const cutoff = Date.now() - (hours * 60 * 60 * 1000);
    
    return activity.filter(item => item.timestamp > cutoff);
  }

  /**
   * Add activity to team history
   */
  async addToTeamActivity(activity) {
    const key = `team_activity_${this.teamId}`;
    const existing = await stateManager.getState(key) || [];
    
    existing.push(activity);
    
    // Keep only last 100 activities
    if (existing.length > 100) {
      existing.splice(0, existing.length - 100);
    }
    
    await stateManager.setState(key, existing);
  }

  /**
   * Load team data
   */
  async loadTeamData(teamId) {
    const teamData = await stateManager.getState(`team_${teamId}`) || {
      id: teamId,
      name: teamId,
      members: [],
      created: Date.now()
    };
    
    return teamData;
  }

  /**
   * Load shared resources
   */
  async loadSharedResources() {
    // Load shared tasks
    const tasks = await stateManager.getState(`team_tasks_${this.teamId}`) || [];
    tasks.forEach(task => {
      this.sharedTasks.set(task.id, task);
    });
    
    // Load chat history
    this.chatHistory = await this.loadChatHistory();
  }

  /**
   * Save shared task
   */
  async saveSharedTask(task) {
    const key = `team_tasks_${this.teamId}`;
    const tasks = await stateManager.getState(key) || [];
    
    const index = tasks.findIndex(t => t.id === task.id);
    if (index >= 0) {
      tasks[index] = task;
    } else {
      tasks.push(task);
    }
    
    await stateManager.setState(key, tasks);
  }

  /**
   * Save chat message
   */
  async saveChatMessage(message) {
    const key = `team_chat_${this.teamId}`;
    const messages = await stateManager.getState(key) || [];
    
    messages.push(message);
    
    // Keep only last 1000 messages
    if (messages.length > 1000) {
      messages.splice(0, messages.length - 1000);
    }
    
    await stateManager.setState(key, messages);
  }

  /**
   * Load chat history
   */
  async loadChatHistory(limit = 20) {
    const key = `team_chat_${this.teamId}`;
    const messages = await stateManager.getState(key) || [];
    
    return messages.slice(-limit);
  }

  /**
   * Release all file locks
   */
  async releaseAllLocks() {
    for (const [filePath, lock] of this.lockManager) {
      if (lock.userId === this.userId) {
        await this.unlockFile(filePath);
      }
    }
  }

  /**
   * Clean up watchers
   */
  cleanupWatchers() {
    this.fileWatchers.clear();
  }

  /**
   * Reset collaboration state
   */
  reset() {
    this.isActive = false;
    this.teamId = null;
    this.userId = null;
    this.teamMembers.clear();
    this.activeFiles.clear();
    this.sharedTasks.clear();
    this.chatHistory = [];
    this.lockManager.clear();
    this.cleanupWatchers();
  }

  /**
   * Format team status for display
   */
  formatTeamStatus(status) {
    const lines = [];
    
    lines.push(chalk.bold.blue('👥 Team Collaboration Status'));
    lines.push('');
    
    lines.push(chalk.white('Team Information:'));
    lines.push(`  ${chalk.gray('•')} Team ID: ${chalk.cyan(status.team.id)}`);
    lines.push(`  ${chalk.gray('•')} Active Members: ${chalk.cyan(status.team.activeMembers)}`);
    lines.push('');
    
    if (status.team.members.length > 0) {
      lines.push(chalk.white('Active Members:'));
      status.team.members.forEach(member => {
        const fileInfo = member.currentFile ? ` (${member.currentFile})` : '';
        lines.push(`  ${chalk.gray('•')} ${chalk.cyan(member.name)}${fileInfo}`);
      });
      lines.push('');
    }
    
    if (status.team.conflicts > 0) {
      lines.push(chalk.yellow('⚠️  Active Conflicts:'));
      status.team.activeConflicts.forEach(conflict => {
        lines.push(`  ${chalk.gray('•')} ${conflict.filePath} (${conflict.users.join(', ')})`);
      });
      lines.push('');
    }
    
    if (status.team.lockedFiles.length > 0) {
      lines.push(chalk.white('🔒 Locked Files:'));
      status.team.lockedFiles.forEach(filePath => {
        lines.push(`  ${chalk.gray('•')} ${filePath}`);
      });
      lines.push('');
    }
    
    if (status.team.sharedTasks.length > 0) {
      lines.push(chalk.white('📋 Active Shared Tasks:'));
      status.team.sharedTasks.slice(0, 5).forEach(task => {
        const assignee = task.assignee ? ` (${task.assignee})` : '';
        lines.push(`  ${chalk.gray('•')} ${task.title}${assignee}`);
      });
      if (status.team.sharedTasks.length > 5) {
        lines.push(`  ${chalk.gray('•')} ...and ${status.team.sharedTasks.length - 5} more`);
      }
    }
    
    return lines.join('\n');
  }

  /**
   * Format chat messages for display
   */
  formatChatMessages(messages) {
    const lines = [];
    
    lines.push(chalk.bold.blue('💬 Team Chat'));
    lines.push('');
    
    messages.forEach(msg => {
      const time = new Date(msg.timestamp).toLocaleTimeString();
      const mentions = msg.mentions.length > 0 ? ` ${chalk.yellow('@' + msg.mentions.join(' @'))}` : '';
      lines.push(`${chalk.gray(time)} ${chalk.cyan(msg.userId)}: ${msg.message}${mentions}`);
    });
    
    return lines.join('\n');
  }
}

// Export singleton instance
const slamCollaborate = new SlamCollaborateTool();

/**
 * Main slam_collaborate function
 */
export async function slam_collaborate(action = 'status', options = {}) {
  switch (action) {
    case 'join':
      if (!options.teamId) {
        throw new Error('Team ID is required for join action');
      }
      const joinResult = await slamCollaborate.joinTeam(options.teamId, options.userId, options);
      joinResult.output = chalk.green(`✓ Joined team "${options.teamId}"`);
      return joinResult;
      
    case 'leave':
      const leaveResult = await slamCollaborate.leaveTeam();
      leaveResult.output = chalk.yellow('👋 Left team collaboration session');
      return leaveResult;
      
    case 'status':
      const statusResult = await slamCollaborate.getTeamStatus();
      if (statusResult.success) {
        statusResult.output = slamCollaborate.formatTeamStatus(statusResult);
      }
      return statusResult;
      
    case 'share':
      const shareResult = await slamCollaborate.shareWork(options);
      shareResult.output = chalk.green('✓ Work shared with team');
      return shareResult;
      
    case 'help':
      if (!options.message) {
        throw new Error('Message is required for help action');
      }
      const helpResult = await slamCollaborate.requestHelp(options.message, options);
      helpResult.output = chalk.green('✓ Help request sent to team');
      return helpResult;
      
    case 'offer':
      if (!options.targetUserId) {
        throw new Error('Target user ID is required for offer action');
      }
      const offerResult = await slamCollaborate.offerHelp(options.targetUserId, options.message);
      offerResult.output = chalk.green(`✓ Help offered to ${options.targetUserId}`);
      return offerResult;
      
    case 'chat':
      if (options.message) {
        const chatResult = await slamCollaborate.sendMessage(options.message, options);
        chatResult.output = chalk.green('✓ Message sent to team');
        return chatResult;
      } else {
        const historyResult = await slamCollaborate.getChatHistory(options.limit);
        if (historyResult.success) {
          historyResult.output = slamCollaborate.formatChatMessages(historyResult.messages);
        }
        return historyResult;
      }
      
    case 'lock':
      if (!options.filePath) {
        throw new Error('File path is required for lock action');
      }
      const lockResult = await slamCollaborate.lockFile(options.filePath, options.reason);
      if (lockResult.success) {
        lockResult.output = chalk.green(`🔒 File locked: ${options.filePath}`);
      } else {
        lockResult.output = chalk.red(`❌ ${lockResult.message}`);
      }
      return lockResult;
      
    case 'unlock':
      if (!options.filePath) {
        throw new Error('File path is required for unlock action');
      }
      const unlockResult = await slamCollaborate.unlockFile(options.filePath);
      unlockResult.output = unlockResult.success 
        ? chalk.green(`🔓 File unlocked: ${options.filePath}`)
        : chalk.red(`❌ ${unlockResult.message}`);
      return unlockResult;
      
    case 'task':
      if (options.task) {
        const taskResult = await slamCollaborate.createSharedTask(options.task);
        taskResult.output = chalk.green('✓ Shared task created');
        return taskResult;
      } else if (options.taskId && options.updates) {
        const updateResult = await slamCollaborate.updateSharedTask(options.taskId, options.updates);
        updateResult.output = chalk.green('✓ Shared task updated');
        return updateResult;
      } else {
        const tasksResult = await slamCollaborate.getSharedTasks(options.status);
        tasksResult.output = tasksResult.tasks.map(task => 
          `${task.title} (${task.status}) - ${task.assignee || 'unassigned'}`
        ).join('\n');
        return tasksResult;
      }
      
    default:
      throw new Error(`Unknown action: ${action}`);
  }
}

export default slamCollaborate;
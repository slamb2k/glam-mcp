import chalk from 'chalk';
import learningSystem from '../learning-system.js';
import stateManager from '../state-manager.js';
import predictiveEngine from '../predictive-engine.js';
import contextEngine from '../context-engine.js';
import logger from '../../utils/logger.js';

/**
 * SLAM Learn - Personalization Tool
 * User-specific customization and learning capabilities
 */
export class SlamLearnTool {
  constructor() {
    this.profileSchema = {
      id: null,
      name: null,
      preferences: {
        theme: 'auto',
        editor: 'vscode',
        language: 'en',
        workingHours: { start: 9, end: 17 },
        shortcuts: {},
        gitDefaults: {
          commitStyle: 'conventional',
          branchPrefix: 'feature/',
          autoRebase: true
        }
      },
      patterns: {
        commands: [],
        workflows: [],
        files: []
      },
      learning: {
        enabled: true,
        privacyMode: 'balanced',
        syncEnabled: true
      },
      statistics: {
        commandsExecuted: 0,
        workflowsCompleted: 0,
        hoursActive: 0,
        lastActive: null
      }
    };
  }

  /**
   * Get or create user profile
   */
  async getProfile(userId = 'default') {
    try {
      // Load existing profile
      let profile = await stateManager.getState(`user_profile_${userId}`);
      
      if (!profile) {
        // Create new profile
        profile = {
          ...this.profileSchema,
          id: userId,
          name: userId,
          createdAt: new Date().toISOString()
        };
        
        await this.saveProfile(profile);
      }
      
      return {
        success: true,
        profile
      };
    } catch (error) {
      logger.error('Error getting user profile:', error);
      throw error;
    }
  }

  /**
   * Update user profile
   */
  async updateProfile(updates, userId = 'default') {
    try {
      const { profile } = await this.getProfile(userId);
      
      // Deep merge updates
      const updated = this.deepMerge(profile, updates);
      updated.lastModified = new Date().toISOString();
      
      await this.saveProfile(updated);
      
      // Apply preferences immediately
      await this.applyPreferences(updated);
      
      return {
        success: true,
        profile: updated,
        message: 'Profile updated successfully'
      };
    } catch (error) {
      logger.error('Error updating profile:', error);
      throw error;
    }
  }

  /**
   * Save profile
   */
  async saveProfile(profile) {
    await stateManager.setState(`user_profile_${profile.id}`, profile);
    
    // Update user preferences in learning system
    if (profile.learning.enabled) {
      learningSystem.setPrivacyMode(profile.learning.privacyMode);
    }
    
    // Log audit
    await stateManager.logAudit({
      action: 'profile_updated',
      resource: 'slam_learn',
      details: { userId: profile.id }
    });
  }

  /**
   * Apply user preferences
   */
  async applyPreferences(profile) {
    const prefs = profile.preferences;
    
    // Update git defaults
    if (prefs.gitDefaults) {
      await stateManager.setState('git_preferences', prefs.gitDefaults);
    }
    
    // Update working hours
    if (prefs.workingHours) {
      contextEngine.setWorkingHours(prefs.workingHours);
    }
    
    // Update shortcuts
    if (prefs.shortcuts && Object.keys(prefs.shortcuts).length > 0) {
      await this.registerShortcuts(prefs.shortcuts);
    }
  }

  /**
   * Get personalized suggestions
   */
  async getSuggestions(input = '', options = {}) {
    try {
      const { profile } = await this.getProfile(options.userId);
      
      // Get base suggestions from predictive engine
      const suggestions = predictiveEngine.predict(input);
      
      // Enhance with personal patterns
      const enhanced = await this.enhanceWithPersonalization(suggestions, profile);
      
      // Apply personal scoring
      const scored = this.applyPersonalScoring(enhanced, profile);
      
      // Sort by score
      scored.sort((a, b) => b.personalScore - a.personalScore);
      
      return {
        success: true,
        suggestions: scored.slice(0, options.limit || 5),
        personalized: true
      };
    } catch (error) {
      logger.error('Error getting personalized suggestions:', error);
      throw error;
    }
  }

  /**
   * Enhance suggestions with personalization
   */
  async enhanceWithPersonalization(suggestions, profile) {
    const enhanced = [...suggestions];
    
    // Add frequently used commands
    if (profile.patterns.commands.length > 0) {
      const topCommands = profile.patterns.commands
        .sort((a, b) => b.count - a.count)
        .slice(0, 3);
      
      topCommands.forEach(cmd => {
        if (!suggestions.some(s => s.value === cmd.value)) {
          enhanced.push({
            type: 'command',
            value: cmd.value,
            confidence: 0.8,
            description: 'Frequently used command',
            metadata: { personal: true, usage: cmd.count }
          });
        }
      });
    }
    
    // Add workflow suggestions based on time
    const hour = new Date().getHours();
    const workingHours = profile.preferences.workingHours;
    
    if (hour >= workingHours.start && hour < workingHours.end) {
      // Working hours suggestions
      if (hour < 10) {
        enhanced.push({
          type: 'workflow',
          value: 'Review yesterday\'s work',
          confidence: 0.7,
          description: 'Morning routine',
          metadata: { personal: true, timeBasedd: true }
        });
      } else if (hour >= workingHours.end - 1) {
        enhanced.push({
          type: 'workflow',
          value: 'Commit and push changes',
          confidence: 0.8,
          description: 'End of day routine',
          metadata: { personal: true, timeBased: true }
        });
      }
    }
    
    return enhanced;
  }

  /**
   * Apply personal scoring
   */
  applyPersonalScoring(suggestions, profile) {
    return suggestions.map(suggestion => {
      let personalScore = suggestion.confidence || 0.5;
      
      // Boost score for matching patterns
      if (suggestion.type === 'command') {
        const pattern = profile.patterns.commands.find(p => p.value === suggestion.value);
        if (pattern) {
          personalScore *= (1 + pattern.count / 100);
        }
      }
      
      // Boost for preferred tools
      if (suggestion.value?.includes(profile.preferences.editor)) {
        personalScore *= 1.2;
      }
      
      // Adjust for working hours
      const hour = new Date().getHours();
      const { start, end } = profile.preferences.workingHours;
      
      if (hour >= start && hour < end) {
        personalScore *= 1.1; // Boost during working hours
      } else {
        personalScore *= 0.9; // Reduce outside working hours
      }
      
      return {
        ...suggestion,
        personalScore: Math.min(personalScore, 1)
      };
    });
  }

  /**
   * Learn from user action
   */
  async learn(action, options = {}) {
    try {
      const { profile } = await this.getProfile(options.userId);
      
      if (!profile.learning.enabled) {
        return {
          success: false,
          message: 'Learning is disabled for this profile'
        };
      }
      
      // Update patterns
      switch (action.type) {
        case 'command':
          await this.updateCommandPattern(profile, action);
          break;
          
        case 'workflow':
          await this.updateWorkflowPattern(profile, action);
          break;
          
        case 'file':
          await this.updateFilePattern(profile, action);
          break;
      }
      
      // Update statistics
      profile.statistics.lastActive = new Date().toISOString();
      
      if (action.type === 'command') {
        profile.statistics.commandsExecuted++;
      } else if (action.type === 'workflow') {
        profile.statistics.workflowsCompleted++;
      }
      
      // Save updated profile
      await this.saveProfile(profile);
      
      // Forward to learning system
      await learningSystem.collectData('user-action', {
        userId: profile.id,
        ...action
      });
      
      return {
        success: true,
        message: 'Learning recorded'
      };
    } catch (error) {
      logger.error('Error learning from action:', error);
      throw error;
    }
  }

  /**
   * Update command pattern
   */
  async updateCommandPattern(profile, action) {
    const existing = profile.patterns.commands.find(p => p.value === action.value);
    
    if (existing) {
      existing.count++;
      existing.lastUsed = Date.now();
    } else {
      profile.patterns.commands.push({
        value: action.value,
        count: 1,
        firstUsed: Date.now(),
        lastUsed: Date.now()
      });
    }
    
    // Keep only top 50 commands
    profile.patterns.commands.sort((a, b) => b.count - a.count);
    profile.patterns.commands = profile.patterns.commands.slice(0, 50);
  }

  /**
   * Update workflow pattern
   */
  async updateWorkflowPattern(profile, action) {
    const existing = profile.patterns.workflows.find(p => p.value === action.value);
    
    if (existing) {
      existing.count++;
      existing.lastUsed = Date.now();
      
      // Update average duration
      if (action.duration) {
        existing.totalDuration = (existing.totalDuration || 0) + action.duration;
        existing.avgDuration = existing.totalDuration / existing.count;
      }
    } else {
      profile.patterns.workflows.push({
        value: action.value,
        count: 1,
        firstUsed: Date.now(),
        lastUsed: Date.now(),
        totalDuration: action.duration || 0,
        avgDuration: action.duration || 0
      });
    }
    
    // Keep only top 20 workflows
    profile.patterns.workflows.sort((a, b) => b.count - a.count);
    profile.patterns.workflows = profile.patterns.workflows.slice(0, 20);
  }

  /**
   * Update file pattern
   */
  async updateFilePattern(profile, action) {
    const existing = profile.patterns.files.find(p => p.value === action.value);
    
    if (existing) {
      existing.count++;
      existing.lastAccessed = Date.now();
    } else {
      profile.patterns.files.push({
        value: action.value,
        count: 1,
        firstAccessed: Date.now(),
        lastAccessed: Date.now()
      });
    }
    
    // Keep only top 30 files
    profile.patterns.files.sort((a, b) => b.count - a.count);
    profile.patterns.files = profile.patterns.files.slice(0, 30);
  }

  /**
   * Get user feedback
   */
  async collectFeedback(feedback, options = {}) {
    try {
      const { profile } = await this.getProfile(options.userId);
      
      // Store feedback
      const feedbackId = stateManager.generateId();
      const feedbackData = {
        id: feedbackId,
        userId: profile.id,
        type: feedback.type || 'general',
        rating: feedback.rating,
        comment: feedback.comment,
        context: feedback.context,
        timestamp: Date.now()
      };
      
      await stateManager.createTask({
        id: feedbackId,
        type: 'user_feedback',
        status: 'completed',
        data: feedbackData
      });
      
      // Process feedback
      if (feedback.type === 'suggestion' && feedback.rating < 3) {
        // Low-rated suggestion, reduce its weight
        const suggestion = feedback.context?.suggestion;
        if (suggestion) {
          await predictiveEngine.learn({
            type: 'feedback',
            value: suggestion.value,
            rating: feedback.rating,
            accepted: false
          });
        }
      }
      
      return {
        success: true,
        message: 'Thank you for your feedback!'
      };
    } catch (error) {
      logger.error('Error collecting feedback:', error);
      throw error;
    }
  }

  /**
   * Sync profile across devices
   */
  async syncProfile(options = {}) {
    try {
      const { profile } = await this.getProfile(options.userId);
      
      if (!profile.learning.syncEnabled) {
        return {
          success: false,
          message: 'Sync is disabled for this profile'
        };
      }
      
      // Export profile data
      const exportData = {
        profile: this.sanitizeProfileForExport(profile),
        timestamp: Date.now(),
        version: '1.0'
      };
      
      // In a real implementation, this would sync to a cloud service
      // For now, we'll save to a sync file
      const syncPath = `.slambed/sync/profile_${profile.id}.json`;
      await stateManager.setState(`sync_${profile.id}`, exportData);
      
      return {
        success: true,
        message: 'Profile synced successfully',
        syncId: stateManager.generateId()
      };
    } catch (error) {
      logger.error('Error syncing profile:', error);
      throw error;
    }
  }

  /**
   * Import profile from sync
   */
  async importProfile(syncData, options = {}) {
    try {
      if (!syncData || !syncData.profile) {
        throw new Error('Invalid sync data');
      }
      
      const profile = syncData.profile;
      profile.lastSynced = Date.now();
      
      await this.saveProfile(profile);
      await this.applyPreferences(profile);
      
      return {
        success: true,
        message: 'Profile imported successfully',
        profile
      };
    } catch (error) {
      logger.error('Error importing profile:', error);
      throw error;
    }
  }

  /**
   * Reset profile
   */
  async resetProfile(options = {}) {
    try {
      const userId = options.userId || 'default';
      
      // Create fresh profile
      const profile = {
        ...this.profileSchema,
        id: userId,
        name: userId,
        createdAt: new Date().toISOString()
      };
      
      await this.saveProfile(profile);
      
      // Reset learning data for this user
      if (options.resetLearning) {
        await predictiveEngine.reset();
      }
      
      return {
        success: true,
        message: 'Profile reset successfully',
        profile
      };
    } catch (error) {
      logger.error('Error resetting profile:', error);
      throw error;
    }
  }

  /**
   * Get insights
   */
  async getInsights(options = {}) {
    try {
      const { profile } = await this.getProfile(options.userId);
      const learningInsights = await learningSystem.getInsights();
      
      // Calculate personal insights
      const insights = {
        usage: {
          totalCommands: profile.statistics.commandsExecuted,
          totalWorkflows: profile.statistics.workflowsCompleted,
          lastActive: profile.statistics.lastActive,
          activeDays: this.calculateActiveDays(profile)
        },
        
        topCommands: profile.patterns.commands
          .sort((a, b) => b.count - a.count)
          .slice(0, 5)
          .map(c => ({
            command: c.value,
            usage: c.count,
            lastUsed: new Date(c.lastUsed).toISOString()
          })),
        
        topWorkflows: profile.patterns.workflows
          .sort((a, b) => b.count - a.count)
          .slice(0, 5)
          .map(w => ({
            workflow: w.value,
            usage: w.count,
            avgDuration: w.avgDuration ? `${Math.round(w.avgDuration / 1000)}s` : 'N/A'
          })),
        
        frequentFiles: profile.patterns.files
          .sort((a, b) => b.count - a.count)
          .slice(0, 5)
          .map(f => ({
            file: f.value,
            accesses: f.count,
            lastAccessed: new Date(f.lastAccessed).toISOString()
          })),
        
        preferences: {
          editor: profile.preferences.editor,
          workingHours: `${profile.preferences.workingHours.start}:00 - ${profile.preferences.workingHours.end}:00`,
          gitStyle: profile.preferences.gitDefaults.commitStyle,
          learningEnabled: profile.learning.enabled,
          privacyMode: profile.learning.privacyMode
        },
        
        systemInsights: learningInsights.insights
      };
      
      return {
        success: true,
        insights
      };
    } catch (error) {
      logger.error('Error getting insights:', error);
      throw error;
    }
  }

  /**
   * Calculate active days
   */
  calculateActiveDays(profile) {
    if (!profile.createdAt) return 0;
    
    const created = new Date(profile.createdAt);
    const now = new Date();
    const days = Math.floor((now - created) / (1000 * 60 * 60 * 24));
    
    return Math.max(1, days);
  }

  /**
   * Sanitize profile for export
   */
  sanitizeProfileForExport(profile) {
    const sanitized = { ...profile };
    
    // Remove sensitive data
    delete sanitized.statistics.lastActive;
    
    // Limit pattern data
    sanitized.patterns.commands = sanitized.patterns.commands.slice(0, 20);
    sanitized.patterns.workflows = sanitized.patterns.workflows.slice(0, 10);
    sanitized.patterns.files = sanitized.patterns.files.slice(0, 10);
    
    return sanitized;
  }

  /**
   * Register shortcuts
   */
  async registerShortcuts(shortcuts) {
    // Store shortcuts for quick access
    await stateManager.setState('user_shortcuts', shortcuts);
    
    logger.info(`Registered ${Object.keys(shortcuts).length} shortcuts`);
  }

  /**
   * Deep merge objects
   */
  deepMerge(target, source) {
    const output = { ...target };
    
    if (this.isObject(target) && this.isObject(source)) {
      Object.keys(source).forEach(key => {
        if (this.isObject(source[key])) {
          if (!(key in target)) {
            Object.assign(output, { [key]: source[key] });
          } else {
            output[key] = this.deepMerge(target[key], source[key]);
          }
        } else {
          Object.assign(output, { [key]: source[key] });
        }
      });
    }
    
    return output;
  }

  /**
   * Check if value is object
   */
  isObject(item) {
    return item && typeof item === 'object' && !Array.isArray(item);
  }

  /**
   * Format profile for display
   */
  formatProfile(profile) {
    const lines = [];
    
    lines.push(chalk.bold.blue('👤 User Profile'));
    lines.push('');
    
    lines.push(chalk.white('Basic Information:'));
    lines.push(`  ${chalk.gray('•')} ID: ${chalk.cyan(profile.id)}`);
    lines.push(`  ${chalk.gray('•')} Name: ${chalk.cyan(profile.name)}`);
    lines.push(`  ${chalk.gray('•')} Created: ${chalk.cyan(new Date(profile.createdAt).toLocaleDateString())}`);
    lines.push('');
    
    lines.push(chalk.white('Preferences:'));
    lines.push(`  ${chalk.gray('•')} Editor: ${chalk.cyan(profile.preferences.editor)}`);
    lines.push(`  ${chalk.gray('•')} Theme: ${chalk.cyan(profile.preferences.theme)}`);
    lines.push(`  ${chalk.gray('•')} Working Hours: ${chalk.cyan(`${profile.preferences.workingHours.start}:00 - ${profile.preferences.workingHours.end}:00`)}`);
    lines.push(`  ${chalk.gray('•')} Git Style: ${chalk.cyan(profile.preferences.gitDefaults.commitStyle)}`);
    lines.push('');
    
    lines.push(chalk.white('Learning:'));
    lines.push(`  ${chalk.gray('•')} Enabled: ${profile.learning.enabled ? chalk.green('Yes') : chalk.red('No')}`);
    lines.push(`  ${chalk.gray('•')} Privacy: ${chalk.cyan(profile.learning.privacyMode)}`);
    lines.push(`  ${chalk.gray('•')} Sync: ${profile.learning.syncEnabled ? chalk.green('Enabled') : chalk.red('Disabled')}`);
    lines.push('');
    
    lines.push(chalk.white('Statistics:'));
    lines.push(`  ${chalk.gray('•')} Commands: ${chalk.cyan(profile.statistics.commandsExecuted)}`);
    lines.push(`  ${chalk.gray('•')} Workflows: ${chalk.cyan(profile.statistics.workflowsCompleted)}`);
    if (profile.statistics.lastActive) {
      lines.push(`  ${chalk.gray('•')} Last Active: ${chalk.cyan(new Date(profile.statistics.lastActive).toLocaleString())}`);
    }
    
    return lines.join('\n');
  }

  /**
   * Format insights for display
   */
  formatInsights(insights) {
    const lines = [];
    
    lines.push(chalk.bold.blue('📊 Personal Insights'));
    lines.push('');
    
    // Usage stats
    lines.push(chalk.white('Usage Statistics:'));
    lines.push(`  ${chalk.gray('•')} Total Commands: ${chalk.cyan(insights.usage.totalCommands)}`);
    lines.push(`  ${chalk.gray('•')} Total Workflows: ${chalk.cyan(insights.usage.totalWorkflows)}`);
    lines.push(`  ${chalk.gray('•')} Active Days: ${chalk.cyan(insights.usage.activeDays)}`);
    lines.push('');
    
    // Top commands
    if (insights.topCommands.length > 0) {
      lines.push(chalk.white('Top Commands:'));
      insights.topCommands.forEach((cmd, i) => {
        lines.push(`  ${chalk.cyan(`${i + 1}.`)} ${cmd.command} (${cmd.usage} times)`);
      });
      lines.push('');
    }
    
    // Top workflows
    if (insights.topWorkflows.length > 0) {
      lines.push(chalk.white('Top Workflows:'));
      insights.topWorkflows.forEach((wf, i) => {
        lines.push(`  ${chalk.cyan(`${i + 1}.`)} ${wf.workflow} (${wf.usage} times, avg: ${wf.avgDuration})`);
      });
      lines.push('');
    }
    
    // Frequent files
    if (insights.frequentFiles.length > 0) {
      lines.push(chalk.white('Frequently Accessed Files:'));
      insights.frequentFiles.forEach((file, i) => {
        lines.push(`  ${chalk.cyan(`${i + 1}.`)} ${file.file} (${file.accesses} times)`);
      });
    }
    
    return lines.join('\n');
  }
}

// Export singleton instance
const slamLearn = new SlamLearnTool();

/**
 * Main slam_learn function
 */
export async function slam_learn(action = 'profile', options = {}) {
  switch (action) {
    case 'profile':
      const { profile } = await slamLearn.getProfile(options.userId);
      return {
        success: true,
        profile,
        output: slamLearn.formatProfile(profile)
      };
      
    case 'update':
      const updateResult = await slamLearn.updateProfile(options.updates, options.userId);
      updateResult.output = chalk.green('✓ Profile updated successfully');
      return updateResult;
      
    case 'suggest':
      const suggestions = await slamLearn.getSuggestions(options.input, options);
      suggestions.output = suggestions.suggestions.map((s, i) => 
        `${i + 1}. ${s.value} (${Math.round(s.personalScore * 100)}%)`
      ).join('\n');
      return suggestions;
      
    case 'learn':
      const learnResult = await slamLearn.learn(options.action, options);
      learnResult.output = chalk.green('✓ Learning recorded');
      return learnResult;
      
    case 'feedback':
      const feedbackResult = await slamLearn.collectFeedback(options.feedback, options);
      feedbackResult.output = chalk.green('✓ Feedback received');
      return feedbackResult;
      
    case 'insights':
      const insightsResult = await slamLearn.getInsights(options);
      insightsResult.output = slamLearn.formatInsights(insightsResult.insights);
      return insightsResult;
      
    case 'sync':
      const syncResult = await slamLearn.syncProfile(options);
      syncResult.output = chalk.green('✓ Profile synced');
      return syncResult;
      
    case 'reset':
      const resetResult = await slamLearn.resetProfile(options);
      resetResult.output = chalk.yellow('⚠️  Profile reset to defaults');
      return resetResult;
      
    default:
      throw new Error(`Unknown action: ${action}`);
  }
}

export default slamLearn;
/**
 * Git Helpers MCP Integration
 * Bridges existing git-helpers with new MCP architecture
 */

import * as gitHelpers from './git-helpers.js';
import simpleGit from 'simple-git';
import contextEngine from '../mcp/context-engine.js';
import stateManager from '../mcp/state-manager.js';
import logger from './logger.js';

/**
 * Enhanced Git Helper with MCP integration
 */
export class GitHelpersMCP {
  constructor() {
    this.git = simpleGit();
    this.legacyHelpers = gitHelpers;
  }

  /**
   * Check if current directory is a git repository
   * Integrates with Context Engine for caching
   */
  async isGitRepository() {
    const cached = contextEngine.query('git.isRepository');
    if (cached !== null) return cached;
    
    const result = this.legacyHelpers.isGitRepository();
    contextEngine.data.update('git.isRepository', result);
    
    return result;
  }

  /**
   * Get main branch with Context Engine integration
   */
  async getMainBranch() {
    try {
      // Check context first
      const contextMain = contextEngine.query('git.mainBranch');
      if (contextMain) return contextMain;
      
      // Use legacy helper
      const mainBranch = this.legacyHelpers.getMainBranch();
      
      // Update context
      contextEngine.data.update('git.mainBranch', mainBranch);
      
      return mainBranch;
    } catch (error) {
      logger.error('Error getting main branch:', error);
      return 'main';
    }
  }

  /**
   * Get current branch with Context Engine sync
   */
  async getCurrentBranch() {
    try {
      // Get from context engine (always up to date)
      const contextBranch = contextEngine.query('git.currentBranch');
      if (contextBranch) return contextBranch;
      
      // Fallback to legacy
      const branch = this.legacyHelpers.getCurrentBranch();
      
      // Update context
      await contextEngine.updateGitContext();
      
      return branch;
    } catch (error) {
      logger.error('Error getting current branch:', error);
      return '';
    }
  }

  /**
   * Check uncommitted changes with inference
   */
  async hasUncommittedChanges() {
    try {
      // Get from inference engine
      const inference = await contextEngine.getInferredContext();
      return inference.projectState.hasUncommittedChanges;
    } catch (error) {
      // Fallback to legacy
      return this.legacyHelpers.hasUncommittedChanges();
    }
  }

  /**
   * Enhanced branch exists check with caching
   */
  async branchExists(branchName) {
    const cacheKey = `branch-exists-${branchName}`;
    const cached = contextEngine.data.getCached(cacheKey, () => null);
    
    if (cached !== null) return cached;
    
    const exists = this.legacyHelpers.branchExists(branchName);
    contextEngine.data.cache.set(cacheKey, exists);
    
    return exists;
  }

  /**
   * Get changed files with detailed info
   */
  async getChangedFiles() {
    try {
      // Use simple-git for richer data
      const status = await this.git.status();
      
      // Track activity
      contextEngine.trackUserActivity({
        type: 'git_status_check',
        filesChanged: status.files.length
      });
      
      return status.files.map(file => ({
        path: file.path,
        status: file.working_dir + file.index,
        index: file.index,
        workingDir: file.working_dir
      }));
    } catch (error) {
      // Fallback to legacy
      return this.legacyHelpers.getChangedFiles();
    }
  }

  /**
   * Generate branch name with context awareness
   */
  async generateBranchName(message, prefix = null) {
    try {
      // Infer prefix from context if not provided
      if (!prefix) {
        const inference = await contextEngine.getInferredContext();
        
        if (inference.workflow.featureDevelopment) {
          prefix = 'feature/';
        } else if (inference.workflow.bugFixing) {
          prefix = 'fix/';
        } else if (inference.workflow.documentation) {
          prefix = 'docs/';
        } else {
          prefix = 'feature/';
        }
      }
      
      // Generate name
      const branchName = this.legacyHelpers.generateBranchName(message, prefix);
      
      // Log to audit
      await stateManager.logAudit({
        action: 'branch_name_generated',
        resource: 'git',
        details: { message, prefix, branchName }
      });
      
      return branchName;
    } catch (error) {
      return this.legacyHelpers.generateBranchName(message, prefix);
    }
  }

  /**
   * Execute git command with tracking
   */
  async execGitCommand(command, options = {}) {
    const startTime = Date.now();
    
    try {
      // Track command execution
      contextEngine.trackUserActivity({
        type: 'git_command',
        command,
        timestamp: new Date().toISOString()
      });
      
      // Execute command
      const result = this.legacyHelpers.execGitCommand(command, options);
      
      // Log successful execution
      const duration = Date.now() - startTime;
      logger.info(`Git command completed: ${command} (${duration}ms)`);
      
      // Update git context if command might have changed state
      const stateChangingCommands = ['commit', 'checkout', 'merge', 'rebase', 'push', 'pull'];
      if (stateChangingCommands.some(cmd => command.includes(cmd))) {
        await contextEngine.updateGitContext();
      }
      
      return result;
    } catch (error) {
      // Log error
      logger.error(`Git command failed: ${command}`, error);
      
      // Log to audit
      await stateManager.logAudit({
        action: 'git_command_failed',
        resource: 'git',
        details: { command, error: error.message }
      });
      
      throw error;
    }
  }

  /**
   * Get recent commits with enhanced data
   */
  async getRecentCommits(count = 10) {
    try {
      // Use simple-git for richer commit data
      const log = await this.git.log({ n: count });
      
      return log.all.map(commit => ({
        hash: commit.hash,
        message: commit.message,
        author: commit.author_name,
        email: commit.author_email,
        date: commit.date,
        body: commit.body
      }));
    } catch (error) {
      // Fallback to legacy
      return this.legacyHelpers.getRecentCommits(count);
    }
  }

  /**
   * Enhanced branch divergence with recommendations
   */
  async getBranchDivergence(targetBranch = null) {
    try {
      const target = targetBranch || await this.getMainBranch();
      const divergence = this.legacyHelpers.getBranchDivergence(target);
      
      // Get recommendations from inference engine
      const inference = await contextEngine.getInferredContext();
      const recommendations = [];
      
      if (divergence.behind > 0) {
        recommendations.push({
          type: 'sync',
          priority: divergence.behind > 10 ? 'high' : 'medium',
          message: `Branch is ${divergence.behind} commits behind ${target}. Consider rebasing.`,
          action: 'rebase'
        });
      }
      
      if (divergence.ahead > 20) {
        recommendations.push({
          type: 'branch_management',
          priority: 'medium',
          message: 'Branch has many commits. Consider creating a pull request soon.',
          action: 'create_pr'
        });
      }
      
      return {
        ...divergence,
        target,
        recommendations
      };
    } catch (error) {
      return this.legacyHelpers.getBranchDivergence(targetBranch);
    }
  }

  /**
   * Safe rebase with state tracking
   */
  async safeRebase(targetBranch = null) {
    const rebaseId = stateManager.generateId();
    
    try {
      // Create task for tracking
      await stateManager.createTask({
        id: rebaseId,
        type: 'git_rebase',
        status: 'in-progress',
        data: { targetBranch }
      });
      
      // Perform rebase
      const result = this.legacyHelpers.safeRebase(targetBranch);
      
      // Update task
      await stateManager.updateTask(rebaseId, {
        status: result.success ? 'completed' : 'failed',
        data: { result }
      });
      
      // Update git context
      if (result.success) {
        await contextEngine.updateGitContext();
      }
      
      // Track activity
      contextEngine.trackUserActivity({
        type: 'git_rebase',
        success: result.success,
        hadConflicts: result.hadConflicts
      });
      
      return result;
    } catch (error) {
      await stateManager.updateTask(rebaseId, {
        status: 'failed',
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Ensure main branch is updated with progress tracking
   */
  async ensureMainUpdated(targetBranch = null) {
    try {
      const result = this.legacyHelpers.ensureMainUpdated(targetBranch);
      
      // Log significant events
      if (result.updateSucceeded) {
        logger.info(`Successfully updated ${targetBranch || 'main'} branch`);
        
        await stateManager.logAudit({
          action: 'branch_updated',
          resource: 'git',
          details: { 
            branch: targetBranch || 'main',
            commitsBehind: result.divergence.behind
          }
        });
      }
      
      if (result.networkError) {
        logger.warn('Network error while fetching from remote');
      }
      
      return result;
    } catch (error) {
      logger.error('Error ensuring main updated:', error);
      throw error;
    }
  }

  /**
   * Get comprehensive git status
   */
  async getComprehensiveStatus() {
    try {
      const [
        status,
        branches,
        remotes,
        stashes,
        tags
      ] = await Promise.all([
        this.git.status(),
        this.git.branchLocal(),
        this.git.getRemotes(true),
        this.git.stashList(),
        this.git.tags()
      ]);
      
      const currentBranch = status.current;
      const mainBranch = await this.getMainBranch();
      const divergence = await this.getBranchDivergence(mainBranch);
      
      return {
        current: currentBranch,
        mainBranch,
        status: {
          clean: status.isClean(),
          files: status.files,
          ahead: status.ahead,
          behind: status.behind,
          tracking: status.tracking
        },
        branches: branches.all,
        remotes,
        stashes: stashes.all || [],
        tags: tags.all || [],
        divergence,
        recommendations: divergence.recommendations || []
      };
    } catch (error) {
      logger.error('Error getting comprehensive status:', error);
      throw error;
    }
  }

  /**
   * Compatibility wrapper for legacy functions
   */
  wrapLegacyFunction(functionName) {
    const legacyFn = this.legacyHelpers[functionName];
    
    if (!legacyFn) {
      throw new Error(`Legacy function ${functionName} not found`);
    }
    
    return async (...args) => {
      try {
        // Track function call
        contextEngine.trackUserActivity({
          type: 'legacy_git_helper',
          function: functionName,
          args: args.length
        });
        
        // Call legacy function
        const result = legacyFn.apply(this.legacyHelpers, args);
        
        // Update context if needed
        const contextUpdatingFunctions = [
          'execGitCommand',
          'safeRebase',
          'forceRebaseOnMain'
        ];
        
        if (contextUpdatingFunctions.includes(functionName)) {
          await contextEngine.updateGitContext();
        }
        
        return result;
      } catch (error) {
        logger.error(`Legacy function ${functionName} failed:`, error);
        throw error;
      }
    };
  }

  /**
   * Get all available git helpers
   */
  getAvailableHelpers() {
    const mcpHelpers = Object.getOwnPropertyNames(Object.getPrototypeOf(this))
      .filter(name => name !== 'constructor' && typeof this[name] === 'function');
    
    const legacyHelpers = Object.keys(this.legacyHelpers)
      .filter(key => typeof this.legacyHelpers[key] === 'function');
    
    return {
      mcp: mcpHelpers,
      legacy: legacyHelpers,
      all: [...new Set([...mcpHelpers, ...legacyHelpers])]
    };
  }
}

// Create singleton instance
const gitHelpersMCP = new GitHelpersMCP();

// Export enhanced functions
export const {
  isGitRepository,
  getMainBranch,
  getCurrentBranch,
  hasUncommittedChanges,
  branchExists,
  getChangedFiles,
  generateBranchName,
  execGitCommand,
  getRecentCommits,
  getBranchDivergence,
  safeRebase,
  ensureMainUpdated
} = Object.fromEntries(
  Object.getOwnPropertyNames(Object.getPrototypeOf(gitHelpersMCP))
    .filter(name => name !== 'constructor' && typeof gitHelpersMCP[name] === 'function')
    .map(name => [name, gitHelpersMCP[name].bind(gitHelpersMCP)])
);

// Export legacy functions for backward compatibility
export * from './git-helpers.js';

// Export the enhanced class
export default gitHelpersMCP;
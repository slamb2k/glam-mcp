/**
 * Team Activity Enhancer
 * Adds team collaboration context to responses
 */

import { BaseEnhancer, EnhancerPriority } from '../base-enhancer.js';
import { execSync } from 'child_process';

/**
 * Enhancer that adds team activity information
 */
export class TeamActivityEnhancer extends BaseEnhancer {
  constructor(options = {}) {
    super({
      name: 'TeamActivityEnhancer',
      priority: EnhancerPriority.LOW,
      description: 'Adds team collaboration context to responses',
      version: '1.0.0',
      tags: ['team', 'collaboration', 'activity'],
      dependencies: ['MetadataEnhancer'],
      config: {
        includeRecentCommits: options.includeRecentCommits !== false,
        includeActiveBranches: options.includeActiveBranches !== false,
        includeContributors: options.includeContributors !== false,
        maxRecentItems: options.maxRecentItems || 5,
        cacheTimeout: options.cacheTimeout || 300000, // 5 minutes
        ...options
      }
    });

    this.cache = new Map();
  }

  /**
   * Enhance response with team activity
   * @param {EnhancedResponse} response - The response to enhance
   * @param {Object} context - Additional context
   * @returns {Promise<EnhancedResponse>} - Enhanced response
   * @protected
   */
  async _doEnhance(response, context) {
    // Only enhance git-related operations or when explicitly requested
    if (!context.operation?.startsWith('git.') && !context.includeTeamActivity) {
      return response;
    }

    const teamActivity = {
      timestamp: new Date().toISOString(),
      recentActivity: {},
      relevantActivity: {}
    };

    try {
      // Get recent commits
      if (this.config.includeRecentCommits) {
        teamActivity.recentActivity.commits = await this._getRecentCommits();
      }

      // Get active branches
      if (this.config.includeActiveBranches) {
        teamActivity.recentActivity.branches = await this._getActiveBranches();
      }

      // Get contributors
      if (this.config.includeContributors) {
        teamActivity.contributors = await this._getRecentContributors();
      }

      // Get relevant activity based on context
      teamActivity.relevantActivity = await this._getRelevantActivity(response, context);

      // Add team activity to response
      response.setTeamActivity(teamActivity);

      // Add collaboration suggestions if needed
      this._addCollaborationContext(response, teamActivity, context);

    } catch (error) {
      // Don't fail the enhancement if team data can't be retrieved
      response.addMetadata('teamActivity.error', error.message);
    }

    return response;
  }

  /**
   * Get recent commits from the repository
   * @returns {Promise<Array>} - Recent commits
   * @private
   */
  async _getRecentCommits() {
    const cacheKey = 'recentCommits';
    const cached = this._getCached(cacheKey);
    if (cached) return cached;

    try {
      const output = execSync(
        `git log --pretty=format:'%h|%an|%ae|%s|%ar' -n ${this.config.maxRecentItems}`,
        { encoding: 'utf8', stdio: 'pipe' }
      );

      const commits = output.trim().split('\n').map(line => {
        const [hash, author, email, message, relativeTime] = line.split('|');
        return { hash, author, email, message, relativeTime };
      });

      this._setCache(cacheKey, commits);
      return commits;
    } catch (error) {
      return [];
    }
  }

  /**
   * Get active branches with recent activity
   * @returns {Promise<Array>} - Active branches
   * @private
   */
  async _getActiveBranches() {
    const cacheKey = 'activeBranches';
    const cached = this._getCached(cacheKey);
    if (cached) return cached;

    try {
      // Get branches sorted by recent commit
      const output = execSync(
        'git for-each-ref --sort=-committerdate --format=\'%(refname:short)|%(committerdate:relative)|%(authorname)\' refs/heads/',
        { encoding: 'utf8', stdio: 'pipe' }
      );

      const branches = output.trim().split('\n')
        .slice(0, this.config.maxRecentItems)
        .map(line => {
          const [branch, lastActivity, lastAuthor] = line.split('|');
          return { branch, lastActivity, lastAuthor };
        });

      this._setCache(cacheKey, branches);
      return branches;
    } catch (error) {
      return [];
    }
  }

  /**
   * Get recent contributors
   * @returns {Promise<Array>} - Recent contributors
   * @private
   */
  async _getRecentContributors() {
    const cacheKey = 'recentContributors';
    const cached = this._getCached(cacheKey);
    if (cached) return cached;

    try {
      // Get contributors from the last 30 days
      const output = execSync(
        'git log --since="30 days ago" --pretty=format:"%an|%ae" | sort | uniq -c | sort -rn',
        { encoding: 'utf8', stdio: 'pipe' }
      );

      const contributors = output.trim().split('\n')
        .slice(0, this.config.maxRecentItems)
        .map(line => {
          const match = line.match(/\s*(\d+)\s+(.+)\|(.+)/);
          if (match) {
            return {
              name: match[2],
              email: match[3],
              commitCount: parseInt(match[1])
            };
          }
          return null;
        })
        .filter(Boolean);

      this._setCache(cacheKey, contributors);
      return contributors;
    } catch (error) {
      return [];
    }
  }

  /**
   * Get activity relevant to the current operation
   * @param {EnhancedResponse} response - The response
   * @param {Object} context - Context
   * @returns {Promise<Object>} - Relevant activity
   * @private
   */
  async _getRelevantActivity(response, context) {
    const relevant = {};

    // Get branch-specific activity
    if (context.branch || response.data?.branch) {
      const branch = context.branch || response.data.branch;
      relevant.branchActivity = await this._getBranchActivity(branch);
    }

    // Get file-specific activity
    if (context.files && context.files.length > 0) {
      relevant.fileActivity = await this._getFileActivity(context.files);
    }

    // Check for potential conflicts with other team members
    if (context.operation === 'git.commit' || context.operation === 'git.push') {
      relevant.potentialConflicts = await this._checkPotentialConflicts(context);
    }

    return relevant;
  }

  /**
   * Get activity for a specific branch
   * @param {string} branch - Branch name
   * @returns {Promise<Object>} - Branch activity
   * @private
   */
  async _getBranchActivity(branch) {
    try {
      // Get last commit on branch
      const lastCommit = execSync(
        `git log -1 --pretty=format:'%h|%an|%ar|%s' ${branch}`,
        { encoding: 'utf8', stdio: 'pipe' }
      ).trim();

      const [hash, author, time, message] = lastCommit.split('|');

      // Check if branch has upstream
      let upstream = null;
      try {
        upstream = execSync(`git rev-parse --abbrev-ref ${branch}@{upstream}`, 
          { encoding: 'utf8', stdio: 'pipe' }
        ).trim();
      } catch (e) {
        // No upstream
      }

      return {
        lastCommit: { hash, author, time, message },
        hasUpstream: !!upstream,
        upstream
      };
    } catch (error) {
      return null;
    }
  }

  /**
   * Get activity for specific files
   * @param {Array} files - File paths
   * @returns {Promise<Object>} - File activity
   * @private
   */
  async _getFileActivity(files) {
    const fileActivity = {};

    for (const file of files.slice(0, 3)) { // Limit to first 3 files
      try {
        const lastModified = execSync(
          `git log -1 --pretty=format:'%an|%ar' -- "${file.path || file}"`,
          { encoding: 'utf8', stdio: 'pipe' }
        ).trim();

        if (lastModified) {
          const [author, time] = lastModified.split('|');
          fileActivity[file.path || file] = { lastModifiedBy: author, lastModifiedTime: time };
        }
      } catch (error) {
        // File might be new
      }
    }

    return fileActivity;
  }

  /**
   * Check for potential conflicts with team members
   * @param {Object} context - Context
   * @returns {Promise<Array>} - Potential conflicts
   * @private
   */
  async _checkPotentialConflicts(context) {
    const conflicts = [];

    try {
      // Check if remote has newer commits
      execSync('git fetch --dry-run', { stdio: 'pipe' });
      
      const behind = execSync('git rev-list HEAD..@{upstream} --count', 
        { encoding: 'utf8', stdio: 'pipe' }
      ).trim();

      if (parseInt(behind) > 0) {
        conflicts.push({
          type: 'behind-remote',
          description: `Local branch is ${behind} commits behind remote`,
          severity: 'medium'
        });
      }

      // Check for other people working on same files
      if (context.files) {
        for (const file of context.files) {
          const recentAuthors = await this._getRecentFileAuthors(file.path || file);
          if (recentAuthors.length > 1) {
            conflicts.push({
              type: 'concurrent-edit',
              file: file.path || file,
              authors: recentAuthors,
              severity: 'low'
            });
          }
        }
      }
    } catch (error) {
      // Ignore errors in conflict detection
    }

    return conflicts;
  }

  /**
   * Get recent authors of a file
   * @param {string} filePath - File path
   * @returns {Promise<Array>} - Recent authors
   * @private
   */
  async _getRecentFileAuthors(filePath) {
    try {
      const output = execSync(
        `git log --since="7 days ago" --pretty=format:"%an" -- "${filePath}" | sort | uniq`,
        { encoding: 'utf8', stdio: 'pipe' }
      );

      return output.trim().split('\n').filter(Boolean);
    } catch (error) {
      return [];
    }
  }

  /**
   * Add collaboration context to response
   * @param {EnhancedResponse} response - The response
   * @param {Object} teamActivity - Team activity data
   * @param {Object} context - Context
   * @private
   */
  _addCollaborationContext(response, teamActivity, context) {
    // Add suggestions based on team activity
    if (teamActivity.relevantActivity?.potentialConflicts?.length > 0) {
      response.addSuggestion(
        'sync-with-team',
        'Synchronize with team changes before proceeding',
        'high'
      );
    }

    // Add risk if multiple people editing same files
    const concurrentEdits = teamActivity.relevantActivity?.potentialConflicts?.filter(
      c => c.type === 'concurrent-edit'
    );

    if (concurrentEdits?.length > 0) {
      response.addRisk(
        'medium',
        `Multiple team members editing same files`,
        'Coordinate with team members to avoid conflicts'
      );
    }
  }

  /**
   * Get cached data
   * @param {string} key - Cache key
   * @returns {*} - Cached data or null
   * @private
   */
  _getCached(key) {
    const cached = this.cache.get(key);
    if (cached && Date.now() - cached.timestamp < this.config.cacheTimeout) {
      return cached.data;
    }
    return null;
  }

  /**
   * Set cache data
   * @param {string} key - Cache key
   * @param {*} data - Data to cache
   * @private
   */
  _setCache(key, data) {
    this.cache.set(key, {
      data,
      timestamp: Date.now()
    });
  }
}
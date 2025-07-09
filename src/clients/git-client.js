/**
 * Git Client for Repository Operations
 * Provides abstraction over Git commands for team awareness features
 */

import { execGitCommand, getCurrentBranch, getMainBranch } from '../utils/git-helpers.js';

export class GitClient {
  constructor() {
    this.cache = new Map();
    this.cacheTimeout = 5 * 60 * 1000; // 5 minutes
  }

  /**
   * Get recent commits from the repository
   */
  async getRecentCommits({ since, limit = 100 }) {
    const cacheKey = `commits:${since}:${limit}`;
    const cached = this.getFromCache(cacheKey);
    if (cached) return cached;

    try {
      const format = '%H|%an|%ae|%at|%s';
      const result = await execGitCommand([
        'log',
        '--all',
        `--since="${since}"`,
        `--format=${format}`,
        `--max-count=${limit}`
      ]);

      const commits = result.trim().split('\n').filter(Boolean).map(line => {
        const [sha, authorName, authorEmail, timestamp, message] = line.split('|');
        return {
          sha,
          author: authorEmail,
          authorName,
          message,
          timestamp: new Date(parseInt(timestamp) * 1000).toISOString(),
          files: []
        };
      });

      // Get changed files for each commit
      for (const commit of commits) {
        const filesResult = await execGitCommand([
          'diff-tree',
          '--no-commit-id',
          '--name-only',
          '-r',
          commit.sha
        ]);
        commit.files = filesResult.trim().split('\n').filter(Boolean);
      }

      this.setCache(cacheKey, commits);
      return commits;
    } catch (error) {
      console.error('Failed to get recent commits:', error);
      return [];
    }
  }

  /**
   * Get active branches with their last activity
   */
  async getActiveBranches() {
    const cacheKey = 'active-branches';
    const cached = this.getFromCache(cacheKey);
    if (cached) return cached;

    try {
      // Get all branches with their last commit info
      const format = '%(refname:short)|%(authorname)|%(authoremail)|%(committerdate:iso8601)';
      const result = await execGitCommand([
        'for-each-ref',
        '--sort=-committerdate',
        `--format=${format}`,
        'refs/heads/'
      ]);

      const branches = result.trim().split('\n').filter(Boolean).map(line => {
        const [name, authorName, authorEmail, lastActivity] = line.split('|');
        return {
          name,
          author: authorEmail,
          authorName,
          lastActivity
        };
      });

      // Filter out old branches (inactive for more than 90 days)
      const ninetyDaysAgo = Date.now() - (90 * 24 * 60 * 60 * 1000);
      const activeBranches = branches.filter(branch => 
        new Date(branch.lastActivity).getTime() > ninetyDaysAgo
      );

      this.setCache(cacheKey, activeBranches);
      return activeBranches;
    } catch (error) {
      console.error('Failed to get active branches:', error);
      return [];
    }
  }

  /**
   * Get file history with commit information
   */
  async getFileHistory(file, options = {}) {
    const { limit = 20 } = options;
    const cacheKey = `file-history:${file}:${limit}`;
    const cached = this.getFromCache(cacheKey);
    if (cached) return cached;

    try {
      const format = '%H|%an|%ae|%at|%s';
      const result = await execGitCommand([
        'log',
        `--format=${format}`,
        `--max-count=${limit}`,
        '--',
        file
      ]);

      const commits = result.trim().split('\n').filter(Boolean).map(line => {
        const [sha, authorName, authorEmail, timestamp, message] = line.split('|');
        return {
          sha,
          author: authorEmail,
          authorName,
          message,
          timestamp: new Date(parseInt(timestamp) * 1000).toISOString()
        };
      });

      const history = {
        file,
        commits
      };

      this.setCache(cacheKey, history);
      return history;
    } catch (error) {
      console.error(`Failed to get history for ${file}:`, error);
      return { file, commits: [] };
    }
  }

  /**
   * Get modified files in current branch compared to main
   */
  async getModifiedFiles() {
    try {
      const mainBranch = await getMainBranch();
      const currentBranch = await getCurrentBranch();

      if (currentBranch === mainBranch) {
        // If on main branch, get uncommitted changes
        const result = await execGitCommand(['diff', '--name-only']);
        return result.trim().split('\n').filter(Boolean);
      }

      // Get files modified between current branch and main
      const result = await execGitCommand([
        'diff',
        '--name-only',
        `${mainBranch}...HEAD`
      ]);

      return result.trim().split('\n').filter(Boolean);
    } catch (error) {
      console.error('Failed to get modified files:', error);
      return [];
    }
  }

  /**
   * Check for potentially conflicting files
   */
  async getConflictingFiles(files) {
    try {
      const mainBranch = await getMainBranch();
      const conflicts = [];

      // Get all branches except current
      const currentBranch = await getCurrentBranch();
      const branchesResult = await execGitCommand(['branch', '-r', '--format=%(refname:short)']);
      const branches = branchesResult.trim().split('\n')
        .filter(Boolean)
        .filter(b => !b.includes(currentBranch) && !b.includes('HEAD'));

      // Check each file against other branches
      for (const file of files) {
        const conflictingBranches = [];

        for (const branch of branches) {
          try {
            // Check if file is modified in the branch
            const diffResult = await execGitCommand([
              'diff',
              '--name-only',
              `${mainBranch}...${branch}`,
              '--',
              file
            ]);

            if (diffResult.trim()) {
              // Get the last modifier of the file in that branch
              const logResult = await execGitCommand([
                'log',
                '-1',
                '--format=%ae',
                branch,
                '--',
                file
              ]);

              if (logResult.trim()) {
                conflictingBranches.push({
                  branch: branch.replace('origin/', ''),
                  author: logResult.trim()
                });
              }
            }
          } catch (err) {
            // Branch might not exist locally, skip it
          }
        }

        if (conflictingBranches.length > 0) {
          conflicts.push({
            file,
            branches: conflictingBranches.map(b => b.branch),
            authors: [...new Set(conflictingBranches.map(b => b.author))]
          });
        }
      }

      return conflicts;
    } catch (error) {
      console.error('Failed to check for conflicts:', error);
      return [];
    }
  }

  /**
   * Get current user email
   */
  async getCurrentUser() {
    try {
      const result = await execGitCommand(['config', 'user.email']);
      return result.trim();
    } catch (error) {
      return null;
    }
  }

  /**
   * Get repository state information
   */
  async getRepoState() {
    try {
      const [fileCount, branchCount, status, currentBranch, mainBranch] = await Promise.all([
        execGitCommand(['ls-files', '--cached']).then(r => r.trim().split('\n').filter(Boolean).length),
        execGitCommand(['branch', '-a']).then(r => r.trim().split('\n').filter(Boolean).length),
        execGitCommand(['status', '--porcelain']),
        getCurrentBranch(),
        getMainBranch()
      ]);

      const hasUncommittedChanges = status.trim().length > 0;
      
      // Check if in detached HEAD state
      let isDetachedHead = false;
      try {
        const symbolic = await execGitCommand(['symbolic-ref', '-q', 'HEAD']);
        isDetachedHead = !symbolic || symbolic.trim() === '';
      } catch {
        isDetachedHead = true;
      }

      return {
        fileCount,
        branchCount,
        hasUncommittedChanges,
        isDetachedHead,
        currentBranch,
        mainBranch
      };
    } catch (error) {
      console.error('Failed to get repo state:', error);
      return {
        fileCount: 0,
        branchCount: 0,
        hasUncommittedChanges: false,
        isDetachedHead: false,
        currentBranch: null,
        mainBranch: 'main'
      };
    }
  }

  /**
   * Get uncommitted changes
   */
  async getUncommittedChanges() {
    try {
      const result = await execGitCommand(['status', '--porcelain']);
      const lines = result.trim().split('\n').filter(Boolean);
      
      const changes = {
        modified: [],
        added: [],
        deleted: []
      };

      lines.forEach(line => {
        const status = line.substring(0, 2);
        const file = line.substring(3);
        
        if (status.includes('M')) {
          changes.modified.push(file);
        } else if (status.includes('A') || status === '??') {
          changes.added.push(file);
        } else if (status.includes('D')) {
          changes.deleted.push(file);
        }
      });

      return changes;
    } catch (error) {
      console.error('Failed to get uncommitted changes:', error);
      return { modified: [], added: [], deleted: [] };
    }
  }

  /**
   * Check if working tree is clean
   */
  async isCleanWorkingTree() {
    try {
      const result = await execGitCommand(['status', '--porcelain']);
      return result.trim() === '';
    } catch (error) {
      return false;
    }
  }

  /**
   * Check if branch has upstream
   */
  async hasUpstreamBranch(branch) {
    try {
      const currentBranch = branch || await getCurrentBranch();
      const result = await execGitCommand(['rev-parse', '--abbrev-ref', `${currentBranch}@{upstream}`]);
      return result.trim() !== '';
    } catch (error) {
      return false;
    }
  }

  /**
   * Get diverged commits (ahead/behind)
   */
  async getDivergedCommits(sourceBranch, targetBranch) {
    try {
      const source = sourceBranch || await getCurrentBranch();
      const target = targetBranch || await getMainBranch();
      
      const [ahead, behind] = await Promise.all([
        execGitCommand(['rev-list', '--count', `${target}..${source}`]),
        execGitCommand(['rev-list', '--count', `${source}..${target}`])
      ]);

      return {
        ahead: parseInt(ahead.trim()) || 0,
        behind: parseInt(behind.trim()) || 0
      };
    } catch (error) {
      console.error('Failed to get diverged commits:', error);
      return { ahead: 0, behind: 0 };
    }
  }

  /**
   * Get branch status compared to upstream
   */
  async getBranchStatus() {
    try {
      const branch = await getCurrentBranch();
      const hasUpstream = await this.hasUpstreamBranch(branch);
      
      if (!hasUpstream) {
        return {
          branch,
          hasUpstream: false,
          ahead: 0,
          behind: 0
        };
      }

      const diverged = await this.getDivergedCommits();
      
      return {
        branch,
        hasUpstream: true,
        ahead: diverged.ahead,
        behind: diverged.behind,
        upToDate: diverged.ahead === 0 && diverged.behind === 0
      };
    } catch (error) {
      console.error('Failed to get branch status:', error);
      return {
        branch: null,
        hasUpstream: false,
        ahead: 0,
        behind: 0
      };
    }
  }

  // Cache helpers
  getFromCache(key) {
    const cached = this.cache.get(key);
    if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
      return cached.data;
    }
    return null;
  }

  setCache(key, data) {
    this.cache.set(key, {
      data,
      timestamp: Date.now()
    });
  }

  clearCache() {
    this.cache.clear();
  }
}
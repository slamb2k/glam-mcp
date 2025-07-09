/**
 * GitHub Client for API Operations
 * Provides abstraction over GitHub API for team awareness features
 */

import { getRemoteUrl, execGitCommand } from '../utils/git-helpers.js';

export class GithubClient {
  constructor(options = {}) {
    this.token = options.token || process.env.GITHUB_TOKEN;
    this.baseUrl = 'https://api.github.com';
    this.cache = new Map();
    this.cacheTimeout = 5 * 60 * 1000; // 5 minutes
    this.repoInfo = null;
  }

  /**
   * Get repository information from remote URL
   */
  async getRepoInfo() {
    if (this.repoInfo) return this.repoInfo;

    try {
      const remoteUrl = await getRemoteUrl();
      
      // Parse GitHub repo from various URL formats
      const patterns = [
        /github\.com[:/]([^/]+)\/([^/]+?)(?:\.git)?$/,
        /git@github\.com:([^/]+)\/([^/]+?)(?:\.git)?$/,
        /https?:\/\/github\.com\/([^/]+)\/([^/]+?)(?:\.git)?$/
      ];

      let owner, repo;
      for (const pattern of patterns) {
        const match = remoteUrl.match(pattern);
        if (match) {
          [, owner, repo] = match;
          break;
        }
      }

      if (owner && repo) {
        this.repoInfo = { owner, repo: repo.replace('.git', '') };
        return this.repoInfo;
      }
    } catch (error) {
      console.error('Failed to parse repository info:', error);
    }

    return null;
  }

  /**
   * Make authenticated request to GitHub API
   */
  async apiRequest(endpoint, options = {}) {
    const headers = {
      'Accept': 'application/vnd.github.v3+json',
      ...options.headers
    };

    if (this.token) {
      headers['Authorization'] = `token ${this.token}`;
    }

    try {
      const response = await fetch(`${this.baseUrl}${endpoint}`, {
        ...options,
        headers
      });

      if (!response.ok) {
        throw new Error(`GitHub API error: ${response.status} ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error(`GitHub API request failed for ${endpoint}:`, error);
      throw error;
    }
  }

  /**
   * Get pull requests for the repository
   */
  async getPullRequests({ state = 'open' } = {}) {
    const cacheKey = `prs:${state}`;
    const cached = this.getFromCache(cacheKey);
    if (cached) return cached;

    const repoInfo = await this.getRepoInfo();
    if (!repoInfo) return [];

    try {
      const endpoint = `/repos/${repoInfo.owner}/${repoInfo.repo}/pulls?state=${state}&per_page=100`;
      const prs = await this.apiRequest(endpoint);

      // Get files for each PR (limited to avoid rate limits)
      const detailedPRs = await Promise.all(
        prs.slice(0, 20).map(async (pr) => {
          try {
            const filesEndpoint = `/repos/${repoInfo.owner}/${repoInfo.repo}/pulls/${pr.number}/files`;
            const files = await this.apiRequest(filesEndpoint);
            
            return {
              number: pr.number,
              title: pr.title,
              author: pr.user.login,
              state: pr.state,
              createdAt: pr.created_at,
              updatedAt: pr.updated_at,
              files: files.map(f => f.filename),
              additions: pr.additions,
              deletions: pr.deletions,
              url: pr.html_url
            };
          } catch (error) {
            // If we can't get files, return PR without file info
            return {
              number: pr.number,
              title: pr.title,
              author: pr.user.login,
              state: pr.state,
              createdAt: pr.created_at,
              updatedAt: pr.updated_at,
              files: [],
              url: pr.html_url
            };
          }
        })
      );

      this.setCache(cacheKey, detailedPRs);
      return detailedPRs;
    } catch (error) {
      console.error('Failed to get pull requests:', error);
      // Fall back to git command if API fails
      return this.getPullRequestsFromGit();
    }
  }

  /**
   * Get pull requests using git commands (fallback)
   */
  async getPullRequestsFromGit() {
    try {
      // This is a simplified version - in production you'd want more sophisticated parsing
      const result = await execGitCommand(['ls-remote', '--heads', 'origin']);
      const branches = result.trim().split('\n')
        .filter(Boolean)
        .map(line => {
          const [, ref] = line.split('\t');
          return ref.replace('refs/heads/', '');
        })
        .filter(branch => branch.includes('feature/') || branch.includes('fix/'));

      // Create pseudo-PRs from branches
      return branches.map((branch, index) => ({
        number: index + 1,
        title: branch.replace(/[-_]/g, ' '),
        author: 'unknown',
        state: 'open',
        files: [],
        branch
      }));
    } catch (error) {
      console.error('Failed to get branches:', error);
      return [];
    }
  }

  /**
   * Get repository collaborators
   */
  async getCollaborators() {
    const cacheKey = 'collaborators';
    const cached = this.getFromCache(cacheKey);
    if (cached) return cached;

    const repoInfo = await this.getRepoInfo();
    if (!repoInfo || !this.token) {
      // Fallback: extract from git log
      return this.getCollaboratorsFromGit();
    }

    try {
      const endpoint = `/repos/${repoInfo.owner}/${repoInfo.repo}/collaborators`;
      const collaborators = await this.apiRequest(endpoint);
      
      const mappedCollaborators = collaborators.map(user => ({
        username: user.login,
        name: user.name || user.login,
        email: user.email || `${user.login}@users.noreply.github.com`,
        avatar: user.avatar_url
      }));

      this.setCache(cacheKey, mappedCollaborators);
      return mappedCollaborators;
    } catch (error) {
      console.error('Failed to get collaborators:', error);
      return this.getCollaboratorsFromGit();
    }
  }

  /**
   * Get collaborators from git log (fallback)
   */
  async getCollaboratorsFromGit() {
    try {
      const result = await execGitCommand([
        'log',
        '--all',
        '--format=%ae|%an',
        '--since="1 year ago"'
      ]);

      const contributorsMap = new Map();
      result.trim().split('\n').filter(Boolean).forEach(line => {
        const [email, name] = line.split('|');
        if (!contributorsMap.has(email)) {
          contributorsMap.set(email, { email, name, username: email.split('@')[0] });
        }
      });

      return Array.from(contributorsMap.values());
    } catch (error) {
      console.error('Failed to get contributors from git:', error);
      return [];
    }
  }

  /**
   * Get user activity and collaboration data
   */
  async getUserActivity({ since }) {
    const cacheKey = `activity:${since}`;
    const cached = this.getFromCache(cacheKey);
    if (cached) return cached;

    try {
      // Get commit data to analyze collaboration
      const format = '%H|%ae|%at';
      const result = await execGitCommand([
        'log',
        '--all',
        `--since="${since}"`,
        `--format=${format}`
      ]);

      const commits = result.trim().split('\n').filter(Boolean).map(line => {
        const [sha, author, timestamp] = line.split('|');
        return { sha, author, timestamp: new Date(parseInt(timestamp) * 1000).toISOString() };
      });

      // Get files changed in each commit to find collaborations
      const collaborations = new Map();
      const fileAuthors = new Map();

      for (const commit of commits) {
        const filesResult = await execGitCommand([
          'diff-tree',
          '--no-commit-id',
          '--name-only',
          '-r',
          commit.sha
        ]);
        
        const files = filesResult.trim().split('\n').filter(Boolean);
        
        // Track which authors work on which files
        files.forEach(file => {
          if (!fileAuthors.has(file)) {
            fileAuthors.set(file, new Set());
          }
          fileAuthors.set(file, fileAuthors.get(file).add(commit.author));
        });
      }

      // Find collaborations (multiple authors on same files)
      fileAuthors.forEach((authors, file) => {
        if (authors.size > 1) {
          const authorList = Array.from(authors);
          
          // Create pairs of collaborators
          for (let i = 0; i < authorList.length; i++) {
            for (let j = i + 1; j < authorList.length; j++) {
              const key = [authorList[i], authorList[j]].sort().join('::');
              
              if (!collaborations.has(key)) {
                collaborations.set(key, {
                  author1: authorList[i],
                  author2: authorList[j],
                  sharedFiles: [],
                  collaborationCount: 0
                });
              }
              
              const collab = collaborations.get(key);
              if (!collab.sharedFiles.includes(file)) {
                collab.sharedFiles.push(file);
              }
              collab.collaborationCount++;
            }
          }
        }
      });

      const collaborationArray = Array.from(collaborations.values());
      this.setCache(cacheKey, collaborationArray);
      return collaborationArray;
    } catch (error) {
      console.error('Failed to get user activity:', error);
      return [];
    }
  }

  /**
   * Get review history and workload
   */
  async getReviewHistory() {
    const cacheKey = 'review-history';
    const cached = this.getFromCache(cacheKey);
    if (cached) return cached;

    const repoInfo = await this.getRepoInfo();
    if (!repoInfo || !this.token) {
      // Return empty workload if we can't access GitHub API
      return {};
    }

    try {
      // Get recent PRs to calculate workload
      const [openPRs, recentClosed] = await Promise.all([
        this.apiRequest(`/repos/${repoInfo.owner}/${repoInfo.repo}/pulls?state=open&per_page=100`),
        this.apiRequest(`/repos/${repoInfo.owner}/${repoInfo.repo}/pulls?state=closed&per_page=50`)
      ]);

      const workload = {};

      // Count open PRs per reviewer
      openPRs.forEach(pr => {
        pr.requested_reviewers?.forEach(reviewer => {
          const email = `${reviewer.login}@users.noreply.github.com`;
          if (!workload[email]) {
            workload[email] = { activePRs: 0, recentReviews: 0 };
          }
          workload[email].activePRs++;
        });
      });

      // Count recent reviews
      const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      recentClosed.forEach(pr => {
        if (new Date(pr.closed_at) > oneWeekAgo) {
          pr.requested_reviewers?.forEach(reviewer => {
            const email = `${reviewer.login}@users.noreply.github.com`;
            if (!workload[email]) {
              workload[email] = { activePRs: 0, recentReviews: 0 };
            }
            workload[email].recentReviews++;
          });
        }
      });

      this.setCache(cacheKey, workload);
      return workload;
    } catch (error) {
      console.error('Failed to get review history:', error);
      return {};
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
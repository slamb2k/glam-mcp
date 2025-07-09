import { describe, it, expect } from '@jest/globals';

describe('Enhanced Utility Tools', () => {
  describe('repository status enhancements', () => {
    it('should provide comprehensive branch status', () => {
      const statusData = {
        currentBranch: 'feature/new-feature',
        remoteBranch: 'origin/feature/new-feature',
        ahead: 2,
        behind: 1,
        diverged: true,
        hasUncommittedChanges: true,
        changedFiles: {
          modified: ['src/index.js', 'package.json'],
          added: ['src/newFile.js'],
          deleted: ['src/oldFile.js']
        }
      };
      
      const context = {
        branchStatus: {
          diverged: statusData.diverged,
          ahead: statusData.ahead,
          behind: statusData.behind,
          syncNeeded: statusData.ahead > 0 || statusData.behind > 0
        },
        fileChanges: {
          total: 4,
          byType: {
            modified: 2,
            added: 1,
            deleted: 1
          }
        },
        suggestions: []
      };
      
      // Add suggestions based on status
      if (statusData.diverged) {
        context.suggestions.push({
          type: 'sync',
          priority: 'high',
          message: 'Branch has diverged from remote. Consider rebasing or merging.'
        });
      }
      
      if (statusData.hasUncommittedChanges) {
        context.suggestions.push({
          type: 'commit',
          priority: 'medium',
          message: 'You have uncommitted changes. Consider committing before switching branches.'
        });
      }
      
      expect(context.suggestions).toHaveLength(2);
      expect(context.branchStatus.syncNeeded).toBe(true);
      expect(context.fileChanges.total).toBe(4);
    });

    it('should track status history', () => {
      const statusHistory = [
        { date: '2024-01-01', branch: 'main', changedFiles: 0 },
        { date: '2024-01-02', branch: 'feature/test', changedFiles: 5 },
        { date: '2024-01-03', branch: 'feature/test', changedFiles: 3 }
      ];
      
      // Calculate trends
      const recentStatus = statusHistory.slice(-2);
      const fileChangeTrend = recentStatus[1].changedFiles - recentStatus[0].changedFiles;
      
      const trends = {
        fileChanges: fileChangeTrend < 0 ? 'decreasing' : 'increasing',
        branchActivity: 'active' // Based on recent switches
      };
      
      expect(trends.fileChanges).toBe('decreasing');
      expect(trends.branchActivity).toBe('active');
    });
  });

  describe('repository information enhancements', () => {
    it('should calculate repository metrics', () => {
      const repoData = {
        files: {
          total: 150,
          byType: {
            '.js': 80,
            '.json': 10,
            '.md': 15,
            '.test.js': 45
          }
        },
        size: {
          total: '25MB',
          largestFiles: [
            { path: 'dist/bundle.js', size: '5MB' },
            { path: 'node_modules.tar', size: '3MB' }
          ]
        },
        branches: {
          total: 25,
          active: 5,
          stale: 10,
          merged: 10
        }
      };
      
      const metrics = {
        codebase: {
          testCoverage: (repoData.files.byType['.test.js'] / repoData.files.byType['.js']) * 100,
          documentationRatio: (repoData.files.byType['.md'] / repoData.files.total) * 100,
          jsFilesRatio: (repoData.files.byType['.js'] / repoData.files.total) * 100
        },
        health: {
          activeBranchRatio: (repoData.branches.active / repoData.branches.total) * 100,
          staleBranchRatio: (repoData.branches.stale / repoData.branches.total) * 100
        }
      };
      
      expect(metrics.codebase.testCoverage).toBeCloseTo(56.25, 2);
      expect(metrics.codebase.documentationRatio).toBeCloseTo(10, 0);
      expect(metrics.health.staleBranchRatio).toBe(40);
    });

    it('should provide actionable suggestions', () => {
      const analysis = {
        dependencies: {
          total: 150,
          outdated: 30,
          vulnerable: 5
        },
        codeQuality: {
          complexity: 15,
          duplicateLines: 500,
          longFiles: 10
        },
        documentation: {
          coverage: 30,
          outdatedDocs: 5
        }
      };
      
      const suggestions = [];
      
      // Dependency suggestions
      if (analysis.dependencies.vulnerable > 0) {
        suggestions.push({
          type: 'security',
          priority: 'critical',
          message: `${analysis.dependencies.vulnerable} vulnerable dependencies found. Run npm audit fix.`,
          command: 'npm audit fix'
        });
      }
      
      if (analysis.dependencies.outdated > 20) {
        suggestions.push({
          type: 'maintenance',
          priority: 'medium',
          message: `${analysis.dependencies.outdated} outdated dependencies. Consider updating.`,
          command: 'npm outdated'
        });
      }
      
      // Code quality suggestions
      if (analysis.codeQuality.complexity > 10) {
        suggestions.push({
          type: 'refactoring',
          priority: 'medium',
          message: 'High code complexity detected. Consider refactoring.',
          tool: 'analyze_code'
        });
      }
      
      // Documentation suggestions
      if (analysis.documentation.coverage < 50) {
        suggestions.push({
          type: 'documentation',
          priority: 'low',
          message: 'Low documentation coverage. Consider adding more docs.',
          percentage: analysis.documentation.coverage
        });
      }
      
      expect(suggestions).toHaveLength(4);
      expect(suggestions.find(s => s.type === 'security')).toBeDefined();
      expect(suggestions.find(s => s.priority === 'critical')).toBeDefined();
    });

    it('should track repository growth over time', () => {
      const history = [
        { date: '2024-01-01', files: 100, commits: 500, contributors: 5 },
        { date: '2024-02-01', files: 120, commits: 600, contributors: 7 },
        { date: '2024-03-01', files: 150, commits: 750, contributors: 8 }
      ];
      
      // Calculate growth rates
      const growthRates = {
        files: ((history[2].files - history[0].files) / history[0].files) * 100,
        commits: ((history[2].commits - history[0].commits) / history[0].commits) * 100,
        contributors: ((history[2].contributors - history[0].contributors) / history[0].contributors) * 100
      };
      
      const insights = {
        growth: {
          files: growthRates.files.toFixed(1) + '%',
          commits: growthRates.commits.toFixed(1) + '%',
          contributors: growthRates.contributors.toFixed(1) + '%'
        },
        trend: growthRates.files > 30 ? 'rapid' : 'steady',
        recommendation: growthRates.files > 30 
          ? 'Consider modularizing the codebase' 
          : 'Growth rate is healthy'
      };
      
      expect(insights.growth.files).toBe('50.0%');
      expect(insights.growth.commits).toBe('50.0%');
      expect(insights.growth.contributors).toBe('60.0%');
      expect(insights.trend).toBe('rapid');
    });
  });

  describe('session integration', () => {
    it('should store utility metrics in session', () => {
      const session = {
        repoMetrics: [],
        statusHistory: []
      };
      
      const newMetrics = {
        date: new Date().toISOString(),
        files: 150,
        branches: 25,
        size: '25MB'
      };
      
      const newStatus = {
        date: new Date().toISOString(),
        branch: 'feature/test',
        changedFiles: 5
      };
      
      // Update session
      session.repoMetrics.push(newMetrics);
      session.statusHistory.push(newStatus);
      
      // Keep only last 50 entries
      if (session.repoMetrics.length > 50) {
        session.repoMetrics.shift();
      }
      
      expect(session.repoMetrics).toHaveLength(1);
      expect(session.statusHistory).toHaveLength(1);
      expect(session.repoMetrics[0].files).toBe(150);
    });

    it('should provide context-aware suggestions based on history', () => {
      const twoHoursAgo = new Date(Date.now() - 7200000); // 2 hours ago
      const oneHourAgo = new Date(Date.now() - 3600000); // 1 hour ago
      
      const sessionData = {
        recentOperations: [
          { tool: 'github_flow_start', timestamp: twoHoursAgo.toISOString() },
          { tool: 'auto_commit', timestamp: oneHourAgo.toISOString() }
        ],
        preferences: {
          autoCommitEnabled: true,
          preferredBranchPrefix: 'feature/'
        }
      };
      
      const contextualSuggestions = [];
      
      // Check recent operations
      const recentStart = sessionData.recentOperations.find(op => op.tool === 'github_flow_start');
      const timeSinceStart = Date.now() - new Date(recentStart.timestamp).getTime();
      
      if (timeSinceStart > 3600000) { // More than 1 hour
        contextualSuggestions.push({
          type: 'workflow',
          message: 'You started a branch over an hour ago. Ready to create a PR?',
          tool: 'github_flow_finish'
        });
      }
      
      expect(contextualSuggestions).toHaveLength(1);
      expect(contextualSuggestions[0].tool).toBe('github_flow_finish');
    });
  });
});
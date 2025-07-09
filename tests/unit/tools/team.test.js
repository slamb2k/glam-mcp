import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { teamTools } from '../../../src/tools/team.js';
import { createSuccessResponse, createErrorResponse } from '../../../src/utils/responses.js';

describe('Team Tools', () => {
  let mockGitClient;
  let mockGithubClient;
  let tools;

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Create mock clients
    mockGitClient = {
      getRecentCommits: jest.fn(),
      getActiveBranches: jest.fn(),
      getFileHistory: jest.fn(),
      getConflictingFiles: jest.fn(),
      getModifiedFiles: jest.fn(),
      getCurrentUser: jest.fn()
    };
    
    mockGithubClient = {
      getPullRequests: jest.fn(),
      getCollaborators: jest.fn(),
      getUserActivity: jest.fn(),
      getReviewHistory: jest.fn()
    };
    
    tools = teamTools(mockGitClient, mockGithubClient);
  });

  describe('check_team_activity', () => {
    const getTool = (name) => tools.find(t => t.name === name);

    it('should retrieve recent team activity', async () => {
      const recentDate = new Date();
      const mockCommits = [
        { 
          sha: 'abc123', 
          author: 'john@example.com', 
          message: 'Add feature X',
          timestamp: new Date(recentDate.getTime() - 2 * 24 * 60 * 60 * 1000).toISOString(),
          files: ['src/feature.js']
        },
        { 
          sha: 'def456', 
          author: 'jane@example.com', 
          message: 'Fix bug Y',
          timestamp: new Date(recentDate.getTime() - 3 * 24 * 60 * 60 * 1000).toISOString(),
          files: ['src/bug.js']
        }
      ];

      const mockBranches = [
        { name: 'feature/x', author: 'john@example.com', lastActivity: '2024-01-10T10:00:00Z' },
        { name: 'bugfix/y', author: 'jane@example.com', lastActivity: '2024-01-10T09:00:00Z' }
      ];

      mockGitClient.getRecentCommits.mockResolvedValue(mockCommits);
      mockGitClient.getActiveBranches.mockResolvedValue(mockBranches);
      mockGitClient.getCurrentUser.mockResolvedValue('current@example.com');

      const tool = getTool('check_team_activity');
      const result = await tool.handler({ days: 7 });

      expect(result.success).toBe(true);
      expect(result.message).toBe('Team activity retrieved');
      expect(result.data.commits).toHaveLength(2);
      expect(result.data.activeBranches).toHaveLength(2);
      expect(result.data.contributors).toContain('john@example.com');
      expect(result.data.contributors).toContain('jane@example.com');
    });

    it('should filter activity by time period', async () => {
      const recentCommit = {
        sha: 'abc123',
        author: 'john@example.com',
        message: 'Recent commit',
        timestamp: new Date().toISOString(),
        files: ['src/recent.js']
      };

      const oldCommit = {
        sha: 'old123',
        author: 'jane@example.com',
        message: 'Old commit',
        timestamp: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
        files: ['src/old.js']
      };

      mockGitClient.getRecentCommits.mockResolvedValue([recentCommit, oldCommit]);
      mockGitClient.getActiveBranches.mockResolvedValue([]);
      mockGitClient.getCurrentUser.mockResolvedValue('current@example.com');

      const tool = getTool('check_team_activity');
      const result = await tool.handler({ days: 7 });

      expect(result.success).toBe(true);
      expect(result.data.commits).toHaveLength(1);
      expect(result.data.commits[0].sha).toBe('abc123');
    });

    it('should handle empty activity gracefully', async () => {
      mockGitClient.getRecentCommits.mockResolvedValue([]);
      mockGitClient.getActiveBranches.mockResolvedValue([]);
      mockGitClient.getCurrentUser.mockResolvedValue('current@example.com');

      const tool = getTool('check_team_activity');
      const result = await tool.handler({});

      expect(result.success).toBe(true);
      expect(result.data.commits).toHaveLength(0);
      expect(result.data.activeBranches).toHaveLength(0);
      expect(result.data.contributors).toHaveLength(0);
    });

    it('should handle API errors gracefully', async () => {
      mockGitClient.getRecentCommits.mockRejectedValue(new Error('Git error'));

      const tool = getTool('check_team_activity');
      const result = await tool.handler({});

      expect(result.success).toBe(false);
      expect(result.message).toContain('Failed to retrieve team activity');
    });
  });

  describe('find_related_work', () => {
    const getTool = (name) => tools.find(t => t.name === name);

    it('should find work related to current files', async () => {
      const mockHistory = { 
        file: 'src/feature.js',
        commits: [
          { sha: 'abc123', author: 'john@example.com', message: 'Initial feature' },
          { sha: 'def456', author: 'jane@example.com', message: 'Enhance feature' }
        ]
      };

      const mockPRs = [
        {
          number: 123,
          title: 'Add feature X',
          author: 'john@example.com',
          files: ['src/feature.js', 'tests/feature.test.js'],
          state: 'open'
        }
      ];

      mockGitClient.getFileHistory.mockImplementation((file) => {
        if (file === 'src/feature.js') {
          return Promise.resolve(mockHistory);
        }
        return Promise.resolve({ file, commits: [] });
      });
      mockGithubClient.getPullRequests.mockResolvedValue(mockPRs);
      mockGitClient.getCurrentUser.mockResolvedValue('current@example.com');

      const tool = getTool('find_related_work');
      const result = await tool.handler({ files: ['src/feature.js'] });

      expect(result.success).toBe(true);
      expect(result.message).toBe('Related work found');
      expect(result.data.relatedCommits).toHaveLength(2);
      expect(result.data.relatedPRs).toHaveLength(1);
      expect(result.data.collaborators).toContain('john@example.com');
      expect(result.data.collaborators).toContain('jane@example.com');
    });

    it('should detect potential conflicts', async () => {
      const mockConflicts = [
        {
          file: 'src/shared.js',
          branches: ['feature/x', 'feature/y'],
          authors: ['john@example.com', 'jane@example.com']
        }
      ];

      mockGitClient.getFileHistory.mockResolvedValue({ file: 'src/shared.js', commits: [] });
      mockGithubClient.getPullRequests.mockResolvedValue([]);
      mockGitClient.getConflictingFiles.mockResolvedValue(mockConflicts);
      mockGitClient.getCurrentUser.mockResolvedValue('current@example.com');

      const tool = getTool('find_related_work');
      const result = await tool.handler({ files: ['src/shared.js'], checkConflicts: true });

      expect(result.success).toBe(true);
      expect(result.data.potentialConflicts).toHaveLength(1);
      expect(result.data.potentialConflicts[0].file).toBe('src/shared.js');
    });

    it('should handle no related work found', async () => {
      mockGitClient.getFileHistory.mockResolvedValue({ file: 'src/new-file.js', commits: [] });
      mockGithubClient.getPullRequests.mockResolvedValue([]);
      mockGitClient.getCurrentUser.mockResolvedValue('current@example.com');

      mockGitClient.getModifiedFiles.mockResolvedValue([]);
      
      const tool = getTool('find_related_work');
      const result = await tool.handler({ files: ['src/new-file.js'] });

      expect(result.success).toBe(true);
      expect(result.message).toBe('No related work found');
      expect(result.data.relatedCommits).toHaveLength(0);
      expect(result.data.relatedPRs).toHaveLength(0);
    });
  });

  describe('suggest_reviewers', () => {
    const getTool = (name) => tools.find(t => t.name === name);

    it('should suggest reviewers based on file expertise', async () => {
      const mockFileExperts = {
        'src/auth.js': [
          { author: 'security@example.com', commits: 15, lastCommit: '2024-01-05' },
          { author: 'john@example.com', commits: 8, lastCommit: '2024-01-08' }
        ],
        'src/api.js': [
          { author: 'api@example.com', commits: 20, lastCommit: '2024-01-09' },
          { author: 'jane@example.com', commits: 5, lastCommit: '2024-01-07' }
        ]
      };

      const mockWorkload = {
        'security@example.com': { activePRs: 2, recentReviews: 5 },
        'john@example.com': { activePRs: 1, recentReviews: 3 },
        'api@example.com': { activePRs: 5, recentReviews: 10 },
        'jane@example.com': { activePRs: 0, recentReviews: 2 }
      };

      mockGitClient.getFileHistory.mockImplementation((file) => {
        const experts = mockFileExperts[file];
        return Promise.resolve(experts ? { file, commits: experts } : { file, commits: [] });
      });

      mockGithubClient.getReviewHistory.mockResolvedValue(mockWorkload);
      mockGitClient.getCurrentUser.mockResolvedValue('current@example.com');

      const tool = getTool('suggest_reviewers');
      const result = await tool.handler({ 
        files: ['src/auth.js', 'src/api.js'],
        maxReviewers: 2 
      });

      expect(result.success).toBe(true);
      expect(result.message).toBe('Reviewers suggested');
      expect(result.data.reviewers).toHaveLength(2);
      expect(result.data.reviewers[0]).toHaveProperty('user');
      expect(result.data.reviewers[0]).toHaveProperty('expertise');
      expect(result.data.reviewers[0]).toHaveProperty('workload');
      expect(result.data.reviewers[0]).toHaveProperty('reason');
    });

    it('should balance workload when suggesting reviewers', async () => {
      const mockExperts = [
        { author: 'busy@example.com', commits: 50, lastCommit: '2024-01-10' },
        { author: 'available@example.com', commits: 45, lastCommit: '2024-01-09' }
      ];

      const mockWorkload = {
        'busy@example.com': { activePRs: 10, recentReviews: 20 },
        'available@example.com': { activePRs: 1, recentReviews: 3 }
      };

      mockGitClient.getFileHistory.mockResolvedValue({ file: 'src/feature.js', commits: mockExperts });
      mockGithubClient.getReviewHistory.mockResolvedValue(mockWorkload);
      mockGitClient.getCurrentUser.mockResolvedValue('current@example.com');

      const tool = getTool('suggest_reviewers');
      const result = await tool.handler({ 
        files: ['src/feature.js'],
        maxReviewers: 1,
        considerWorkload: true 
      });

      expect(result.success).toBe(true);
      expect(result.data.reviewers[0].user).toBe('available@example.com');
      expect(result.data.reviewers[0].reason).toContain('workload');
    });

    it('should handle no available reviewers', async () => {
      mockGitClient.getFileHistory.mockResolvedValue({ file: 'src/new-feature.js', commits: [] });
      mockGithubClient.getReviewHistory.mockResolvedValue({});
      mockGitClient.getCurrentUser.mockResolvedValue('current@example.com');

      const tool = getTool('suggest_reviewers');
      const result = await tool.handler({ files: ['src/new-feature.js'] });

      expect(result.success).toBe(true);
      expect(result.message).toBe('No suitable reviewers found');
      expect(result.data.reviewers).toHaveLength(0);
      expect(result.data.fallbackSuggestion).toBeDefined();
    });

    it('should exclude PR author from suggestions', async () => {
      const mockExperts = [
        { author: 'author@example.com', commits: 30, lastCommit: '2024-01-10' },
        { author: 'reviewer@example.com', commits: 25, lastCommit: '2024-01-09' }
      ];

      mockGitClient.getFileHistory.mockResolvedValue({ file: 'src/feature.js', commits: mockExperts });
      mockGithubClient.getReviewHistory.mockResolvedValue({
        'author@example.com': { activePRs: 2, recentReviews: 5 },
        'reviewer@example.com': { activePRs: 1, recentReviews: 3 }
      });
      mockGitClient.getCurrentUser.mockResolvedValue('current@example.com');

      const tool = getTool('suggest_reviewers');
      const result = await tool.handler({ 
        files: ['src/feature.js'],
        excludeAuthors: ['author@example.com']
      });

      expect(result.success).toBe(true);
      expect(result.data.reviewers).not.toContainEqual(
        expect.objectContaining({ user: 'author@example.com' })
      );
    });
  });

  describe('get_collaboration_insights', () => {
    const getTool = (name) => tools.find(t => t.name === name);

    it('should generate collaboration network insights', async () => {
      const mockCollabData = [
        { 
          author1: 'john@example.com', 
          author2: 'jane@example.com',
          sharedFiles: ['src/api.js', 'src/auth.js'],
          collaborationCount: 15
        },
        {
          author1: 'john@example.com',
          author2: 'bob@example.com',
          sharedFiles: ['src/database.js'],
          collaborationCount: 8
        }
      ];

      mockGithubClient.getUserActivity.mockResolvedValue(mockCollabData);

      const tool = getTool('get_collaboration_insights');
      const result = await tool.handler({ days: 30 });

      expect(result.success).toBe(true);
      expect(result.message).toBe('Collaboration insights generated');
      expect(result.data.collaborationPairs).toHaveLength(2);
      expect(result.data.mostActiveCollaborators).toBeDefined();
      expect(result.data.knowledgeClusters).toBeDefined();
    });
  });
});
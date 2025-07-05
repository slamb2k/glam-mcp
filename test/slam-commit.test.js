import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { SlamCommitTool } from '../src/mcp/tools/slam_commit.js';
import simpleGit from 'simple-git';

// Mock dependencies
vi.mock('simple-git');
vi.mock('../src/mcp/context-engine.js', () => ({
  default: {
    getInferredContext: vi.fn(() => ({
      workflow: { featureDevelopment: true },
      recentActivity: []
    })),
    trackUserActivity: vi.fn()
  }
}));
vi.mock('../src/mcp/state-manager.js', () => ({
  default: {
    generateId: vi.fn(() => 'test-id'),
    createTask: vi.fn(),
    getTasksByStatus: vi.fn(() => []),
    deleteTask: vi.fn(),
    logAudit: vi.fn()
  }
}));
vi.mock('../src/mcp/intent-resolver.js', () => ({
  default: {
    resolve: vi.fn((message) => ({
      entities: { commitMessage: message }
    }))
  }
}));

describe('SlamCommitTool', () => {
  let tool;
  let mockGit;

  beforeEach(() => {
    tool = new SlamCommitTool();
    mockGit = {
      status: vi.fn(),
      diff: vi.fn(),
      add: vi.fn(),
      commit: vi.fn(),
      log: vi.fn()
    };
    simpleGit.mockReturnValue(mockGit);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('generateCommitMessage', () => {
    it('should handle no changes', async () => {
      mockGit.status.mockResolvedValue({ files: [] });

      const result = await tool.generateCommitMessage();

      expect(result.success).toBe(false);
      expect(result.message).toBe('No changes to commit');
    });

    it('should generate feature commit message', async () => {
      mockGit.status.mockResolvedValue({
        files: [
          { path: 'src/new-feature.js', index: 'A', working_dir: ' ' }
        ]
      });
      mockGit.diff.mockResolvedValue('+ function newFeature() {}');

      const result = await tool.generateCommitMessage();

      expect(result.success).toBe(true);
      expect(result.message).toMatch(/^feat/);
      expect(result.message).toContain('add new feature');
    });

    it('should detect bug fixes', async () => {
      mockGit.status.mockResolvedValue({
        files: [
          { path: 'src/utils.js', index: 'M', working_dir: ' ' }
        ]
      });
      mockGit.diff.mockResolvedValue('- bug\n+ fixed');

      const result = await tool.generateCommitMessage();

      expect(result.success).toBe(true);
      expect(result.message).toMatch(/^fix/);
    });

    it('should detect documentation changes', async () => {
      mockGit.status.mockResolvedValue({
        files: [
          { path: 'README.md', index: 'M', working_dir: ' ' }
        ]
      });
      mockGit.diff.mockResolvedValue('# Updated documentation');

      const result = await tool.generateCommitMessage();

      expect(result.success).toBe(true);
      expect(result.message).toMatch(/^docs/);
      expect(result.message).toContain('README');
    });

    it('should detect test changes', async () => {
      mockGit.status.mockResolvedValue({
        files: [
          { path: 'test/feature.test.js', index: 'A', working_dir: ' ' }
        ]
      });
      mockGit.diff.mockResolvedValue('describe("feature", () => {');

      const result = await tool.generateCommitMessage();

      expect(result.success).toBe(true);
      expect(result.message).toMatch(/^test/);
    });

    it('should detect breaking changes', async () => {
      mockGit.status.mockResolvedValue({
        files: [
          { path: 'src/api.js', index: 'M', working_dir: ' ' }
        ]
      });
      mockGit.diff.mockResolvedValue('- BREAKING CHANGE: removed old API');

      const result = await tool.generateCommitMessage();

      expect(result.success).toBe(true);
      expect(result.message).toContain('!:');
      expect(result.analysis.breaking).toBe(true);
    });

    it('should include scope when multiple files in same directory', async () => {
      mockGit.status.mockResolvedValue({
        files: [
          { path: 'src/components/Button.js', index: 'M', working_dir: ' ' },
          { path: 'src/components/Input.js', index: 'M', working_dir: ' ' }
        ]
      });
      mockGit.diff.mockResolvedValue('component changes');

      const result = await tool.generateCommitMessage();

      expect(result.success).toBe(true);
      expect(result.message).toMatch(/\(components\)/);
    });

    it('should use custom options', async () => {
      mockGit.status.mockResolvedValue({
        files: [
          { path: 'src/feature.js', index: 'M', working_dir: ' ' }
        ]
      });
      mockGit.diff.mockResolvedValue('changes');

      const result = await tool.generateCommitMessage({
        type: 'chore',
        scope: 'deps',
        description: 'Updated dependencies',
        issues: ['123', '456'],
        coAuthors: ['John Doe <john@example.com>']
      });

      expect(result.success).toBe(true);
      expect(result.message).toMatch(/^chore\(deps\):/);
      expect(result.message).toContain('Updated dependencies');
      expect(result.message).toContain('Fixes #123');
      expect(result.message).toContain('Fixes #456');
      expect(result.message).toContain('Co-authored-by: John Doe');
    });
  });

  describe('analyzeChanges', () => {
    it('should detect patterns correctly', () => {
      const patterns = tool.detectPatterns(`
        diff --git a/src/api/users.js b/src/api/users.js
        + router.post('/users', authenticate, createUser);
        
        diff --git a/test/api.test.js b/test/api.test.js
        + describe('API tests', () => {
        
        diff --git a/.github/workflows/ci.yml b/.github/workflows/ci.yml
        + name: CI Pipeline
      `);

      expect(patterns).toContain('api-changes');
      expect(patterns).toContain('test-changes');
      expect(patterns).toContain('build-changes');
    });

    it('should calculate stats correctly', async () => {
      mockGit.status.mockResolvedValue({
        files: [
          { path: 'file1.js', index: 'M', working_dir: ' ' },
          { path: 'file2.js', index: 'A', working_dir: ' ' }
        ]
      });
      mockGit.diff.mockResolvedValue(' 10 insertions(+), 5 deletions(-)');

      const analysis = await tool.analyzeChanges({
        status: await mockGit.status(),
        stagedDiff: { content: '', stats: ' 10 insertions(+), 5 deletions(-)' },
        unstagedDiff: { content: '', stats: '' }
      });

      expect(analysis.stats.additions).toBe(10);
      expect(analysis.stats.deletions).toBe(5);
      expect(analysis.stats.filesChanged).toBe(2);
    });
  });

  describe('commit', () => {
    it('should stage and commit files', async () => {
      mockGit.status.mockResolvedValue({
        files: [
          { path: 'src/feature.js', index: ' ', working_dir: 'M' }
        ]
      });
      mockGit.diff.mockResolvedValue('changes');
      mockGit.commit.mockResolvedValue({ commit: 'abc123' });

      const result = await tool.commit({
        all: true,
        userMessage: 'Added new feature'
      });

      expect(result.success).toBe(true);
      expect(result.commit).toBe('abc123');
      expect(mockGit.add).toHaveBeenCalledWith('.');
      expect(mockGit.commit).toHaveBeenCalled();
    });

    it('should handle dry run', async () => {
      mockGit.status.mockResolvedValue({
        files: [
          { path: 'src/feature.js', index: 'M', working_dir: ' ' }
        ]
      });
      mockGit.diff.mockResolvedValue('changes');

      const result = await tool.generateCommitMessage({ dryRun: true });

      expect(result.success).toBe(true);
      expect(result.message).toBeDefined();
      expect(mockGit.commit).not.toHaveBeenCalled();
    });
  });

  describe('analyzeHistory', () => {
    it('should analyze commit history', async () => {
      mockGit.log.mockResolvedValue({
        all: [
          {
            hash: 'abc123',
            author_name: 'John Doe',
            date: '2024-01-01',
            message: 'feat: add feature'
          },
          {
            hash: 'def456',
            author_name: 'Jane Doe',
            date: '2024-01-02',
            message: 'fix: bug fix'
          }
        ]
      });

      const analysis = await tool.analyzeHistory({ limit: 2 });

      expect(analysis.commits).toHaveLength(2);
      expect(analysis.patterns.types.feat).toBe(1);
      expect(analysis.patterns.types.fix).toBe(1);
      expect(analysis.patterns.authors['John Doe']).toBe(1);
      expect(analysis.patterns.authors['Jane Doe']).toBe(1);
    });

    it('should generate recommendations', async () => {
      mockGit.log.mockResolvedValue({
        all: Array(10).fill({
          hash: 'abc123',
          author_name: 'John Doe',
          date: '2024-01-01',
          message: 'fix: another bug fix'
        })
      });

      const analysis = await tool.analyzeHistory({ limit: 10 });

      expect(analysis.recommendations).toHaveLength(1);
      expect(analysis.recommendations[0].type).toBe('commit-type-balance');
      expect(analysis.recommendations[0].message).toContain('fix commits dominate');
    });
  });
});
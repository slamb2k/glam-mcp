import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { safetyTools } from '../../../src/tools/safety.js';
import { createSuccessResponse, createErrorResponse } from '../../../src/utils/responses.js';

describe('Safety Tools', () => {
  let mockGitClient;
  let tools;

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Create mock Git client
    mockGitClient = {
      getRepoState: jest.fn(),
      getUncommittedChanges: jest.fn(),
      getBranchStatus: jest.fn(),
      getFileHistory: jest.fn(),
      getCurrentBranch: jest.fn(),
      getMainBranch: jest.fn(),
      isCleanWorkingTree: jest.fn(),
      hasUpstreamBranch: jest.fn(),
      getConflictingFiles: jest.fn(),
      getDivergedCommits: jest.fn(),
      getModifiedFiles: jest.fn()
    };
    
    tools = safetyTools(mockGitClient);
  });

  describe('analyze_operation_risk', () => {
    const getTool = (name) => tools.find(t => t.name === name);

    it('should analyze low risk operations', async () => {
      mockGitClient.getRepoState.mockResolvedValue({
        fileCount: 100,
        branchCount: 5,
        hasUncommittedChanges: false,
        isDetachedHead: false,
        currentBranch: 'feature/test',
        mainBranch: 'main'
      });

      mockGitClient.isCleanWorkingTree.mockResolvedValue(true);

      const tool = getTool('analyze_operation_risk');
      const result = await tool.handler({
        operation: 'pull',
        targetBranch: 'feature/test'  // Change from 'main' to avoid protected branch
      });

      expect(result.success).toBe(true);
      expect(result.message).toBe('Risk analysis completed');
      expect(result.data.riskScore).toBeLessThan(30);
      expect(result.data.riskLevel).toBe('minimal');
      expect(result.data.risks).toHaveLength(0);
    });

    it('should detect high risk force push operations', async () => {
      mockGitClient.getRepoState.mockResolvedValue({
        fileCount: 1000,
        branchCount: 20,
        hasUncommittedChanges: false,
        isDetachedHead: false,
        currentBranch: 'main',
        mainBranch: 'main'
      });

      mockGitClient.hasUpstreamBranch.mockResolvedValue(true);

      const tool = getTool('analyze_operation_risk');
      const result = await tool.handler({
        operation: 'push',
        force: true,
        targetBranch: 'main'
      });

      expect(result.success).toBe(true);
      expect(result.data.riskScore).toBeGreaterThan(70);
      expect(result.data.riskLevel).toBe('high');
      expect(result.data.risks).toContainEqual(
        expect.objectContaining({
          type: 'force-push-main',
          severity: 'high'
        })
      );
      expect(result.data.recommendations).toContain('Consider creating a backup branch before force pushing');
    });

    it('should detect uncommitted changes risk', async () => {
      mockGitClient.getRepoState.mockResolvedValue({
        fileCount: 200,
        branchCount: 10,
        hasUncommittedChanges: true,
        isDetachedHead: false,
        currentBranch: 'feature/test',
        mainBranch: 'main'
      });

      mockGitClient.getUncommittedChanges.mockResolvedValue({
        modified: ['src/important.js', 'tests/test.js'],
        added: ['new-file.js'],
        deleted: []
      });

      const tool = getTool('analyze_operation_risk');
      const result = await tool.handler({
        operation: 'checkout',
        targetBranch: 'main'
      });

      expect(result.success).toBe(true);
      expect(result.data.riskScore).toBeGreaterThan(30);
      expect(result.data.risks).toContainEqual(
        expect.objectContaining({
          type: 'uncommitted-changes',
          severity: 'medium'
        })
      );
    });

    it('should assess risk for large-scale operations', async () => {
      mockGitClient.getRepoState.mockResolvedValue({
        fileCount: 5000,
        branchCount: 50,
        hasUncommittedChanges: false,
        isDetachedHead: false,
        currentBranch: 'feature/refactor',
        mainBranch: 'main'
      });

      const tool = getTool('analyze_operation_risk');
      const result = await tool.handler({
        operation: 'merge',
        targetBranch: 'main',
        affectedFiles: 500
      });

      expect(result.success).toBe(true);
      expect(result.data.riskScore).toBeGreaterThan(40);
      expect(result.data.risks).toContainEqual(
        expect.objectContaining({
          type: 'large-scale-change',
          severity: 'medium'
        })
      );
    });
  });

  describe('check_for_conflicts', () => {
    const getTool = (name) => tools.find(t => t.name === name);

    it('should detect no conflicts in clean state', async () => {
      mockGitClient.getModifiedFiles.mockResolvedValue([]);
      mockGitClient.getConflictingFiles.mockResolvedValue([]);
      mockGitClient.getDivergedCommits.mockResolvedValue({
        ahead: 0,
        behind: 0
      });
      mockGitClient.isCleanWorkingTree.mockResolvedValue(true);

      const tool = getTool('check_for_conflicts');
      const result = await tool.handler({
        sourceBranch: 'feature/test',
        targetBranch: 'main'
      });

      expect(result.success).toBe(true);
      expect(result.message).toBe('No conflicts detected');
      expect(result.data.hasConflicts).toBe(false);
      expect(result.data.conflictingFiles).toHaveLength(0);
    });

    it('should detect merge conflicts', async () => {
      mockGitClient.getModifiedFiles.mockResolvedValue(['src/index.js', 'README.md']);
      mockGitClient.getConflictingFiles.mockResolvedValue([
        {
          file: 'src/index.js',
          conflictType: 'both-modified',
          conflictMarkers: 3
        },
        {
          file: 'README.md',
          conflictType: 'both-modified',
          conflictMarkers: 1
        }
      ]);
      mockGitClient.getDivergedCommits.mockResolvedValue({
        ahead: 0,
        behind: 0
      });
      mockGitClient.isCleanWorkingTree.mockResolvedValue(true);

      const tool = getTool('check_for_conflicts');
      const result = await tool.handler({
        sourceBranch: 'feature/test',
        targetBranch: 'main'
      });

      expect(result.success).toBe(true);
      expect(result.message).toBe('Conflicts detected');
      expect(result.data.hasConflicts).toBe(true);
      expect(result.data.conflictingFiles).toHaveLength(2);
      expect(result.data.resolutionGuidance).toBeDefined();
    });

    it('should detect diverged branches', async () => {
      mockGitClient.getModifiedFiles.mockResolvedValue([]);
      mockGitClient.getConflictingFiles.mockResolvedValue([]);
      mockGitClient.getDivergedCommits.mockResolvedValue({
        ahead: 5,
        behind: 10
      });
      mockGitClient.isCleanWorkingTree.mockResolvedValue(true);
      mockGitClient.getUncommittedChanges.mockResolvedValue({
        modified: [],
        added: [],
        deleted: []
      });

      const tool = getTool('check_for_conflicts');
      const result = await tool.handler({
        sourceBranch: 'feature/old',
        targetBranch: 'main'
      });

      expect(result.success).toBe(true);
      expect(result.data.divergence).toEqual({
        ahead: 5,
        behind: 10,
        isDiverged: true
      });
      expect(result.data.recommendations).toContain('Branches have diverged - consider rebasing or merging');
    });

    it('should detect uncommitted changes as potential conflict', async () => {
      mockGitClient.getConflictingFiles.mockResolvedValue([]);
      mockGitClient.isCleanWorkingTree.mockResolvedValue(false);
      mockGitClient.getUncommittedChanges.mockResolvedValue({
        modified: ['src/app.js'],
        added: [],
        deleted: []
      });

      const tool = getTool('check_for_conflicts');
      const result = await tool.handler({
        checkUncommitted: true
      });

      expect(result.success).toBe(true);
      expect(result.data.hasUncommittedChanges).toBe(true);
      expect(result.data.uncommittedFiles).toContain('src/app.js');
      expect(result.data.recommendations).toContain('Commit or stash changes before merging to avoid conflicts');
    });
  });

  describe('validate_preconditions', () => {
    const getTool = (name) => tools.find(t => t.name === name);

    it('should validate successful preconditions for commit', async () => {
      mockGitClient.getUncommittedChanges.mockResolvedValue({
        modified: ['src/file.js'],
        added: [],
        deleted: []
      });
      mockGitClient.getCurrentBranch.mockResolvedValue('feature/test');
      mockGitClient.getRepoState.mockResolvedValue({
        isDetachedHead: false,
        hasUncommittedChanges: true
      });

      const tool = getTool('validate_preconditions');
      const result = await tool.handler({
        operation: 'commit'
      });

      expect(result.success).toBe(true);
      expect(result.message).toBe('All preconditions met');
      expect(result.data.valid).toBe(true);
      expect(result.data.checks).toContainEqual(
        expect.objectContaining({
          name: 'has-changes',
          passed: true
        })
      );
    });

    it('should fail validation for commit without changes', async () => {
      mockGitClient.getUncommittedChanges.mockResolvedValue({
        modified: [],
        added: [],
        deleted: []
      });
      mockGitClient.getRepoState.mockResolvedValue({
        isDetachedHead: false
      });

      const tool = getTool('validate_preconditions');
      const result = await tool.handler({
        operation: 'commit'
      });

      expect(result.success).toBe(true);
      expect(result.data.valid).toBe(false);
      expect(result.data.failedChecks).toContainEqual(
        expect.objectContaining({
          name: 'has-changes',
          reason: 'No changes to commit'
        })
      );
    });

    it('should validate preconditions for push', async () => {
      mockGitClient.getCurrentBranch.mockResolvedValue('feature/test');
      mockGitClient.hasUpstreamBranch.mockResolvedValue(true);
      mockGitClient.getDivergedCommits.mockResolvedValue({
        ahead: 2,
        behind: 0
      });

      const tool = getTool('validate_preconditions');
      const result = await tool.handler({
        operation: 'push'
      });

      expect(result.success).toBe(true);
      expect(result.data.valid).toBe(true);
      expect(result.data.checks).toContainEqual(
        expect.objectContaining({
          name: 'has-upstream',
          passed: true
        })
      );
    });

    it('should validate preconditions for merge', async () => {
      mockGitClient.isCleanWorkingTree.mockResolvedValue(true);
      mockGitClient.getCurrentBranch.mockResolvedValue('feature/test');
      mockGitClient.getConflictingFiles.mockResolvedValue([]);

      const tool = getTool('validate_preconditions');
      const result = await tool.handler({
        operation: 'merge',
        targetBranch: 'main'
      });

      expect(result.success).toBe(true);
      expect(result.data.valid).toBe(true);
      expect(result.data.checks).toContainEqual(
        expect.objectContaining({
          name: 'clean-working-tree',
          passed: true
        })
      );
    });

    it('should provide recommendations for failed validations', async () => {
      mockGitClient.isCleanWorkingTree.mockResolvedValue(false);
      mockGitClient.getUncommittedChanges.mockResolvedValue({
        modified: ['src/app.js'],
        added: ['new.js'],
        deleted: []
      });

      const tool = getTool('validate_preconditions');
      const result = await tool.handler({
        operation: 'checkout',
        targetBranch: 'main'
      });

      expect(result.success).toBe(true);
      expect(result.data.valid).toBe(false);
      expect(result.data.recommendations).toContain('Use: git stash');
      expect(result.data.recommendations).toContain('Or commit: git commit -am "Work in progress"');
    });
  });

  describe('assess_critical_files', () => {
    const getTool = (name) => tools.find(t => t.name === name);

    it('should identify operations affecting critical files', async () => {
      const tool = getTool('assess_critical_files');
      const result = await tool.handler({
        files: [
          'package.json',
          'src/index.js',
          '.github/workflows/ci.yml',
          'README.md'
        ]
      });

      expect(result.success).toBe(true);
      expect(result.data.criticalFiles).toContain('package.json');
      expect(result.data.criticalFiles).toContain('.github/workflows/ci.yml');
      expect(result.data.criticalityScore).toBeGreaterThan(50);
      expect(result.data.recommendations).toContain('Review changes carefully before proceeding');
    });

    it('should assess low criticality for non-critical files', async () => {
      const tool = getTool('assess_critical_files');
      const result = await tool.handler({
        files: [
          'docs/guide.md',
          'tests/unit/helper.test.js',
          'examples/demo.js'
        ]
      });

      expect(result.success).toBe(true);
      expect(result.data.criticalFiles).toHaveLength(0);
      expect(result.data.criticalityScore).toBeLessThan(30);
    });
  });
});
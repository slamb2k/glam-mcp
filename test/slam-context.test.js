import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { SlamContextTool } from '../src/mcp/tools/slam_context.js';
import fs from 'fs-extra';
import path from 'path';

// Mock dependencies
vi.mock('../src/mcp/context-engine.js', () => ({
  default: {
    getInferredContext: vi.fn(() => ({
      workflow: { type: 'featureDevelopment', inProgress: true },
      projectState: { hasUncommittedChanges: true },
      recommendations: [],
      confidence: 0.85
    })),
    getSnapshot: vi.fn(() => ({
      git: { currentBranch: 'feature/test' },
      recentActivity: [
        { type: 'command', value: 'npm test', timestamp: Date.now() }
      ],
      currentFile: 'src/index.js',
      recentFiles: ['src/index.js', 'test/index.test.js'],
      patterns: ['testing', 'feature-development']
    }))
  }
}));

vi.mock('../src/mcp/predictive-engine.js', () => ({
  default: {
    getCurrentPredictions: vi.fn(() => [
      { type: 'command', value: 'npm test', confidence: 0.9 },
      { type: 'workflow', value: 'commit changes', confidence: 0.8 }
    ]),
    getStatistics: vi.fn(() => ({
      confidence: 0.75,
      historySize: { commands: 100, workflows: 50, files: 200 },
      patterns: { testing: 10, committing: 5 }
    }))
  }
}));

vi.mock('../src/mcp/workflow-orchestrator.js', () => ({
  default: {
    listRunningWorkflows: vi.fn(() => [])
  }
}));

vi.mock('../src/utils/git-helpers-mcp.js', () => ({
  default: {
    getComprehensiveStatus: vi.fn(() => ({
      current: 'feature/test',
      mainBranch: 'main',
      status: {
        clean: false,
        files: [{ path: 'src/index.js' }],
        ahead: 2,
        behind: 0
      },
      branches: ['main', 'feature/test'],
      remotes: [{ name: 'origin', refs: { fetch: 'https://github.com/user/repo.git' } }],
      stashes: [],
      tags: [],
      divergence: { ahead: 2, behind: 0 },
      recommendations: []
    })),
    getRecentCommits: vi.fn(() => [
      {
        hash: 'abc123def',
        message: 'feat: add new feature',
        author: 'John Doe',
        email: 'john@example.com',
        date: '2024-01-01'
      }
    ])
  }
}));

vi.mock('fs-extra');

describe('SlamContextTool', () => {
  let tool;

  beforeEach(() => {
    tool = new SlamContextTool();
    vi.clearAllMocks();
    
    // Mock file system operations
    fs.pathExists.mockResolvedValue(true);
    fs.readdir.mockResolvedValue(['src', 'test', 'package.json']);
    fs.stat.mockImplementation((path) => ({
      isDirectory: () => !path.includes('.')
    }));
    fs.readJson.mockResolvedValue({
      name: 'test-project',
      dependencies: { express: '^4.0.0' },
      devDependencies: { vitest: '^0.30.0' },
      scripts: { test: 'vitest', build: 'vite build' }
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('getContext', () => {
    it('should gather comprehensive context', async () => {
      const result = await tool.getContext();

      expect(result.success).toBe(true);
      expect(result.context).toBeDefined();
      expect(result.context.project).toBeDefined();
      expect(result.context.git).toBeDefined();
      expect(result.context.workflow).toBeDefined();
      expect(result.context.activity).toBeDefined();
      expect(result.context.team).toBeDefined();
      expect(result.context.system).toBeDefined();
    });

    it('should filter context when requested', async () => {
      const result = await tool.getContext({ filter: 'git.branch,workflow.current' });

      expect(result.success).toBe(true);
      expect(result.context.git?.branch).toBe('feature/test');
      expect(result.context.workflow?.current).toBeDefined();
      expect(result.context.project).toBeUndefined();
    });

    it('should calculate diff when requested', async () => {
      // First call establishes baseline
      await tool.getContext();
      
      // Second call calculates diff
      const result = await tool.getContext({ diff: true });

      expect(result.success).toBe(true);
      expect(result.diff).toBeDefined();
    });
  });

  describe('getProjectContext', () => {
    it('should gather project structure and dependencies', async () => {
      const context = await tool.getProjectContext();

      expect(context.name).toBeDefined();
      expect(context.structure).toBeDefined();
      expect(context.dependencies.production).toContain('express');
      expect(context.dependencies.development).toContain('vitest');
      expect(context.scripts).toHaveProperty('test');
    });

    it('should identify configuration files', async () => {
      fs.pathExists.mockImplementation(path => 
        path.includes('.env') || path.includes('config.json')
      );

      const context = await tool.getProjectContext();

      expect(context.configuration['.env']).toBe(true);
      expect(context.configuration['config.json']).toBe(true);
    });
  });

  describe('getProjectStructure', () => {
    it('should scan directory structure', async () => {
      fs.readdir.mockResolvedValue(['file1.js', 'file2.ts', 'subdir']);
      
      const structure = await tool.getProjectStructure('/test', 2);

      expect(structure.stats.totalFiles).toBeGreaterThan(0);
      expect(structure.stats.fileTypes).toBeDefined();
      expect(structure.stats.topFileTypes).toBeDefined();
    });

    it('should ignore specified directories', async () => {
      fs.readdir.mockResolvedValue(['node_modules', 'src', '.git']);
      
      const structure = await tool.getProjectStructure('/test', 2);

      expect(structure.directories).not.toContain('node_modules');
      expect(structure.directories).not.toContain('.git');
    });
  });

  describe('filterContext', () => {
    it('should filter by single field', () => {
      const context = {
        git: { branch: 'main', status: 'clean' },
        workflow: { type: 'feature' }
      };

      const filtered = tool.filterContext(context, 'git.branch');

      expect(filtered).toEqual({ git: { branch: 'main' } });
    });

    it('should filter by multiple fields', () => {
      const context = {
        git: { branch: 'main', status: 'clean' },
        workflow: { type: 'feature', confidence: 0.8 },
        system: { platform: 'linux' }
      };

      const filtered = tool.filterContext(context, ['git.branch', 'workflow.type']);

      expect(filtered).toEqual({
        git: { branch: 'main' },
        workflow: { type: 'feature' }
      });
    });
  });

  describe('calculateContextDiff', () => {
    it('should detect branch changes', async () => {
      const prev = { git: { branch: 'main' }, timestamp: '2024-01-01' };
      const curr = { git: { branch: 'feature' }, timestamp: '2024-01-02' };

      // Mock state manager
      const { default: stateManager } = await import('../src/mcp/state-manager.js');
      stateManager.getState.mockResolvedValueOnce(prev);

      const diff = await tool.calculateContextDiff(curr);

      expect(diff.changes).toContainEqual({
        type: 'branch_change',
        from: 'main',
        to: 'feature'
      });
    });

    it('should detect file changes', async () => {
      const prev = { git: { status: { files: [] } }, timestamp: '2024-01-01' };
      const curr = { git: { status: { files: ['a', 'b'] } }, timestamp: '2024-01-02' };

      const { default: stateManager } = await import('../src/mcp/state-manager.js');
      stateManager.getState.mockResolvedValueOnce(prev);

      const diff = await tool.calculateContextDiff(curr);

      expect(diff.changes).toContainEqual({
        type: 'file_changes',
        from: 0,
        to: 2,
        delta: 2
      });
    });
  });

  describe('exportContext', () => {
    it('should export as JSON', async () => {
      const context = { test: 'data' };
      const result = await tool.exportContext(context, 'json');

      expect(result.success).toBe(true);
      expect(result.output).toBe(JSON.stringify(context, null, 2));
    });

    it('should export as YAML', async () => {
      const context = { test: 'data' };
      const result = await tool.exportContext(context, 'yaml');

      expect(result.success).toBe(true);
      expect(result.output).toContain('test: data');
    });

    it('should export as Markdown', async () => {
      const context = {
        timestamp: '2024-01-01',
        project: { name: 'test' },
        git: { repository: true, branch: 'main' }
      };

      const result = await tool.exportContext(context, 'markdown');

      expect(result.success).toBe(true);
      expect(result.output).toContain('# Project Context Report');
      expect(result.output).toContain('test');
    });

    it('should save to file when path provided', async () => {
      const context = { test: 'data' };
      const outputPath = '/tmp/context.json';

      fs.writeFile.mockResolvedValue();

      const result = await tool.exportContext(context, 'json', outputPath);

      expect(result.success).toBe(true);
      expect(result.path).toBe(outputPath);
      expect(fs.writeFile).toHaveBeenCalled();
    });
  });

  describe('formatAsTree', () => {
    it('should format context as tree structure', () => {
      const context = {
        project: {
          name: 'test-project',
          structure: { stats: { totalFiles: 100, totalDirectories: 20 } },
          dependencies: { count: { production: 5, development: 10 } }
        },
        git: {
          repository: true,
          branch: 'main',
          status: { clean: true },
          divergence: { behind: 0, ahead: 2 },
          recommendations: []
        }
      };

      const tree = tool.formatAsTree(context);

      expect(tree).toContain('Project Context');
      expect(tree).toContain('test-project');
      expect(tree).toContain('Files: 100');
      expect(tree).toContain('Branch: main');
    });
  });
});
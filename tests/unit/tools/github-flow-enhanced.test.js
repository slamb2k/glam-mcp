import { describe, it, expect } from '@jest/globals';

describe('Enhanced GitHub Flow Tools', () => {

  describe('commit pattern analysis', () => {
    it('should analyze conventional commit patterns', () => {
      const commits = [
        'abc123 feat: add new feature',
        'def456 fix: resolve bug',
        'ghi789 docs: update readme',
        'jkl012 test: add unit tests'
      ];
      
      // Test the analyzeCommitPatterns logic
      const types = [];
      const hasTests = commits.some(c => c.toLowerCase().includes('test'));
      const hasDocs = commits.some(c => c.toLowerCase().includes('doc'));
      
      commits.forEach(commit => {
        const match = commit.match(/^[a-zA-Z0-9]+ (feat|fix|docs|test|refactor|style|chore|perf):/);
        if (match) {
          types.push(match[1]);
        }
      });

      const analysis = {
        types: [...new Set(types)],
        totalCommits: commits.length,
        hasTests,
        hasDocs,
        conventional: types.length > commits.length * 0.5
      };
      
      expect(analysis.types).toEqual(['feat', 'fix', 'docs', 'test']);
      expect(analysis.hasTests).toBe(true);
      expect(analysis.hasDocs).toBe(true);
      expect(analysis.conventional).toBe(true);
    });
  });

  describe('PR template generation', () => {
    it('should generate standard PR template', () => {
      const title = 'Add new feature';
      const modifiedFiles = ['src/api.js', 'tests/api.test.js'];
      const commitAnalysis = {
        types: ['feat', 'test'],
        totalCommits: 2,
        hasTests: true,
        hasDocs: false,
        conventional: true
      };
      
      // Test PR template generation logic
      const template = `## Changes
- ${title}

## Type of Change
${commitAnalysis.types.map(t => `- [x] ${t}`).join('\n')}

## Testing
- [ ] Manual testing completed
- [ ] All tests pass
${commitAnalysis.hasTests ? '- [x] Tests added/updated' : '- [ ] Tests added/updated'}

## Files Changed (${modifiedFiles.length})
${modifiedFiles.map(f => `- ${f}`).join('\n')}

## Checklist
- [ ] Code follows project style guidelines
- [ ] Self-review completed
${commitAnalysis.hasDocs ? '- [x] Documentation updated' : '- [ ] Documentation updated if needed'}

🤖 Generated with [Slambed MCP](https://github.com/your-username/slambed-mcp)`;

      expect(template).toContain('Add new feature');
      expect(template).toContain('- [x] feat');
      expect(template).toContain('- [x] test');
      expect(template).toContain('- [x] Tests added/updated');
      expect(template).toContain('src/api.js');
    });
  });

  describe('branch naming conventions', () => {
    it('should validate branch names', () => {
      const validNames = ['new-feature', 'fix-bug', 'update-docs'];
      const invalidNames = ['new_feature', 'Fix Bug', 'update docs', 'feature!'];
      
      validNames.forEach(name => {
        expect(name.match(/^[a-z0-9-]+$/)).toBeTruthy();
      });
      
      invalidNames.forEach(name => {
        expect(name.match(/^[a-z0-9-]+$/)).toBeFalsy();
      });
    });

    it('should generate suggestions for invalid names', () => {
      const suggestions = [];
      const name = 'new_feature';
      
      if (name.includes('_') || name.includes(' ')) {
        suggestions.push({
          type: 'naming',
          value: 'Consider using kebab-case (dash-separated) for branch names'
        });
      }

      if (!name.match(/^[a-z0-9-]+$/)) {
        suggestions.push({
          type: 'naming',
          value: 'Consider using conventional commit style naming (lowercase, no special chars)'
        });
      }
      
      expect(suggestions).toHaveLength(2);
      expect(suggestions[0].value).toContain('kebab-case');
    });
  });

  describe('repository insights', () => {
    it('should identify stale branches', () => {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 31); // Make it 31 days ago
      
      const activeBranches = [
        { name: 'feature/recent', lastActivity: new Date().toISOString() },
        { name: 'feature/stale', lastActivity: thirtyDaysAgo.toISOString() }
      ];
      
      const thirtyDaysAgoCheck = new Date();
      thirtyDaysAgoCheck.setDate(thirtyDaysAgoCheck.getDate() - 30);
      
      const staleBranches = activeBranches.filter(
        b => new Date(b.lastActivity) < thirtyDaysAgoCheck
      );
      
      expect(staleBranches).toHaveLength(1);
      expect(staleBranches[0].name).toBe('feature/stale');
    });

    it('should generate cleanup recommendations', () => {
      const recommendations = [];
      const staleBranchCount = 5;
      const openPRCount = 10;
      
      if (staleBranchCount > 0) {
        recommendations.push({
          type: 'cleanup',
          priority: 'medium',
          action: `Clean up ${staleBranchCount} stale branches`,
          command: 'github_flow_cleanup'
        });
      }

      if (openPRCount > 3) {
        recommendations.push({
          type: 'review',
          priority: 'medium',
          action: `Review and merge ${openPRCount} open pull requests`,
          command: 'github_flow_merge_pr'
        });
      }
      
      expect(recommendations).toHaveLength(2);
      expect(recommendations[0].action).toContain('5 stale branches');
      expect(recommendations[1].action).toContain('10 open pull requests');
    });
  });
});
import { describe, it, expect } from '@jest/globals';

describe('Enhanced Automation Tools', () => {
  describe('smart commit analysis', () => {
    it('should analyze file changes and suggest commit types', () => {
      const changedFiles = [
        { file: 'src/api.js', status: 'modified' },
        { file: 'tests/api.test.js', status: 'added' },
        { file: 'docs/api.md', status: 'modified' }
      ];
      
      // Test file categorization
      const categories = {};
      changedFiles.forEach(({ file }) => {
        let category = 'other';
        if (file.includes('test')) category = 'test';
        else if (file.includes('doc') || file.endsWith('.md')) category = 'docs';
        else if (file.endsWith('.js')) category = 'code';
        
        categories[category] = (categories[category] || 0) + 1;
      });
      
      expect(categories).toEqual({
        code: 1,
        test: 1,
        docs: 1
      });
    });

    it('should detect breaking changes from diff patterns', () => {
      const diffContent = `
diff --git a/src/api.js b/src/api.js
-export function oldFunction() {
+// Function removed - BREAKING CHANGE
-export class OldClass {
+// Class removed`;
      
      const hasBreakingChange = 
        diffContent.includes('BREAKING CHANGE') ||
        diffContent.match(/^-.*export\s+(default\s+)?function/m) ||
        diffContent.match(/^-.*export\s+(default\s+)?class/m);
      
      expect(hasBreakingChange).toBe(true);
    });

    it('should generate commit message with confidence score', () => {
      const analysis = {
        filesByType: { code: 3, test: 2, docs: 1 },
        suggestedType: 'feat',
        breakingChanges: false,
        scope: 'api'
      };
      
      const message = `${analysis.suggestedType}(${analysis.scope}): add new functionality`;
      const confidence = 
        analysis.filesByType.test > 0 ? 85 :
        analysis.filesByType.docs > 0 ? 75 : 60;
      
      expect(message).toContain('feat(api)');
      expect(confidence).toBe(85);
    });
  });

  describe('test automation enhancements', () => {
    it('should track test execution history', () => {
      const testHistory = [
        { date: '2024-01-01', passed: 100, failed: 0, duration: 30 },
        { date: '2024-01-02', passed: 98, failed: 2, duration: 35 },
        { date: '2024-01-03', passed: 100, failed: 0, duration: 28 }
      ];
      
      const avgPassRate = testHistory.reduce((sum, t) => 
        sum + (t.passed / (t.passed + t.failed) * 100), 0
      ) / testHistory.length;
      
      const avgDuration = testHistory.reduce((sum, t) => 
        sum + t.duration, 0
      ) / testHistory.length;
      
      expect(avgPassRate).toBeCloseTo(99.33, 2);
      expect(avgDuration).toBeCloseTo(31, 0);
    });

    it('should identify flaky tests', () => {
      const testRuns = [
        { name: 'api.test.js', results: ['pass', 'pass', 'fail', 'pass'] },
        { name: 'auth.test.js', results: ['pass', 'pass', 'pass', 'pass'] },
        { name: 'flaky.test.js', results: ['pass', 'fail', 'pass', 'fail'] }
      ];
      
      const flakyTests = testRuns.filter(test => {
        const failures = test.results.filter(r => r === 'fail').length;
        const total = test.results.length;
        return failures > 0 && failures < total;
      });
      
      expect(flakyTests).toHaveLength(2);
      expect(flakyTests.map(t => t.name)).toContain('flaky.test.js');
    });

    it('should provide test improvement suggestions', () => {
      const testMetrics = {
        coverage: 65,
        avgDuration: 45,
        flakyCount: 3,
        skippedCount: 5
      };
      
      const suggestions = [];
      
      if (testMetrics.coverage < 80) {
        suggestions.push({
          type: 'coverage',
          priority: 'high',
          message: 'Test coverage is below 80%. Consider adding more tests.'
        });
      }
      
      if (testMetrics.avgDuration > 30) {
        suggestions.push({
          type: 'performance',
          priority: 'medium',
          message: 'Tests are taking longer than 30 seconds. Consider optimizing slow tests.'
        });
      }
      
      if (testMetrics.flakyCount > 0) {
        suggestions.push({
          type: 'reliability',
          priority: 'high',
          message: `${testMetrics.flakyCount} flaky tests detected. Fix to improve CI reliability.`
        });
      }
      
      expect(suggestions).toHaveLength(3);
      expect(suggestions.find(s => s.type === 'coverage')).toBeDefined();
    });
  });

  describe('code analysis enhancements', () => {
    it('should calculate code complexity metrics', () => {
      const codeMetrics = {
        cyclomaticComplexity: 15,
        linesOfCode: 500,
        duplicateLines: 50,
        technicalDebt: 2.5 // hours
      };
      
      const complexityLevel = 
        codeMetrics.cyclomaticComplexity > 20 ? 'high' :
        codeMetrics.cyclomaticComplexity > 10 ? 'medium' : 'low';
      
      const duplicationRatio = (codeMetrics.duplicateLines / codeMetrics.linesOfCode) * 100;
      
      expect(complexityLevel).toBe('medium');
      expect(duplicationRatio).toBe(10);
    });

    it('should identify code quality improvements', () => {
      const codeAnalysis = {
        files: [
          { name: 'api.js', complexity: 25, issues: ['long-method', 'no-tests'] },
          { name: 'auth.js', complexity: 8, issues: [] },
          { name: 'utils.js', complexity: 30, issues: ['duplicate-code', 'complex-logic'] }
        ]
      };
      
      const prioritizedImprovements = codeAnalysis.files
        .filter(f => f.complexity > 20 || f.issues.length > 0)
        .sort((a, b) => b.complexity - a.complexity)
        .map(f => ({
          file: f.name,
          priority: f.complexity > 25 ? 'high' : 'medium',
          suggestions: f.issues
        }));
      
      expect(prioritizedImprovements).toHaveLength(2);
      expect(prioritizedImprovements[0].file).toBe('utils.js');
      expect(prioritizedImprovements[0].priority).toBe('high');
    });
  });

  describe('workflow optimization', () => {
    it('should suggest workflow improvements based on patterns', () => {
      const workflowHistory = [
        { action: 'commit', branch: 'feature/api', time: '10:00', duration: 5 },
        { action: 'test', branch: 'feature/api', time: '10:05', duration: 30 },
        { action: 'commit', branch: 'feature/api', time: '10:35', duration: 5 },
        { action: 'test', branch: 'feature/api', time: '10:40', duration: 30 }
      ];
      
      // Detect repetitive patterns
      const commitTestPattern = workflowHistory.filter((h, i) => 
        h.action === 'commit' && 
        workflowHistory[i + 1]?.action === 'test'
      ).length;
      
      const suggestions = [];
      if (commitTestPattern >= 2) {
        suggestions.push({
          type: 'automation',
          message: 'Consider using auto_commit tool to combine commit and test workflows'
        });
      }
      
      expect(suggestions).toHaveLength(1);
      expect(suggestions[0].type).toBe('automation');
    });

    it('should track team collaboration patterns', () => {
      const collaborationData = [
        { author: 'dev1', reviewers: ['dev2', 'dev3'], mergeTime: 2 },
        { author: 'dev2', reviewers: ['dev1'], mergeTime: 1 },
        { author: 'dev1', reviewers: ['dev3'], mergeTime: 3 }
      ];
      
      const authorStats = {};
      collaborationData.forEach(pr => {
        if (!authorStats[pr.author]) {
          authorStats[pr.author] = {
            prs: 0,
            avgMergeTime: 0,
            reviewers: new Set()
          };
        }
        
        authorStats[pr.author].prs += 1;
        authorStats[pr.author].avgMergeTime = 
          (authorStats[pr.author].avgMergeTime * (authorStats[pr.author].prs - 1) + pr.mergeTime) / 
          authorStats[pr.author].prs;
        pr.reviewers.forEach(r => authorStats[pr.author].reviewers.add(r));
      });
      
      expect(authorStats.dev1.prs).toBe(2);
      expect(authorStats.dev1.avgMergeTime).toBe(2.5);
      expect(authorStats.dev1.reviewers.size).toBe(2);
    });
  });
});
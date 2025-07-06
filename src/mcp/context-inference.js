import logger from '../utils/logger.js';

/**
 * Context Inference Engine
 * Derives higher-level context from raw data using rules and patterns
 */
export class ContextInferenceEngine {
  constructor(contextEngine) {
    this.contextEngine = contextEngine;
    this.rules = this.initializeRules();
    this.patterns = this.initializePatterns();
  }

  /**
   * Initialize inference rules
   */
  initializeRules() {
    return {
      workflow: {
        featureDevelopment: (context) => {
          const branch = context.git?.currentBranch || '';
          return branch.includes('feature/') || branch.includes('feat/');
        },
        bugFixing: (context) => {
          const branch = context.git?.currentBranch || '';
          return branch.includes('fix/') || branch.includes('bugfix/') || branch.includes('hotfix/');
        },
        release: (context) => {
          const branch = context.git?.currentBranch || '';
          return branch.includes('release/');
        },
        documentation: (context) => {
          const branch = context.git?.currentBranch || '';
          const recentFiles = context.user?.activities?.filter(a => a.type === 'file_edit') || [];
          return branch.includes('docs/') || 
                 recentFiles.some(f => f.path?.includes('.md') || f.path?.includes('README'));
        }
      },
      
      projectState: {
        hasUncommittedChanges: (context) => {
          return context.git?.status?.files?.length > 0;
        },
        hasConflicts: (context) => {
          return context.git?.conflicts?.length > 0;
        },
        isClean: (context) => {
          return context.git?.status?.isClean === true;
        },
        needsPush: (context) => {
          return context.git?.status?.ahead > 0;
        },
        needsPull: (context) => {
          return context.git?.status?.behind > 0;
        },
        isOutOfSync: (context) => {
          return (context.git?.status?.ahead > 0 && context.git?.status?.behind > 0);
        }
      },
      
      userIntent: {
        wantsToCommit: (context) => {
          const recent = context.user?.activities?.slice(-5) || [];
          return recent.some(a => 
            a.type === 'command' && 
            (a.command?.includes('commit') || a.command?.includes('add'))
          );
        },
        wantsToMerge: (context) => {
          const recent = context.user?.activities?.slice(-5) || [];
          return recent.some(a => 
            a.type === 'command' && 
            (a.command?.includes('merge') || a.command?.includes('pull'))
          );
        },
        isDebugging: (context) => {
          const recent = context.user?.activities?.slice(-10) || [];
          return recent.filter(a => 
            a.type === 'file_edit' && 
            (a.action === 'debug' || a.path?.includes('test'))
          ).length > 3;
        },
        isRefactoring: (context) => {
          const recent = context.user?.activities?.slice(-20) || [];
          const edits = recent.filter(a => a.type === 'file_edit');
          const uniqueFiles = new Set(edits.map(e => e.path));
          return uniqueFiles.size > 5 && !this.rules.userIntent.isDebugging(context);
        }
      },
      
      teamDynamics: {
        hasActiveCollaboration: (context) => {
          const recentTeam = context.team?.activities?.slice(-30) || [];
          const uniqueMembers = new Set(recentTeam.map(a => a.member));
          return uniqueMembers.size > 1;
        },
        hasRecentConflicts: (context) => {
          const recentTeam = context.team?.activities?.slice(-10) || [];
          return recentTeam.some(a => a.type === 'merge_conflict');
        }
      }
    };
  }

  /**
   * Initialize pattern matchers
   */
  initializePatterns() {
    return {
      commitPatterns: {
        conventional: /^(feat|fix|docs|style|refactor|test|chore|perf|ci|build|revert)(\(.+\))?: .+/,
        ticket: /^(\w+-\d+): .+/,
        semantic: /^(Added|Changed|Deprecated|Removed|Fixed|Security): .+/
      },
      
      filePatterns: {
        test: /\.(test|spec)\.(js|ts|jsx|tsx)$/,
        config: /^(\..*rc|.*\.config\.(js|json|ts))$/,
        documentation: /\.(md|rst|txt)$/,
        source: /\.(js|ts|jsx|tsx|py|java|go|rs|cpp|c)$/
      },
      
      branchPatterns: {
        feature: /^(feature|feat)\/.+/,
        bugfix: /^(fix|bugfix|hotfix)\/.+/,
        release: /^release\/.+/,
        experimental: /^(exp|experiment|spike)\/.+/
      }
    };
  }

  /**
   * Infer high-level context
   */
  async infer(contextSnapshot) {
    const inferences = {
      workflow: {},
      projectState: {},
      userIntent: {},
      teamDynamics: {},
      recommendations: []
    };

    // Apply rules
    for (const [category, rules] of Object.entries(this.rules)) {
      for (const [ruleName, rule] of Object.entries(rules)) {
        try {
          inferences[category][ruleName] = rule(contextSnapshot);
        } catch (error) {
          logger.error(`Error applying rule ${category}.${ruleName}:`, error);
          inferences[category][ruleName] = null;
        }
      }
    }

    // Generate recommendations
    inferences.recommendations = this.generateRecommendations(inferences, contextSnapshot);

    // Add pattern analysis
    inferences.patterns = this.analyzePatterns(contextSnapshot);

    // Add risk assessment
    inferences.risks = this.assessRisks(contextSnapshot, inferences);

    return inferences;
  }

  /**
   * Generate recommendations based on inferences
   */
  generateRecommendations(inferences, _context) {
    const recommendations = [];

    // Git state recommendations
    if (inferences.projectState.hasUncommittedChanges) {
      recommendations.push({
        type: 'git',
        priority: 'medium',
        message: 'You have uncommitted changes. Consider committing or stashing them.',
        action: 'commit'
      });
    }

    if (inferences.projectState.hasConflicts) {
      recommendations.push({
        type: 'git',
        priority: 'high',
        message: 'Merge conflicts detected. Resolve them before proceeding.',
        action: 'resolve_conflicts'
      });
    }

    if (inferences.projectState.needsPush) {
      recommendations.push({
        type: 'git',
        priority: 'low',
        message: 'You have local commits not pushed to remote.',
        action: 'push'
      });
    }

    if (inferences.projectState.needsPull) {
      recommendations.push({
        type: 'git',
        priority: 'medium',
        message: 'Remote has new commits. Consider pulling latest changes.',
        action: 'pull'
      });
    }

    // Workflow recommendations
    if (inferences.workflow.featureDevelopment && inferences.projectState.isClean) {
      recommendations.push({
        type: 'workflow',
        priority: 'low',
        message: 'Feature branch is clean. Ready to create pull request?',
        action: 'create_pr'
      });
    }

    if (inferences.userIntent.isRefactoring) {
      recommendations.push({
        type: 'workflow',
        priority: 'low',
        message: 'Detected refactoring activity. Consider running tests frequently.',
        action: 'run_tests'
      });
    }

    // Team recommendations
    if (inferences.teamDynamics.hasActiveCollaboration && inferences.projectState.needsPull) {
      recommendations.push({
        type: 'team',
        priority: 'high',
        message: 'Active team collaboration detected. Pull latest changes to avoid conflicts.',
        action: 'pull'
      });
    }

    return recommendations;
  }

  /**
   * Analyze patterns in the context
   */
  analyzePatterns(context) {
    const analysis = {
      commitStyle: 'unknown',
      branchingStrategy: 'unknown',
      fileTypes: {}
    };

    // Analyze commit patterns
    const recentCommits = context.git?.commits?.slice(0, 10) || [];
    for (const commit of recentCommits) {
      for (const [style, pattern] of Object.entries(this.patterns.commitPatterns)) {
        if (pattern.test(commit.message)) {
          analysis.commitStyle = style;
          break;
        }
      }
      if (analysis.commitStyle !== 'unknown') break;
    }

    // Analyze branching strategy
    const branches = context.git?.branches || [];
    const branchTypes = {};
    for (const branch of branches) {
      for (const [type, pattern] of Object.entries(this.patterns.branchPatterns)) {
        if (pattern.test(branch)) {
          branchTypes[type] = (branchTypes[type] || 0) + 1;
        }
      }
    }
    
    if (Object.keys(branchTypes).length > 0) {
      analysis.branchingStrategy = Object.entries(branchTypes)
        .sort((a, b) => b[1] - a[1])[0][0];
    }

    // Analyze file types
    const files = context.project?.files || [];
    for (const file of files) {
      for (const [type, pattern] of Object.entries(this.patterns.filePatterns)) {
        if (pattern.test(file.path)) {
          analysis.fileTypes[type] = (analysis.fileTypes[type] || 0) + 1;
        }
      }
    }

    return analysis;
  }

  /**
   * Assess risks based on context and inferences
   */
  assessRisks(context, inferences) {
    const risks = [];

    // Large number of uncommitted changes
    const changedFiles = context.git?.status?.files?.length || 0;
    if (changedFiles > 20) {
      risks.push({
        level: 'high',
        type: 'commit_size',
        message: `Large number of uncommitted files (${changedFiles}). Consider breaking into smaller commits.`
      });
    }

    // Out of sync with remote
    if (inferences.projectState.isOutOfSync) {
      risks.push({
        level: 'high',
        type: 'sync',
        message: 'Branch is both ahead and behind remote. High risk of conflicts.'
      });
    }

    // Long-running feature branch
    const currentBranch = context.git?.currentBranch || '';
    const branchAge = this.calculateBranchAge(context, currentBranch);
    if (branchAge > 7 && inferences.workflow.featureDevelopment) {
      risks.push({
        level: 'medium',
        type: 'stale_branch',
        message: `Feature branch is ${branchAge} days old. Consider merging or rebasing.`
      });
    }

    // No recent tests
    const recentTests = context.user?.activities?.filter(a => 
      a.type === 'command' && a.command?.includes('test')
    ) || [];
    if (recentTests.length === 0 && changedFiles > 5) {
      risks.push({
        level: 'medium',
        type: 'no_tests',
        message: 'No recent test runs detected with multiple file changes.'
      });
    }

    return risks;
  }

  /**
   * Calculate age of a branch in days
   */
  calculateBranchAge(context, branchName) {
    const commits = context.git?.commits || [];
    const branchCommits = commits.filter(c => c.refs?.includes(branchName));
    
    if (branchCommits.length === 0) return 0;
    
    const oldestCommit = branchCommits[branchCommits.length - 1];
    const commitDate = new Date(oldestCommit.date);
    const now = new Date();
    
    return Math.floor((now - commitDate) / (1000 * 60 * 60 * 24));
  }

  /**
   * Get inference for a specific aspect
   */
  getInference(aspect, rule) {
    const context = this.contextEngine.getSnapshot();
    
    if (this.rules[aspect] && this.rules[aspect][rule]) {
      return this.rules[aspect][rule](context);
    }
    
    return null;
  }

  /**
   * Update inference rules dynamically
   */
  addRule(category, ruleName, ruleFn) {
    if (!this.rules[category]) {
      this.rules[category] = {};
    }
    this.rules[category][ruleName] = ruleFn;
  }

  /**
   * Update patterns dynamically
   */
  addPattern(category, patternName, pattern) {
    if (!this.patterns[category]) {
      this.patterns[category] = {};
    }
    this.patterns[category][patternName] = pattern;
  }
}

export default ContextInferenceEngine;
import simpleGit from 'simple-git';
import chalk from 'chalk';
import path from 'path';
import fs from 'fs-extra';
import contextEngine from '../context-engine.js';
import stateManager from '../state-manager.js';
import logger from '../../utils/logger.js';
import { execSync } from 'child_process';

/**
 * SLAM Develop - Development Workflow Tool
 * Manages feature development workflows with git integration
 */
export class SlamDevelopTool {
  constructor() {
    this.git = simpleGit();
    this.workflowSteps = [
      'setup',
      'branch',
      'develop',
      'commit',
      'test',
      'push',
      'pr'
    ];
  }

  /**
   * Main development workflow entry point
   */
  async develop(options = {}) {
    try {
      // Initialize workflow state
      const workflowId = await this.initializeWorkflow(options);
      
      // Get current context
      const context = await contextEngine.getInferredContext();
      const snapshot = contextEngine.getSnapshot();
      
      // Determine workflow type
      const workflowType = this.determineWorkflowType(options, context);
      
      // Execute workflow
      const result = await this.executeWorkflow(workflowId, workflowType, options);
      
      // Update workflow state
      await this.finalizeWorkflow(workflowId, result);
      
      return result;
    } catch (error) {
      logger.error('Development workflow error:', error);
      throw error;
    }
  }

  /**
   * Initialize workflow state
   */
  async initializeWorkflow(options) {
    const workflowId = stateManager.generateId();
    
    await stateManager.createTask({
      id: workflowId,
      type: 'development_workflow',
      status: 'in-progress',
      data: {
        options,
        steps: [],
        startedAt: new Date().toISOString()
      }
    });
    
    // Log audit
    await stateManager.logAudit({
      action: 'workflow_started',
      resource: 'slam_develop',
      details: { workflowId, options }
    });
    
    return workflowId;
  }

  /**
   * Determine workflow type based on context
   */
  determineWorkflowType(options, context) {
    if (options.type) {
      return options.type;
    }
    
    // Infer from context
    if (context.workflow.featureDevelopment) {
      return 'feature';
    } else if (context.workflow.bugFixing) {
      return 'bugfix';
    } else if (context.workflow.documentation) {
      return 'docs';
    }
    
    return 'feature'; // default
  }

  /**
   * Execute development workflow
   */
  async executeWorkflow(workflowId, type, options) {
    const steps = [];
    const results = {
      workflowId,
      type,
      success: true,
      steps: [],
      summary: {}
    };
    
    try {
      // Step 1: Setup and validation
      const setupResult = await this.setupWorkflow(options);
      steps.push({ name: 'setup', ...setupResult });
      results.steps.push(setupResult);
      
      // Step 2: Create/checkout branch
      const branchResult = await this.manageBranch(type, options);
      steps.push({ name: 'branch', ...branchResult });
      results.steps.push(branchResult);
      results.summary.branch = branchResult.branch;
      
      // Step 3: Development guidance
      const devResult = await this.provideDevelopmentGuidance(type, options);
      steps.push({ name: 'develop', ...devResult });
      results.steps.push(devResult);
      
      // Step 4: Commit changes (if requested)
      if (options.autoCommit || options.commit) {
        const commitResult = await this.commitChanges(options);
        steps.push({ name: 'commit', ...commitResult });
        results.steps.push(commitResult);
        results.summary.commit = commitResult.commit;
      }
      
      // Step 5: Run tests (if available)
      if (options.runTests !== false) {
        const testResult = await this.runTests(options);
        steps.push({ name: 'test', ...testResult });
        results.steps.push(testResult);
        results.summary.testsPass = testResult.success;
      }
      
      // Step 6: Push changes (if requested)
      if (options.push) {
        const pushResult = await this.pushChanges(branchResult.branch, options);
        steps.push({ name: 'push', ...pushResult });
        results.steps.push(pushResult);
        results.summary.pushed = pushResult.success;
      }
      
      // Step 7: Create PR (if requested)
      if (options.createPR) {
        const prResult = await this.createPullRequest(branchResult.branch, options);
        steps.push({ name: 'pr', ...prResult });
        results.steps.push(prResult);
        results.summary.prUrl = prResult.url;
      }
      
      // Update workflow state
      await stateManager.updateTask(workflowId, {
        data: { steps, results: results.summary }
      });
      
    } catch (error) {
      results.success = false;
      results.error = error.message;
      logger.error('Workflow execution error:', error);
    }
    
    return results;
  }

  /**
   * Setup and validate workflow
   */
  async setupWorkflow(options) {
    const result = {
      step: 'setup',
      success: true,
      checks: {}
    };
    
    try {
      // Check git repository
      const isRepo = await this.git.checkIsRepo();
      result.checks.gitRepo = isRepo;
      
      if (!isRepo) {
        throw new Error('Not in a git repository');
      }
      
      // Check for uncommitted changes
      const status = await this.git.status();
      result.checks.cleanWorkingDirectory = status.isClean();
      result.checks.uncommittedFiles = status.files.length;
      
      // Check remote configuration
      const remotes = await this.git.getRemotes(true);
      result.checks.hasRemote = remotes.length > 0;
      result.remote = remotes[0]?.name;
      
      // Get current branch
      result.currentBranch = status.current;
      
      // Check for package.json (Node.js project)
      const hasPackageJson = await fs.pathExists('package.json');
      if (hasPackageJson) {
        const packageData = await fs.readJson('package.json');
        result.checks.hasTestScript = !!packageData.scripts?.test;
        result.checks.hasLintScript = !!packageData.scripts?.lint;
      }
      
      result.message = 'Workflow setup complete';
      
    } catch (error) {
      result.success = false;
      result.error = error.message;
    }
    
    return result;
  }

  /**
   * Manage branch creation/checkout
   */
  async manageBranch(type, options) {
    const result = {
      step: 'branch',
      success: true
    };
    
    try {
      const status = await this.git.status();
      const currentBranch = status.current;
      
      // Determine branch name
      let branchName = options.branch;
      
      if (!branchName) {
        // Generate branch name
        const prefix = this.getBranchPrefix(type);
        const description = options.description || 'feature';
        const sanitized = description.toLowerCase()
          .replace(/[^a-z0-9-]/g, '-')
          .replace(/-+/g, '-')
          .substring(0, 30);
        
        branchName = `${prefix}/${sanitized}`;
        
        if (options.includeDate) {
          const date = new Date().toISOString().split('T')[0];
          branchName += `-${date}`;
        }
      }
      
      result.branch = branchName;
      
      // Check if branch exists
      const branches = await this.git.branchLocal();
      const branchExists = branches.all.includes(branchName);
      
      if (branchExists && !options.useExisting) {
        // Switch to existing branch
        await this.git.checkout(branchName);
        result.action = 'switched';
        result.message = `Switched to existing branch: ${branchName}`;
      } else if (!branchExists) {
        // Create new branch
        await this.git.checkoutBranch(branchName, currentBranch);
        result.action = 'created';
        result.message = `Created and switched to new branch: ${branchName}`;
      } else {
        // Use existing branch
        await this.git.checkout(branchName);
        result.action = 'reused';
        result.message = `Using existing branch: ${branchName}`;
      }
      
      // Track user activity
      contextEngine.trackUserActivity({
        type: 'branch_operation',
        action: result.action,
        branch: branchName
      });
      
    } catch (error) {
      result.success = false;
      result.error = error.message;
    }
    
    return result;
  }

  /**
   * Get branch prefix based on type
   */
  getBranchPrefix(type) {
    const prefixes = {
      feature: 'feature',
      bugfix: 'fix',
      hotfix: 'hotfix',
      docs: 'docs',
      chore: 'chore',
      refactor: 'refactor'
    };
    
    return prefixes[type] || 'feature';
  }

  /**
   * Provide development guidance
   */
  async provideDevelopmentGuidance(type, options) {
    const result = {
      step: 'develop',
      success: true,
      guidance: []
    };
    
    try {
      const context = await contextEngine.getInferredContext();
      
      // General guidance
      result.guidance.push({
        title: 'Development Best Practices',
        items: [
          'Write clean, readable code with meaningful variable names',
          'Follow existing code style and conventions',
          'Add appropriate error handling',
          'Write tests for new functionality',
          'Update documentation as needed'
        ]
      });
      
      // Type-specific guidance
      switch (type) {
        case 'feature':
          result.guidance.push({
            title: 'Feature Development',
            items: [
              'Start with a clear understanding of requirements',
              'Break down the feature into small, testable components',
              'Consider edge cases and error scenarios',
              'Ensure backward compatibility',
              'Add feature flags if needed for gradual rollout'
            ]
          });
          break;
          
        case 'bugfix':
          result.guidance.push({
            title: 'Bug Fixing',
            items: [
              'Reproduce the bug consistently',
              'Write a failing test that demonstrates the bug',
              'Fix the bug with minimal code changes',
              'Ensure the test passes after the fix',
              'Check for similar bugs in related code'
            ]
          });
          break;
          
        case 'docs':
          result.guidance.push({
            title: 'Documentation',
            items: [
              'Use clear, concise language',
              'Include code examples where appropriate',
              'Keep documentation up-to-date with code changes',
              'Add diagrams for complex concepts',
              'Check for spelling and grammar errors'
            ]
          });
          break;
      }
      
      // Context-based recommendations
      if (context.recommendations && context.recommendations.length > 0) {
        result.guidance.push({
          title: 'Context-Based Recommendations',
          items: context.recommendations.map(r => r.message)
        });
      }
      
      // Next steps
      result.nextSteps = [
        'Make your code changes',
        'Test your changes locally',
        'Run: slam "commit my changes" when ready',
        'Run: slam "push to remote" to share your work'
      ];
      
      result.message = 'Development guidance provided';
      
    } catch (error) {
      result.success = false;
      result.error = error.message;
    }
    
    return result;
  }

  /**
   * Commit changes
   */
  async commitChanges(options) {
    const result = {
      step: 'commit',
      success: true
    };
    
    try {
      const status = await this.git.status();
      
      if (status.files.length === 0) {
        result.message = 'No changes to commit';
        return result;
      }
      
      // Stage files
      if (options.files && options.files.length > 0) {
        await this.git.add(options.files);
      } else {
        await this.git.add('.');
      }
      
      // Generate or use commit message
      let commitMessage = options.message;
      
      if (!commitMessage) {
        // Generate commit message based on changes
        const diff = await this.git.diff(['--cached', '--name-status']);
        commitMessage = this.generateCommitMessage(diff, options);
      }
      
      // Commit
      const commit = await this.git.commit(commitMessage);
      
      result.commit = {
        hash: commit.commit,
        message: commitMessage,
        files: status.files.length
      };
      
      result.message = `Committed ${status.files.length} files`;
      
      // Track activity
      contextEngine.trackUserActivity({
        type: 'commit',
        message: commitMessage,
        files: status.files.length
      });
      
    } catch (error) {
      result.success = false;
      result.error = error.message;
    }
    
    return result;
  }

  /**
   * Generate commit message from changes
   */
  generateCommitMessage(diff, options) {
    const lines = diff.split('\n').filter(l => l.trim());
    const added = lines.filter(l => l.startsWith('A')).length;
    const modified = lines.filter(l => l.startsWith('M')).length;
    const deleted = lines.filter(l => l.startsWith('D')).length;
    
    const type = options.type || 'feat';
    const scope = options.scope || '';
    
    let message = type;
    if (scope) {
      message += `(${scope})`;
    }
    message += ': ';
    
    const changes = [];
    if (added > 0) changes.push(`add ${added} files`);
    if (modified > 0) changes.push(`update ${modified} files`);
    if (deleted > 0) changes.push(`remove ${deleted} files`);
    
    message += changes.join(', ');
    
    return message;
  }

  /**
   * Run tests
   */
  async runTests(options) {
    const result = {
      step: 'test',
      success: true,
      tests: {}
    };
    
    try {
      // Check for test command
      const hasPackageJson = await fs.pathExists('package.json');
      
      if (!hasPackageJson) {
        result.message = 'No package.json found - skipping tests';
        return result;
      }
      
      const packageData = await fs.readJson('package.json');
      const testScript = packageData.scripts?.test;
      
      if (!testScript) {
        result.message = 'No test script found - skipping tests';
        return result;
      }
      
      // Run tests
      result.message = 'Running tests...';
      
      try {
        const output = execSync('npm test', { 
          encoding: 'utf8',
          stdio: 'pipe'
        });
        
        result.tests.passed = true;
        result.tests.output = output;
        result.message = 'All tests passed';
        
      } catch (error) {
        result.tests.passed = false;
        result.tests.output = error.stdout || error.message;
        result.success = false;
        result.message = 'Tests failed';
      }
      
    } catch (error) {
      result.success = false;
      result.error = error.message;
    }
    
    return result;
  }

  /**
   * Push changes to remote
   */
  async pushChanges(branch, options) {
    const result = {
      step: 'push',
      success: true
    };
    
    try {
      const remotes = await this.git.getRemotes();
      
      if (remotes.length === 0) {
        throw new Error('No remote repository configured');
      }
      
      const remote = options.remote || remotes[0].name;
      
      // Push with upstream
      await this.git.push(remote, branch, ['--set-upstream']);
      
      result.remote = remote;
      result.branch = branch;
      result.message = `Pushed to ${remote}/${branch}`;
      
      // Track activity
      contextEngine.trackUserActivity({
        type: 'push',
        branch,
        remote
      });
      
    } catch (error) {
      result.success = false;
      result.error = error.message;
    }
    
    return result;
  }

  /**
   * Create pull request
   */
  async createPullRequest(branch, options) {
    const result = {
      step: 'pr',
      success: true
    };
    
    try {
      // Get remote URL
      const remotes = await this.git.getRemotes(true);
      const remoteUrl = remotes[0]?.refs?.push || remotes[0]?.refs?.fetch;
      
      if (!remoteUrl) {
        throw new Error('No remote URL found');
      }
      
      // Extract GitHub info
      const githubMatch = remoteUrl.match(/github\.com[:/]([^/]+)\/([^.]+)/);
      
      if (!githubMatch) {
        result.message = 'Not a GitHub repository - manual PR creation required';
        result.instruction = `Create PR manually at: ${remoteUrl}`;
        return result;
      }
      
      const [, owner, repo] = githubMatch;
      
      // Check for GitHub CLI
      try {
        execSync('gh --version', { stdio: 'ignore' });
        
        // Create PR using GitHub CLI
        const title = options.prTitle || `Feature: ${branch}`;
        const body = options.prBody || 'Automated PR created by slam_develop';
        
        const output = execSync(
          `gh pr create --title "${title}" --body "${body}" --head ${branch}`,
          { encoding: 'utf8' }
        );
        
        const prUrlMatch = output.match(/(https:\/\/github\.com\/[^\s]+)/);
        result.url = prUrlMatch ? prUrlMatch[1] : null;
        result.message = 'Pull request created successfully';
        
      } catch (ghError) {
        // GitHub CLI not available
        const prUrl = `https://github.com/${owner}/${repo}/compare/${branch}?expand=1`;
        result.url = prUrl;
        result.message = 'GitHub CLI not found - open this URL to create PR';
        result.instruction = `Open: ${prUrl}`;
      }
      
    } catch (error) {
      result.success = false;
      result.error = error.message;
    }
    
    return result;
  }

  /**
   * Finalize workflow
   */
  async finalizeWorkflow(workflowId, result) {
    await stateManager.updateTask(workflowId, {
      status: result.success ? 'completed' : 'failed',
      completedAt: new Date().toISOString(),
      data: { result }
    });
    
    // Log audit
    await stateManager.logAudit({
      action: 'workflow_completed',
      resource: 'slam_develop',
      details: { 
        workflowId, 
        success: result.success,
        summary: result.summary
      }
    });
  }

  /**
   * Get workflow status
   */
  async getWorkflowStatus(workflowId) {
    return await stateManager.getTask(workflowId);
  }

  /**
   * List recent workflows
   */
  async listRecentWorkflows(limit = 10) {
    const tasks = await stateManager.getTasksByStatus('completed', 'development_workflow');
    const inProgress = await stateManager.getTasksByStatus('in-progress', 'development_workflow');
    
    return [...inProgress, ...tasks].slice(0, limit);
  }

  /**
   * Format workflow result for display
   */
  formatResult(result) {
    const lines = [];
    
    // Header
    lines.push(chalk.bold.blue('🚀 Development Workflow Result'));
    lines.push('');
    
    // Summary
    if (result.success) {
      lines.push(chalk.green('✓ Workflow completed successfully'));
    } else {
      lines.push(chalk.red('✗ Workflow failed'));
      if (result.error) {
        lines.push(chalk.red(`  Error: ${result.error}`));
      }
    }
    
    // Steps
    lines.push('');
    lines.push(chalk.dim('Steps completed:'));
    
    result.steps.forEach(step => {
      const icon = step.success ? chalk.green('✓') : chalk.red('✗');
      lines.push(`  ${icon} ${step.step}: ${step.message || step.error}`);
      
      // Additional details
      if (step.checks) {
        Object.entries(step.checks).forEach(([check, value]) => {
          const checkIcon = value ? '✓' : '✗';
          lines.push(`    ${chalk.gray(checkIcon)} ${check}: ${value}`);
        });
      }
      
      if (step.guidance) {
        step.guidance.forEach(section => {
          lines.push(`    ${chalk.dim(section.title)}:`);
          section.items.forEach(item => {
            lines.push(`      ${chalk.gray('•')} ${item}`);
          });
        });
      }
    });
    
    // Summary
    if (result.summary && Object.keys(result.summary).length > 0) {
      lines.push('');
      lines.push(chalk.dim('Summary:'));
      Object.entries(result.summary).forEach(([key, value]) => {
        lines.push(`  ${chalk.gray('•')} ${key}: ${chalk.cyan(value)}`);
      });
    }
    
    // Next steps
    const lastStep = result.steps[result.steps.length - 1];
    if (lastStep?.nextSteps) {
      lines.push('');
      lines.push(chalk.dim('Next steps:'));
      lastStep.nextSteps.forEach((step, i) => {
        lines.push(`  ${chalk.gray(`${i + 1}.`)} ${step}`);
      });
    }
    
    return lines.join('\n');
  }
}

// Export singleton instance
const slamDevelop = new SlamDevelopTool();

/**
 * Main slam_develop function
 */
export async function slam_develop(options = {}) {
  const result = await slamDevelop.develop(options);
  result.output = slamDevelop.formatResult(result);
  return result;
}

export default slamDevelop;
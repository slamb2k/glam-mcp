import chalk from 'chalk';
import { IntentResolver } from '../intent-resolver.js';
import contextEngine from '../context-engine.js';
import logger from '../../utils/logger.js';

/**
 * SLAM (Slambed Language Action Module)
 * Universal natural language interface for all Slambed functionality
 */
export class SlamTool {
  constructor() {
    this.intentResolver = new IntentResolver(contextEngine);
    this.actionHandlers = this.initializeActionHandlers();
    this.commandHistory = [];
    this.maxHistorySize = 100;
  }

  /**
   * Initialize action handlers for different intent types
   */
  initializeActionHandlers() {
    return {
      // Git operations
      commit: async (intent) => this.handleCommit(intent),
      push: async (intent) => this.handlePush(intent),
      pull: async (intent) => this.handlePull(intent),
      branch: async (intent) => this.handleBranch(intent),
      merge: async (intent) => this.handleMerge(intent),
      
      // Development workflows
      develop: async (intent) => this.handleDevelop(intent),
      deploy: async (intent) => this.handleDeploy(intent),
      test: async (intent) => this.handleTest(intent),
      
      // Context queries
      status: async (intent) => this.handleStatus(intent),
      context: async (intent) => this.handleContext(intent),
      
      // Collaboration
      collaborate: async (intent) => this.handleCollaborate(intent),
      
      // Help and info
      help: async (intent) => this.handleHelp(intent),
      
      // Special cases
      ambiguous: async (intent) => this.handleAmbiguous(intent),
      error: async (intent) => this.handleError(intent)
    };
  }

  /**
   * Main SLAM function - processes natural language input
   */
  async slam(input, options = {}) {
    try {
      // Add to history
      this.addToHistory(input);
      
      // Log the input
      logger.info(`SLAM input: ${input}`);
      
      // Resolve intent
      const intent = await this.intentResolver.resolve(input, options);
      logger.debug('Resolved intent:', intent);
      
      // Track user activity
      contextEngine.trackUserActivity({
        type: 'slam_command',
        command: input,
        intent: intent.type,
        timestamp: new Date().toISOString()
      });
      
      // Execute action
      const result = await this.executeAction(intent);
      
      // Format and return response
      return this.formatResponse(result, intent);
    } catch (error) {
      logger.error('SLAM error:', error);
      return this.formatErrorResponse(error, input);
    }
  }

  /**
   * Execute action based on intent
   */
  async executeAction(intent) {
    const handler = this.actionHandlers[intent.type];
    
    if (!handler) {
      return {
        success: false,
        message: `No handler found for intent type: ${intent.type}`,
        intent
      };
    }
    
    return await handler(intent);
  }

  /**
   * Handle commit intent
   */
  async handleCommit(intent) {
    const context = await contextEngine.getInferredContext();
    
    if (!context.projectState.hasUncommittedChanges) {
      return {
        success: false,
        message: 'No uncommitted changes found.',
        suggestion: 'Make some changes to your files first.'
      };
    }
    
    return {
      success: true,
      action: 'commit',
      message: 'Ready to commit changes.',
      details: {
        files: context.git.status?.files?.length || 0,
        branch: context.git.currentBranch
      },
      nextSteps: [
        'Run: git add -A',
        'Run: git commit -m "your message"',
        'Or use: slambed auto-commit'
      ]
    };
  }

  /**
   * Handle push intent
   */
  async handlePush(intent) {
    const context = await contextEngine.getInferredContext();
    
    if (!context.projectState.needsPush) {
      return {
        success: false,
        message: 'Nothing to push - your branch is up to date with remote.'
      };
    }
    
    return {
      success: true,
      action: 'push',
      message: `Ready to push ${context.git.status?.ahead || 0} commits.`,
      details: {
        branch: context.git.currentBranch,
        ahead: context.git.status?.ahead || 0
      },
      nextSteps: [
        `Run: git push origin ${context.git.currentBranch}`
      ]
    };
  }

  /**
   * Handle pull intent
   */
  async handlePull(intent) {
    const context = await contextEngine.getInferredContext();
    
    return {
      success: true,
      action: 'pull',
      message: 'Ready to pull latest changes.',
      details: {
        branch: context.git.currentBranch,
        behind: context.git.status?.behind || 0
      },
      nextSteps: [
        'Run: git pull',
        context.projectState.hasUncommittedChanges && 'Consider stashing changes first: git stash'
      ].filter(Boolean)
    };
  }

  /**
   * Handle branch intent
   */
  async handleBranch(intent) {
    const { params } = intent;
    
    if (params.name) {
      return {
        success: true,
        action: 'branch',
        message: `Ready to create/switch to branch: ${params.name}`,
        nextSteps: [
          `Run: git checkout -b ${params.name}`,
          `Or: git checkout ${params.name}`
        ]
      };
    }
    
    return {
      success: true,
      action: 'branch',
      message: 'Branch operation requires a branch name.',
      nextSteps: [
        'Specify a branch name: "create branch feature/my-feature"',
        'Or use: slambed create-branch --type feature'
      ]
    };
  }

  /**
   * Handle merge intent
   */
  async handleMerge(intent) {
    const context = contextEngine.getSnapshot();
    const currentBranch = context.git?.currentBranch;
    
    return {
      success: true,
      action: 'merge',
      message: `Ready to merge changes into ${currentBranch}.`,
      details: {
        currentBranch,
        hasConflicts: context.git?.conflicts?.length > 0
      },
      nextSteps: [
        'Specify source branch: git merge <branch-name>',
        'Or use: slambed git-flow merge'
      ]
    };
  }

  /**
   * Handle develop intent
   */
  async handleDevelop(intent) {
    return {
      success: true,
      action: 'develop',
      message: 'Starting development workflow.',
      tool: 'slam_develop',
      params: intent.params,
      nextSteps: [
        'This will guide you through:',
        '1. Creating a feature branch',
        '2. Setting up development environment',
        '3. Running tests',
        '4. Creating pull request when ready'
      ]
    };
  }

  /**
   * Handle deploy intent
   */
  async handleDeploy(intent) {
    const target = intent.params.target || 'production';
    
    return {
      success: true,
      action: 'deploy',
      message: `Ready to deploy to ${target}.`,
      tool: 'slam_ship',
      params: { target },
      warning: target === 'production' ? 'This will deploy to PRODUCTION!' : null,
      nextSteps: [
        'Ensure all tests pass',
        'Verify deployment configuration',
        `Run: slambed deploy --target ${target}`
      ]
    };
  }

  /**
   * Handle test intent
   */
  async handleTest(intent) {
    const context = contextEngine.getSnapshot();
    const hasTestScript = context.project?.scripts?.test;
    
    return {
      success: true,
      action: 'test',
      message: 'Ready to run tests.',
      details: {
        hasTestScript,
        testCommand: hasTestScript ? 'npm test' : null
      },
      nextSteps: hasTestScript ? 
        ['Run: npm test'] : 
        ['No test script found in package.json', 'Add a test script first']
    };
  }

  /**
   * Handle status intent
   */
  async handleStatus(intent) {
    const context = await contextEngine.getInferredContext();
    const snapshot = contextEngine.getSnapshot();
    
    return {
      success: true,
      action: 'status',
      message: 'Current project status:',
      details: {
        branch: snapshot.git?.currentBranch,
        uncommittedChanges: context.projectState.hasUncommittedChanges,
        ahead: snapshot.git?.status?.ahead || 0,
        behind: snapshot.git?.status?.behind || 0,
        conflicts: snapshot.git?.conflicts?.length || 0
      },
      recommendations: context.recommendations
    };
  }

  /**
   * Handle context intent
   */
  async handleContext(intent) {
    const context = await contextEngine.getInferredContext();
    const snapshot = contextEngine.getSnapshot();
    
    return {
      success: true,
      action: 'context',
      message: 'Current context information:',
      tool: 'slam_context',
      details: {
        workflow: Object.entries(context.workflow)
          .filter(([_, value]) => value)
          .map(([key]) => key),
        projectState: context.projectState,
        userIntent: Object.entries(context.userIntent)
          .filter(([_, value]) => value)
          .map(([key]) => key),
        patterns: context.patterns,
        risks: context.risks
      }
    };
  }

  /**
   * Handle collaborate intent
   */
  async handleCollaborate(intent) {
    return {
      success: true,
      action: 'collaborate',
      message: 'Starting collaboration session.',
      tool: 'slam_collaborate',
      params: intent.params,
      nextSteps: [
        'Share your workspace with team members',
        'Real-time collaboration features will be activated',
        'Use: slambed collaborate --invite <email>'
      ]
    };
  }

  /**
   * Handle help intent
   */
  async handleHelp(intent) {
    const commands = this.intentResolver.getAvailableCommands();
    const groupedCommands = {};
    
    // Group commands by type
    commands.forEach(cmd => {
      if (!groupedCommands[cmd.type]) {
        groupedCommands[cmd.type] = [];
      }
      groupedCommands[cmd.type].push(cmd);
    });
    
    return {
      success: true,
      action: 'help',
      message: 'Available commands:',
      commands: groupedCommands,
      examples: [
        '"commit my changes" - Prepare to commit',
        '"push to remote" - Push commits',
        '"create feature branch" - Create new branch',
        '"show status" - Display git status',
        '"deploy to production" - Start deployment'
      ],
      tips: [
        'Use natural language - I\'ll understand!',
        'Be specific for better results',
        'Ask for context to see current state'
      ]
    };
  }

  /**
   * Handle ambiguous intent
   */
  async handleAmbiguous(intent) {
    return {
      success: false,
      action: 'ambiguous',
      message: intent.message,
      suggestions: intent.suggestions,
      tip: 'Try being more specific or use "help" to see available commands.'
    };
  }

  /**
   * Handle error intent
   */
  async handleError(intent) {
    return {
      success: false,
      action: 'error',
      message: intent.message,
      error: intent.error,
      tip: 'Check your input and try again.'
    };
  }

  /**
   * Format response for output
   */
  formatResponse(result, intent) {
    const response = {
      ...result,
      intent: {
        type: intent.type,
        confidence: intent.confidence,
        method: intent.method
      },
      timestamp: new Date().toISOString()
    };
    
    // Add CLI-formatted output
    response.output = this.formatCliOutput(result);
    
    return response;
  }

  /**
   * Format error response
   */
  formatErrorResponse(error, input) {
    return {
      success: false,
      error: error.message,
      input,
      output: chalk.red(`❌ Error: ${error.message}`),
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Format output for CLI display
   */
  formatCliOutput(result) {
    const lines = [];
    
    // Status indicator
    if (result.success) {
      lines.push(chalk.green('✓ ') + chalk.bold(result.message));
    } else {
      lines.push(chalk.red('✗ ') + chalk.bold(result.message));
    }
    
    // Warning
    if (result.warning) {
      lines.push(chalk.yellow(`⚠️  ${result.warning}`));
    }
    
    // Details
    if (result.details) {
      lines.push('');
      lines.push(chalk.dim('Details:'));
      Object.entries(result.details).forEach(([key, value]) => {
        const formattedKey = key.replace(/([A-Z])/g, ' $1').toLowerCase();
        lines.push(`  ${chalk.gray('•')} ${formattedKey}: ${chalk.cyan(value)}`);
      });
    }
    
    // Recommendations
    if (result.recommendations && result.recommendations.length > 0) {
      lines.push('');
      lines.push(chalk.dim('Recommendations:'));
      result.recommendations.forEach(rec => {
        const icon = rec.priority === 'high' ? '🔴' : 
                    rec.priority === 'medium' ? '🟡' : '🟢';
        lines.push(`  ${icon} ${rec.message}`);
      });
    }
    
    // Next steps
    if (result.nextSteps && result.nextSteps.length > 0) {
      lines.push('');
      lines.push(chalk.dim('Next steps:'));
      result.nextSteps.forEach((step, i) => {
        lines.push(`  ${chalk.gray(`${i + 1}.`)} ${step}`);
      });
    }
    
    // Commands
    if (result.commands) {
      lines.push('');
      Object.entries(result.commands).forEach(([type, cmds]) => {
        lines.push(chalk.dim(`${type}:`));
        cmds.forEach(cmd => {
          lines.push(`  ${chalk.gray('•')} ${chalk.cyan(cmd.name)} - ${cmd.description}`);
        });
      });
    }
    
    // Examples
    if (result.examples) {
      lines.push('');
      lines.push(chalk.dim('Examples:'));
      result.examples.forEach(ex => {
        lines.push(`  ${chalk.gray('•')} ${chalk.italic(ex)}`);
      });
    }
    
    // Tips
    if (result.tips) {
      lines.push('');
      lines.push(chalk.dim('Tips:'));
      result.tips.forEach(tip => {
        lines.push(`  ${chalk.gray('💡')} ${tip}`);
      });
    }
    
    // Suggestions (for ambiguous)
    if (result.suggestions) {
      lines.push('');
      lines.push(chalk.dim('Did you mean:'));
      result.suggestions.forEach(sug => {
        lines.push(`  ${chalk.gray('•')} ${chalk.cyan(sug.command)} - ${sug.description}`);
      });
    }
    
    return lines.join('\n');
  }

  /**
   * Add command to history
   */
  addToHistory(command) {
    this.commandHistory.unshift({
      command,
      timestamp: new Date().toISOString()
    });
    
    // Limit history size
    if (this.commandHistory.length > this.maxHistorySize) {
      this.commandHistory = this.commandHistory.slice(0, this.maxHistorySize);
    }
  }

  /**
   * Get command history
   */
  getHistory(limit = 10) {
    return this.commandHistory.slice(0, limit);
  }

  /**
   * Clear command history
   */
  clearHistory() {
    this.commandHistory = [];
  }
}

// Export singleton instance
const slamTool = new SlamTool();

/**
 * Main SLAM function export
 */
export async function slam(input, options = {}) {
  return await slamTool.slam(input, options);
}

// Export class for testing
export default slamTool;
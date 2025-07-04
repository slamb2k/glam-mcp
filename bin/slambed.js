#!/usr/bin/env node

/**
 * Main Slambed CLI
 * Unified interface for all git flow operations
 */

import { Command } from 'commander';
import chalk from 'chalk';
import inquirer from 'inquirer';

// Import tool functions directly for CLI usage
import { autoCommit, quickCommit, smartCommit, syncBranch, squashCommits, undoCommit, batchCommit } from '../src/tools/automation.js';
import { startFeature, finishFeature, startRelease, finishRelease, startHotfix, finishHotfix, createPullRequest, mergePullRequest, cleanBranches, getGitFlowStatus } from '../src/tools/git-flow.js';
import { getRepoInfo, analyzeChanges, listBranches, getCommitHistory, getFileStatus, showDiff, searchCode, tagOperations, stashOperations, repoHealthCheck } from '../src/tools/utilities.js';

const program = new Command();

program
  .name('slambed')
  .description('Comprehensive Git Flow Automation with MCP and CLI Support')
  .version('1.0.0');

// Automation commands
const automationCmd = program
  .command('auto')
  .description('Automation commands for streamlined git workflow');

automationCmd
  .command('commit')
  .description('Complete automation: branch → format → lint → commit → push → PR → merge → cleanup')
  .option('-m, --message <message>', 'Commit message')
  .option('-b, --branch <branch>', 'Custom branch name')
  .option('--no-merge', 'Skip auto-merge')
  .option('--no-format', 'Skip formatting')
  .option('--no-lint', 'Skip linting')
  .option('-t, --target <branch>', 'Target branch', 'main')
  .action(async (options) => {
    try {
      if (!options.message) {
        const answer = await inquirer.prompt([
          {
            type: 'input',
            name: 'message',
            message: 'Commit message:',
            validate: input => input.trim().length > 0 || 'Message required'
          }
        ]);
        options.message = answer.message;
      }

      const result = await autoCommit({
        message: options.message,
        branch_name: options.branch,
        auto_merge: options.merge,
        run_format: options.format,
        run_lint: options.lint,
        target_branch: options.target
      });

      console.log(result.success ? 
        chalk.green(result.message) : 
        chalk.red(result.message)
      );
      
      if (result.data) {
        console.log('\nDetails:', JSON.stringify(result.data, null, 2));
      }
    } catch (error) {
      console.error(chalk.red('Error:'), error.message);
      process.exit(1);
    }
  });

automationCmd
  .command('quick')
  .description('Quick commit with smart defaults')
  .option('-m, --message <message>', 'Custom message')
  .action(async (options) => {
    try {
      const result = await quickCommit({ message: options.message });
      console.log(result.success ? 
        chalk.green(result.message) : 
        chalk.red(result.message)
      );
    } catch (error) {
      console.error(chalk.red('Error:'), error.message);
      process.exit(1);
    }
  });

automationCmd
  .command('smart')
  .description('Analyze changes and suggest commit')
  .option('-x, --execute', 'Execute suggested commit')
  .action(async (options) => {
    try {
      const result = await smartCommit({ execute: options.execute });
      console.log(result.success ? 
        chalk.green(result.message) : 
        chalk.red(result.message)
      );
      
      if (result.data) {
        console.log('\n' + JSON.stringify(result.data, null, 2));
      }
    } catch (error) {
      console.error(chalk.red('Error:'), error.message);
      process.exit(1);
    }
  });

// Git flow commands
const flowCmd = program
  .command('flow')
  .description('Traditional git flow operations');

// Feature operations
const featureCmd = flowCmd
  .command('feature')
  .description('Feature branch operations');

featureCmd
  .command('start <name>')
  .description('Start a new feature branch')
  .action(async (name) => {
    try {
      const result = await startFeature(name);
      console.log(result.success ? 
        chalk.green(result.message) : 
        chalk.red(result.message)
      );
    } catch (error) {
      console.error(chalk.red('Error:'), error.message);
      process.exit(1);
    }
  });

featureCmd
  .command('finish [name]')
  .description('Finish a feature branch')
  .option('-m, --message <message>', 'PR description')
  .option('--auto-merge', 'Auto-merge PR')
  .option('-t, --target <branch>', 'Target branch', 'main')
  .action(async (name, options) => {
    try {
      const result = await finishFeature(
        name, 
        options.message, 
        options.autoMerge, 
        true, 
        options.target
      );
      console.log(result.success ? 
        chalk.green(result.message) : 
        chalk.red(result.message)
      );
    } catch (error) {
      console.error(chalk.red('Error:'), error.message);
      process.exit(1);
    }
  });

// Release operations
const releaseCmd = flowCmd
  .command('release')
  .description('Release branch operations');

releaseCmd
  .command('start <version>')
  .description('Start a new release branch')
  .action(async (version) => {
    try {
      const result = await startRelease(version);
      console.log(result.success ? 
        chalk.green(result.message) : 
        chalk.red(result.message)
      );
    } catch (error) {
      console.error(chalk.red('Error:'), error.message);
      process.exit(1);
    }
  });

releaseCmd
  .command('finish [version]')
  .description('Finish a release branch')
  .option('-m, --message <message>', 'Release message')
  .action(async (version, options) => {
    try {
      const result = await finishRelease(version, options.message);
      console.log(result.success ? 
        chalk.green(result.message) : 
        chalk.red(result.message)
      );
    } catch (error) {
      console.error(chalk.red('Error:'), error.message);
      process.exit(1);
    }
  });

// Utility commands
const utilCmd = program
  .command('util')
  .description('Utility operations');

utilCmd
  .command('info')
  .description('Show repository information')
  .action(async () => {
    try {
      const result = await getRepoInfo({});
      console.log(chalk.blue('Repository Information:'));
      console.log(JSON.stringify(result.data, null, 2));
    } catch (error) {
      console.error(chalk.red('Error:'), error.message);
      process.exit(1);
    }
  });

utilCmd
  .command('status')
  .description('Show git flow status')
  .action(async () => {
    try {
      const result = await getGitFlowStatus();
      console.log(result.message || result.data);
    } catch (error) {
      console.error(chalk.red('Error:'), error.message);
      process.exit(1);
    }
  });

utilCmd
  .command('analyze')
  .description('Analyze current changes')
  .option('-d, --detailed', 'Show detailed analysis')
  .action(async (options) => {
    try {
      const result = await analyzeChanges({ detailed: options.detailed });
      console.log(result.success ? 
        chalk.green(result.message) : 
        chalk.red(result.message)
      );
      
      if (result.data) {
        console.log('\n' + JSON.stringify(result.data, null, 2));
      }
    } catch (error) {
      console.error(chalk.red('Error:'), error.message);
      process.exit(1);
    }
  });

utilCmd
  .command('branches')
  .description('List and categorize branches')
  .option('-r, --remote', 'Include remote branches')
  .option('-m, --merged', 'Show only merged branches')
  .action(async (options) => {
    try {
      const result = await listBranches({ 
        include_remote: options.remote, 
        merged_only: options.merged 
      });
      console.log(result.success ? 
        chalk.green(result.message) : 
        chalk.red(result.message)
      );
      
      if (result.data) {
        console.log('\n' + JSON.stringify(result.data, null, 2));
      }
    } catch (error) {
      console.error(chalk.red('Error:'), error.message);
      process.exit(1);
    }
  });

utilCmd
  .command('health')
  .description('Check repository health')
  .option('-f, --fix', 'Auto-fix issues')
  .action(async (options) => {
    try {
      const result = await repoHealthCheck({ fix_issues: options.fix });
      console.log(result.success ? 
        chalk.green(result.message) : 
        chalk.red(result.message)
      );
      
      if (result.data) {
        console.log('\n' + JSON.stringify(result.data, null, 2));
      }
    } catch (error) {
      console.error(chalk.red('Error:'), error.message);
      process.exit(1);
    }
  });

// Interactive mode
program
  .command('interactive')
  .alias('i')
  .description('Interactive mode with guided prompts')
  .action(async () => {
    try {
      console.log(chalk.blue('🎯 Slambed Interactive Mode'));
      console.log('===========================\n');

      const { operation } = await inquirer.prompt([
        {
          type: 'list',
          name: 'operation',
          message: 'What would you like to do?',
          choices: [
            { name: '🚀 Auto Commit (Complete workflow)', value: 'auto-commit' },
            { name: '⚡ Quick Commit (Smart defaults)', value: 'quick-commit' },
            { name: '🧠 Smart Analysis (Analyze changes)', value: 'smart-analysis' },
            { name: '🌿 Start Feature Branch', value: 'feature-start' },
            { name: '🏁 Finish Feature Branch', value: 'feature-finish' },
            { name: '📊 Repository Status', value: 'status' },
            { name: '🔍 Analyze Changes', value: 'analyze' },
            { name: '🏥 Health Check', value: 'health' },
            { name: '📋 List Branches', value: 'branches' },
            { name: '❌ Exit', value: 'exit' }
          ]
        }
      ]);

      if (operation === 'exit') {
        console.log(chalk.yellow('Goodbye! 👋'));
        return;
      }

      // Handle the selected operation
      switch (operation) {
        case 'auto-commit':
          const { message } = await inquirer.prompt([
            {
              type: 'input',
              name: 'message',
              message: 'Commit message:',
              validate: input => input.trim().length > 0 || 'Message required'
            }
          ]);
          
          const result = await autoCommit({ message });
          console.log(result.success ? 
            chalk.green('\n✅ ' + result.message) : 
            chalk.red('\n❌ ' + result.message)
          );
          break;

        case 'status':
          const statusResult = await getGitFlowStatus();
          console.log('\n' + statusResult.message);
          break;

        // Add more cases for other operations...
        
        default:
          console.log(chalk.yellow('Operation not yet implemented in interactive mode'));
      }

    } catch (error) {
      console.error(chalk.red('Error:'), error.message);
      process.exit(1);
    }
  });

// Parse command line arguments
program.parse();

// Show help if no command provided
if (!process.argv.slice(2).length) {
  program.outputHelp();
}
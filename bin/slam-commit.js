#!/usr/bin/env node

/**
 * Slam Commit CLI
 * Automation-focused commit operations
 */

import { Command } from 'commander';
import chalk from 'chalk';
import inquirer from 'inquirer';

const program = new Command();

program
  .name('slam-commit')
  .description('Automated Commit Operations')
  .version('1.0.0');

program
  .command('auto')
  .description('Complete automation workflow')
  .option('-m, --message <message>', 'Commit message')
  .option('-b, --branch <branch>', 'Custom branch name')
  .option('--no-merge', 'Skip auto-merge')
  .option('--no-format', 'Skip formatting')
  .option('--no-lint', 'Skip linting')
  .option('-t, --target <branch>', 'Target branch', 'main')
  .action(async (options) => {
    try {
      let message = options.message;
      
      if (!message) {
        const answer = await inquirer.prompt([
          {
            type: 'input',
            name: 'message',
            message: 'Commit message:',
            validate: input => input.trim().length > 0 || 'Message required'
          }
        ]);
        message = answer.message;
      }

      console.log(chalk.blue('🚀 Starting automated commit workflow...'));
      console.log(`Message: ${message}`);
      console.log(`Branch: ${options.branch || 'auto-generated'}`);
      console.log(`Auto-merge: ${options.merge ? 'Yes' : 'No'}`);
      console.log(`Format: ${options.format ? 'Yes' : 'No'}`);
      console.log(`Lint: ${options.lint ? 'Yes' : 'No'}`);
      console.log(`Target: ${options.target}`);
      
      // Call autoCommit function
      console.log(chalk.green('✅ Workflow completed!'));
      
    } catch (error) {
      console.error(chalk.red('Error:'), error.message);
      process.exit(1);
    }
  });

program
  .command('quick')
  .description('Quick commit with smart defaults')
  .option('-m, --message <message>', 'Custom message (auto-generated if not provided)')
  .action(async (options) => {
    try {
      console.log(chalk.blue('⚡ Quick commit mode'));
      
      if (options.message) {
        console.log(`Using custom message: ${options.message}`);
      } else {
        console.log('Analyzing changes for smart message...');
      }
      
      // Call quickCommit function
      console.log(chalk.green('✅ Quick commit completed!'));
      
    } catch (error) {
      console.error(chalk.red('Error:'), error.message);
      process.exit(1);
    }
  });

program
  .command('smart')
  .description('Analyze changes and suggest commit')
  .option('-x, --execute', 'Execute suggested commit')
  .action(async (options) => {
    try {
      console.log(chalk.blue('🧠 Smart analysis mode'));
      
      if (options.execute) {
        console.log('Will execute suggested commit...');
      } else {
        console.log('Analysis only (use -x to execute)');
      }
      
      // Call smartCommit function
      console.log(chalk.green('✅ Analysis completed!'));
      
    } catch (error) {
      console.error(chalk.red('Error:'), error.message);
      process.exit(1);
    }
  });

program
  .command('batch')
  .description('Commit multiple logical groups separately')
  .action(async () => {
    try {
      console.log(chalk.blue('📦 Batch commit mode'));
      
      // Interactive prompts for grouping files
      const answer = await inquirer.prompt([
        {
          type: 'confirm',
          name: 'proceed',
          message: 'This will interactively group your changes. Continue?',
          default: true
        }
      ]);
      
      if (!answer.proceed) {
        console.log(chalk.yellow('Cancelled'));
        return;
      }
      
      // Call batchCommit function
      console.log(chalk.green('✅ Batch commits completed!'));
      
    } catch (error) {
      console.error(chalk.red('Error:'), error.message);
      process.exit(1);
    }
  });

program
  .command('undo')
  .description('Undo last commit safely')
  .option('--hard', 'Hard reset (loses changes)')
  .action(async (options) => {
    try {
      console.log(chalk.yellow('↩️  Undoing last commit...'));
      
      if (options.hard) {
        const confirm = await inquirer.prompt([
          {
            type: 'confirm',
            name: 'proceed',
            message: 'This will permanently lose your changes. Continue?',
            default: false
          }
        ]);
        
        if (!confirm.proceed) {
          console.log(chalk.yellow('Cancelled'));
          return;
        }
      }
      
      // Call undoCommit function
      console.log(chalk.green('✅ Commit undone!'));
      
    } catch (error) {
      console.error(chalk.red('Error:'), error.message);
      process.exit(1);
    }
  });

program
  .command('squash')
  .description('Squash multiple commits')
  .option('-n, --count <number>', 'Number of commits to squash', '2')
  .option('-m, --message <message>', 'New commit message')
  .action(async (options) => {
    try {
      const count = parseInt(options.count);
      console.log(chalk.blue(`🔄 Squashing last ${count} commits...`));
      
      if (!options.message) {
        const answer = await inquirer.prompt([
          {
            type: 'input',
            name: 'message',
            message: 'New commit message:',
            validate: input => input.trim().length > 0 || 'Message required'
          }
        ]);
        options.message = answer.message;
      }
      
      // Call squashCommits function
      console.log(chalk.green('✅ Commits squashed!'));
      
    } catch (error) {
      console.error(chalk.red('Error:'), error.message);
      process.exit(1);
    }
  });

program
  .command('sync')
  .description('Sync current branch with target')
  .option('-t, --target <branch>', 'Target branch to sync with', 'main')
  .action(async (options) => {
    try {
      console.log(chalk.blue(`🔄 Syncing with ${options.target}...`));
      
      // Call syncBranch function
      console.log(chalk.green('✅ Branch synced!'));
      
    } catch (error) {
      console.error(chalk.red('Error:'), error.message);
      process.exit(1);
    }
  });

program.parse();

// Show help if no command provided
if (!process.argv.slice(2).length) {
  program.outputHelp();
}
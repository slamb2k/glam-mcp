#!/usr/bin/env node

/**
 * CLI tool for generating MCP client configurations
 */

import { program } from 'commander';
import { configGenerator } from './config-generator.js';
import './platforms/index.js'; // Register all platforms
import fs from 'fs';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const packageJson = require('../../package.json');

program
  .name('glam-config')
  .description('Generate MCP client configurations for glam-mcp')
  .version(packageJson.version);

// Generate command
program
  .command('generate <platform>')
  .description('Generate configuration for a specific platform')
  .option('-o, --output <path>', 'Output file path')
  .option('-p, --path <path>', 'Path to glam-mcp installation')
  .option('--no-npx', 'Use direct path instead of npx')
  .option('-l, --log-level <level>', 'Log level (debug, info, warn, error)', 'info')
  .option('-e, --env <vars...>', 'Environment variables (KEY=VALUE)')
  .option('--merge', 'Merge with existing configuration')
  .option('--extension <type>', 'VS Code extension type (cline, continue, cursor)', 'cline')
  .action(async (platform, options) => {
    try {
      console.log(`🔧 Generating configuration for ${platform}...`);

      // Parse environment variables
      const env = {};
      if (options.env) {
        options.env.forEach(envVar => {
          const [key, value] = envVar.split('=');
          if (key && value) {
            env[key] = value;
          }
        });
      }

      // Generate configuration
      const config = await configGenerator.generate(platform, {
        serverPath: options.path,
        useNpx: options.npx,
        logLevel: options.logLevel,
        extensionType: options.extension,
        env
      });

      // Handle merging if requested
      let finalConfig = config;
      if (options.merge && platform === 'claude-desktop') {
        const generator = configGenerator.platforms.get(platform);
        finalConfig = await generator.mergeWithExisting(config);
      }

      // Output or save configuration
      if (options.output) {
        await configGenerator.saveConfig(platform, finalConfig, options.output);
        console.log(`✅ Configuration saved to: ${options.output}`);
      } else {
        console.log('\n📋 Generated configuration:\n');
        console.log(JSON.stringify(finalConfig, null, 2));
      }

      // Show platform-specific instructions
      const generator = configGenerator.platforms.get(platform);
      if (generator.getInstructions) {
        console.log('\n' + generator.getInstructions(options.extension));
      }

    } catch (error) {
      console.error(`❌ Error: ${error.message}`);
      process.exit(1);
    }
  });

// Validate command
program
  .command('validate <platform> <config-file>')
  .description('Validate a configuration file')
  .action(async (platform, configFile) => {
    try {
      console.log(`🔍 Validating ${platform} configuration...`);

      const configContent = await fs.promises.readFile(configFile, 'utf8');
      const config = JSON.parse(configContent);

      const result = await configGenerator.validate(platform, config);

      if (result.valid) {
        console.log(`✅ ${result.message}`);
      } else {
        console.log(`❌ ${result.message}`);
        if (result.errors) {
          result.errors.forEach(error => console.log(`  - ${error}`));
        }
        process.exit(1);
      }
    } catch (error) {
      console.error(`❌ Error: ${error.message}`);
      process.exit(1);
    }
  });

// Test command
program
  .command('test <platform> <config-file>')
  .description('Test connection using a configuration file')
  .action(async (platform, configFile) => {
    try {
      console.log(`🧪 Testing ${platform} connection...`);

      const configContent = await fs.promises.readFile(configFile, 'utf8');
      const config = JSON.parse(configContent);

      const result = await configGenerator.testConnection(platform, config);

      if (result.success) {
        console.log(`✅ ${result.message}`);
        if (result.version) {
          console.log(`   Version: ${result.version}`);
        }
      } else {
        console.log(`❌ ${result.message}`);
        if (result.error) {
          console.log(`   Error: ${result.error}`);
        }
        process.exit(1);
      }
    } catch (error) {
      console.error(`❌ Error: ${error.message}`);
      process.exit(1);
    }
  });

// List command
program
  .command('list')
  .description('List available platforms')
  .action(() => {
    console.log('📋 Available platforms:\n');
    
    const platforms = configGenerator.getAvailablePlatforms();
    platforms.forEach(platform => {
      console.log(`  ${platform.name}`);
      console.log(`    ${platform.description}`);
      console.log(`    Format: ${platform.configFormat}`);
      console.log();
    });
  });

// Interactive setup command
program
  .command('setup')
  .description('Interactive configuration setup')
  .action(async () => {
    try {
      const { default: inquirer } = await import('inquirer');
      
      // Ask for platform
      const { platform } = await inquirer.prompt([
        {
          type: 'list',
          name: 'platform',
          message: 'Select your platform:',
          choices: configGenerator.getAvailablePlatforms().map(p => ({
            name: `${p.name} - ${p.description}`,
            value: p.name
          }))
        }
      ]);

      // Platform-specific questions
      let answers = {};
      
      if (platform === 'vscode' || platform.includes('vscode')) {
        const vscodeAnswers = await inquirer.prompt([
          {
            type: 'list',
            name: 'extension',
            message: 'Which VS Code extension are you using?',
            choices: [
              { name: 'Cline', value: 'cline' },
              { name: 'Continue', value: 'continue' },
              { name: 'Cursor', value: 'cursor' },
              { name: 'Other', value: 'generic' }
            ]
          }
        ]);
        answers = { ...answers, ...vscodeAnswers };
      }

      // Common questions
      const commonAnswers = await inquirer.prompt([
        {
          type: 'confirm',
          name: 'useNpx',
          message: 'Use npx to run glam-mcp? (recommended if installed globally)',
          default: true
        },
        {
          type: 'input',
          name: 'path',
          message: 'Path to glam-mcp installation:',
          when: (answers) => !answers.useNpx,
          default: process.cwd()
        },
        {
          type: 'list',
          name: 'logLevel',
          message: 'Select log level:',
          choices: ['debug', 'info', 'warn', 'error'],
          default: 'info'
        },
        {
          type: 'confirm',
          name: 'save',
          message: 'Save configuration to file?',
          default: true
        }
      ]);

      answers = { ...answers, ...commonAnswers };

      // Generate configuration
      const config = await configGenerator.generate(platform, {
        useNpx: answers.useNpx,
        serverPath: answers.path,
        logLevel: answers.logLevel,
        extensionType: answers.extension
      });

      // Save or display
      if (answers.save) {
        const { outputPath } = await inquirer.prompt([
          {
            type: 'input',
            name: 'outputPath',
            message: 'Output file path:',
            default: `glam-${platform}-config.json`
          }
        ]);

        await configGenerator.saveConfig(platform, config, outputPath);
        console.log(`\n✅ Configuration saved to: ${outputPath}`);
      } else {
        console.log('\n📋 Generated configuration:\n');
        console.log(JSON.stringify(config, null, 2));
      }

      // Show instructions
      const generator = configGenerator.platforms.get(platform);
      if (generator.getInstructions) {
        console.log('\n' + generator.getInstructions(answers.extension));
      }

    } catch (error) {
      console.error(`❌ Error: ${error.message}`);
      process.exit(1);
    }
  });

program.parse();

// Show help if no command provided
if (!process.argv.slice(2).length) {
  program.outputHelp();
}
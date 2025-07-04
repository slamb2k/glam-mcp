#!/usr/bin/env node

/**
 * Test runner for Slambed MCP
 */

import chalk from 'chalk';
import { execSync } from 'child_process';
import fs from 'fs';

// Import test modules
import { testGitHelpers } from './git-helpers.test.js';
import { testConfiguration } from './configuration.test.js';
import { testMCPServer } from './mcp-server.test.js';

class TestRunner {
  constructor() {
    this.tests = [];
    this.passed = 0;
    this.failed = 0;
    this.skipped = 0;
  }

  async runAllTests() {
    console.log(chalk.blue('🧪 Slambed MCP Test Suite'));
    console.log('==========================\n');

    try {
      // Environment checks
      await this.checkEnvironment();

      // Run test suites
      await this.runTestSuite('Git Helpers', testGitHelpers);
      await this.runTestSuite('Configuration', testConfiguration);
      await this.runTestSuite('MCP Server', testMCPServer);

      // Summary
      this.printSummary();

    } catch (error) {
      console.error(chalk.red('Test runner failed:'), error.message);
      process.exit(1);
    }
  }

  async checkEnvironment() {
    console.log(chalk.yellow('🔍 Environment Checks'));
    console.log('======================');

    const checks = [
      {
        name: 'Node.js version',
        check: () => {
          const version = process.version;
          const major = parseInt(version.split('.')[0].slice(1));
          return major >= 18;
        },
        details: () => `Current: ${process.version}, Required: >=18.0.0`
      },
      {
        name: 'Git available',
        check: () => {
          try {
            execSync('git --version', { stdio: 'pipe' });
            return true;
          } catch (e) {
            return false;
          }
        },
        details: () => {
          try {
            return execSync('git --version', { encoding: 'utf8' }).trim();
          } catch (e) {
            return 'Not installed';
          }
        }
      },
      {
        name: 'GitHub CLI available',
        check: () => {
          try {
            execSync('gh --version', { stdio: 'pipe' });
            return true;
          } catch (e) {
            return false;
          }
        },
        details: () => {
          try {
            return execSync('gh --version', { encoding: 'utf8' }).split('\n')[0];
          } catch (e) {
            return 'Not installed (optional for PR operations)';
          }
        }
      },
      {
        name: 'Package.json exists',
        check: () => fs.existsSync('./package.json'),
        details: () => fs.existsSync('./package.json') ? 'Found' : 'Missing'
      }
    ];

    for (const check of checks) {
      const passed = check.check();
      const icon = passed ? '✅' : '❌';
      const status = passed ? chalk.green('PASS') : chalk.red('FAIL');
      console.log(`${icon} ${check.name}: ${status} - ${check.details()}`);
      
      if (!passed && ['Node.js version', 'Git available'].includes(check.name)) {
        throw new Error(`Required dependency failed: ${check.name}`);
      }
    }

    console.log('');
  }

  async runTestSuite(name, testFunction) {
    console.log(chalk.blue(`📋 ${name} Tests`));
    console.log('='.repeat(name.length + 8));

    try {
      const results = await testFunction();
      
      for (const result of results) {
        this.recordTest(result);
        this.printTestResult(result);
      }

    } catch (error) {
      this.recordTest({
        name: `${name} Suite`,
        passed: false,
        error: error.message,
        skipped: false
      });
      console.error(chalk.red(`❌ Test suite failed: ${error.message}`));
    }

    console.log('');
  }

  recordTest(result) {
    if (result.skipped) {
      this.skipped++;
    } else if (result.passed) {
      this.passed++;
    } else {
      this.failed++;
    }
  }

  printTestResult(result) {
    let icon, status, color;
    
    if (result.skipped) {
      icon = '⏭️ ';
      status = 'SKIP';
      color = chalk.yellow;
    } else if (result.passed) {
      icon = '✅';
      status = 'PASS';
      color = chalk.green;
    } else {
      icon = '❌';
      status = 'FAIL';
      color = chalk.red;
    }

    console.log(`${icon} ${result.name}: ${color(status)}`);
    
    if (result.details) {
      console.log(`   ${chalk.gray(result.details)}`);
    }
    
    if (result.error) {
      console.log(`   ${chalk.red('Error:')} ${result.error}`);
    }
  }

  printSummary() {
    console.log(chalk.blue('📊 Test Summary'));
    console.log('================');
    
    const total = this.passed + this.failed + this.skipped;
    
    console.log(`Total tests: ${total}`);
    console.log(`${chalk.green('Passed:')} ${this.passed}`);
    console.log(`${chalk.red('Failed:')} ${this.failed}`);
    console.log(`${chalk.yellow('Skipped:')} ${this.skipped}`);
    
    const passRate = total > 0 ? ((this.passed / (total - this.skipped)) * 100).toFixed(1) : 0;
    console.log(`Pass rate: ${passRate}%`);

    if (this.failed > 0) {
      console.log(chalk.red('\n❌ Some tests failed'));
      process.exit(1);
    } else {
      console.log(chalk.green('\n🎉 All tests passed!'));
    }
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const runner = new TestRunner();
  runner.runAllTests().catch(error => {
    console.error('Test runner error:', error);
    process.exit(1);
  });
}

export { TestRunner };
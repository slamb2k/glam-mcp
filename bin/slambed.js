#!/usr/bin/env node

/**
 * Main Slambed CLI
 * Unified interface for all git flow operations
 */

import { Command } from "commander";
import chalk from "chalk";
import inquirer from "inquirer";

// Import banner utility
import { showBanner, getStyledBanner } from "../src/utils/banner.js";

// Import tool functions directly for CLI usage
import {
  autoCommit,
  quickCommit,
  smartCommit,
  syncBranch,
  squashCommits,
  undoCommit,
  batchCommit,
  npmPublish,
} from "../src/tools/automation.js";
import {
  startBranch,
  finishBranch,
  quickWorkflow,
  createPullRequest,
  mergePullRequest,
  syncWithMain,
  cleanupBranches,
  getGitHubFlowStatus,
} from "../src/tools/github-flow.js";
import {
  getRepoInfo,
  analyzeChanges,
  listBranches,
  getCommitHistory,
  getFileStatus,
  showDiff,
  searchCode,
  tagOperations,
  stashOperations,
  repoHealthCheck,
} from "../src/tools/utilities.js";

const program = new Command();

// Show banner for specific commands
program.hook("preAction", (thisCommand) => {
  if (thisCommand.args[0] !== "help") {
    showBanner({ compact: true });
    console.log(""); // Add spacing
  }
});

program
  .name("slambed")
  .description("Comprehensive Git Flow Automation with MCP and CLI Support")
  .version("1.0.0");

// Automation commands
const automationCmd = program
  .command("auto")
  .description("Automation commands for streamlined git workflow");

automationCmd
  .command("commit")
  .description(
    "Complete automation: branch → format → lint → commit → push → PR → merge → cleanup",
  )
  .option("-m, --message <message>", "Commit message")
  .option("-b, --branch <branch>", "Custom branch name")
  .option("--no-merge", "Skip auto-merge")
  .option("--no-format", "Skip formatting")
  .option("--no-lint", "Skip linting")
  .option("-t, --target <branch>", "Target branch", "main")
  .action(async (options) => {
    try {
      if (!options.message) {
        const answer = await inquirer.prompt([
          {
            type: "input",
            name: "message",
            message: "Commit message:",
            validate: (input) => input.trim().length > 0 || "Message required",
          },
        ]);
        options.message = answer.message;
      }

      const result = await autoCommit({
        message: options.message,
        branch_name: options.branch,
        auto_merge: options.merge,
        run_format: options.format,
        run_lint: options.lint,
        target_branch: options.target,
      });

      console.log(
        result.success
          ? chalk.green(result.message)
          : chalk.red(result.message),
      );

      if (result.data) {
        console.log("\nDetails:", JSON.stringify(result.data, null, 2));
      }
    } catch (error) {
      console.error(chalk.red("Error:"), error.message);
      process.exit(1);
    }
  });

automationCmd
  .command("quick")
  .description("Quick commit with smart defaults")
  .option("-m, --message <message>", "Custom message")
  .action(async (options) => {
    try {
      const result = await quickCommit({ message: options.message });
      console.log(
        result.success
          ? chalk.green(result.message)
          : chalk.red(result.message),
      );
    } catch (error) {
      console.error(chalk.red("Error:"), error.message);
      process.exit(1);
    }
  });

automationCmd
  .command("smart")
  .description("Analyze changes and suggest commit")
  .option("-x, --execute", "Execute suggested commit")
  .action(async (options) => {
    try {
      const result = await smartCommit({ execute: options.execute });
      console.log(
        result.success
          ? chalk.green(result.message)
          : chalk.red(result.message),
      );

      if (result.data) {
        console.log("\n" + JSON.stringify(result.data, null, 2));
      }
    } catch (error) {
      console.error(chalk.red("Error:"), error.message);
      process.exit(1);
    }
  });

automationCmd
  .command("sync")
  .description("Sync current branch with target branch")
  .option("-t, --target <branch>", "Target branch to sync with", "main")
  .action(async (options) => {
    try {
      const result = await syncBranch({ target_branch: options.target });
      console.log(
        result.success
          ? chalk.green(result.message)
          : chalk.red(result.message),
      );

      if (result.data && result.data.steps) {
        console.log("\nSteps taken:");
        result.data.steps.forEach((step) => console.log(`  • ${step}`));
      }
    } catch (error) {
      console.error(chalk.red("Error:"), error.message);
      process.exit(1);
    }
  });

automationCmd
  .command("publish")
  .description("Automated NPM publishing workflow")
  .option(
    "-v, --version <type>",
    "Version bump type (patch, minor, major)",
    "patch",
  )
  .option("--custom-version <version>", "Custom version number")
  .option("--tag <tag>", "NPM tag for publishing", "latest")
  .option("--no-tests", "Skip running tests")
  .option("--no-build", "Skip running build")
  .option("--no-lint", "Skip running linting")
  .option("--no-release", "Skip creating GitHub release")
  .option("--no-merge", "Skip auto-merging PR")
  .option("--dry-run", "Perform dry run without publishing")
  .option("--registry <url>", "NPM registry URL", "https://registry.npmjs.org/")
  .action(async (options) => {
    try {
      if (options.dryRun) {
        console.log(
          chalk.yellow("🔍 DRY RUN - No actual publishing will occur"),
        );
      } else {
        // Confirmation for actual publishing
        const confirm = await inquirer.prompt([
          {
            type: "confirm",
            name: "proceed",
            message: "This will publish to NPM. Continue?",
            default: false,
          },
        ]);

        if (!confirm.proceed) {
          console.log(chalk.yellow("Publishing cancelled"));
          return;
        }
      }

      const result = await npmPublish({
        version_type: options.version,
        custom_version: options.customVersion,
        tag: options.tag,
        run_tests: options.tests,
        run_build: options.build,
        run_lint: options.lint,
        create_release: options.release,
        auto_merge_pr: options.merge,
        dry_run: options.dryRun,
        registry: options.registry,
      });

      console.log(
        result.success
          ? chalk.green(result.message)
          : chalk.red(result.message),
      );

      if (result.data) {
        if (result.data.steps) {
          console.log("\nSteps completed:");
          result.data.steps.forEach((step) => console.log(`  • ${step}`));
        }

        if (result.data.nextSteps) {
          console.log("\nNext steps:");
          result.data.nextSteps.forEach((step) => console.log(`  • ${step}`));
        }
      }
    } catch (error) {
      console.error(chalk.red("Error:"), error.message);
      process.exit(1);
    }
  });

// GitHub Flow commands (simplified)
const flowCmd = program
  .command("flow")
  .description("GitHub Flow operations (simple branch-based workflow)");

flowCmd
  .command("start <name>")
  .description("Start a new branch from main")
  .option(
    "-t, --type <type>",
    "Branch type (feature, fix, docs, chore)",
    "feature",
  )
  .action(async (name, options) => {
    try {
      const result = await startBranch(name, options.type);
      console.log(
        result.success
          ? chalk.green(result.message)
          : chalk.red(result.message),
      );
    } catch (error) {
      console.error(chalk.red("Error:"), error.message);
      process.exit(1);
    }
  });

flowCmd
  .command("finish")
  .description("Finish current branch by creating a PR")
  .option("-t, --title <title>", "PR title")
  .option("-d, --description <description>", "PR description")
  .option("--draft", "Create as draft PR")
  .option("--auto-merge", "Auto-merge PR")
  .action(async (options) => {
    try {
      const result = await finishBranch(
        options.title,
        options.description,
        options.draft,
        options.autoMerge,
        true,
      );
      console.log(
        result.success
          ? chalk.green(result.message)
          : chalk.red(result.message),
      );
    } catch (error) {
      console.error(chalk.red("Error:"), error.message);
      process.exit(1);
    }
  });

flowCmd
  .command("quick <name>")
  .description("Quick workflow: branch + commit + PR")
  .option("-m, --message <message>", "Commit message", "Quick update")
  .option(
    "-t, --type <type>",
    "Branch type (feature, fix, docs, chore)",
    "feature",
  )
  .option("--auto-merge", "Auto-merge PR")
  .action(async (name, options) => {
    try {
      const result = await quickWorkflow(
        name,
        options.message,
        options.message,
        undefined,
        options.type,
        options.autoMerge,
      );
      console.log(
        result.success
          ? chalk.green(result.message)
          : chalk.red(result.message),
      );

      if (result.data && result.data.steps) {
        console.log("\nSteps completed:");
        result.data.steps.forEach((step) => console.log(`  ${step}`));
      }
    } catch (error) {
      console.error(chalk.red("Error:"), error.message);
      process.exit(1);
    }
  });

flowCmd
  .command("sync")
  .description("Sync current branch with main")
  .option(
    "-s, --strategy <strategy>",
    "Sync strategy (merge, rebase)",
    "rebase",
  )
  .action(async (options) => {
    try {
      const result = await syncWithMain(options.strategy);
      console.log(
        result.success
          ? chalk.green(result.message)
          : chalk.red(result.message),
      );

      if (result.data && result.data.steps) {
        console.log("\nSteps taken:");
        result.data.steps.forEach((step) => console.log(`  • ${step}`));
      }
    } catch (error) {
      console.error(chalk.red("Error:"), error.message);
      process.exit(1);
    }
  });

flowCmd
  .command("cleanup")
  .description("Clean up merged branches")
  .option("-f, --force", "Force cleanup without confirmation")
  .action(async (options) => {
    try {
      const result = await cleanupBranches(options.force);
      console.log(
        result.success
          ? chalk.green(result.message)
          : chalk.red(result.message),
      );
    } catch (error) {
      console.error(chalk.red("Error:"), error.message);
      process.exit(1);
    }
  });

// Utility commands
const utilCmd = program.command("util").description("Utility operations");

utilCmd
  .command("info")
  .description("Show repository information")
  .action(async () => {
    try {
      const result = await getRepoInfo({});
      console.log(chalk.blue("Repository Information:"));
      console.log(JSON.stringify(result.data, null, 2));
    } catch (error) {
      console.error(chalk.red("Error:"), error.message);
      process.exit(1);
    }
  });

utilCmd
  .command("status")
  .description("Show GitHub Flow status")
  .action(async () => {
    try {
      const result = await getGitHubFlowStatus();
      console.log(result.message || result.data);
    } catch (error) {
      console.error(chalk.red("Error:"), error.message);
      process.exit(1);
    }
  });

utilCmd
  .command("analyze")
  .description("Analyze current changes")
  .option("-d, --detailed", "Show detailed analysis")
  .action(async (options) => {
    try {
      const result = await analyzeChanges({ detailed: options.detailed });
      console.log(
        result.success
          ? chalk.green(result.message)
          : chalk.red(result.message),
      );

      if (result.data) {
        console.log("\n" + JSON.stringify(result.data, null, 2));
      }
    } catch (error) {
      console.error(chalk.red("Error:"), error.message);
      process.exit(1);
    }
  });

utilCmd
  .command("branches")
  .description("List and categorize branches")
  .option("-r, --remote", "Include remote branches")
  .option("-m, --merged", "Show only merged branches")
  .action(async (options) => {
    try {
      const result = await listBranches({
        include_remote: options.remote,
        merged_only: options.merged,
      });
      console.log(
        result.success
          ? chalk.green(result.message)
          : chalk.red(result.message),
      );

      if (result.data) {
        console.log("\n" + JSON.stringify(result.data, null, 2));
      }
    } catch (error) {
      console.error(chalk.red("Error:"), error.message);
      process.exit(1);
    }
  });

utilCmd
  .command("health")
  .description("Check repository health")
  .option("-f, --fix", "Auto-fix issues")
  .action(async (options) => {
    try {
      const result = await repoHealthCheck({ fix_issues: options.fix });
      console.log(
        result.success
          ? chalk.green(result.message)
          : chalk.red(result.message),
      );

      if (result.data) {
        console.log("\n" + JSON.stringify(result.data, null, 2));
      }
    } catch (error) {
      console.error(chalk.red("Error:"), error.message);
      process.exit(1);
    }
  });

// Interactive mode
program
  .command("interactive")
  .alias("i")
  .description("Interactive mode with guided prompts")
  .action(async () => {
    try {
      console.log(chalk.blue("🎯 Slambed Interactive Mode"));
      console.log("===========================\n");

      const { operation } = await inquirer.prompt([
        {
          type: "list",
          name: "operation",
          message: "What would you like to do?",
          choices: [
            {
              name: "🚀 Auto Commit (Complete workflow)",
              value: "auto-commit",
            },
            { name: "⚡ Quick Commit (Smart defaults)", value: "quick-commit" },
            {
              name: "🧠 Smart Analysis (Analyze changes)",
              value: "smart-analysis",
            },
            { name: "🌿 Start Feature Branch", value: "feature-start" },
            { name: "🏁 Finish Feature Branch", value: "feature-finish" },
            { name: "📊 Repository Status", value: "status" },
            { name: "🔍 Analyze Changes", value: "analyze" },
            { name: "🏥 Health Check", value: "health" },
            { name: "📋 List Branches", value: "branches" },
            { name: "❌ Exit", value: "exit" },
          ],
        },
      ]);

      if (operation === "exit") {
        console.log(chalk.yellow("Goodbye! 👋"));
        return;
      }

      // Handle the selected operation
      switch (operation) {
        case "auto-commit":
          const { message } = await inquirer.prompt([
            {
              type: "input",
              name: "message",
              message: "Commit message:",
              validate: (input) =>
                input.trim().length > 0 || "Message required",
            },
          ]);

          const result = await autoCommit({ message });
          console.log(
            result.success
              ? chalk.green("\n✅ " + result.message)
              : chalk.red("\n❌ " + result.message),
          );
          break;

        case "status":
          const statusResult = await getGitFlowStatus();
          console.log("\n" + statusResult.message);
          break;

        // Add more cases for other operations...

        default:
          console.log(
            chalk.yellow("Operation not yet implemented in interactive mode"),
          );
      }
    } catch (error) {
      console.error(chalk.red("Error:"), error.message);
      process.exit(1);
    }
  });

// Show help if no command provided
if (!process.argv.slice(2).length) {
  showBanner();
  console.log(""); // Add spacing after banner
  program.outputHelp();
  process.exit(0);
}

// Parse command line arguments
program.parse();

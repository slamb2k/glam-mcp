#!/usr/bin/env node

/**
 * Main Slambed CLI
 * Unified interface for all GitHub Flow operations
 */

import { Command } from "commander";
import chalk from "chalk";
import inquirer from "inquirer";
import fs from "fs";
import path from "path";
import os from "os";

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
  createPRWorkflow,
  createReleaseWorkflow,
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

// Load user aliases
function loadAliases() {
  const aliasFiles = [
    path.join(process.cwd(), ".slambed-aliases"),
    path.join(os.homedir(), ".slambed-aliases"),
  ];

  for (const file of aliasFiles) {
    try {
      if (fs.existsSync(file)) {
        const content = fs.readFileSync(file, "utf8");
        const aliases = {};

        content.split("\n").forEach((line) => {
          line = line.trim();
          if (line && !line.startsWith("#")) {
            const [alias, ...commandParts] = line.split("=");
            if (alias && commandParts.length > 0) {
              aliases[alias.trim()] = commandParts.join("=").trim();
            }
          }
        });

        return aliases;
      }
    } catch (error) {
      // Ignore errors in alias files
    }
  }

  return {};
}

// Check if command is an alias
function checkAlias(args) {
  const aliases = loadAliases();
  const command = args[2]; // First argument after 'node' and 'slambed'

  if (command && aliases[command]) {
    // Replace alias with actual command
    const aliasCommand = aliases[command];
    const expandedArgs = aliasCommand.split(" ");

    // Merge with any additional arguments
    const newArgs = [
      args[0], // node
      args[1], // slambed
      ...expandedArgs,
      ...args.slice(3), // any additional args after the alias
    ];

    console.log(
      chalk.dim(
        `→ Expanding alias '${command}' to: slambed ${expandedArgs.join(" ")}`,
      ),
    );
    console.log("");

    return newArgs;
  }

  return args;
}

// Apply alias expansion
const originalArgs = process.argv.slice();
process.argv = checkAlias(process.argv);

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
  .description("Comprehensive GitHub Flow Automation with MCP and CLI Support")
  .version("1.0.0")
  .option(
    "-q, --quick",
    "Quick mode - automatically perform the most likely action",
  );

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
  .option(
    "--branch-strategy <strategy>",
    "Strategy for stale branches: auto, rebase, new",
    "auto",
  )
  .action(async (options) => {
    try {
      // Check if we need a message (auto-generate with AI by default)
      if (!options.message) {
        // Import git helpers to check current state
        const { getCurrentBranch, getMainBranch, getChangedFiles } =
          await import("../src/utils/git-helpers.js");
        const currentBranch = getCurrentBranch();
        const mainBranch = getMainBranch();
        const changedFiles = getChangedFiles();

        // Only prompt for message if user wants to override AI generation
        const shouldPrompt = await inquirer.prompt([
          {
            type: "confirm",
            name: "useAI",
            message: `AI will generate a smart commit message${changedFiles.length > 0 ? ` for ${changedFiles.length} changed files` : ` for ${currentBranch} branch`}. Use AI-generated message?`,
            default: true,
          },
        ]);

        if (!shouldPrompt.useAI) {
          // User wants to provide their own message
          const answer = await inquirer.prompt([
            {
              type: "input",
              name: "message",
              message:
                changedFiles.length > 0 ? "Commit message:" : "PR message:",
              validate: (input) =>
                input.trim().length > 0 ||
                "Message required when not using AI generation",
            },
          ]);
          options.message = answer.message;
        }
        // If options.message is still undefined, autoCommit will generate AI message
      }

      const result = await autoCommit({
        message: options.message,
        branch_name: options.branch,
        auto_merge: options.merge,
        run_format: options.format,
        run_lint: options.lint,
        target_branch: options.target,
        branch_strategy: options.branchStrategy,
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

automationCmd
  .command("create-pr-workflow")
  .description("Create GitHub Actions workflow for PR checks")
  .option("-n, --name <name>", "Workflow name", "PR Checks")
  .option("--node-version <version>", "Node.js version", "18")
  .option("--no-lint", "Skip linting step")
  .option("--no-test", "Skip testing step")
  .option("--no-build", "Skip build step")
  .option("--no-type-check", "Skip type checking step")
  .action(async (options) => {
    try {
      const result = await createPRWorkflow({
        workflow_name: options.name,
        node_version: options.nodeVersion,
        include_lint: options.lint,
        include_test: options.test,
        include_build: options.build,
        include_type_check: options.typeCheck,
      });

      console.log(
        result.success
          ? chalk.green(result.message)
          : chalk.red(result.message),
      );

      if (result.data) {
        console.log("\nWorkflow created:", result.data.workflowFile);
        if (result.data.setupGuide) {
          console.log("Setup guide:", result.data.setupGuide);
        }
      }
    } catch (error) {
      console.error(chalk.red("Error:"), error.message);
      process.exit(1);
    }
  });

automationCmd
  .command("create-release-workflow")
  .description("Create GitHub Actions workflow for automated releases")
  .option("-n, --name <name>", "Workflow name", "Release")
  .option("--node-version <version>", "Node.js version", "18")
  .option("-t, --type <type>", "Release type (npm, github, both)", "both")
  .option("--no-auto-version", "Skip automatic version bumping")
  .option(
    "--version-type <type>",
    "Version bump type (patch, minor, major)",
    "patch",
  )
  .option("--no-changelog", "Skip changelog generation")
  .action(async (options) => {
    try {
      const result = await createReleaseWorkflow({
        workflow_name: options.name,
        node_version: options.nodeVersion,
        release_type: options.type,
        auto_version_bump: options.autoVersion,
        version_bump_type: options.versionType,
        create_changelog: options.changelog,
      });

      console.log(
        result.success
          ? chalk.green(result.message)
          : chalk.red(result.message),
      );

      if (result.data) {
        console.log("\nWorkflow created:", result.data.workflowFile);
        if (result.data.setupGuide) {
          console.log("Setup guide:", result.data.setupGuide);
        }
        if (result.data.features) {
          console.log("\nFeatures enabled:");
          result.data.features.forEach((feature) =>
            console.log(`  ${feature}`),
          );
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

// Natural command aliases for common operations
program
  .command("commit")
  .description("Commit changes with smart workflow")
  .option("-m, --message <message>", "Commit message")
  .option("--no-merge", "Skip auto-merge")
  .action(async (options) => {
    try {
      const result = await autoCommit({
        message: options.message,
        auto_merge: options.merge,
      });
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

program
  .command("pr")
  .description("Create pull request from current branch")
  .option("-t, --title <title>", "PR title")
  .option("-d, --description <description>", "PR description")
  .option("--draft", "Create as draft PR")
  .action(async (options) => {
    try {
      const result = await finishBranch(
        options.title,
        options.description,
        options.draft,
        true, // auto-merge by default
        true, // delete branch by default
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

program
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
    } catch (error) {
      console.error(chalk.red("Error:"), error.message);
      process.exit(1);
    }
  });

program
  .command("publish")
  .description("Publish package to npm")
  .option("-v, --version <type>", "Version bump type", "patch")
  .option("--dry-run", "Perform dry run")
  .action(async (options) => {
    try {
      const result = await npmPublish({
        version_type: options.version,
        dry_run: options.dryRun,
      });
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

program
  .command("status")
  .description("Show repository status")
  .action(async () => {
    try {
      const result = await getGitHubFlowStatus();
      console.log(result.message || result.data);
    } catch (error) {
      console.error(chalk.red("Error:"), error.message);
      process.exit(1);
    }
  });

program
  .command("feature <name>")
  .description("Start a new feature branch")
  .action(async (name) => {
    try {
      const result = await startBranch(name, "feature");
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
      // Don't show banner again if already shown
      if (process.argv.slice(2).length > 0) {
        console.log(chalk.blue("🎯 Slambed Interactive Mode"));
        console.log("===========================\n");
      }

      // Get context if not already detected
      const context = await detectContext();

      // Build context-aware menu choices
      const choices = [];

      // Primary actions based on context
      if (context && context.hasChanges) {
        choices.push({
          name: "🚀 Commit changes (smart workflow)",
          value: "auto-commit",
        });
        choices.push({
          name: "⚡ Quick commit (minimal prompts)",
          value: "quick-commit",
        });
      }

      if (context && !context.isOnMain && !context.hasChanges) {
        choices.push({
          name: "🏁 Create pull request",
          value: "feature-finish",
        });
      }

      if (context && context.isOnMain) {
        choices.push({
          name: "🌿 Start new feature branch",
          value: "feature-start",
        });
      }

      // Add separator if we have primary actions
      if (choices.length > 0) {
        choices.push(new inquirer.Separator("─── Other Actions ───"));
      }

      // Always available actions
      choices.push(
        { name: "📊 Repository status", value: "status" },
        { name: "🔍 Analyze changes", value: "analyze" },
        { name: "🔄 Sync with main", value: "sync" },
        { name: "📋 List branches", value: "branches" },
        { name: "🏥 Health check", value: "health" },
        { name: "📦 Publish to npm", value: "publish" },
        new inquirer.Separator("─── Setup ───"),
        { name: "⚙️ Create PR workflow", value: "create-pr-workflow" },
        {
          name: "🚀 Create release workflow",
          value: "create-release-workflow",
        },
        new inquirer.Separator(),
        { name: "❌ Exit", value: "exit" },
      );

      const { operation } = await inquirer.prompt([
        {
          type: "list",
          name: "operation",
          message: "What would you like to do?",
          choices,
        },
      ]);

      if (operation === "exit") {
        console.log(chalk.yellow("Goodbye! 👋"));
        return;
      }

      // Handle the selected operation
      switch (operation) {
        case "auto-commit":
          const useAI = await inquirer.prompt([
            {
              type: "confirm",
              name: "useAI",
              message: "Use AI-generated smart commit message?",
              default: true,
            },
          ]);

          let message;
          if (!useAI.useAI) {
            const messagePrompt = await inquirer.prompt([
              {
                type: "input",
                name: "message",
                message: "Commit message:",
                validate: (input) =>
                  input.trim().length > 0 || "Message required",
              },
            ]);
            message = messagePrompt.message;
          }

          const result = await autoCommit({ message });
          console.log(
            result.success
              ? chalk.green("\n✅ " + result.message)
              : chalk.red("\n❌ " + result.message),
          );
          break;

        case "status":
          const statusResult = await getGitHubFlowStatus();
          console.log("\n" + statusResult.message);
          break;

        case "create-pr-workflow":
          const prWorkflowResult = await createPRWorkflow({});
          console.log(
            prWorkflowResult.success
              ? chalk.green("\n✅ " + prWorkflowResult.message)
              : chalk.red("\n❌ " + prWorkflowResult.message),
          );
          break;

        case "create-release-workflow":
          const releaseWorkflowResult = await createReleaseWorkflow({});
          console.log(
            releaseWorkflowResult.success
              ? chalk.green("\n✅ " + releaseWorkflowResult.message)
              : chalk.red("\n❌ " + releaseWorkflowResult.message),
          );
          break;

        case "quick-commit":
          const quickResult = await quickCommit({});
          console.log(
            quickResult.success
              ? chalk.green("\n✅ " + quickResult.message)
              : chalk.red("\n❌ " + quickResult.message),
          );
          break;

        case "feature-start":
          const featureName = await inquirer.prompt([
            {
              type: "input",
              name: "name",
              message: "Feature branch name:",
              validate: (input) =>
                input.trim().length > 0 || "Branch name required",
            },
          ]);
          const startResult = await startBranch(featureName.name, "feature");
          console.log(
            startResult.success
              ? chalk.green("\n✅ " + startResult.message)
              : chalk.red("\n❌ " + startResult.message),
          );
          break;

        case "feature-finish":
          const finishResult = await finishBranch();
          console.log(
            finishResult.success
              ? chalk.green("\n✅ " + finishResult.message)
              : chalk.red("\n❌ " + finishResult.message),
          );
          break;

        case "sync":
          const syncResult = await syncWithMain("rebase");
          console.log(
            syncResult.success
              ? chalk.green("\n✅ " + syncResult.message)
              : chalk.red("\n❌ " + syncResult.message),
          );
          break;

        case "analyze":
          const analyzeResult = await analyzeChanges({ detailed: true });
          console.log(
            analyzeResult.success
              ? chalk.green("\n✅ " + analyzeResult.message)
              : chalk.red("\n❌ " + analyzeResult.message),
          );
          if (analyzeResult.data) {
            console.log("\n" + JSON.stringify(analyzeResult.data, null, 2));
          }
          break;

        case "branches":
          const branchResult = await listBranches({ include_remote: false });
          console.log(
            branchResult.success
              ? chalk.green("\n✅ " + branchResult.message)
              : chalk.red("\n❌ " + branchResult.message),
          );
          if (branchResult.data) {
            console.log("\n" + JSON.stringify(branchResult.data, null, 2));
          }
          break;

        case "health":
          const healthResult = await repoHealthCheck({ fix_issues: false });
          console.log(
            healthResult.success
              ? chalk.green("\n✅ " + healthResult.message)
              : chalk.red("\n❌ " + healthResult.message),
          );
          if (healthResult.data) {
            console.log("\n" + JSON.stringify(healthResult.data, null, 2));
          }
          break;

        case "publish":
          const publishConfirm = await inquirer.prompt([
            {
              type: "confirm",
              name: "proceed",
              message: "This will publish to NPM. Continue?",
              default: false,
            },
          ]);
          if (publishConfirm.proceed) {
            const publishResult = await npmPublish({});
            console.log(
              publishResult.success
                ? chalk.green("\n✅ " + publishResult.message)
                : chalk.red("\n❌ " + publishResult.message),
            );
          }
          break;

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

// Add smart context detection function
async function detectContext() {
  const {
    getCurrentBranch,
    getMainBranch,
    getChangedFiles,
    hasUncommittedChanges,
  } = await import("../src/utils/git-helpers.js");

  try {
    const currentBranch = getCurrentBranch();
    const mainBranch = getMainBranch();
    const changedFiles = getChangedFiles();
    const hasChanges = hasUncommittedChanges();

    return {
      currentBranch,
      mainBranch,
      isOnMain: currentBranch === mainBranch,
      hasChanges,
      changedFiles: changedFiles.length,
      suggestedAction: determineSuggestedAction(
        currentBranch,
        mainBranch,
        hasChanges,
      ),
    };
  } catch (error) {
    return null;
  }
}

function determineSuggestedAction(currentBranch, mainBranch, hasChanges) {
  const isOnMain = currentBranch === mainBranch;

  if (hasChanges) {
    return isOnMain ? "start-feature" : "commit";
  } else {
    return isOnMain ? "start-feature" : "create-pr";
  }
}

// Handle quick mode or smart interactive mode
async function handleSmartMode() {
  const opts = program.opts();
  const context = await detectContext();

  showBanner({ compact: true });
  console.log(""); // Add spacing after banner

  if (context) {
    console.log(chalk.blue("📍 Current context:"));
    console.log(`  Branch: ${chalk.cyan(context.currentBranch)}`);
    if (context.hasChanges) {
      console.log(
        `  Changes: ${chalk.yellow(context.changedFiles + " files modified")}`,
      );
    } else {
      console.log(`  Changes: ${chalk.green("Working directory clean")}`);
    }
    console.log("");
  }

  // Quick mode - execute suggested action automatically
  if (opts.quick && context) {
    console.log(chalk.green("⚡ Quick mode - executing suggested action..."));
    console.log("");

    switch (context.suggestedAction) {
      case "commit":
        console.log(chalk.blue("🚀 Running smart commit workflow..."));
        const commitResult = await autoCommit({});
        console.log(
          commitResult.success
            ? chalk.green(commitResult.message)
            : chalk.red(commitResult.message),
        );
        break;

      case "create-pr":
        console.log(chalk.blue("🏁 Creating pull request..."));
        const prResult = await finishBranch();
        console.log(
          prResult.success
            ? chalk.green(prResult.message)
            : chalk.red(prResult.message),
        );
        break;

      case "start-feature":
        console.log(chalk.blue("🌿 Please specify a feature name:"));
        console.log(chalk.yellow("  slambed feature <name>"));
        console.log(
          chalk.yellow(
            "  or use: slambed (without --quick) for interactive mode",
          ),
        );
        break;
    }
    return;
  }

  // Show suggested action for interactive mode
  if (context) {
    const suggestions = {
      commit: "🚀 Commit your changes",
      "create-pr": "🏁 Create a pull request",
      "start-feature": "🌿 Start a new feature",
    };

    if (suggestions[context.suggestedAction]) {
      console.log(
        chalk.green(
          "💡 Suggested action: " + suggestions[context.suggestedAction],
        ),
      );
      console.log("");
    }
  }

  // Run interactive mode
  await program.parseAsync(["node", "slambed", "interactive"]);
}

// Show smart interactive mode if no command provided
if (
  !process.argv.slice(2).length ||
  (process.argv.length === 3 && process.argv[2] === "--quick")
) {
  handleSmartMode();
} else {
  // Parse command line arguments normally
  program.parse();
}

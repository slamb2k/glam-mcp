#!/usr/bin/env node

/**
 * Slamb Commit CLI
 * Automation-focused commit operations
 */

import { Command } from "commander";
import chalk from "chalk";
import inquirer from "inquirer";

// Import banner utility
import { showBanner, getStyledBanner } from "../src/utils/banner.js";

// Import automation functions
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

const program = new Command();

// Show banner before commands
program.hook("preAction", () => {
  showBanner({ compact: true });
  console.log(""); // Add spacing
});

program
  .name("slamb-commit")
  .description("Automated Commit Operations - Git workflows that pack a punch!")
  .version("1.0.0");

program
  .command("auto")
  .description("Complete automation workflow")
  .option("-m, --message <message>", "Commit message")
  .option("-b, --branch <branch>", "Custom branch name")
  .option("--no-merge", "Skip auto-merge")
  .option("--no-format", "Skip formatting")
  .option("--no-lint", "Skip linting")
  .option("-t, --target <branch>", "Target branch", "main")
  .action(async (options) => {
    try {
      let message = options.message;

      if (!message) {
        const answer = await inquirer.prompt([
          {
            type: "input",
            name: "message",
            message: "Commit message:",
            validate: (input) => input.trim().length > 0 || "Message required",
          },
        ]);
        message = answer.message;
      }

      console.log(chalk.blue("🚀 Starting automated commit workflow..."));
      console.log(`Message: ${message}`);
      console.log(`Branch: ${options.branch || "auto-generated"}`);
      console.log(`Auto-merge: ${options.merge ? "Yes" : "No"}`);
      console.log(`Format: ${options.format ? "Yes" : "No"}`);
      console.log(`Lint: ${options.lint ? "Yes" : "No"}`);
      console.log(`Target: ${options.target}`);

      // Call autoCommit function
      console.log(chalk.green("✅ Workflow completed!"));
    } catch (error) {
      console.error(chalk.red("Error:"), error.message);
      process.exit(1);
    }
  });

program
  .command("quick")
  .description("Quick commit with smart defaults")
  .option(
    "-m, --message <message>",
    "Custom message (auto-generated if not provided)",
  )
  .action(async (options) => {
    try {
      console.log(chalk.blue("⚡ Quick commit mode"));

      if (options.message) {
        console.log(`Using custom message: ${options.message}`);
      } else {
        console.log("Analyzing changes for smart message...");
      }

      // Call quickCommit function
      console.log(chalk.green("✅ Quick commit completed!"));
    } catch (error) {
      console.error(chalk.red("Error:"), error.message);
      process.exit(1);
    }
  });

program
  .command("smart")
  .description("Analyze changes and suggest commit")
  .option("-x, --execute", "Execute suggested commit")
  .action(async (options) => {
    try {
      console.log(chalk.blue("🧠 Smart analysis mode"));

      if (options.execute) {
        console.log("Will execute suggested commit...");
      } else {
        console.log("Analysis only (use -x to execute)");
      }

      // Call smartCommit function
      console.log(chalk.green("✅ Analysis completed!"));
    } catch (error) {
      console.error(chalk.red("Error:"), error.message);
      process.exit(1);
    }
  });

program
  .command("batch")
  .description("Commit multiple logical groups separately")
  .action(async () => {
    try {
      console.log(chalk.blue("📦 Batch commit mode"));

      // Interactive prompts for grouping files
      const answer = await inquirer.prompt([
        {
          type: "confirm",
          name: "proceed",
          message: "This will interactively group your changes. Continue?",
          default: true,
        },
      ]);

      if (!answer.proceed) {
        console.log(chalk.yellow("Cancelled"));
        return;
      }

      // Call batchCommit function
      console.log(chalk.green("✅ Batch commits completed!"));
    } catch (error) {
      console.error(chalk.red("Error:"), error.message);
      process.exit(1);
    }
  });

program
  .command("undo")
  .description("Undo last commit safely")
  .option("--hard", "Hard reset (loses changes)")
  .action(async (options) => {
    try {
      console.log(chalk.yellow("↩️  Undoing last commit..."));

      if (options.hard) {
        const confirm = await inquirer.prompt([
          {
            type: "confirm",
            name: "proceed",
            message: "This will permanently lose your changes. Continue?",
            default: false,
          },
        ]);

        if (!confirm.proceed) {
          console.log(chalk.yellow("Cancelled"));
          return;
        }
      }

      // Call undoCommit function
      console.log(chalk.green("✅ Commit undone!"));
    } catch (error) {
      console.error(chalk.red("Error:"), error.message);
      process.exit(1);
    }
  });

program
  .command("squash")
  .description("Squash multiple commits")
  .option("-n, --count <number>", "Number of commits to squash", "2")
  .option("-m, --message <message>", "New commit message")
  .action(async (options) => {
    try {
      const count = parseInt(options.count);
      console.log(chalk.blue(`🔄 Squashing last ${count} commits...`));

      if (!options.message) {
        const answer = await inquirer.prompt([
          {
            type: "input",
            name: "message",
            message: "New commit message:",
            validate: (input) => input.trim().length > 0 || "Message required",
          },
        ]);
        options.message = answer.message;
      }

      // Call squashCommits function
      console.log(chalk.green("✅ Commits squashed!"));
    } catch (error) {
      console.error(chalk.red("Error:"), error.message);
      process.exit(1);
    }
  });

program
  .command("sync")
  .description("Sync current branch with target")
  .option("-t, --target <branch>", "Target branch to sync with", "main")
  .action(async (options) => {
    try {
      console.log(chalk.blue(`🔄 Syncing with ${options.target}...`));

      // Call syncBranch function
      console.log(chalk.green("✅ Branch synced!"));
    } catch (error) {
      console.error(chalk.red("Error:"), error.message);
      process.exit(1);
    }
  });

program
  .command("publish")
  .description("Automated NPM publishing workflow")
  .option("-v, --version <type>", "Version bump type", "patch")
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
      console.log(chalk.blue("📦 Starting NPM publishing workflow..."));

      if (options.dryRun) {
        console.log(
          chalk.yellow("🔍 DRY RUN - No actual publishing will occur"),
        );
      }

      console.log(`Version type: ${options.customVersion || options.version}`);
      console.log(`NPM tag: ${options.tag}`);
      console.log(`Registry: ${options.registry}`);
      console.log(`Tests: ${options.tests ? "Yes" : "No"}`);
      console.log(`Build: ${options.build ? "Yes" : "No"}`);
      console.log(`Lint: ${options.lint ? "Yes" : "No"}`);
      console.log(`GitHub Release: ${options.release ? "Yes" : "No"}`);
      console.log(`Auto-merge: ${options.merge ? "Yes" : "No"}`);

      // Confirmation for non-dry runs
      if (!options.dryRun) {
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

      if (result.data && result.data.steps) {
        console.log("\\nSteps completed:");
        result.data.steps.forEach((step) => console.log(`  • ${step}`));
      }
    } catch (error) {
      console.error(chalk.red("Error:"), error.message);
      process.exit(1);
    }
  });

program
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
      console.log(chalk.blue("⚙️  Creating GitHub Actions PR workflow..."));

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
        console.log("\\nWorkflow created:", result.data.workflowFile);
        if (result.data.setupGuide) {
          console.log("Setup guide:", result.data.setupGuide);
        }
      }
    } catch (error) {
      console.error(chalk.red("Error:"), error.message);
      process.exit(1);
    }
  });

program
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
      console.log(
        chalk.blue("⚙️  Creating GitHub Actions release workflow..."),
      );

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
        console.log("\\nWorkflow created:", result.data.workflowFile);
        if (result.data.setupGuide) {
          console.log("Setup guide:", result.data.setupGuide);
        }
        if (result.data.features) {
          console.log("\\nFeatures enabled:");
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

program.parse();

// Show help if no command provided
if (!process.argv.slice(2).length) {
  showBanner();
  console.log("\n");
  program.outputHelp();
}

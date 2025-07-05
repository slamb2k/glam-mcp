#!/usr/bin/env node

/**
 * Slamb Flow CLI
 * GitHub Flow focused interface (simplified workflow)
 */

import { Command } from "commander";
import chalk from "chalk";

// Import banner utility
import { showBanner } from "../src/utils/banner.js";

// Import GitHub Flow functions
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

const program = new Command();

program
  .name("slamb-flow")
  .description("GitHub Flow Operations (Simplified Workflow)")
  .version("1.0.0");

program
  .command("start <name>")
  .description("Start a new branch from main")
  .option(
    "-t, --type <type>",
    "Branch type (feature, fix, docs, chore)",
    "feature",
  )
  .option("--allow-outdated-base", "Allow operations on outdated base branch")
  .action(async (name, options) => {
    try {
      console.log(chalk.blue(`Starting ${options.type} branch: ${name}`));
      const result = await startBranch(
        name,
        options.type,
        options.allowOutdatedBase,
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
  .command("finish")
  .description("Finish current branch by creating a PR")
  .option("-t, --title <title>", "PR title")
  .option("-d, --description <description>", "PR description")
  .option("--draft", "Create as draft PR")
  .option("--auto-merge", "Auto-merge PR")
  .action(async (options) => {
    try {
      console.log(chalk.blue("Creating pull request for current branch"));
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

program
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
      console.log(chalk.blue(`Quick workflow for: ${name}`));
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

program
  .command("pr")
  .description("Create or merge pull request")
  .option("-t, --title <title>", "PR title")
  .option("-d, --description <description>", "PR description")
  .option("--draft", "Create as draft PR")
  .option("--merge [number]", "Merge PR by number")
  .option("--method <method>", "Merge method (merge, squash, rebase)", "squash")
  .action(async (options) => {
    try {
      if (options.merge) {
        console.log(chalk.blue(`Merging PR: ${options.merge}`));
        const result = await mergePullRequest(
          options.merge,
          options.method,
          true,
        );
        console.log(
          result.success
            ? chalk.green(result.message)
            : chalk.red(result.message),
        );
      } else {
        console.log(chalk.blue("Creating pull request"));
        const result = await createPullRequest(
          options.title,
          options.description,
          options.draft,
        );
        console.log(
          result.success
            ? chalk.green(result.message)
            : chalk.red(result.message),
        );
      }
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
      console.log(chalk.blue("Syncing with main branch"));
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

program
  .command("status")
  .description("Show GitHub Flow status")
  .action(async () => {
    try {
      const result = await getGitHubFlowStatus();
      console.log(result.message || JSON.stringify(result.data, null, 2));
    } catch (error) {
      console.error(chalk.red("Error:"), error.message);
      process.exit(1);
    }
  });

program
  .command("cleanup")
  .description("Clean up merged branches")
  .option("-f, --force", "Force cleanup")
  .action(async (options) => {
    try {
      console.log(chalk.blue("Cleaning up merged branches"));
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

program.parse();

// Show help if no command provided
if (!process.argv.slice(2).length) {
  showBanner();
  console.log("\n");
  program.outputHelp();
}

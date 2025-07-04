#!/usr/bin/env node

/**
 * Slamb Flow CLI
 * Traditional git-flow operations
 */

import { Command } from "commander";
import chalk from "chalk";
import inquirer from "inquirer";

// Import banner utility
import { showBanner, getStyledBanner } from "../src/utils/banner.js";

// Import git-flow functions (we'll need to adjust these imports)
import "../src/tools/git-flow.js";

const program = new Command();

// Show banner before commands
program.hook("preAction", () => {
  showBanner({ compact: true });
  console.log(""); // Add spacing
});

program
  .name("slamb-flow")
  .description(
    "Traditional Git Flow Operations - Git workflows that pack a punch!",
  )
  .version("1.0.0");

program
  .command("feature")
  .argument("<action>", "start or finish")
  .argument("[name]", "feature name")
  .option("-m, --message <message>", "PR message for finish")
  .option("--auto-merge", "Auto-merge PR (finish only)")
  .option("-t, --target <branch>", "Target branch (finish only)", "main")
  .description("Feature branch operations (start/finish)")
  .action(async (action, name, options) => {
    try {
      if (action === "start") {
        if (!name) {
          const answer = await inquirer.prompt([
            {
              type: "input",
              name: "name",
              message: "Feature name:",
              validate: (input) => input.trim().length > 0 || "Name required",
            },
          ]);
          name = answer.name;
        }

        console.log(chalk.blue(`Starting feature: ${name}`));
        // Call startFeature function
      } else if (action === "finish") {
        console.log(
          chalk.blue(`Finishing feature: ${name || "current branch"}`),
        );
        // Call finishFeature function
      } else {
        console.error(chalk.red('Invalid action. Use "start" or "finish"'));
        process.exit(1);
      }
    } catch (error) {
      console.error(chalk.red("Error:"), error.message);
      process.exit(1);
    }
  });

program
  .command("release")
  .argument("<action>", "start or finish")
  .argument("[version]", "release version")
  .option("-m, --message <message>", "Release message")
  .description("Release branch operations (start/finish)")
  .action(async (action, version, options) => {
    try {
      if (action === "start") {
        if (!version) {
          const answer = await inquirer.prompt([
            {
              type: "input",
              name: "version",
              message: "Release version (e.g., 1.2.0):",
              validate: (input) =>
                /^\d+\.\d+\.\d+$/.test(input) || "Version must be x.y.z format",
            },
          ]);
          version = answer.version;
        }

        console.log(chalk.blue(`Starting release: ${version}`));
        // Call startRelease function
      } else if (action === "finish") {
        console.log(
          chalk.blue(`Finishing release: ${version || "current branch"}`),
        );
        // Call finishRelease function
      } else {
        console.error(chalk.red('Invalid action. Use "start" or "finish"'));
        process.exit(1);
      }
    } catch (error) {
      console.error(chalk.red("Error:"), error.message);
      process.exit(1);
    }
  });

program
  .command("hotfix")
  .argument("<action>", "start or finish")
  .argument("[name]", "hotfix name")
  .option("-m, --message <message>", "PR message for finish")
  .option("--auto-merge", "Auto-merge PR (finish only)")
  .description("Hotfix branch operations (start/finish)")
  .action(async (action, name, options) => {
    try {
      if (action === "start") {
        if (!name) {
          const answer = await inquirer.prompt([
            {
              type: "input",
              name: "name",
              message: "Hotfix name:",
              validate: (input) => input.trim().length > 0 || "Name required",
            },
          ]);
          name = answer.name;
        }

        console.log(chalk.blue(`Starting hotfix: ${name}`));
        // Call startHotfix function
      } else if (action === "finish") {
        console.log(
          chalk.blue(`Finishing hotfix: ${name || "current branch"}`),
        );
        // Call finishHotfix function
      } else {
        console.error(chalk.red('Invalid action. Use "start" or "finish"'));
        process.exit(1);
      }
    } catch (error) {
      console.error(chalk.red("Error:"), error.message);
      process.exit(1);
    }
  });

program
  .command("status")
  .description("Show git flow status")
  .action(async () => {
    try {
      console.log(chalk.blue("📊 Git Flow Status"));
      // Call getGitFlowStatus function
    } catch (error) {
      console.error(chalk.red("Error:"), error.message);
      process.exit(1);
    }
  });

program
  .command("clean")
  .description("Clean up merged branches")
  .option("-f, --force", "Force cleanup without confirmation")
  .action(async (options) => {
    try {
      console.log(chalk.blue("🧹 Cleaning merged branches"));
      // Call cleanBranches function
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

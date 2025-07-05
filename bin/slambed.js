#!/usr/bin/env node

/**
 * Main Slambed CLI
 * Unified interface for all GitHub Flow operations
 */

import { Command } from "commander";
import chalk from "chalk";
import inquirer from "inquirer";

// Import banner utility
import { showBanner } from "../src/utils/banner.js";

// Import tool functions directly for CLI usage
import {
  autoCommit,
  quickCommit,
  smartCommit,
  syncBranch,
  npmPublish,
  createPRWorkflow,
  createReleaseWorkflow,
} from "../src/tools/automation.js";
import {
  startBranch,
  finishBranch,
  quickWorkflow,
  syncWithMain,
  cleanupBranches,
  getGitHubFlowStatus,
} from "../src/tools/github-flow.js";
import {
  getRepoInfo,
  analyzeChanges,
  listBranches,
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
  .description("Comprehensive GitHub Flow Automation with MCP and CLI Support")
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
  .option("--branch-strategy <strategy>", "Strategy for stale branches: auto, rebase, new", "auto")
  .action(async (options) => {
    try {
      // Check if we need a message (auto-generate with AI by default)
      if (!options.message) {
        // Import git helpers to check current state
        const { getCurrentBranch, getChangedFiles } =
          await import("../src/utils/git-helpers.js");
        const currentBranch = getCurrentBranch();
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

// Issue-based workflow command
program
  .command("issue [searchTerm]")
  .description("Work with GitHub issues - create branches from issues")
  .option("-l, --list", "List all open issues")
  .option("-c, --closed", "Include closed issues")
  .option("-a, --assignee <username>", "Filter by assignee")
  .option("-L, --label <label>", "Filter by label")
  .option("-m, --milestone <milestone>", "Filter by milestone")
  .action(async (searchTerm, options) => {
    try {
      // Import necessary functions
      const { execGitCommand, isGitRepository, getMainBranch, getCurrentBranch, branchExists } = 
        await import("../src/utils/git-helpers.js");
      
      if (!isGitRepository()) {
        console.error(chalk.red("Error: Not a git repository"));
        process.exit(1);
      }

      // Check if gh CLI is available
      try {
        execGitCommand("gh --version", { silent: true });
      } catch (error) {
        console.error(chalk.red("Error: GitHub CLI (gh) is not installed or not authenticated"));
        console.error(chalk.yellow("Please install gh and run 'gh auth login'"));
        process.exit(1);
      }

      let issues = [];
      
      // Build the gh issue list command
      let listCommand = "gh issue list --json number,title,state,assignees,labels,milestone,body,url";
      
      if (!options.closed) {
        listCommand += " --state open";
      } else {
        listCommand += " --state all";
      }
      
      if (options.assignee) {
        listCommand += ` --assignee ${options.assignee}`;
      }
      
      if (options.label) {
        listCommand += ` --label "${options.label}"`;
      }
      
      if (options.milestone) {
        listCommand += ` --milestone "${options.milestone}"`;
      }
      
      try {
        const output = execGitCommand(listCommand, { silent: true });
        issues = JSON.parse(output);
      } catch (error) {
        console.error(chalk.red("Error fetching issues:"), error.message);
        process.exit(1);
      }

      // If searchTerm is provided, filter or find specific issue
      if (searchTerm) {
        // Check if searchTerm is a number (issue ID)
        const issueNumber = parseInt(searchTerm);
        if (!isNaN(issueNumber)) {
          // Fetch specific issue
          try {
            const issueOutput = execGitCommand(`gh issue view ${issueNumber} --json number,title,state,assignees,labels,milestone,body,url`, { silent: true });
            const specificIssue = JSON.parse(issueOutput);
            issues = [specificIssue];
          } catch (error) {
            console.error(chalk.red(`Issue #${issueNumber} not found`));
            process.exit(1);
          }
        } else {
          // Search by title/body
          issues = issues.filter(issue => 
            issue.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
            (issue.body && issue.body.toLowerCase().includes(searchTerm.toLowerCase()))
          );
        }
      }

      // Handle no issues found
      if (issues.length === 0) {
        console.log(chalk.yellow(searchTerm ? `No issues found matching "${searchTerm}"` : "No open issues found"));
        process.exit(0);
      }

      // If just listing, show all issues
      if (options.list || !searchTerm) {
        console.log(chalk.blue(`\n📋 ${options.closed ? 'All' : 'Open'} Issues (${issues.length}):\n`));
        issues.forEach(issue => {
          const state = issue.state === 'OPEN' ? chalk.green('●') : chalk.red('●');
          const labels = issue.labels.map(l => chalk.cyan(`[${l.name}]`)).join(' ');
          const assignees = issue.assignees.map(a => `@${a.login}`).join(', ');
          
          console.log(`${state} #${issue.number}: ${chalk.bold(issue.title)}`);
          if (labels) console.log(`  ${labels}`);
          if (assignees) console.log(`  Assigned to: ${assignees}`);
          if (issue.milestone) console.log(`  Milestone: ${issue.milestone.title}`);
          console.log(`  ${chalk.dim(issue.url)}`);
          console.log();
        });
        
        if (!searchTerm) {
          console.log(chalk.dim("Tip: Use 'slambed issue <number>' to create a branch from a specific issue"));
        }
        process.exit(0);
      }

      // Select issue if multiple matches
      let selectedIssue;
      if (issues.length === 1) {
        selectedIssue = issues[0];
      } else {
        // Multiple matches - show selection menu
        const choices = issues.map(issue => ({
          name: `#${issue.number}: ${issue.title} ${issue.state === 'CLOSED' ? chalk.red('[CLOSED]') : ''}`,
          value: issue,
          short: `#${issue.number}`
        }));

        const answer = await inquirer.prompt([{
          type: 'list',
          name: 'issue',
          message: 'Select an issue to work on:',
          choices: choices,
          pageSize: 10
        }]);
        
        selectedIssue = answer.issue;
      }

      // Check if issue is closed
      if (selectedIssue.state === 'CLOSED') {
        const confirm = await inquirer.prompt([{
          type: 'confirm',
          name: 'proceed',
          message: chalk.yellow(`Issue #${selectedIssue.number} is closed. Do you still want to create a branch?`),
          default: false
        }]);
        
        if (!confirm.proceed) {
          console.log(chalk.yellow("Operation cancelled"));
          process.exit(0);
        }
      }

      // Generate branch name from issue
      const sanitizedTitle = selectedIssue.title
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')
        .substring(0, 50);
      
      const branchName = `issue/${selectedIssue.number}-${sanitizedTitle}`;

      // Check if branch already exists
      if (branchExists(branchName)) {
        const switchBranch = await inquirer.prompt([{
          type: 'confirm',
          name: 'switch',
          message: `Branch '${branchName}' already exists. Switch to it?`,
          default: true
        }]);
        
        if (switchBranch.switch) {
          execGitCommand(`git checkout ${branchName}`, { silent: true });
          console.log(chalk.green(`✅ Switched to existing branch: ${branchName}`));
        } else {
          console.log(chalk.yellow("Operation cancelled"));
        }
        process.exit(0);
      }

      // Create the branch
      console.log(chalk.blue(`\n🎯 Creating branch for issue #${selectedIssue.number}: ${selectedIssue.title}\n`));

      // Ensure we're on main branch and up to date
      const mainBranch = getMainBranch();
      const currentBranch = getCurrentBranch();
      
      if (currentBranch !== mainBranch) {
        console.log(chalk.dim(`Switching to ${mainBranch} branch...`));
        execGitCommand(`git checkout ${mainBranch}`, { silent: true });
      }

      try {
        console.log(chalk.dim("Pulling latest changes..."));
        execGitCommand("git pull origin HEAD", { silent: true });
      } catch (e) {
        // Ignore pull errors (might not have remote)
      }

      // Create and checkout new branch
      execGitCommand(`git checkout -b ${branchName}`, { silent: true });
      
      // Store issue metadata in git config for later use
      execGitCommand(`git config branch.${branchName}.issue-number ${selectedIssue.number}`, { silent: true });
      execGitCommand(`git config branch.${branchName}.issue-title "${selectedIssue.title}"`, { silent: true });
      execGitCommand(`git config branch.${branchName}.issue-url "${selectedIssue.url}"`, { silent: true });

      console.log(chalk.green(`\n✅ Created and switched to branch: ${branchName}`));
      console.log(chalk.dim(`\nIssue URL: ${selectedIssue.url}`));
      console.log(chalk.dim(`\nThis branch is now linked to issue #${selectedIssue.number}`));
      console.log(chalk.dim(`When you create commits or PRs, they will automatically reference this issue.\n`));
      
      // Show next steps
      console.log(chalk.blue("Next steps:"));
      console.log("  1. Make your changes");
      console.log("  2. Commit with: git commit -m 'Your message'");
      console.log(`  3. Create PR with: slambed flow finish`);
      console.log(chalk.dim("\nThe PR will automatically link to issue #" + selectedIssue.number));

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
            { name: "🎯 Work on Issue", value: "issue-branch" },
            { name: "🌿 Start Feature Branch", value: "feature-start" },
            { name: "🏁 Finish Feature Branch", value: "feature-finish" },
            { name: "📊 Repository Status", value: "status" },
            { name: "🔍 Analyze Changes", value: "analyze" },
            { name: "🏥 Health Check", value: "health" },
            { name: "📋 List Branches", value: "branches" },
            { name: "⚙️ Create PR Workflow", value: "create-pr-workflow" },
            {
              name: "🚀 Create Release Workflow",
              value: "create-release-workflow",
            },
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

        case "issue-branch":
          // Show open issues first
          const { execGitCommand: execGit } = await import("../src/utils/git-helpers.js");
          
          try {
            const issuesOutput = execGit("gh issue list --json number,title,state --limit 20", { silent: true });
            const issues = JSON.parse(issuesOutput);
            
            if (issues.length === 0) {
              console.log(chalk.yellow("\nNo open issues found"));
              break;
            }
            
            const issueChoices = issues.map(issue => ({
              name: `#${issue.number}: ${issue.title}`,
              value: issue.number
            }));
            
            const { selectedIssue } = await inquirer.prompt([{
              type: 'list',
              name: 'selectedIssue',
              message: 'Select an issue to work on:',
              choices: issueChoices
            }]);
            
            // Now execute the issue command with the selected issue number
            process.argv = ['node', 'slambed', 'issue', selectedIssue.toString()];
            const issueCommand = program.commands.find(cmd => cmd.name() === 'issue');
            await issueCommand.parseAsync(process.argv);
          } catch (error) {
            console.error(chalk.red("Error:"), error.message);
          }
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

/**
 * Enhanced Automation Features
 * Complete workflow automation tools for streamlined development
 */

import { execSync } from "child_process";
import fs from "fs";
import path from "path";
import {
  isGitRepository,
  getMainBranch,
  getCurrentBranch,
  hasUncommittedChanges,
  getChangedFiles,
  hasScript,
  generateBranchName,
  execGitCommand,
  getBranchDivergence,
  safeRebase,
  isBranchMerged,
  hasRemoteBranch,
  forceRebaseOnMain,
  ensureMainUpdated,
} from "../utils/git-helpers.js";
import {
  createSuccessResponse,
  createErrorResponse,
} from "../utils/responses.js";
import { createNpmPackage } from "./utilities.js";
import { getConfig } from "../core/config.js";

/**
 * Register automation tools
 */
export function registerAutomationTools(server) {
  // Complete automation workflow
  server.addTool({
    name: "auto_commit",
    description:
      "Complete automation: branch → format → lint → commit → push → PR → merge → cleanup",
    inputSchema: {
      type: "object",
      properties: {
        message: {
          type: "string",
          description:
            "Commit message (required for new commits, optional when pushing existing branch)",
        },
        branch_name: {
          type: "string",
          description: "Custom branch name (auto-generated if not provided)",
        },
        auto_merge: {
          type: "boolean",
          description: "Automatically merge PR after creation",
          default: true,
        },
        delete_branch: {
          type: "boolean",
          description: "Delete branch after successful merge",
          default: true,
        },
        run_format: {
          type: "boolean",
          description: "Run code formatting",
          default: true,
        },
        run_lint: {
          type: "boolean",
          description: "Run linting",
          default: true,
        },
        target_branch: {
          type: "string",
          description: "Target branch for PR",
          default: "main",
        },
        branch_prefix: {
          type: "string",
          description: "Branch prefix",
          default: "feature/",
        },
        branch_strategy: {
          type: "string",
          description:
            "Strategy for handling stale branches: 'auto' (prompt if interactive), 'rebase', 'new'",
          enum: ["auto", "rebase", "new"],
          default: "auto",
        },
      },
      required: [],
    },
    handler: async (params) => autoCommit(params),
  });

  // Quick commit with auto-generation
  server.addTool({
    name: "quick_commit",
    description: "Fast commit with auto-generated branch and smart message",
    inputSchema: {
      type: "object",
      properties: {
        message: {
          type: "string",
          description: "Custom commit message (auto-generated if not provided)",
        },
        auto_merge: {
          type: "boolean",
          description: "Auto-merge PR",
          default: true,
        },
        run_format: {
          type: "boolean",
          description: "Run formatting",
          default: true,
        },
      },
    },
    handler: async (params) => quickCommit(params),
  });

  // Smart commit with analysis
  server.addTool({
    name: "smart_commit",
    description: "Analyze changes and suggest commit message and type",
    inputSchema: {
      type: "object",
      properties: {
        execute: {
          type: "boolean",
          description: "Execute the commit after analysis",
          default: false,
        },
      },
    },
    handler: async (params) => smartCommit(params),
  });

  // Branch synchronization
  server.addTool({
    name: "sync_branch",
    description:
      "Sync current branch with target branch (stash, pull, rebase, restore)",
    inputSchema: {
      type: "object",
      properties: {
        target_branch: {
          type: "string",
          description: "Target branch to sync with",
          default: "main",
        },
      },
    },
    handler: async (params) => syncBranch(params),
  });

  // Commit squashing
  server.addTool({
    name: "squash_commits",
    description: "Squash multiple commits into one",
    inputSchema: {
      type: "object",
      properties: {
        count: {
          type: "number",
          description: "Number of commits to squash",
          default: 2,
        },
        message: {
          type: "string",
          description: "New commit message for squashed commit",
        },
      },
    },
    handler: async (params) => squashCommits(params),
  });

  // Safe commit undo
  server.addTool({
    name: "undo_commit",
    description: "Undo last commit while preserving changes",
    inputSchema: {
      type: "object",
      properties: {
        hard: {
          type: "boolean",
          description: "Hard reset (loses changes)",
          default: false,
        },
      },
    },
    handler: async (params) => undoCommit(params),
  });

  // Batch operations
  server.addTool({
    name: "batch_commit",
    description:
      "Commit multiple logical groups of changes as separate commits",
    inputSchema: {
      type: "object",
      properties: {
        groups: {
          type: "array",
          description: "Array of commit groups",
          items: {
            type: "object",
            properties: {
              files: {
                type: "array",
                items: { type: "string" },
                description: "Files to include in this commit",
              },
              message: {
                type: "string",
                description: "Commit message for this group",
              },
            },
            required: ["files", "message"],
          },
        },
        push: {
          type: "boolean",
          description: "Push commits after creation",
          default: true,
        },
      },
      required: ["groups"],
    },
    handler: async (params) => batchCommit(params),
  });

  // Complete project initialization
  server.addTool({
    name: "init_project",
    description:
      "Complete project initialization: git init → create repo → branch protection → feature branch → initial commit → PR → merge",
    inputSchema: {
      type: "object",
      properties: {
        project_name: {
          type: "string",
          description: "Project name (defaults to directory name)",
        },
        description: {
          type: "string",
          description: "Project description",
        },
        repo_visibility: {
          type: "string",
          enum: ["public", "private"],
          description: "Repository visibility",
          default: "private",
        },
        create_npm_package: {
          type: "boolean",
          description: "Create package.json and npm files",
          default: true,
        },
        author: {
          type: "string",
          description: "Author name",
        },
        license: {
          type: "string",
          description: "License type",
          default: "MIT",
        },
        enable_branch_protection: {
          type: "boolean",
          description: "Enable branch protection rules",
          default: true,
        },
        auto_merge_initial: {
          type: "boolean",
          description: "Auto-merge initial commit PR",
          default: true,
        },
        initial_commit_message: {
          type: "string",
          description: "Initial commit message",
          default: "Initial project setup",
        },
        create_readme: {
          type: "boolean",
          description: "Create README.md",
          default: true,
        },
        create_gitignore: {
          type: "boolean",
          description: "Create .gitignore",
          default: true,
        },
        template_type: {
          type: "string",
          enum: ["node", "python", "generic"],
          description: "Project template type",
          default: "node",
        },
      },
    },
    handler: async (params) => initProject(params),
  });

  // Automated NPM publishing workflow
  server.addTool({
    name: "npm_publish",
    description:
      "Automated NPM publishing: version bump → build → test → tag → publish → PR → merge",
    inputSchema: {
      type: "object",
      properties: {
        version_type: {
          type: "string",
          enum: ["patch", "minor", "major"],
          description: "Version bump type",
          default: "patch",
        },
        custom_version: {
          type: "string",
          description: "Custom version (overrides version_type)",
        },
        tag: {
          type: "string",
          description: "NPM tag for publishing",
          default: "latest",
        },
        run_tests: {
          type: "boolean",
          description: "Run tests before publishing",
          default: true,
        },
        run_build: {
          type: "boolean",
          description: "Run build before publishing",
          default: true,
        },
        run_lint: {
          type: "boolean",
          description: "Run linting before publishing",
          default: true,
        },
        create_release: {
          type: "boolean",
          description: "Create GitHub release",
          default: true,
        },
        auto_merge_pr: {
          type: "boolean",
          description: "Auto-merge version bump PR",
          default: true,
        },
        dry_run: {
          type: "boolean",
          description: "Perform dry run without publishing",
          default: false,
        },
        registry: {
          type: "string",
          description: "NPM registry URL",
          default: "https://registry.npmjs.org/",
        },
      },
    },
    handler: async (params) => npmPublish(params),
  });

  // GitHub Actions creation
  server.addTool({
    name: "create_pr_workflow",
    description:
      "Create GitHub Action workflow for PR checks (linting, testing, building)",
    inputSchema: {
      type: "object",
      properties: {
        workflow_name: {
          type: "string",
          description: "Workflow name",
          default: "PR Checks",
        },
        node_version: {
          type: "string",
          description: "Node.js version to use",
          default: "18",
        },
        include_lint: {
          type: "boolean",
          description: "Include linting step",
          default: true,
        },
        include_test: {
          type: "boolean",
          description: "Include testing step",
          default: true,
        },
        include_build: {
          type: "boolean",
          description: "Include build step",
          default: true,
        },
        include_type_check: {
          type: "boolean",
          description: "Include type checking step",
          default: false,
        },
      },
    },
    handler: async (params) => createPRWorkflow(params),
  });

  server.addTool({
    name: "create_release_workflow",
    description:
      "Create GitHub Action workflow for automated releases on main branch",
    inputSchema: {
      type: "object",
      properties: {
        workflow_name: {
          type: "string",
          description: "Workflow name",
          default: "Release",
        },
        node_version: {
          type: "string",
          description: "Node.js version to use",
          default: "18",
        },
        release_type: {
          type: "string",
          enum: ["npm", "github", "both"],
          description: "Type of release to create",
          default: "both",
        },
        auto_version_bump: {
          type: "boolean",
          description: "Automatically bump version",
          default: true,
        },
        version_bump_type: {
          type: "string",
          enum: ["patch", "minor", "major"],
          description: "Default version bump type",
          default: "patch",
        },
        create_changelog: {
          type: "boolean",
          description: "Generate changelog",
          default: true,
        },
      },
    },
    handler: async (params) => createReleaseWorkflow(params),
  });

  // Enhanced test runner with analysis
  server.addTool({
    name: "run_tests",
    description:
      "Run tests with enhanced analysis, metrics tracking, and intelligent suggestions. Use this when you need to execute tests and get detailed insights about test performance, flaky tests, and improvement areas.",
    inputSchema: {
      type: "object",
      properties: {
        coverage: {
          type: "boolean",
          description: "Run with coverage analysis",
          default: true,
        },
        watch: {
          type: "boolean",
          description: "Run in watch mode",
          default: false,
        },
        pattern: {
          type: "string",
          description: "Test file pattern to match",
        },
        bail: {
          type: "boolean",
          description: "Stop after first test failure",
          default: false,
        },
        verbose: {
          type: "boolean",
          description: "Show detailed output",
          default: false,
        },
      },
    },
    handler: async (params) => runTests(params),
  });

  // Enhanced code analyzer
  server.addTool({
    name: "analyze_code",
    description:
      "Analyze code quality, complexity, and provide improvement suggestions. Use this when you need insights about code quality metrics, technical debt, and prioritized improvement recommendations.",
    inputSchema: {
      type: "object",
      properties: {
        path: {
          type: "string",
          description: "Path to analyze (file or directory)",
          default: "./src",
        },
        include_deps: {
          type: "boolean",
          description: "Include dependency analysis",
          default: true,
        },
        include_complexity: {
          type: "boolean",
          description: "Include complexity metrics",
          default: true,
        },
        include_duplication: {
          type: "boolean",
          description: "Include code duplication analysis",
          default: true,
        },
        threshold: {
          type: "number",
          description: "Complexity threshold for flagging files",
          default: 10,
        },
      },
    },
    handler: async (params) => analyzeCode(params),
  });
}


/**
 * Complete automation workflow
 */
async function autoCommit({
  message,
  branch_name,
  auto_merge = true,
  delete_branch = true,
  run_format = true,
  run_lint = true,
  target_branch = "main",
  branch_prefix = "feature/",
  branch_strategy = "auto",
  allow_outdated_base,
}) {
  if (!isGitRepository()) {
    return createErrorResponse("Not a git repository");
  }

  try {
    const steps = [];
    const warnings = [];
    const currentBranch = getCurrentBranch();
    const mainBranch = getMainBranch();
    let hasStashedChanges = false;

    // Check if working on already-merged or deleted remote branch
    if (currentBranch !== mainBranch) {
      const isMerged = isBranchMerged(currentBranch, mainBranch);
      const hasRemote = hasRemoteBranch(currentBranch);

      if (isMerged || !hasRemote) {
        steps.push(
          isMerged
            ? `Branch '${currentBranch}' was already merged to ${mainBranch}`
            : `Branch '${currentBranch}' has no remote (was deleted)`,
        );
        steps.push(`Forcing rebase on origin/${mainBranch} as required...`);

        // Force rebase on origin/main
        const rebaseResult = forceRebaseOnMain(mainBranch);
        steps.push(...rebaseResult.steps);

        if (!rebaseResult.success) {
          return createErrorResponse(
            `Failed to rebase on origin/${mainBranch}: ${rebaseResult.message}. ` +
              `Please resolve conflicts manually or checkout a fresh branch.`,
          );
        }

        steps.push(
          `Successfully ensured branch is based on latest origin/${mainBranch}`,
        );
      }
    }

    // Check for changes
    const changedFiles = getChangedFiles();
    const hasChanges = changedFiles.length > 0;

    // If no changes and we're on main branch, nothing to do
    if (!hasChanges && currentBranch === mainBranch) {
      return createErrorResponse(
        "No changes detected and on main branch. Nothing to commit.",
      );
    }

    let branchName;
    let needsCommit = hasChanges;
    let needsPush = false;
    let needsForcePush = false;

    if (!hasChanges && currentBranch !== mainBranch) {
      // No changes but on feature branch - check if it needs rebasing
      branchName = currentBranch;
      needsCommit = false;
      needsPush = true;

      // Check if branch is stale
      const divergence = getBranchDivergence(mainBranch);
      if (divergence.behind > 0) {
        steps.push(
          `Branch ${branchName} is ${divergence.behind} commits behind ${mainBranch}`,
        );

        // For no-changes scenario, we can ask if they want to rebase before pushing
        let shouldRebase = true;

        if (branch_strategy === "auto") {
          // Add warning about branch status
          warnings.push(
            `Branch '${currentBranch}' is ${divergence.behind} commits behind ${mainBranch}.`
          );
          warnings.push(`You have no uncommitted changes.`);
          warnings.push(`Defaulting to rebase before creating PR.`);
          
          // Default to rebasing in non-interactive mode
          shouldRebase = true;
        } else if (branch_strategy === "new") {
          // Can't create new branch with no changes
          return createErrorResponse(
            "Cannot create new branch with no changes. Use --branch-strategy=rebase or commit changes first.",
          );
        }

        if (shouldRebase) {
          // Attempt to rebase
          const rebaseResult = safeRebase(mainBranch);
          steps.push(...rebaseResult.steps);

          if (!rebaseResult.success) {
            if (rebaseResult.hadConflicts) {
              return createErrorResponse(
                `Cannot auto-rebase due to conflicts. Please manually resolve conflicts or checkout a new branch.`,
              );
            } else {
              return createErrorResponse(rebaseResult.message);
            }
          }

          steps.push(
            `Successfully rebased ${branchName} on latest ${mainBranch}`,
          );
          needsPush = true;
          needsForcePush = true; // Force push needed after rebase
        } else {
          steps.push(`Proceeding without rebase as requested`);
        }
      } else {
        steps.push(
          `No changes to commit, continuing with push + PR workflow for branch: ${branchName}`,
        );
      }
    } else if (hasChanges) {
      // Has changes - check if we should reuse existing feature branch or create new one
      if (!message) {
        // Generate AI message when none provided
        try {
          const analysis = await analyzeChangesInDepth(
            changedFiles,
            currentBranch,
          );
          message = analysis.suggestedMessage;
          steps.push(
            `Generated AI commit message: "${message}" (confidence: ${analysis.confidence}%)`,
          );
        } catch (e) {
          return createErrorResponse(
            "Could not generate commit message automatically. Please provide a message.",
          );
        }
      }

      steps.push(`Found ${changedFiles.length} changed files`);

      // If we're already on a feature branch, check if it's stale
      if (currentBranch !== mainBranch && !branch_name) {
        const divergence = getBranchDivergence(mainBranch);

        if (divergence.behind > 0) {
          steps.push(
            `Current branch ${currentBranch} is ${divergence.behind} commits behind ${mainBranch}`,
          );

          // Determine strategy based on branch_strategy parameter
          let strategy = branch_strategy;

          // If auto mode, default to rebase
          if (strategy === "auto") {
            // Add warnings about branch status
            warnings.push(
              `Branch '${currentBranch}' is ${divergence.behind} commits behind ${mainBranch}.`
            );
            warnings.push(
              `You have uncommitted changes for: ${message || "new work"}`
            );
            warnings.push(`Defaulting to rebase strategy.`);
            
            // Non-interactive auto mode - default to rebase
            strategy = "rebase";
            steps.push("Non-interactive mode: defaulting to rebase strategy");
          }

          // Execute chosen strategy
          if (strategy === "rebase") {
            steps.push("Attempting to rebase current branch...");

            // Stash changes before rebasing
            execGitCommand("git stash", { silent: true });
            steps.push("Stashed uncommitted changes");
            hasStashedChanges = true;

            // Attempt to rebase
            const rebaseResult = safeRebase(mainBranch);
            steps.push(...rebaseResult.steps);

            // Restore stashed changes
            try {
              execGitCommand("git stash pop", { silent: true });
              steps.push("Restored stashed changes");
            } catch (e) {
              steps.push(
                "Failed to restore stashed changes - manual intervention may be needed",
              );
            }

            if (!rebaseResult.success) {
              if (rebaseResult.hadConflicts) {
                // Rebase failed due to conflicts
                if (branch_strategy === "auto") {
                  warnings.push(`Rebase failed due to conflicts.`);
                  // In non-interactive mode, default to creating new branch
                  strategy = "new"; // Fall through to new branch creation
                  steps.push("Defaulting to new branch strategy due to rebase conflicts");
                } else {
                  return createErrorResponse(
                    "Rebase failed due to conflicts. Use --branch-strategy=new to create a new branch.",
                  );
                }
              } else {
                return createErrorResponse(rebaseResult.message);
              }
            } else {
              // Successfully rebased - continue with existing branch
              branchName = currentBranch;
              steps.push(
                `Successfully rebased and continuing with branch: ${branchName}`,
              );
              needsForcePush = true; // Force push needed after rebase
            }
          }

          // Create new branch (either by choice or fallback)
          if (strategy === "new" || !branchName) {
            steps.push("Creating new feature branch...");
            branchName = generateBranchName(message, branch_prefix);

            // If we have stashed changes from failed rebase, they're still stashed
            // Otherwise, stash current changes
            const hasStash =
              execGitCommand("git stash list", { silent: true }).trim().length >
              0;
            if (!hasStash) {
              execGitCommand("git stash", { silent: true });
              steps.push("Stashed uncommitted changes");
              hasStashedChanges = true;
            }

            // Switch to main and create new branch
            execGitCommand(`git checkout ${mainBranch}`, { silent: true });

            // Always check and attempt to update main branch
            const config = getConfig();
            if (allow_outdated_base !== undefined) {
              config.gitFlow.allowOutdatedBase = allow_outdated_base;
            }
            const updateResult = ensureMainUpdated(mainBranch);

            if (updateResult.divergence.behind > 0) {
              warnings.push(
                `Main branch is ${updateResult.divergence.behind} commits behind origin/${mainBranch}`
              );
            }

            steps.push(...updateResult.steps);

            // Handle different scenarios
            if (!updateResult.success && !updateResult.isUpdated) {
              // Main is outdated and couldn't be updated
              if (updateResult.networkError) {
                // Network issue - check config for whether to continue
                if (config.gitFlow.allowOutdatedBase) {
                  warnings.push(
                    `Could not update base branch (${mainBranch}) due to network issue. Continuing anyway due to config...`
                  );
                  steps.push(
                    "Continuing despite network issue (allowOutdatedBase: true)",
                  );
                } else {
                  // Restore stashed changes before failing
                  try {
                    execGitCommand("git stash pop", { silent: true });
                  } catch (e) {
                    // Ignore stash pop errors
                  }

                  return createErrorResponse(
                    `Cannot create new branch: base branch (${mainBranch}) needs updating but network is unavailable.\n` +
                      `To work offline, set gitFlow.allowOutdatedBase: true in .glam.json`,
                  );
                }
              } else if (
                updateResult.divergence.ahead > 0 &&
                updateResult.divergence.behind > 0
              ) {
                // Diverged - always fail regardless of config
                // Restore stashed changes before failing
                try {
                  execGitCommand("git stash pop", { silent: true });
                } catch (e) {
                  // Ignore stash pop errors
                }

                return createErrorResponse(
                  `Cannot create new branch: base branch (${mainBranch}) has diverged from origin/${mainBranch}.\n` +
                    `Please resolve the divergence manually before proceeding.`,
                );
              } else if (updateResult.divergence.behind > 0) {
                // Behind but update failed (uncommitted changes on main?)
                if (config.gitFlow.allowOutdatedBase) {
                  warnings.push(
                    `Base branch (${mainBranch}) is outdated but cannot be updated. Continuing anyway due to config...`
                  );
                  steps.push(
                    "Continuing with outdated base (allowOutdatedBase: true)"
                  );
                } else {
                  // Restore stashed changes before failing
                  try {
                    execGitCommand("git stash pop", { silent: true });
                  } catch (e) {
                    // Ignore stash pop errors
                  }

                  return createErrorResponse(
                    `Cannot create new branch: base branch (${mainBranch}) is ${updateResult.divergence.behind} commits behind origin/${mainBranch} and could not be updated.\n` +
                      `Please manually update ${mainBranch} or set gitFlow.allowOutdatedBase: true in .glam.json`,
                  );
                }
              }
            }

            execGitCommand(`git checkout -b ${branchName}`, { silent: true });
            steps.push(`Created new branch: ${branchName}`);

            // Apply stashed changes to new branch
            try {
              execGitCommand("git stash pop", { silent: true });
              steps.push("Applied changes to new branch");
            } catch (e) {
              return createErrorResponse(
                "Failed to apply changes to new branch",
              );
            }
          }
        } else {
          // Branch is up to date, continue using it
          branchName = currentBranch;
          steps.push(`Branch is up to date, continuing with: ${branchName}`);
        }

        needsPush = true;
      } else {
        // On main branch or explicit branch name provided - create new branch
        branchName = branch_name || generateBranchName(message, branch_prefix);
        steps.push(`Generated branch name: ${branchName}`);

        // Create and switch to new branch
        execGitCommand(`git checkout ${mainBranch}`, { silent: true });

        // Always check and attempt to update main branch
        const config = getConfig();
        if (allow_outdated_base !== undefined) {
          config.gitFlow.allowOutdatedBase = allow_outdated_base;
        }
        const updateResult = ensureMainUpdated(mainBranch);

        if (updateResult.divergence.behind > 0) {
          console.log(
            `\n⚠️  Main branch is ${updateResult.divergence.behind} commits behind origin/${mainBranch}`,
          );
        }

        steps.push(...updateResult.steps);

        // Handle different scenarios
        if (!updateResult.success && !updateResult.isUpdated) {
          // Main is outdated and couldn't be updated
          if (updateResult.networkError) {
            // Network issue - check config for whether to continue
            if (config.gitFlow.allowOutdatedBase) {
              console.log(
                `⚠️  Could not update base branch (${mainBranch}) due to network issue. Continuing anyway due to config...`,
              );
              steps.push(
                "Continuing despite network issue (allowOutdatedBase: true)",
              );
            } else {
              return createErrorResponse(
                `Cannot create new branch: base branch (${mainBranch}) needs updating but network is unavailable.\n` +
                  `To work offline, set gitFlow.allowOutdatedBase: true in .glam.json`,
              );
            }
          } else if (
            updateResult.divergence.ahead > 0 &&
            updateResult.divergence.behind > 0
          ) {
            // Diverged - always fail regardless of config
            return createErrorResponse(
              `Cannot create new branch: base branch (${mainBranch}) has diverged from origin/${mainBranch}.\n` +
                `Please resolve the divergence manually before proceeding.`,
            );
          } else if (updateResult.divergence.behind > 0) {
            // Behind but update failed (uncommitted changes on main?)
            if (config.gitFlow.allowOutdatedBase) {
              console.log(
                `⚠️  Base branch (${mainBranch}) is outdated but cannot be updated. Continuing anyway due to config...`,
              );
              steps.push(
                "Continuing with outdated base (allowOutdatedBase: true)",
              );
            } else {
              return createErrorResponse(
                `Cannot create new branch: base branch (${mainBranch}) is ${updateResult.divergence.behind} commits behind origin/${mainBranch} and could not be updated.\n` +
                  `Please manually update ${mainBranch} or set gitFlow.allowOutdatedBase: true in .glam.json`,
              );
            }
          }
        }

        execGitCommand(`git checkout -b ${branchName}`, { silent: true });
        steps.push(`Created and switched to branch: ${branchName}`);
        needsPush = true;
      }
    }

    // Only run formatting and linting if we have changes to commit
    if (needsCommit) {
      // Run formatting if available and requested
      if (run_format && hasScript("format")) {
        try {
          execSync("npm run format", { stdio: "inherit" });
          steps.push("Code formatting completed");
        } catch (e) {
          steps.push("Formatting failed, continuing...");
        }
      } else if (run_format) {
        steps.push("No format script found, skipping formatting");
      }

      // Run linting if available and requested
      if (run_lint && hasScript("lint")) {
        try {
          execSync("npm run lint", { stdio: "inherit" });
          steps.push("Linting passed");
        } catch (e) {
          // Restore stashed changes before failing
          if (hasStashedChanges) {
            try {
              execGitCommand("git stash pop", { silent: true });
            } catch (stashError) {
              // Ignore stash pop errors
            }
          }

          return createErrorResponse(
            `Linting failed. Please fix linting errors before committing.\n` +
              `To skip linting, use --no-lint flag or set automation.runLint: false in .glam.json`,
          );
        }
      } else if (run_lint) {
        steps.push("No lint script found, skipping linting");
      }

      // Stage and commit changes
      execGitCommand("git add .", { silent: true });

      const commitMessage = `${message}

🤖 Generated with [glam-mcp](https://github.com/your-username/glam-mcp)`;

      execGitCommand(`git commit -m "${commitMessage}"`, { silent: true });
      steps.push("Changes committed successfully");
    } else {
      steps.push("Skipping commit - no changes to commit");
    }

    // Push branch to remote if needed
    if (needsPush) {
      if (needsForcePush) {
        // Force push after rebase
        try {
          execGitCommand(`git push --force-with-lease origin ${branchName}`, {
            silent: true,
          });
          steps.push(
            "Force pushed rebased branch to remote (using --force-with-lease for safety)",
          );
        } catch (e) {
          // If force-with-lease fails, it means remote has changes we don't have
          return createErrorResponse(
            `Force push failed. Remote branch has been updated. Please pull and resolve manually.`,
          );
        }
      } else {
        // Normal push
        try {
          execGitCommand(`git push -u origin ${branchName}`, { silent: true });
          steps.push("Branch pushed to remote");
        } catch (e) {
          // Branch might already be pushed, try without -u flag
          try {
            execGitCommand(`git push origin ${branchName}`, { silent: true });
            steps.push("Branch updated on remote");
          } catch (e2) {
            steps.push("Push failed, continuing with PR creation...");
          }
        }
      }
    }

    // Create PR - use default message if none provided and no commit was made
    const prTitle = message || `Update ${branchName}`;
    const prBody = needsCommit
      ? `## Summary
${message}

## Changes Made
- Auto-generated commit with formatting and linting
- Ready for review and merge

## Testing
- [ ] Code formatting applied
- [ ] Linting checks passed
- [ ] Manual testing completed

🤖 Generated with [glam-mcp](https://github.com/your-username/glam-mcp)`
      : `## Summary
${message || "Push existing branch changes for review"}

## Changes Made
- Pushing existing commits for review
- Ready for review and merge

## Testing
- [ ] Manual testing completed
- [ ] Changes reviewed

🤖 Generated with [glam-mcp](https://github.com/your-username/glam-mcp)`;

    // Create PR - check if one already exists first
    let prUrl;
    try {
      prUrl = execGitCommand(
        `gh pr create --title "${prTitle}" --body "${prBody}" --base ${target_branch}`,
        { silent: true },
      ).trim();
      steps.push(`Pull request created: ${prUrl}`);
    } catch (e) {
      // PR might already exist, try to get the existing PR URL
      try {
        prUrl = execGitCommand(`gh pr view --json url --jq .url`, {
          silent: true,
        }).trim();
        steps.push(`Using existing pull request: ${prUrl}`);
      } catch (e2) {
        return createErrorResponse(`Failed to create or find PR: ${e.message}`);
      }
    }

    let merged = false;
    let deleted = false;

    // Auto-merge if enabled
    if (auto_merge) {
      try {
        // Wait a moment for CI to potentially start
        await new Promise((resolve) => setTimeout(resolve, 2000));

        execGitCommand(`gh pr merge ${prUrl} --squash --auto`, {
          silent: true,
        });
        merged = true;
        steps.push("Pull request auto-merged");

        if (delete_branch) {
          // Switch back to main and clean up
          execGitCommand(`git checkout ${target_branch}`, { silent: true });
          execGitCommand("git pull origin HEAD", { silent: true });
          execGitCommand(`git branch -d ${branchName}`, { silent: true });
          deleted = true;
          steps.push("Branch cleaned up");
        }
      } catch (e) {
        steps.push("Auto-merge failed, PR created for manual review");
      }
    }

    return createSuccessResponse(
      "GitHub Flow automation completed successfully!",
      {
        branch: branchName,
        targetBranch: target_branch,
        prUrl,
        merged,
        deleted,
        steps,
        warnings,
        changedFiles: changedFiles.length,
        operation: "auto-commit",
      },
    );
  } catch (error) {
    return createErrorResponse(
      `GitHub Flow automation failed: ${error.message}`,
    );
  }
}

/**
 * Quick commit with smart defaults
 */
async function quickCommit({ message, auto_merge = true, run_format = true }) {
  if (!isGitRepository()) {
    return createErrorResponse("Not a git repository");
  }

  const currentBranch = getCurrentBranch();
  const mainBranch = getMainBranch();
  const changedFiles = getChangedFiles();

  // If no changes and we're on main branch, nothing to do
  if (changedFiles.length === 0 && currentBranch === mainBranch) {
    return createErrorResponse("No changes to commit and on main branch.");
  }

  // If no changes but on feature branch, just use autoCommit for push + PR
  if (changedFiles.length === 0 && currentBranch !== mainBranch) {
    return autoCommit({
      message: message || `Quick push for ${currentBranch}`,
      auto_merge,
      run_format: false, // Skip formatting since no new changes
      run_lint: false, // Skip linting since no new changes
    });
  }

  // Generate message if not provided
  let commitMessage = message;
  if (!commitMessage) {
    // Use enhanced AI message generation
    try {
      const analysis = await analyzeChangesInDepth(changedFiles, currentBranch);
      commitMessage = analysis.suggestedMessage;
    } catch (e) {
      // Fallback to basic message generation
      const fileTypes = changedFiles.map((f) => {
        if (f.file.includes("test")) return "test";
        if (f.file.includes("doc") || f.file.includes("README")) return "docs";
        if (f.file.includes("package.json")) return "deps";
        if (f.file.includes(".github")) return "ci";
        return "code";
      });

      const primaryType = fileTypes.reduce((a, b, _, arr) =>
        arr.filter((v) => v === a).length >= arr.filter((v) => v === b).length
          ? a
          : b,
      );

      const typeMessages = {
        test: "Update tests",
        docs: "Update documentation",
        deps: "Update dependencies",
        ci: "Update CI configuration",
        code: `Update ${changedFiles.length} file${changedFiles.length > 1 ? "s" : ""}`,
      };

      commitMessage = typeMessages[primaryType];
    }
  }

  // Use auto-commit with smart defaults
  return autoCommit({
    message: commitMessage,
    auto_merge,
    run_format,
    run_lint: false, // Skip lint for quick commits
    branch_prefix: "quick/",
  });
}

/**
 * Smart commit with change analysis
 */
async function smartCommit({ execute = false }) {
  if (!isGitRepository()) {
    return createErrorResponse("Not a git repository");
  }

  const currentBranch = getCurrentBranch();
  const mainBranch = getMainBranch();
  const changedFiles = getChangedFiles();

  // If no changes and we're on main branch, nothing to analyze
  if (changedFiles.length === 0 && currentBranch === mainBranch) {
    return createErrorResponse("No changes to analyze and on main branch.");
  }

  // If no changes but on feature branch, suggest push + PR
  if (changedFiles.length === 0 && currentBranch !== mainBranch) {
    const suggestion = {
      analysis: {
        totalFiles: 0,
        suggestedAction: "push-pr",
        suggestedMessage: `Push existing commits from ${currentBranch} for review`,
        confidence: 100,
      },
      recommendation:
        "No new changes detected, but you're on a feature branch. Consider pushing and creating a PR for existing commits.",
    };

    if (execute) {
      return autoCommit({
        message: suggestion.analysis.suggestedMessage,
        auto_merge: false, // Don't auto-merge for smart commits
        run_format: false,
        run_lint: false,
      });
    }

    return createSuccessResponse("Smart commit analysis completed", suggestion);
  }

  try {
    // Enhanced analysis with diff parsing
    const analysis = await analyzeChangesInDepth(changedFiles, currentBranch);

    if (execute) {
      return autoCommit({
        message: analysis.suggestedMessage,
        auto_merge: false, // Don't auto-merge for smart commits
        run_format: true,
        run_lint: true,
      });
    }

    return createSuccessResponse("Smart commit analysis completed", {
      analysis,
      recommendation: generateRecommendation(analysis),
    });
  } catch (error) {
    return createErrorResponse(
      `Smart commit analysis failed: ${error.message}`,
    );
  }
}

/**
 * Enhanced analysis engine with diff parsing and semantic understanding
 */
async function analyzeChangesInDepth(changedFiles, currentBranch) {
  const analysis = {
    totalFiles: changedFiles.length,
    filesByType: {},
    changeTypes: {},
    suggestedType: "feat",
    suggestedMessage: "",
    suggestedBranch: "",
    confidence: 0,
    breakingChanges: false,
    scope: "",
    description: "",
  };

  // Get actual diff content for better analysis
  let diffContent = "";
  try {
    diffContent = execGitCommand("git diff --cached HEAD", { silent: true });
    if (!diffContent) {
      diffContent = execGitCommand("git diff HEAD~1", { silent: true });
    }
  } catch (e) {
    // Fallback to file-based analysis
  }

  // Categorize files and analyze changes
  changedFiles.forEach(({ file, status }) => {
    const category = categorizeFile(file);
    analysis.filesByType[category] = (analysis.filesByType[category] || 0) + 1;

    // Track change types
    analysis.changeTypes[status] = (analysis.changeTypes[status] || 0) + 1;
  });

  // Analyze diff content for semantic understanding
  if (diffContent) {
    const diffAnalysis = analyzeDiffContent(diffContent);
    analysis.breakingChanges = diffAnalysis.breakingChanges;
    analysis.scope = diffAnalysis.scope;
    analysis.description = diffAnalysis.description;
  }

  // Determine primary change type and generate message
  const primaryCategory = getPrimaryCategory(analysis.filesByType);
  const messageData = generateSmartMessage(
    analysis,
    primaryCategory,
    currentBranch,
  );

  analysis.suggestedType = messageData.type;
  analysis.suggestedMessage = messageData.message;
  analysis.suggestedBranch = messageData.branch;
  analysis.confidence = messageData.confidence;

  return analysis;
}

/**
 * Categorize a file based on its path and extension
 */
function categorizeFile(file) {
  if (
    file.includes("test") ||
    file.includes(".test.") ||
    file.includes(".spec.") ||
    file.includes("__tests__")
  ) {
    return "test";
  } else if (
    file.includes("doc") ||
    file.includes("README") ||
    file.endsWith(".md")
  ) {
    return "docs";
  } else if (
    file.includes("package.json") ||
    file.includes("yarn.lock") ||
    file.includes("package-lock.json") ||
    file.includes("requirements.txt") ||
    file.includes("Gemfile")
  ) {
    return "deps";
  } else if (
    file.includes(".github") ||
    file.endsWith(".yml") ||
    file.endsWith(".yaml") ||
    file.includes("docker") ||
    file.includes("ci") ||
    file.includes("cd")
  ) {
    return "ci";
  } else if (
    file.endsWith(".css") ||
    file.endsWith(".scss") ||
    file.endsWith(".sass") ||
    file.endsWith(".less") ||
    file.includes("style")
  ) {
    return "style";
  } else if (
    file.includes("config") ||
    file.endsWith(".config.js") ||
    file.endsWith(".json") ||
    file.endsWith(".env")
  ) {
    return "config";
  } else if (
    file.endsWith(".js") ||
    file.endsWith(".ts") ||
    file.endsWith(".tsx") ||
    file.endsWith(".jsx") ||
    file.endsWith(".py") ||
    file.endsWith(".rb") ||
    file.endsWith(".go") ||
    file.endsWith(".rs")
  ) {
    return "code";
  }

  return "other";
}

/**
 * Analyze diff content for semantic patterns
 */
function analyzeDiffContent(diffContent) {
  const analysis = {
    breakingChanges: false,
    scope: "",
    description: "",
  };

  // Detect breaking changes
  if (
    diffContent.includes("BREAKING CHANGE") ||
    diffContent.includes("breaking:") ||
    diffContent.includes("major:") ||
    diffContent.match(/^-.*export\s+(default\s+)?function/) ||
    diffContent.match(/^-.*export\s+(default\s+)?class/)
  ) {
    analysis.breakingChanges = true;
  }

  // Extract scope from file paths
  const scopeMatch = diffContent.match(/diff --git a\/([^\/]+)/);
  if (scopeMatch) {
    analysis.scope = scopeMatch[1];
  }

  // Analyze change patterns
  const addedLines = diffContent
    .split("\n")
    .filter((line) => line.startsWith("+")).length;
  const removedLines = diffContent
    .split("\n")
    .filter((line) => line.startsWith("-")).length;

  if (addedLines > removedLines * 2) {
    analysis.description = "substantial additions";
  } else if (removedLines > addedLines * 2) {
    analysis.description = "significant removals";
  } else {
    analysis.description = "modifications";
  }

  return analysis;
}

/**
 * Get the primary category of changes
 */
function getPrimaryCategory(filesByType) {
  const categories = Object.keys(filesByType);
  if (categories.length === 0) return "other";

  return categories.reduce((a, b) =>
    filesByType[a] >= filesByType[b] ? a : b,
  );
}

/**
 * Generate smart commit message based on analysis
 */
function generateSmartMessage(analysis, primaryCategory, currentBranch) {
  const suggestions = {
    test: {
      type: "test",
      message: "Add/update tests",
      branch: "test/",
      confidence: 90,
    },
    docs: {
      type: "docs",
      message: "Update documentation",
      branch: "docs/",
      confidence: 95,
    },
    deps: {
      type: "chore",
      message: "Update dependencies",
      branch: "chore/",
      confidence: 95,
    },
    ci: {
      type: "ci",
      message: "Update CI configuration",
      branch: "ci/",
      confidence: 90,
    },
    style: {
      type: "style",
      message: "Update styles and formatting",
      branch: "style/",
      confidence: 85,
    },
    config: {
      type: "chore",
      message: "Update configuration",
      branch: "chore/",
      confidence: 85,
    },
    code: {
      type: "feat",
      message: "Add new functionality",
      branch: "feature/",
      confidence: 70,
    },
    other: {
      type: "chore",
      message: "Update project files",
      branch: "chore/",
      confidence: 60,
    },
  };

  const suggestion = suggestions[primaryCategory] || suggestions.other;

  // Enhance message based on analysis details
  if (analysis.breakingChanges) {
    suggestion.type = suggestion.type + "!";
    suggestion.message = "BREAKING: " + suggestion.message;
    suggestion.confidence = Math.max(suggestion.confidence, 85);
  }

  // Format as conventional commit
  const baseMessage = suggestion.message
    .toLowerCase()
    .replace(/^(feat|fix|docs|style|refactor|test|chore|ci):?\s*/, "");

  if (analysis.scope && analysis.scope !== ".") {
    suggestion.message = `${suggestion.type}(${analysis.scope}): ${baseMessage}`;
  } else {
    suggestion.message = `${suggestion.type}: ${baseMessage}`;
  }

  // Enhance based on file count and types
  if (analysis.totalFiles === 1) {
    const singleFileCategories = {
      test: "add test",
      docs: "update README",
      deps: "update package.json",
      ci: "update workflow",
      config: "update config",
    };

    if (singleFileCategories[primaryCategory]) {
      suggestion.message = `${suggestion.type}: ${singleFileCategories[primaryCategory]}`;
      suggestion.confidence += 10;
    }
  } else if (analysis.totalFiles > 10) {
    suggestion.message = suggestion.message.replace(
      "Update",
      "Major update to",
    );
    suggestion.confidence -= 5;
  }

  // Branch name enhancement based on current branch
  if (currentBranch && currentBranch !== "main" && currentBranch !== "master") {
    const branchName = currentBranch.split("/").slice(1).join("/");

    if (branchName) {
      suggestion.message = `${suggestion.type}: ${branchName.replace(/-/g, " ")}`;
      suggestion.confidence += 15;
    }
  }

  return suggestion;
}

/**
 * Generate recommendation text based on analysis
 */
function generateRecommendation(analysis) {
  const confidence = analysis.confidence;

  if (confidence >= 90) {
    return "High confidence suggestion. This message accurately reflects your changes.";
  } else if (confidence >= 75) {
    return "Good suggestion based on file patterns. You might want to refine the description.";
  } else if (confidence >= 60) {
    return "Basic suggestion. Consider providing a more specific commit message for better clarity.";
  } else {
    return "Low confidence suggestion. A manual commit message would be more accurate.";
  }
}

/**
 * Sync branch with target
 */
async function syncBranch({ target_branch = "main" }) {
  if (!isGitRepository()) {
    return createErrorResponse("Not a git repository");
  }

  try {
    const currentBranch = getCurrentBranch();
    const steps = [];

    if (currentBranch === target_branch) {
      execGitCommand("git pull origin HEAD", { silent: true });
      return createSuccessResponse(`Updated ${target_branch} branch`, {
        branch: currentBranch,
        operation: "sync-branch",
      });
    }

    // Stash changes if any
    const hasChanges = hasUncommittedChanges();
    if (hasChanges) {
      execGitCommand("git stash", { silent: true });
      steps.push("Stashed uncommitted changes");
    }

    // Switch to target and pull
    execGitCommand(`git checkout ${target_branch}`, { silent: true });
    execGitCommand("git pull origin HEAD", { silent: true });
    steps.push(`Updated ${target_branch} branch`);

    // Switch back and rebase
    execGitCommand(`git checkout ${currentBranch}`, { silent: true });
    execGitCommand(`git rebase ${target_branch}`, { silent: true });
    steps.push(`Rebased ${currentBranch} onto ${target_branch}`);

    // Restore stashed changes
    if (hasChanges) {
      execGitCommand("git stash pop", { silent: true });
      steps.push("Restored stashed changes");
    }

    return createSuccessResponse(
      `Synced ${currentBranch} with ${target_branch}`,
      {
        currentBranch,
        targetBranch: target_branch,
        steps,
        operation: "sync-branch",
      },
    );
  } catch (error) {
    return createErrorResponse(`Branch sync failed: ${error.message}`);
  }
}

/**
 * Squash commits
 */
async function squashCommits({ count = 2, message }) {
  if (!isGitRepository()) {
    return createErrorResponse("Not a git repository");
  }

  try {
    if (hasUncommittedChanges()) {
      return createErrorResponse(
        "Please commit or stash changes before squashing",
      );
    }

    // Get commits to be squashed
    const commits = execGitCommand(`git log --oneline -${count}`, {
      silent: true,
    })
      .split("\n")
      .filter((line) => line.trim());

    if (commits.length < count) {
      return createErrorResponse(
        `Not enough commits to squash (found ${commits.length}, need ${count})`,
      );
    }

    // Perform interactive rebase (auto-squash)
    const tempMessage = message || "Squashed commits";

    // Reset to count commits back, then commit again
    execGitCommand(`git reset --soft HEAD~${count}`, { silent: true });
    execGitCommand(`git commit -m "${tempMessage}"`, { silent: true });

    return createSuccessResponse(`Squashed ${count} commits`, {
      squashedCommits: commits,
      newMessage: tempMessage,
      operation: "squash-commits",
    });
  } catch (error) {
    return createErrorResponse(`Squash failed: ${error.message}`);
  }
}

/**
 * Undo commit safely
 */
async function undoCommit({ hard = false }) {
  if (!isGitRepository()) {
    return createErrorResponse("Not a git repository");
  }

  try {
    // Get the commit being undone
    const lastCommit = execGitCommand("git log --oneline -1", {
      silent: true,
    }).trim();

    if (hard) {
      execGitCommand("git reset --hard HEAD~1", { silent: true });
    } else {
      execGitCommand("git reset --soft HEAD~1", { silent: true });
    }

    return createSuccessResponse(`Undone last commit: ${lastCommit}`, {
      undoneCommit: lastCommit,
      preservedChanges: !hard,
      operation: "undo-commit",
    });
  } catch (error) {
    return createErrorResponse(`Undo commit failed: ${error.message}`);
  }
}

/**
 * Batch commit multiple groups
 */
async function batchCommit({ groups, push = true }) {
  if (!isGitRepository()) {
    return createErrorResponse("Not a git repository");
  }

  try {
    const commits = [];

    for (const group of groups) {
      const { files, message } = group;

      // Stage specific files
      for (const file of files) {
        execGitCommand(`git add "${file}"`, { silent: true });
      }

      // Commit this group
      execGitCommand(`git commit -m "${message}"`, { silent: true });
      commits.push({ message, files: files.length });
    }

    // Push all commits if requested
    if (push) {
      const currentBranch = getCurrentBranch();
      execGitCommand(`git push origin ${currentBranch}`, { silent: true });
    }

    return createSuccessResponse(`Created ${commits.length} commits`, {
      commits,
      pushed: push,
      operation: "batch-commit",
    });
  } catch (error) {
    return createErrorResponse(`Batch commit failed: ${error.message}`);
  }
}

/**
 * Complete project initialization
 */
async function initProject({
  project_name,
  description,
  repo_visibility = "private",
  create_npm_package = true,
  author,
  license = "MIT",
  enable_branch_protection = true,
  auto_merge_initial = true,
  initial_commit_message = "Initial project setup",
  create_readme = true,
  create_gitignore = true,
  template_type = "node",
}) {
  try {
    const currentDir = process.cwd();
    const finalProjectName = project_name || path.basename(currentDir);
    const steps = [];
    const warnings = [];

    // Step 1: Initialize git repository if not present
    if (!isGitRepository()) {
      execSync("git init", { cwd: currentDir, stdio: "pipe" });
      steps.push("✓ Initialized git repository");
    } else {
      steps.push("✓ Git repository already exists");
    }

    // Step 2: Create project files based on template
    const createdFiles = [];

    if (create_npm_package && template_type === "node") {
      // Create NPM package structure
      const npmResult = await createNpmPackage({
        package_name: finalProjectName,
        description,
        author,
        license,
        create_readme,
        initialize_git: false, // Already initialized
      });

      if (npmResult.success) {
        createdFiles.push(...npmResult.data.createdFiles);
        steps.push("✓ Created npm package structure");
      } else {
        warnings.push("⚠ NPM package creation failed, continuing...");
      }
    } else if (template_type === "python") {
      // Create Python project structure
      const pythonFiles = createPythonTemplate(
        finalProjectName,
        description,
        author,
        license,
      );
      createdFiles.push(...pythonFiles);
      steps.push("✓ Created Python project structure");
    } else {
      // Generic template
      const genericFiles = createGenericTemplate(
        finalProjectName,
        description,
        license,
        create_readme,
        create_gitignore,
      );
      createdFiles.push(...genericFiles);
      steps.push("✓ Created generic project structure");
    }

    // Step 3: Create and push to remote repository
    let repoUrl;
    try {
      const visibility =
        repo_visibility === "public" ? "--public" : "--private";
      const repoDescription = description
        ? `--description "${description}"`
        : "";

      const ghResult = execSync(
        `gh repo create ${finalProjectName} ${visibility} ${repoDescription} --source=. --push`,
        { cwd: currentDir, encoding: "utf8" },
      );

      repoUrl = ghResult.trim().split("\n").pop();
      steps.push(`✓ Created ${repo_visibility} repository: ${repoUrl}`);
    } catch (error) {
      warnings.push(
        "⚠ Failed to create GitHub repository, continuing with local setup...",
      );
    }

    // Step 4: Set up branch protection (if repo was created)
    if (repoUrl && enable_branch_protection) {
      try {
        // Wait for repository to be fully initialized
        await new Promise((resolve) => setTimeout(resolve, 2000));

        execSync(
          `gh api repos/${finalProjectName} -X PATCH -f default_branch=main`,
          { cwd: currentDir, stdio: "pipe" },
        );

        // Configure branch protection with required status checks
        const protectionCmd = `gh api repos/${finalProjectName}/branches/main/protection -X PUT \
          -f "required_status_checks[strict]=true" \
          -f "required_status_checks[contexts][]=lint" \
          -f "required_status_checks[contexts][]=test" \
          -f "required_status_checks[contexts][]=build" \
          -f "enforce_admins=false" \
          -f "required_pull_request_reviews[require_code_owner_reviews]=false" \
          -f "required_pull_request_reviews[required_approving_review_count]=0" \
          -f "required_pull_request_reviews[dismiss_stale_reviews]=true" \
          -f "restrictions=null" \
          -f "allow_force_pushes=false" \
          -f "allow_deletions=false"`;

        execSync(protectionCmd, { cwd: currentDir, stdio: "pipe" });

        steps.push("✓ Enabled branch protection for main branch");
      } catch (error) {
        warnings.push(
          "⚠ Branch protection setup failed, manual setup may be required",
        );
      }
    }

    // Step 5: Create feature branch for initial commit
    const initialBranchName = "feature/initial-setup";

    try {
      execGitCommand(`git checkout -b ${initialBranchName}`, { silent: true });
      steps.push(`✓ Created feature branch: ${initialBranchName}`);
    } catch (error) {
      return createErrorResponse(
        `Failed to create feature branch: ${error.message}`,
      );
    }

    // Step 6: Add and commit all files
    execGitCommand("git add .", { silent: true });

    const commitMessage = `${initial_commit_message}

Project initialized with:
- ${template_type} template
- ${createdFiles.length} files created
- ${repo_visibility} repository
${enable_branch_protection ? "- Branch protection enabled" : ""}

🤖 Generated with [glam-mcp](https://github.com/your-username/glam-mcp)`;

    execGitCommand(`git commit -m "${commitMessage}"`, { silent: true });
    steps.push("✓ Committed initial files");

    // Step 7: Push feature branch
    if (repoUrl) {
      try {
        execGitCommand(`git push -u origin ${initialBranchName}`, {
          silent: true,
        });
        steps.push("✓ Pushed feature branch to remote");
      } catch (error) {
        warnings.push("⚠ Failed to push feature branch");
      }
    }

    // Step 8: Create initial PR
    let prUrl;
    if (repoUrl) {
      try {
        const prTitle = initial_commit_message;
        const prBody = `## Project Initialization

This PR sets up the initial project structure with the following:

### Created Files
${createdFiles.map((file) => `- ${file}`).join("\n")}

### Configuration
- **Template**: ${template_type}
- **License**: ${license}
- **Repository**: ${repo_visibility}
- **Branch Protection**: ${enable_branch_protection ? "Enabled" : "Disabled"}

### Next Steps
- [ ] Review project structure
- [ ] Update README with specific project details
- [ ] Add any additional dependencies
- [ ] Configure CI/CD if needed

🤖 Generated with [glam-mcp](https://github.com/your-username/glam-mcp)`;

        prUrl = execGitCommand(
          `gh pr create --title "${prTitle}" --body "${prBody}" --base main`,
          { silent: true },
        ).trim();

        steps.push(`✓ Created initial PR: ${prUrl}`);
      } catch (error) {
        warnings.push("⚠ Failed to create initial PR");
      }
    }

    // Step 9: Auto-merge if requested
    if (prUrl && auto_merge_initial) {
      try {
        // Wait for PR to be fully created
        await new Promise((resolve) => setTimeout(resolve, 3000));

        execGitCommand(`gh pr merge ${prUrl} --squash --auto`, {
          silent: true,
        });
        steps.push("✓ Auto-merged initial PR");

        // Switch back to main and pull
        execGitCommand("git checkout main", { silent: true });
        execGitCommand("git pull origin main", { silent: true });
        execGitCommand(`git branch -d ${initialBranchName}`, { silent: true });
        steps.push("✓ Cleaned up feature branch");
      } catch (error) {
        warnings.push("⚠ Auto-merge failed, PR available for manual review");
      }
    }

    return createSuccessResponse(
      "Project initialization completed successfully!",
      {
        projectName: finalProjectName,
        description,
        templateType: template_type,
        repoUrl,
        prUrl,
        createdFiles,
        steps,
        warnings,
        nextSteps: [
          "Review and customize the generated files",
          "Update README with project-specific information",
          "Add dependencies as needed",
          "Configure development environment",
          "Set up CI/CD pipeline if required",
        ],
        operation: "init-project",
      },
    );
  } catch (error) {
    return createErrorResponse(
      `Project initialization failed: ${error.message}`,
    );
  }
}

/**
 * Create Python project template
 */
function createPythonTemplate(projectName, description, author, license) {
  const currentDir = process.cwd();
  const createdFiles = [];

  // Create setup.py
  const setupPy = `from setuptools import setup, find_packages

setup(
    name="${projectName}",
    version="0.1.0",
    description="${description || "A Python project"}",
    author="${author || ""}",
    packages=find_packages(),
    python_requires=">=3.8",
    install_requires=[
        # Add dependencies here
    ],
)
`;
  fs.writeFileSync(path.join(currentDir, "setup.py"), setupPy);
  createdFiles.push("setup.py");

  // Create requirements.txt
  fs.writeFileSync(
    path.join(currentDir, "requirements.txt"),
    "# Add dependencies here\n",
  );
  createdFiles.push("requirements.txt");

  // Create main module
  const srcDir = path.join(
    currentDir,
    projectName.replace(/[^a-zA-Z0-9]/g, "_"),
  );
  if (!fs.existsSync(srcDir)) {
    fs.mkdirSync(srcDir, { recursive: true });
  }

  const initPy = `"""${projectName}

${description || "A Python project"}
"""

__version__ = "0.1.0"
`;
  fs.writeFileSync(path.join(srcDir, "__init__.py"), initPy);
  createdFiles.push(`${path.basename(srcDir)}/__init__.py`);

  // Create .gitignore
  const gitignore = `# Python
__pycache__/
*.py[cod]
*$py.class
*.so
.Python
build/
develop-eggs/
dist/
downloads/
eggs/
.eggs/
lib/
lib64/
parts/
sdist/
var/
wheels/
*.egg-info/
.installed.cfg
*.egg

# Virtual environments
venv/
ENV/
env/
.venv/

# IDE
.vscode/
.idea/
*.swp
*.swo

# OS
.DS_Store
Thumbs.db
`;
  fs.writeFileSync(path.join(currentDir, ".gitignore"), gitignore);
  createdFiles.push(".gitignore");

  // Create README.md
  const readme = `# ${projectName}

${description || "A Python project"}

## Installation

\`\`\`bash
pip install -r requirements.txt
\`\`\`

## Usage

\`\`\`python
import ${projectName.replace(/[^a-zA-Z0-9]/g, "_")}

# Your code here
\`\`\`

## License

${license}
`;
  fs.writeFileSync(path.join(currentDir, "README.md"), readme);
  createdFiles.push("README.md");

  return createdFiles;
}

/**
 * Create generic project template
 */
function createGenericTemplate(
  projectName,
  description,
  license,
  createReadme,
  createGitignore,
) {
  const currentDir = process.cwd();
  const createdFiles = [];

  // Create basic project structure
  const srcDir = path.join(currentDir, "src");
  if (!fs.existsSync(srcDir)) {
    fs.mkdirSync(srcDir, { recursive: true });
  }

  // Create main file
  const mainFile = `// ${projectName}
// ${description || "A generic project"}

console.log('Hello from ${projectName}!');
`;
  fs.writeFileSync(path.join(srcDir, "main.js"), mainFile);
  createdFiles.push("src/main.js");

  if (createReadme) {
    const readme = `# ${projectName}

${description || "A generic project"}

## Getting Started

Add instructions for your project here.

## License

${license}
`;
    fs.writeFileSync(path.join(currentDir, "README.md"), readme);
    createdFiles.push("README.md");
  }

  if (createGitignore) {
    const gitignore = `# Dependencies
node_modules/

# Logs
logs
*.log

# Runtime data
pids
*.pid
*.seed

# Coverage directory
coverage/

# IDE files
.vscode/
.idea/
*.swp
*.swo

# OS generated files
.DS_Store
Thumbs.db
`;
    fs.writeFileSync(path.join(currentDir, ".gitignore"), gitignore);
    createdFiles.push(".gitignore");
  }

  return createdFiles;
}

/**
 * Automated NPM publishing workflow
 */
async function npmPublish({
  version_type = "patch",
  custom_version,
  tag = "latest",
  run_tests = true,
  run_build = true,
  run_lint = true,
  create_release = true,
  auto_merge_pr = true,
  dry_run = false,
  registry = "https://registry.npmjs.org/",
  allow_outdated_base,
}) {
  if (!isGitRepository()) {
    return createErrorResponse("Not a git repository");
  }

  try {
    const steps = [];
    const currentDir = process.cwd();

    // Step 1: Validate package.json exists
    const packageJsonPath = path.join(currentDir, "package.json");
    if (!fs.existsSync(packageJsonPath)) {
      return createErrorResponse(
        "package.json not found. This is not an npm package.",
      );
    }

    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, "utf8"));
    const currentVersion = packageJson.version;
    steps.push(`Current version: ${currentVersion}`);

    // Step 2: Check for uncommitted changes
    if (hasUncommittedChanges()) {
      return createErrorResponse(
        "Please commit or stash changes before publishing",
      );
    }

    // Step 3: Ensure we're on main branch and up to date
    const mainBranch = getMainBranch();
    const currentBranch = getCurrentBranch();

    if (currentBranch !== mainBranch) {
      execGitCommand(`git checkout ${mainBranch}`, { silent: true });
      steps.push(`Switched to ${mainBranch} branch`);
    }

    // Always check and attempt to update main branch before version bump
    const config = getConfig();
    if (allow_outdated_base !== undefined) {
      config.gitFlow.allowOutdatedBase = allow_outdated_base;
    }
    const updateResult = ensureMainUpdated(mainBranch);

    if (updateResult.divergence.behind > 0) {
      console.log(
        `\n⚠️  Main branch is ${updateResult.divergence.behind} commits behind origin/${mainBranch}`,
      );
    }

    steps.push(...updateResult.steps);

    // Handle different scenarios
    if (!updateResult.success && !updateResult.isUpdated) {
      // Main is outdated and couldn't be updated
      if (updateResult.networkError) {
        // Network issue - check config for whether to continue
        if (config.gitFlow.allowOutdatedBase) {
          console.log(
            `⚠️  Could not update base branch (${mainBranch}) due to network issue. Continuing with publish anyway due to config...`,
          );
          steps.push(
            "Continuing despite network issue (allowOutdatedBase: true)",
          );
        } else {
          return createErrorResponse(
            `Cannot publish: base branch (${mainBranch}) needs updating but network is unavailable.\n` +
              `Publishing with an outdated base branch could create version conflicts.\n` +
              `To work offline, set gitFlow.allowOutdatedBase: true in .glam.json`,
          );
        }
      } else if (
        updateResult.divergence.ahead > 0 &&
        updateResult.divergence.behind > 0
      ) {
        // Diverged - always fail regardless of config
        return createErrorResponse(
          `Cannot publish: base branch (${mainBranch}) has diverged from origin/${mainBranch}.\n` +
            `Please resolve the divergence manually before publishing.`,
        );
      } else if (updateResult.divergence.behind > 0) {
        // Behind but update failed (uncommitted changes on main?)
        if (config.gitFlow.allowOutdatedBase) {
          console.log(
            `⚠️  Base branch (${mainBranch}) is outdated but cannot be updated. Continuing with publish anyway due to config...`,
          );
          console.log(
            `⚠️  WARNING: Publishing from outdated base branch may cause version conflicts!`,
          );
          steps.push(
            "Continuing with outdated base (allowOutdatedBase: true) - version conflicts possible",
          );
        } else {
          return createErrorResponse(
            `Cannot publish: base branch (${mainBranch}) is ${updateResult.divergence.behind} commits behind origin/${mainBranch} and could not be updated.\n` +
              `Publishing with an outdated base branch could create version conflicts.\n` +
              `Please manually update ${mainBranch} or set gitFlow.allowOutdatedBase: true in .glam.json`,
          );
        }
      }
    }

    // Step 4: Calculate new version
    let newVersion;
    if (custom_version) {
      newVersion = custom_version;
    } else {
      const versionParts = currentVersion.split(".").map(Number);
      switch (version_type) {
        case "major":
          newVersion = `${versionParts[0] + 1}.0.0`;
          break;
        case "minor":
          newVersion = `${versionParts[0]}.${versionParts[1] + 1}.0`;
          break;
        case "patch":
        default:
          newVersion = `${versionParts[0]}.${versionParts[1]}.${versionParts[2] + 1}`;
          break;
      }
    }
    steps.push(`New version: ${newVersion}`);

    // Step 5: Create release branch
    const releaseBranch = `release/${newVersion}`;
    execGitCommand(`git checkout -b ${releaseBranch}`, { silent: true });
    steps.push(`Created release branch: ${releaseBranch}`);

    // Step 6: Update version in package.json
    packageJson.version = newVersion;
    fs.writeFileSync(
      packageJsonPath,
      JSON.stringify(packageJson, null, 2) + "\n",
    );
    steps.push("Updated package.json version");

    // Step 7: Run linting if enabled
    if (run_lint && hasScript("lint")) {
      try {
        execSync("npm run lint", { stdio: "pipe" });
        steps.push("Linting passed");
      } catch (e) {
        return createErrorResponse(
          "Linting failed. Please fix linting errors before publishing.",
        );
      }
    } else if (run_lint) {
      steps.push("No lint script found, skipping linting");
    }

    // Step 8: Run build if enabled
    if (run_build && hasScript("build")) {
      try {
        execSync("npm run build", { stdio: "pipe" });
        steps.push("Build completed successfully");
      } catch (e) {
        return createErrorResponse(
          "Build failed. Please fix build errors before publishing.",
        );
      }
    } else if (run_build) {
      steps.push("No build script found, skipping build");
    }

    // Step 9: Run tests if enabled
    if (run_tests && hasScript("test")) {
      try {
        execSync("npm test", { stdio: "pipe" });
        steps.push("All tests passed");
      } catch (e) {
        return createErrorResponse(
          "Tests failed. Please fix failing tests before publishing.",
        );
      }
    } else if (run_tests) {
      steps.push("No test script found, skipping tests");
    }

    // Step 10: Commit version bump
    execGitCommand("git add package.json", { silent: true });

    const commitMessage = `chore(release): bump version to ${newVersion}

Version bump from ${currentVersion} to ${newVersion}

🤖 Generated with [glam-mcp](https://github.com/your-username/glam-mcp)`;

    execGitCommand(`git commit -m "${commitMessage}"`, { silent: true });
    steps.push("Committed version bump");

    // Step 11: Create and push git tag
    const tagName = `v${newVersion}`;
    execGitCommand(`git tag -a ${tagName} -m "Release ${newVersion}"`, {
      silent: true,
    });
    steps.push(`Created git tag: ${tagName}`);

    // Step 12: Push branch and tag
    execGitCommand(`git push -u origin ${releaseBranch}`, { silent: true });
    execGitCommand(`git push origin ${tagName}`, { silent: true });
    steps.push("Pushed release branch and tag");

    // Step 13: NPM publish (unless dry run)
    if (!dry_run) {
      try {
        const publishCmd = `npm publish --registry ${registry} --tag ${tag}`;
        execSync(publishCmd, { stdio: "pipe" });
        steps.push(`Published to NPM with tag: ${tag}`);
      } catch (e) {
        return createErrorResponse(`NPM publish failed: ${e.message}`);
      }
    } else {
      steps.push("Dry run: Skipped NPM publish");
    }

    // Step 14: Create pull request for version bump
    const prTitle = `Release ${newVersion}`;
    const prBody = `## Release ${newVersion}

### Changes
- Version bump from ${currentVersion} to ${newVersion}
- Updated package.json
- Created git tag: ${tagName}
${!dry_run ? `- Published to NPM with tag: ${tag}` : "- Dry run: Not published to NPM"}

### Validation
- [x] Linting ${run_lint ? "passed" : "skipped"}
- [x] Build ${run_build ? "completed" : "skipped"}
- [x] Tests ${run_tests ? "passed" : "skipped"}
- [x] Version updated in package.json
- [x] Git tag created
${!dry_run ? "- [x] Published to NPM" : "- [ ] Published to NPM (dry run)"}

### Next Steps
- [ ] Review and merge this PR
- [ ] Update changelog if needed
- [ ] Announce release if applicable

🤖 Generated with [glam-mcp](https://github.com/your-username/glam-mcp)`;

    const prUrl = execGitCommand(
      `gh pr create --title "${prTitle}" --body "${prBody}" --base ${mainBranch}`,
      { silent: true },
    ).trim();
    steps.push(`Created release PR: ${prUrl}`);

    let merged = false;
    let deleted = false;

    // Step 15: Auto-merge if enabled
    if (auto_merge_pr && !dry_run) {
      try {
        // Wait for PR to be created
        await new Promise((resolve) => setTimeout(resolve, 2000));

        execGitCommand(`gh pr merge ${prUrl} --squash --auto`, {
          silent: true,
        });
        merged = true;
        steps.push("Auto-merged release PR");

        // Switch back to main and clean up
        execGitCommand(`git checkout ${mainBranch}`, { silent: true });
        execGitCommand("git pull origin HEAD", { silent: true });
        execGitCommand(`git branch -d ${releaseBranch}`, { silent: true });
        deleted = true;
        steps.push("Cleaned up release branch");
      } catch (e) {
        steps.push("Auto-merge failed, PR available for manual review");
      }
    }

    // Step 16: Create GitHub release if enabled
    let releaseUrl;
    if (create_release && !dry_run) {
      try {
        const releaseTitle = `Release ${newVersion}`;
        const releaseBody = `## What's New in ${newVersion}

This release includes version bump from ${currentVersion} to ${newVersion}.

### Installation
\`\`\`bash
npm install ${packageJson.name}@${newVersion}
\`\`\`

### Full Changelog
See the [commit history](https://github.com/${packageJson.repository?.url?.split("/").slice(-2).join("/").replace(".git", "") || "owner/repo"}/compare/v${currentVersion}...v${newVersion}) for detailed changes.

🤖 Generated with [glam-mcp](https://github.com/your-username/glam-mcp)`;

        releaseUrl = execGitCommand(
          `gh release create ${tagName} --title "${releaseTitle}" --notes "${releaseBody}"`,
          { silent: true },
        ).trim();
        steps.push(`Created GitHub release: ${releaseUrl}`);
      } catch (e) {
        steps.push("Failed to create GitHub release");
      }
    }

    return createSuccessResponse(
      `NPM publishing workflow completed successfully!`,
      {
        packageName: packageJson.name,
        oldVersion: currentVersion,
        newVersion,
        versionType: version_type,
        tag,
        dryRun: dry_run,
        published: !dry_run,
        prUrl,
        releaseUrl,
        merged,
        deleted,
        steps,
        nextSteps: dry_run
          ? [
              "Review the changes made",
              "Run again without dry_run to publish",
              "Merge the PR when ready",
            ]
          : [
              "Package published to NPM",
              "GitHub release created",
              "Version bump PR processed",
            ],
        operation: "npm-publish",
      },
    );
  } catch (error) {
    return createErrorResponse(`NPM publishing failed: ${error.message}`);
  }
}

/**
 * Create GitHub Action workflow for PR checks
 */
async function createPRWorkflow({
  workflow_name = "PR Checks",
  node_version = "18",
  include_lint = true,
  include_test = true,
  include_build = true,
  include_type_check = false,
}) {
  if (!isGitRepository()) {
    return createErrorResponse("Not a git repository");
  }

  try {
    const currentDir = process.cwd();
    const workflowsDir = path.join(currentDir, ".github", "workflows");

    // Create .github/workflows directory if it doesn't exist
    if (!fs.existsSync(workflowsDir)) {
      fs.mkdirSync(workflowsDir, { recursive: true });
    }

    // Check if package.json exists to determine project type
    const packageJsonPath = path.join(currentDir, "package.json");
    const isNodeProject = fs.existsSync(packageJsonPath);

    let packageJson = {};
    if (isNodeProject) {
      packageJson = JSON.parse(fs.readFileSync(packageJsonPath, "utf8"));
    }

    // Generate workflow content
    const workflowContent = `name: ${workflow_name}

on:
  pull_request:
    branches: [ main, develop ]
  push:
    branches: [ main ]

jobs:
  test:
    runs-on: ubuntu-latest
    
    strategy:
      matrix:
        node-version: [${node_version}]
    
    steps:
    - name: Checkout code
      uses: actions/checkout@v4
      
    - name: Setup Node.js
      uses: actions/setup-node@v4
      with:
        node-version: \${{ matrix.node-version }}
        cache: '${packageJson.packageManager === "yarn" ? "yarn" : "npm"}'
        
    - name: Install dependencies
      run: ${packageJson.packageManager === "yarn" ? "yarn install --frozen-lockfile" : "npm ci"}
      
${
  include_lint && hasScript("lint")
    ? `    - name: Run linting
      run: ${packageJson.packageManager === "yarn" ? "yarn lint" : "npm run lint"}
      
`
    : ""
}${
      include_type_check && hasScript("type-check")
        ? `    - name: Type checking
      run: ${packageJson.packageManager === "yarn" ? "yarn type-check" : "npm run type-check"}
      
`
        : ""
    }${
      include_test && hasScript("test")
        ? `    - name: Run tests
      run: ${packageJson.packageManager === "yarn" ? "yarn test" : "npm test"}
      env:
        CI: true
        
`
        : ""
    }${
      include_build && hasScript("build")
        ? `    - name: Build project
      run: ${packageJson.packageManager === "yarn" ? "yarn build" : "npm run build"}
      
`
        : ""
    }    - name: Upload coverage reports
      if: always()
      uses: actions/upload-artifact@v4
      with:
        name: coverage-report
        path: coverage/
        retention-days: 30
      continue-on-error: true
`;

    // Write workflow file
    const workflowFileName =
      workflow_name.toLowerCase().replace(/\s+/g, "-") + ".yml";
    const workflowPath = path.join(workflowsDir, workflowFileName);
    fs.writeFileSync(workflowPath, workflowContent);

    return createSuccessResponse("Created PR workflow successfully", {
      workflowFile: `.github/workflows/${workflowFileName}`,
      workflowName: workflow_name,
      steps: [
        include_lint && hasScript("lint")
          ? "✓ Linting"
          : "✗ Linting (no script found)",
        include_type_check && hasScript("type-check")
          ? "✓ Type checking"
          : "✗ Type checking (no script found)",
        include_test && hasScript("test")
          ? "✓ Testing"
          : "✗ Testing (no script found)",
        include_build && hasScript("build")
          ? "✓ Building"
          : "✗ Building (no script found)",
      ].filter(Boolean),
      nodeVersion: node_version,
      operation: "create-pr-workflow",
    });
  } catch (error) {
    return createErrorResponse(
      `Failed to create PR workflow: ${error.message}`,
    );
  }
}

/**
 * Create GitHub Action workflow for automated releases
 */
async function createReleaseWorkflow({
  workflow_name = "Release",
  node_version = "18",
  release_type = "both",
  auto_version_bump = true,
  version_bump_type = "patch",
  create_changelog = true,
}) {
  if (!isGitRepository()) {
    return createErrorResponse("Not a git repository");
  }

  try {
    const currentDir = process.cwd();
    const workflowsDir = path.join(currentDir, ".github", "workflows");

    // Create .github/workflows directory if it doesn't exist
    if (!fs.existsSync(workflowsDir)) {
      fs.mkdirSync(workflowsDir, { recursive: true });
    }

    // Check if package.json exists
    const packageJsonPath = path.join(currentDir, "package.json");
    const isNodeProject = fs.existsSync(packageJsonPath);

    let packageJson = {};
    if (isNodeProject) {
      packageJson = JSON.parse(fs.readFileSync(packageJsonPath, "utf8"));
    }

    // Generate workflow content
    const workflowContent = `name: ${workflow_name}

on:
  push:
    branches: [ main ]
  workflow_dispatch:
    inputs:
      version_type:
        description: 'Version bump type'
        required: true
        default: '${version_bump_type}'
        type: choice
        options:
          - patch
          - minor
          - major

jobs:
  release:
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main'
    
    permissions:
      contents: write
      pull-requests: write
      ${release_type === "npm" || release_type === "both" ? "id-token: write" : ""}
    
    steps:
    - name: Checkout code
      uses: actions/checkout@v4
      with:
        fetch-depth: 0
        token: \${{ secrets.GITHUB_TOKEN }}
        
    - name: Setup Node.js
      uses: actions/setup-node@v4
      with:
        node-version: ${node_version}
        cache: '${packageJson.packageManager === "yarn" ? "yarn" : "npm"}'
        ${release_type === "npm" || release_type === "both" ? "registry-url: 'https://registry.npmjs.org'" : ""}
        
    - name: Install dependencies
      run: ${packageJson.packageManager === "yarn" ? "yarn install --frozen-lockfile" : "npm ci"}
      
    - name: Run tests
      run: ${hasScript("test") ? (packageJson.packageManager === "yarn" ? "yarn test" : "npm test") : "echo 'No tests found, skipping...'"}
      env:
        CI: true
        
    - name: Build project
      run: ${hasScript("build") ? (packageJson.packageManager === "yarn" ? "yarn build" : "npm run build") : "echo 'No build script found, skipping...'"}
      
${
  auto_version_bump
    ? `    - name: Bump version
      id: version
      run: |
        VERSION_TYPE=\${{ github.event.inputs.version_type || '${version_bump_type}' }}
        ${packageJson.packageManager === "yarn" ? "yarn version --\$VERSION_TYPE --no-git-tag-version" : "npm version \$VERSION_TYPE --no-git-tag-version"}
        NEW_VERSION=\$(node -p "require('./package.json').version")
        echo "new_version=\$NEW_VERSION" >> \$GITHUB_OUTPUT
        echo "tag=v\$NEW_VERSION" >> \$GITHUB_OUTPUT
        
    - name: Commit version bump
      run: |
        git config --local user.email "action@github.com"
        git config --local user.name "GitHub Action"
        git add package.json
        git commit -m "chore(release): bump version to \${{ steps.version.outputs.new_version }}"
        git push
        
`
    : ""
}${
      create_changelog
        ? `    - name: Generate changelog
      id: changelog
      run: |
        # Simple changelog generation
        LAST_TAG=\$(git describe --tags --abbrev=0 2>/dev/null || echo "")
        if [ -n "\$LAST_TAG" ]; then
          CHANGELOG=\$(git log \$LAST_TAG..HEAD --pretty=format:"- %s (%h)" --no-merges)
        else
          CHANGELOG=\$(git log --pretty=format:"- %s (%h)" --no-merges -10)
        fi
        echo "changelog<<EOF" >> \$GITHUB_OUTPUT
        echo "\$CHANGELOG" >> \$GITHUB_OUTPUT
        echo "EOF" >> \$GITHUB_OUTPUT
        
`
        : ""
    }${
      release_type === "github" || release_type === "both"
        ? `    - name: Create GitHub Release
      uses: actions/create-release@v1
      env:
        GITHUB_TOKEN: \${{ secrets.GITHUB_TOKEN }}
      with:
        tag_name: \${{ steps.version.outputs.tag }}
        release_name: Release \${{ steps.version.outputs.new_version }}
        body: |
          ## What's Changed
          \${{ steps.changelog.outputs.changelog }}
          
          **Full Changelog**: https://github.com/\${{ github.repository }}/compare/\${{ steps.version.outputs.tag }}...HEAD
        draft: false
        prerelease: false
        
`
        : ""
    }${
      release_type === "npm" || release_type === "both"
        ? `    - name: Publish to NPM
      run: ${packageJson.packageManager === "yarn" ? "yarn publish --access public" : "npm publish --access public"}
      env:
        NODE_AUTH_TOKEN: \${{ secrets.NPM_TOKEN }}
        
`
        : ""
    }    - name: Create tag
      if: steps.version.outputs.tag
      run: |
        git tag \${{ steps.version.outputs.tag }}
        git push origin \${{ steps.version.outputs.tag }}
`;

    // Write workflow file
    const workflowFileName =
      workflow_name.toLowerCase().replace(/\s+/g, "-") + ".yml";
    const workflowPath = path.join(workflowsDir, workflowFileName);
    fs.writeFileSync(workflowPath, workflowContent);

    // Create a simple setup guide
    const setupGuide = `# GitHub Actions Release Setup

## Required Secrets

${
  release_type === "npm" || release_type === "both"
    ? `### NPM Token
1. Go to npmjs.com and create an access token
2. Add it as \`NPM_TOKEN\` in GitHub repository secrets

`
    : ""
}### GitHub Token
The \`GITHUB_TOKEN\` is automatically provided by GitHub Actions.

## Manual Release Trigger
You can manually trigger a release by:
1. Go to Actions tab in your repository
2. Select "${workflow_name}" workflow
3. Click "Run workflow"
4. Choose the version bump type (patch/minor/major)

## Automatic Releases
Releases will automatically trigger when code is pushed to the main branch.
`;

    const setupGuidePath = path.join(workflowsDir, "RELEASE_SETUP.md");
    fs.writeFileSync(setupGuidePath, setupGuide);

    return createSuccessResponse("Created release workflow successfully", {
      workflowFile: `.github/workflows/${workflowFileName}`,
      setupGuide: `.github/workflows/RELEASE_SETUP.md`,
      workflowName: workflow_name,
      releaseType: release_type,
      features: [
        auto_version_bump
          ? "✓ Automatic version bumping"
          : "✗ Manual version management",
        create_changelog ? "✓ Changelog generation" : "✗ No changelog",
        release_type === "github" || release_type === "both"
          ? "✓ GitHub releases"
          : "✗ No GitHub releases",
        release_type === "npm" || release_type === "both"
          ? "✓ NPM publishing"
          : "✗ No NPM publishing",
      ],
      nodeVersion: node_version,
      operation: "create-release-workflow",
    });
  } catch (error) {
    return createErrorResponse(
      `Failed to create release workflow: ${error.message}`,
    );
  }
}

/**
 * Enhanced test runner with analysis and metrics
 */
async function runTests({
  coverage = true,
  watch = false,
  pattern,
  bail = false,
  verbose = false,
}) {
  if (!isGitRepository()) {
    return createErrorResponse("Not a git repository");
  }

  try {
    const hasPackageJson = fs.existsSync("package.json");
    if (!hasPackageJson) {
      return createErrorResponse("No package.json found");
    }

    const packageJson = JSON.parse(fs.readFileSync("package.json", "utf8"));
    const scripts = packageJson.scripts || {};
    
    // Get session manager instance
    const SessionManager = await import("../context/session-manager.js").then(m => m.SessionManager);
    const sessionManager = SessionManager.getInstance({ autoSave: false });
    const session = sessionManager.get();
    
    // Get historical test data
    const testHistory = session.testHistory || [];
    
    // Determine test command
    let testCommand = scripts.test || "";
    if (!testCommand) {
      return createErrorResponse("No test script found in package.json");
    }

    // Build test command with options
    if (coverage && !testCommand.includes("coverage")) {
      testCommand = testCommand.replace("jest", "jest --coverage");
      testCommand = testCommand.replace("vitest", "vitest --coverage");
    }
    if (watch) {
      testCommand += " --watch";
    }
    if (pattern) {
      testCommand += ` --testNamePattern="${pattern}"`;
    }
    if (bail) {
      testCommand += " --bail";
    }
    if (verbose) {
      testCommand += " --verbose";
    }

    const startTime = Date.now();
    let testOutput = "";
    let testResult = { success: false, exitCode: 1 };

    try {
      testOutput = execSync(testCommand, { 
        encoding: "utf8",
        stdio: "pipe"
      });
      testResult = { success: true, exitCode: 0 };
    } catch (error) {
      testOutput = error.stdout?.toString() || error.message;
      testResult = { 
        success: false, 
        exitCode: error.status || 1 
      };
    }

    const duration = Date.now() - startTime;

    // Parse test results
    const testMetrics = parseTestOutput(testOutput);
    
    // Update test history
    const currentRun = {
      date: new Date().toISOString(),
      passed: testMetrics.passed,
      failed: testMetrics.failed,
      skipped: testMetrics.skipped,
      duration: duration / 1000,
      coverage: testMetrics.coverage
    };
    
    testHistory.push(currentRun);
    if (testHistory.length > 100) {
      testHistory.shift(); // Keep last 100 runs
    }
    
    // Calculate metrics
    const avgPassRate = testHistory.length > 0
      ? testHistory.reduce((sum, t) => 
          sum + (t.passed / (t.passed + t.failed) * 100), 0
        ) / testHistory.length
      : 0;
    
    const avgDuration = testHistory.length > 0
      ? testHistory.reduce((sum, t) => sum + t.duration, 0) / testHistory.length
      : 0;
    
    // Identify flaky tests (simplified - in real implementation would track individual tests)
    const recentRuns = testHistory.slice(-10);
    const flakyIndicator = recentRuns.some(r => r.failed > 0) && 
                          recentRuns.some(r => r.failed === 0);
    
    // Generate suggestions
    const suggestions = [];
    
    if (testMetrics.coverage < 80) {
      suggestions.push({
        type: 'coverage',
        priority: 'high',
        message: `Test coverage is ${testMetrics.coverage}%. Consider adding more tests to reach 80%.`
      });
    }
    
    if (avgDuration > 30) {
      suggestions.push({
        type: 'performance',
        priority: 'medium',
        message: `Tests are taking ${avgDuration.toFixed(1)}s on average. Consider optimizing slow tests.`
      });
    }
    
    if (flakyIndicator) {
      suggestions.push({
        type: 'reliability',
        priority: 'high',
        message: 'Potential flaky tests detected. Review recent failures for intermittent issues.'
      });
    }
    
    if (testMetrics.skipped > 0) {
      suggestions.push({
        type: 'maintenance',
        priority: 'low',
        message: `${testMetrics.skipped} tests are skipped. Consider enabling or removing them.`
      });
    }
    
    // Save updated history
    sessionManager.update({
      testHistory,
      lastTestRun: currentRun
    });
    
    const context = {
      testMetrics,
      historicalMetrics: {
        avgPassRate: avgPassRate.toFixed(2),
        avgDuration: avgDuration.toFixed(1),
        totalRuns: testHistory.length,
        trend: calculateTrend(testHistory)
      },
      suggestions,
      relatedTools: [
        {
          name: 'analyze_code',
          reason: 'Analyze code quality to identify areas needing tests'
        },
        {
          name: 'auto_commit',
          reason: 'Commit test changes with proper messages'
        }
      ]
    };
    
    const metadata = {
      timestamp: new Date().toISOString(),
      duration: duration / 1000,
      command: testCommand,
      coverage: coverage
    };

    return createSuccessResponse(
      testResult.success ? "Tests completed successfully" : "Tests failed",
      {
        ...testResult,
        output: testOutput.slice(-1000), // Last 1000 chars
        context,
        metadata
      }
    );
  } catch (error) {
    return createErrorResponse(`Failed to run tests: ${error.message}`);
  }
}

/**
 * Enhanced code analyzer with quality metrics
 */
async function analyzeCode({
  path: analyzePath = "./src",
  include_deps = true,
  include_complexity = true,
  include_duplication = true,
  threshold = 10,
}) {
  if (!isGitRepository()) {
    return createErrorResponse("Not a git repository");
  }

  try {
    const results = {
      files: [],
      summary: {
        totalFiles: 0,
        totalLines: 0,
        avgComplexity: 0,
        highComplexityFiles: 0,
        duplicateLines: 0,
        technicalDebt: 0
      }
    };

    // Check if path exists
    if (!fs.existsSync(analyzePath)) {
      return createErrorResponse(`Path ${analyzePath} does not exist`);
    }

    // Get list of JavaScript/TypeScript files
    const files = getJSFiles(analyzePath);
    results.summary.totalFiles = files.length;

    // Analyze each file
    for (const file of files) {
      const content = fs.readFileSync(file, 'utf8');
      const lines = content.split('\n');
      const fileAnalysis = {
        name: file,
        lines: lines.length,
        complexity: 0,
        issues: [],
        duplicates: []
      };

      // Simple complexity analysis (count functions, conditionals, loops)
      if (include_complexity) {
        const complexity = calculateComplexity(content);
        fileAnalysis.complexity = complexity;
        
        if (complexity > threshold) {
          fileAnalysis.issues.push('high-complexity');
          results.summary.highComplexityFiles++;
        }
        
        // Check for specific issues
        if (lines.some(l => l.length > 120)) {
          fileAnalysis.issues.push('long-lines');
        }
        
        const functionCount = (content.match(/function\s+\w+|=>\s*{|async\s+function/g) || []).length;
        if (functionCount > 20) {
          fileAnalysis.issues.push('too-many-functions');
        }
        
        // Check for missing tests
        if (!file.includes('.test.') && !file.includes('.spec.')) {
          const baseName = file.replace(/\.(js|ts)$/, '');
          const testExists = files.some(f => 
            f.includes(`${baseName}.test.`) || f.includes(`${baseName}.spec.`)
          );
          if (!testExists) {
            fileAnalysis.issues.push('no-tests');
          }
        }
      }

      results.files.push(fileAnalysis);
      results.summary.totalLines += lines.length;
    }

    // Calculate averages
    if (results.files.length > 0) {
      results.summary.avgComplexity = 
        results.files.reduce((sum, f) => sum + f.complexity, 0) / results.files.length;
    }

    // Simple duplication check (in real implementation would use more sophisticated algorithm)
    if (include_duplication) {
      const allLines = [];
      results.files.forEach(f => {
        const content = fs.readFileSync(f.name, 'utf8');
        content.split('\n').forEach((line, idx) => {
          if (line.trim().length > 50) { // Only check substantial lines
            allLines.push({ file: f.name, line: line.trim(), lineNum: idx + 1 });
          }
        });
      });
      
      // Find duplicates
      const lineMap = new Map();
      allLines.forEach(({ file, line, lineNum }) => {
        const existing = lineMap.get(line);
        if (existing) {
          existing.push({ file, lineNum });
        } else {
          lineMap.set(line, [{ file, lineNum }]);
        }
      });
      
      let duplicateCount = 0;
      lineMap.forEach((locations, _line) => {
        if (locations.length > 1) {
          duplicateCount++;
          // Add to file issues
          locations.forEach(({ file }) => {
            const fileResult = results.files.find(f => f.name === file);
            if (fileResult && !fileResult.issues.includes('duplicate-code')) {
              fileResult.issues.push('duplicate-code');
            }
          });
        }
      });
      
      results.summary.duplicateLines = duplicateCount;
    }

    // Estimate technical debt (hours)
    results.summary.technicalDebt = estimateTechnicalDebt(results);

    // Get session manager for storing metrics
    const SessionManager = await import("../context/session-manager.js").then(m => m.SessionManager);
    const sessionManager = SessionManager.getInstance({ autoSave: false });
    const session = sessionManager.get();
    
    const codeMetricsHistory = session.codeMetricsHistory || [];
    codeMetricsHistory.push({
      date: new Date().toISOString(),
      ...results.summary
    });
    
    if (codeMetricsHistory.length > 50) {
      codeMetricsHistory.shift();
    }
    
    sessionManager.update({
      codeMetricsHistory,
      lastCodeAnalysis: results.summary
    });

    // Generate prioritized improvements
    const prioritizedImprovements = results.files
      .filter(f => f.complexity > threshold || f.issues.length > 0)
      .sort((a, b) => b.complexity - a.complexity)
      .slice(0, 10)
      .map(f => ({
        file: f.name,
        priority: f.complexity > threshold * 2 ? 'high' : 'medium',
        complexity: f.complexity,
        suggestions: f.issues,
        estimatedEffort: Math.ceil(f.complexity / 10) + ' hours'
      }));

    // Include dependency analysis
    let dependencyAnalysis = null;
    if (include_deps && fs.existsSync('package.json')) {
      const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
      const deps = Object.keys(packageJson.dependencies || {});
      const devDeps = Object.keys(packageJson.devDependencies || {});
      
      dependencyAnalysis = {
        total: deps.length + devDeps.length,
        production: deps.length,
        development: devDeps.length,
        // In real implementation would check for outdated/vulnerable deps
        suggestions: []
      };
      
      if (deps.length > 50) {
        dependencyAnalysis.suggestions.push({
          type: 'dependencies',
          message: 'Consider reviewing dependencies - project has many production dependencies'
        });
      }
    }

    const context = {
      summary: results.summary,
      prioritizedImprovements,
      dependencyAnalysis,
      suggestions: generateCodeSuggestions(results),
      relatedTools: [
        {
          name: 'run_tests',
          reason: 'Run tests to ensure code quality'
        },
        {
          name: 'smart_commit',
          reason: 'Commit improvements with proper messages'
        }
      ]
    };

    const metadata = {
      timestamp: new Date().toISOString(),
      analyzedPath: analyzePath,
      fileCount: results.summary.totalFiles
    };

    return createSuccessResponse("Code analysis completed", {
      results,
      context,
      metadata
    });
  } catch (error) {
    return createErrorResponse(`Failed to analyze code: ${error.message}`);
  }
}

// Helper functions
function parseTestOutput(output) {
  const metrics = {
    passed: 0,
    failed: 0,
    skipped: 0,
    coverage: 0
  };

  // Parse Jest/Vitest style output
  const passMatch = output.match(/(\d+) passed/);
  const failMatch = output.match(/(\d+) failed/);
  const skipMatch = output.match(/(\d+) skipped/);
  const coverageMatch = output.match(/All files.*?(\d+\.?\d*)/);

  if (passMatch) metrics.passed = parseInt(passMatch[1]);
  if (failMatch) metrics.failed = parseInt(failMatch[1]);
  if (skipMatch) metrics.skipped = parseInt(skipMatch[1]);
  if (coverageMatch) metrics.coverage = parseFloat(coverageMatch[1]);

  return metrics;
}

function calculateTrend(history) {
  if (history.length < 2) return 'stable';
  
  const recent = history.slice(-5);
  const older = history.slice(-10, -5);
  
  if (recent.length === 0 || older.length === 0) return 'stable';
  
  const recentAvg = recent.reduce((sum, r) => 
    sum + (r.passed / (r.passed + r.failed)), 0) / recent.length;
  const olderAvg = older.reduce((sum, r) => 
    sum + (r.passed / (r.passed + r.failed)), 0) / older.length;
  
  if (recentAvg > olderAvg + 0.05) return 'improving';
  if (recentAvg < olderAvg - 0.05) return 'degrading';
  return 'stable';
}

function getJSFiles(dir, files = []) {
  const items = fs.readdirSync(dir);
  
  for (const item of items) {
    const fullPath = path.join(dir, item);
    const stat = fs.statSync(fullPath);
    
    if (stat.isDirectory() && !item.startsWith('.') && item !== 'node_modules') {
      getJSFiles(fullPath, files);
    } else if (item.match(/\.(js|jsx|ts|tsx)$/) && !item.includes('.test.') && !item.includes('.spec.')) {
      files.push(fullPath);
    }
  }
  
  return files;
}

function calculateComplexity(content) {
  let complexity = 1; // Base complexity
  
  // Count control flow statements
  const patterns = [
    /if\s*\(/g,
    /else\s+if\s*\(/g,
    /for\s*\(/g,
    /while\s*\(/g,
    /switch\s*\(/g,
    /case\s+/g,
    /catch\s*\(/g,
    /\?\s*.*\s*:/g, // ternary
  ];
  
  patterns.forEach(pattern => {
    const matches = content.match(pattern);
    if (matches) complexity += matches.length;
  });
  
  return complexity;
}

function estimateTechnicalDebt(results) {
  let hours = 0;
  
  results.files.forEach(file => {
    if (file.complexity > 20) hours += 2;
    else if (file.complexity > 10) hours += 1;
    
    if (file.issues.includes('no-tests')) hours += 3;
    if (file.issues.includes('duplicate-code')) hours += 1;
    if (file.issues.includes('long-lines')) hours += 0.5;
  });
  
  return Math.round(hours * 10) / 10;
}

function generateCodeSuggestions(results) {
  const suggestions = [];
  
  if (results.summary.highComplexityFiles > 0) {
    suggestions.push({
      type: 'refactoring',
      priority: 'high',
      message: `${results.summary.highComplexityFiles} files have high complexity. Consider breaking them into smaller modules.`
    });
  }
  
  if (results.summary.duplicateLines > 10) {
    suggestions.push({
      type: 'duplication',
      priority: 'medium',
      message: 'Significant code duplication detected. Consider extracting common functionality.'
    });
  }
  
  const noTestFiles = results.files.filter(f => f.issues.includes('no-tests')).length;
  if (noTestFiles > 0) {
    suggestions.push({
      type: 'testing',
      priority: 'high',
      message: `${noTestFiles} files lack tests. Prioritize testing for high-complexity files.`
    });
  }
  
  if (results.summary.technicalDebt > 40) {
    suggestions.push({
      type: 'planning',
      priority: 'medium',
      message: `Estimated ${results.summary.technicalDebt} hours of technical debt. Consider scheduling refactoring sprints.`
    });
  }
  
  return suggestions;
}

// Export individual functions for CLI usage
export {
  autoCommit,
  quickCommit,
  smartCommit,
  syncBranch,
  squashCommits,
  undoCommit,
  batchCommit,
  initProject,
  npmPublish,
  createPRWorkflow,
  createReleaseWorkflow,
  runTests,
  analyzeCode,
};

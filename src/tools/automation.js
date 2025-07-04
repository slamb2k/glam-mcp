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
} from "../utils/git-helpers.js";
import {
  createSuccessResponse,
  createErrorResponse,
} from "../utils/responses.js";
import { createNpmPackage } from "./utilities.js";

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
}) {
  if (!isGitRepository()) {
    return createErrorResponse("Not a git repository");
  }

  try {
    const steps = [];
    const currentBranch = getCurrentBranch();
    const mainBranch = getMainBranch();

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

    if (!hasChanges && currentBranch !== mainBranch) {
      // No changes but on feature branch - continue with push + PR workflow
      branchName = currentBranch;
      needsCommit = false;
      needsPush = true;
      steps.push(
        `No changes to commit, but continuing with push + PR workflow for branch: ${branchName}`,
      );
    } else if (hasChanges) {
      // Has changes - normal commit workflow
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

      // Generate branch name if not provided
      branchName = branch_name || generateBranchName(message, branch_prefix);
      steps.push(`Generated branch name: ${branchName}`);

      // Create and switch to new branch
      execGitCommand(`git checkout ${mainBranch}`, { silent: true });

      try {
        execGitCommand("git pull origin HEAD", { silent: true });
        steps.push("Updated main branch");
      } catch (e) {
        steps.push(
          "Could not pull latest changes (no remote or network issue)",
        );
      }

      execGitCommand(`git checkout -b ${branchName}`, { silent: true });
      steps.push(`Created and switched to branch: ${branchName}`);
      needsPush = true;
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
          execSync("npm run lint", { stdio: "pipe" });
          steps.push("Linting passed");
        } catch (e) {
          steps.push("Linting issues found, continuing...");
        }
      } else if (run_lint) {
        steps.push("No lint script found, skipping linting");
      }

      // Stage and commit changes
      execGitCommand("git add .", { silent: true });

      const commitMessage = `${message}

🤖 Generated with [Slambed MCP](https://github.com/your-username/slambed-mcp)

Co-Authored-By: Claude <noreply@anthropic.com>`;

      execGitCommand(`git commit -m "${commitMessage}"`, { silent: true });
      steps.push("Changes committed successfully");
    } else {
      steps.push("Skipping commit - no changes to commit");
    }

    // Push branch to remote if needed
    if (needsPush) {
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

🤖 Generated with [Slambed MCP](https://github.com/your-username/slambed-mcp)`
      : `## Summary
${message || "Push existing branch changes for review"}

## Changes Made
- Pushing existing commits for review
- Ready for review and merge

## Testing
- [ ] Manual testing completed
- [ ] Changes reviewed

🤖 Generated with [Slambed MCP](https://github.com/your-username/slambed-mcp)`;

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
        author,
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

        execSync(
          `gh api repos/${finalProjectName}/branches/main/protection -X PUT -f required_status_checks='null' -f enforce_admins=false -f required_pull_request_reviews='{"require_code_owner_reviews":false,"required_approving_review_count":1}' -f restrictions='null'`,
          { cwd: currentDir, stdio: "pipe" },
        );

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

🤖 Generated with [Slambed MCP](https://github.com/your-username/slambed-mcp)

Co-Authored-By: Claude <noreply@anthropic.com>`;

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

🤖 Generated with [Slambed MCP](https://github.com/your-username/slambed-mcp)`;

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
  author,
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

    try {
      execGitCommand("git pull origin HEAD", { silent: true });
      steps.push("Updated branch with latest changes");
    } catch (e) {
      steps.push("Could not pull latest changes (no remote or network issue)");
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

🤖 Generated with [Slambed MCP](https://github.com/your-username/slambed-mcp)

Co-Authored-By: Claude <noreply@anthropic.com>`;

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

🤖 Generated with [Slambed MCP](https://github.com/your-username/slambed-mcp)`;

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

🤖 Generated with [Slambed MCP](https://github.com/your-username/slambed-mcp)`;

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
};

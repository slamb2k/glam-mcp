/**
 * GitHub Flow Operations
 * Simple, branch-based workflow focused on feature branches and main
 *
 * GitHub Flow is simpler than Git Flow:
 * 1. Create a branch from main
 * 2. Make commits
 * 3. Open a pull request
 * 4. Merge to main
 * 5. Delete the branch
 */

// Note: execSync, fs, and path imports removed as they're not currently used
import {
  isGitRepository,
  getMainBranch,
  getCurrentBranch,
  hasUncommittedChanges,
  branchExists,
  execGitCommand,
  ensureMainUpdated,
} from "../utils/git-helpers.js";
import {
  createSuccessResponse,
  createErrorResponse,
} from "../utils/responses.js";
import { getConfig } from "../config.js";

/**
 * Register GitHub Flow tools
 */
export function registerGitHubFlowTools(server) {
  // Start a new branch
  server.addTool({
    name: "github_flow_start",
    description: "Start a new branch from main for GitHub Flow",
    inputSchema: {
      type: "object",
      properties: {
        name: {
          type: "string",
          description: "Branch name (without prefix)",
        },
        type: {
          type: "string",
          enum: ["feature", "fix", "docs", "chore"],
          description: "Type of branch",
          default: "feature",
        },
      },
      required: ["name"],
    },
    handler: async ({ name, type = "feature" }) => startBranch(name, type),
  });

  // Finish a branch (create PR)
  server.addTool({
    name: "github_flow_finish",
    description: "Finish a branch by creating a pull request",
    inputSchema: {
      type: "object",
      properties: {
        title: {
          type: "string",
          description: "PR title (auto-generated if not provided)",
        },
        description: {
          type: "string",
          description: "PR description",
        },
        draft: {
          type: "boolean",
          description: "Create as draft PR",
          default: false,
        },
        auto_merge: {
          type: "boolean",
          description: "Automatically merge PR after creation",
          default: false,
        },
        delete_branch: {
          type: "boolean",
          description: "Delete branch after successful merge",
          default: true,
        },
      },
    },
    handler: async ({
      title,
      description,
      draft = false,
      auto_merge = false,
      delete_branch = true,
    }) => finishBranch(title, description, draft, auto_merge, delete_branch),
  });

  // Quick workflow (branch + commit + PR)
  server.addTool({
    name: "github_flow_quick",
    description:
      "Quick GitHub Flow: create branch, commit changes, and create PR",
    inputSchema: {
      type: "object",
      properties: {
        branch_name: {
          type: "string",
          description: "Branch name",
        },
        commit_message: {
          type: "string",
          description: "Commit message",
        },
        pr_title: {
          type: "string",
          description: "PR title (defaults to commit message)",
        },
        pr_description: {
          type: "string",
          description: "PR description",
        },
        type: {
          type: "string",
          enum: ["feature", "fix", "docs", "chore"],
          description: "Type of change",
          default: "feature",
        },
        auto_merge: {
          type: "boolean",
          description: "Automatically merge PR",
          default: false,
        },
      },
      required: ["branch_name", "commit_message"],
    },
    handler: async ({
      branch_name,
      commit_message,
      pr_title,
      pr_description,
      type = "feature",
      auto_merge = false,
    }) =>
      quickWorkflow(
        branch_name,
        commit_message,
        pr_title,
        pr_description,
        type,
        auto_merge,
      ),
  });

  // Create PR for current branch
  server.addTool({
    name: "github_flow_create_pr",
    description: "Create a pull request for current branch",
    inputSchema: {
      type: "object",
      properties: {
        title: {
          type: "string",
          description: "PR title",
        },
        description: {
          type: "string",
          description: "PR description",
        },
        draft: {
          type: "boolean",
          description: "Create as draft PR",
          default: false,
        },
      },
    },
    handler: async ({ title, description, draft = false }) =>
      createPullRequest(title, description, draft),
  });

  // Merge PR
  server.addTool({
    name: "github_flow_merge_pr",
    description: "Merge a pull request",
    inputSchema: {
      type: "object",
      properties: {
        pr_number: {
          type: "string",
          description: "PR number or URL",
        },
        merge_method: {
          type: "string",
          enum: ["merge", "squash", "rebase"],
          description: "Merge method",
          default: "squash",
        },
        delete_branch: {
          type: "boolean",
          description: "Delete branch after merge",
          default: true,
        },
      },
    },
    handler: async ({
      pr_number,
      merge_method = "squash",
      delete_branch = true,
    }) => mergePullRequest(pr_number, merge_method, delete_branch),
  });

  // Sync with main
  server.addTool({
    name: "github_flow_sync",
    description: "Sync current branch with main branch",
    inputSchema: {
      type: "object",
      properties: {
        strategy: {
          type: "string",
          enum: ["merge", "rebase"],
          description: "Sync strategy",
          default: "rebase",
        },
      },
    },
    handler: async ({ strategy = "rebase" }) => syncWithMain(strategy),
  });

  // Clean up merged branches
  server.addTool({
    name: "github_flow_cleanup",
    description: "Clean up merged branches",
    inputSchema: {
      type: "object",
      properties: {
        force: {
          type: "boolean",
          description: "Force cleanup without confirmation",
          default: false,
        },
      },
    },
    handler: async ({ force = false }) => cleanupBranches(force),
  });

  // Status
  server.addTool({
    name: "github_flow_status",
    description: "Show GitHub Flow status and branch information",
    inputSchema: {
      type: "object",
      properties: {},
    },
    handler: async () => getGitHubFlowStatus(),
  });
}

/**
 * Start a new branch from main
 */
async function startBranch(name, type, allow_outdated_base) {
  if (!name) {
    return createErrorResponse("Branch name is required");
  }

  if (!isGitRepository()) {
    return createErrorResponse("Not a git repository");
  }

  const mainBranch = getMainBranch();
  const branchName = `${type}/${name}`;

  try {
    // Check if branch already exists
    if (branchExists(branchName)) {
      return createErrorResponse(`Branch '${branchName}' already exists`);
    }

    // Ensure we're on main branch and up to date
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

    // Show update steps to user
    updateResult.steps.forEach((step) => {
      if (
        step.includes("✅") ||
        step.includes("❌") ||
        step.includes("Attempting")
      ) {
        console.log(`  ${step}`);
      }
    });

    // Handle different scenarios
    if (!updateResult.success && !updateResult.isUpdated) {
      // Main is outdated and couldn't be updated
      if (updateResult.networkError) {
        // Network issue - check config for whether to continue
        if (config.gitFlow.allowOutdatedBase) {
          console.log(
            `⚠️  Could not update base branch (${mainBranch}) due to network issue. Continuing anyway due to config...`,
          );
        } else {
          return createErrorResponse(
            `Cannot start new branch: base branch (${mainBranch}) needs updating but network is unavailable.\n` +
              `To work offline, set gitFlow.allowOutdatedBase: true in .slambed.json`,
          );
        }
      } else if (updateResult.divergence.behind > 0) {
        // Behind but update failed (uncommitted changes on main?)
        if (config.gitFlow.allowOutdatedBase) {
          console.log(
            `⚠️  Base branch (${mainBranch}) is outdated but cannot be updated. Continuing anyway due to config...`,
          );
        } else {
          return createErrorResponse(
            `Cannot start new branch: base branch (${mainBranch}) is ${updateResult.divergence.behind} commits behind origin/${mainBranch} and could not be updated.\n` +
              `Please manually update ${mainBranch} or set gitFlow.allowOutdatedBase: true in .slambed.json`,
          );
        }
      } else if (
        updateResult.divergence.ahead > 0 &&
        updateResult.divergence.behind > 0
      ) {
        // Diverged - always fail regardless of config
        return createErrorResponse(
          `Cannot start new branch: base branch (${mainBranch}) has diverged from origin/${mainBranch}.\n` +
            `Please resolve the divergence manually before creating new branches.`,
        );
      }
    }

    // Create and checkout new branch
    execGitCommand(`git checkout -b ${branchName}`, { silent: true });

    return createSuccessResponse(`Started ${type} branch: ${branchName}`, {
      branch: branchName,
      type,
      baseBranch: mainBranch,
      operation: "github-flow-start",
    });
  } catch (error) {
    return createErrorResponse(`Failed to start branch: ${error.message}`);
  }
}

/**
 * Finish a branch by creating a pull request
 */
async function finishBranch(
  title,
  description,
  draft,
  autoMerge,
  deleteBranch,
) {
  if (!isGitRepository()) {
    return createErrorResponse("Not a git repository");
  }

  const currentBranch = getCurrentBranch();
  const mainBranch = getMainBranch();

  if (currentBranch === mainBranch) {
    return createErrorResponse(`Cannot create PR from ${mainBranch} to itself`);
  }

  try {
    // Check for uncommitted changes
    if (hasUncommittedChanges()) {
      return createErrorResponse(
        "Please commit or stash your changes before creating a PR",
      );
    }

    // Push current branch to remote
    try {
      execGitCommand(`git push origin ${currentBranch}`, { silent: true });
    } catch (e) {
      execGitCommand(`git push -u origin ${currentBranch}`, { silent: true });
    }

    // Generate title if not provided
    const prTitle =
      title ||
      currentBranch
        .replace(/^(feature|fix|docs|chore)\//, "")
        .replace(/-/g, " ")
        .replace(/\b\w/g, (l) => l.toUpperCase());

    // Generate description
    const prDescription =
      description ||
      `## Changes
- Implement ${prTitle.toLowerCase()}

## Testing
- [ ] Manual testing completed
- [ ] All tests pass

## Checklist
- [ ] Code follows project style guidelines
- [ ] Self-review completed
- [ ] Documentation updated if needed

🤖 Generated with [Slambed MCP](https://github.com/your-username/slambed-mcp)`;

    // Create PR
    let createCommand = `gh pr create --title "${prTitle}" --body "${prDescription}" --base ${mainBranch}`;
    if (draft) {
      createCommand += " --draft";
    }

    const prUrl = execGitCommand(createCommand, { silent: true }).trim();

    const result = {
      branch: currentBranch,
      targetBranch: mainBranch,
      prUrl,
      title: prTitle,
      draft,
      operation: "github-flow-finish",
    };

    // Auto-merge if requested and not draft
    if (autoMerge && !draft) {
      try {
        await new Promise((resolve) => setTimeout(resolve, 2000)); // Wait for PR to be created

        let mergeCommand = `gh pr merge ${prUrl} --squash`;
        if (deleteBranch) {
          mergeCommand += " --delete-branch";
        }

        execGitCommand(mergeCommand, { silent: true });
        result.merged = true;
        result.deleted = deleteBranch;

        // Switch back to main if branch was deleted
        if (deleteBranch) {
          execGitCommand(`git checkout ${mainBranch}`, { silent: true });
          execGitCommand("git pull origin HEAD", { silent: true });
        }
      } catch (e) {
        result.merged = false;
        result.mergeError = e.message;
      }
    }

    return createSuccessResponse(
      `Created PR for ${currentBranch}: ${prTitle}`,
      result,
    );
  } catch (error) {
    return createErrorResponse(`Failed to finish branch: ${error.message}`);
  }
}

/**
 * Quick workflow: branch + commit + PR
 */
async function quickWorkflow(
  branchName,
  commitMessage,
  prTitle,
  prDescription,
  type,
  autoMerge,
) {
  if (!isGitRepository()) {
    return createErrorResponse("Not a git repository");
  }

  try {
    const steps = [];

    // Step 1: Start branch
    const startResult = await startBranch(branchName, type);
    if (!startResult.success) {
      return startResult;
    }
    steps.push(`✓ Created branch: ${startResult.data.branch}`);

    // Step 2: Commit changes
    if (hasUncommittedChanges()) {
      execGitCommand("git add .", { silent: true });
      execGitCommand(`git commit -m "${commitMessage}"`, { silent: true });
      steps.push("✓ Committed changes");
    } else {
      return createErrorResponse("No changes to commit");
    }

    // Step 3: Create PR
    const finalPrTitle = prTitle || commitMessage;
    const finishResult = await finishBranch(
      finalPrTitle,
      prDescription,
      false,
      autoMerge,
      true,
    );

    if (!finishResult.success) {
      return finishResult;
    }

    steps.push(`✓ Created PR: ${finishResult.data.prUrl}`);

    if (finishResult.data.merged) {
      steps.push("✓ Auto-merged PR");
      steps.push("✓ Cleaned up branch");
    }

    return createSuccessResponse("GitHub Flow quick workflow completed", {
      ...finishResult.data,
      steps,
      operation: "github-flow-quick",
    });
  } catch (error) {
    return createErrorResponse(`Quick workflow failed: ${error.message}`);
  }
}

/**
 * Create a pull request for current branch
 */
async function createPullRequest(title, description, draft) {
  if (!isGitRepository()) {
    return createErrorResponse("Not a git repository");
  }

  const currentBranch = getCurrentBranch();
  const mainBranch = getMainBranch();

  if (currentBranch === mainBranch) {
    return createErrorResponse(`Cannot create PR from ${mainBranch} to itself`);
  }

  try {
    // Check for uncommitted changes
    if (hasUncommittedChanges()) {
      return createErrorResponse(
        "Please commit or stash your changes before creating a PR",
      );
    }

    // Push current branch to remote
    try {
      execGitCommand(`git push origin ${currentBranch}`, { silent: true });
    } catch (e) {
      execGitCommand(`git push -u origin ${currentBranch}`, { silent: true });
    }

    const prTitle =
      title ||
      currentBranch
        .replace(/^(feature|fix|docs|chore)\//, "")
        .replace(/-/g, " ")
        .replace(/\b\w/g, (l) => l.toUpperCase());

    const prBody =
      description ||
      `## Changes
- Implement ${prTitle.toLowerCase()}

## Testing
- [ ] Manual testing completed
- [ ] All tests pass

🤖 Generated with [Slambed MCP](https://github.com/your-username/slambed-mcp)`;

    let createCommand = `gh pr create --title "${prTitle}" --body "${prBody}" --base ${mainBranch}`;
    if (draft) {
      createCommand += " --draft";
    }

    const prUrl = execGitCommand(createCommand, { silent: true }).trim();

    return createSuccessResponse(`Created pull request: ${prTitle}`, {
      branch: currentBranch,
      targetBranch: mainBranch,
      prUrl,
      title: prTitle,
      draft,
      operation: "create-pr",
    });
  } catch (error) {
    return createErrorResponse(`Failed to create PR: ${error.message}`);
  }
}

/**
 * Merge a pull request
 */
async function mergePullRequest(prNumber, mergeMethod, deleteBranch) {
  if (!isGitRepository()) {
    return createErrorResponse("Not a git repository");
  }

  try {
    let mergeCommand = `gh pr merge ${prNumber || ""} --${mergeMethod}`;
    if (deleteBranch) {
      mergeCommand += " --delete-branch";
    }

    const result = execGitCommand(mergeCommand, { silent: true });

    // Update local main branch
    const mainBranch = getMainBranch();
    const currentBranch = getCurrentBranch();

    if (currentBranch !== mainBranch) {
      execGitCommand(`git checkout ${mainBranch}`, { silent: true });
    }
    execGitCommand("git pull origin HEAD", { silent: true });

    return createSuccessResponse("Merged pull request", {
      mergeMethod,
      deleted: deleteBranch,
      result: result.trim(),
      operation: "merge-pr",
    });
  } catch (error) {
    return createErrorResponse(`Failed to merge PR: ${error.message}`);
  }
}

/**
 * Sync current branch with main
 */
async function syncWithMain(strategy) {
  if (!isGitRepository()) {
    return createErrorResponse("Not a git repository");
  }

  try {
    const currentBranch = getCurrentBranch();
    const mainBranch = getMainBranch();
    const steps = [];

    if (currentBranch === mainBranch) {
      execGitCommand("git pull origin HEAD", { silent: true });
      return createSuccessResponse(`Updated ${mainBranch} branch`, {
        branch: currentBranch,
        operation: "sync-with-main",
      });
    }

    // Stash changes if any
    const hasChanges = hasUncommittedChanges();
    if (hasChanges) {
      execGitCommand("git stash", { silent: true });
      steps.push("Stashed uncommitted changes");
    }

    // Update main branch
    execGitCommand(`git checkout ${mainBranch}`, { silent: true });
    execGitCommand("git pull origin HEAD", { silent: true });
    steps.push(`Updated ${mainBranch} branch`);

    // Switch back and sync
    execGitCommand(`git checkout ${currentBranch}`, { silent: true });

    if (strategy === "rebase") {
      execGitCommand(`git rebase ${mainBranch}`, { silent: true });
      steps.push(`Rebased ${currentBranch} onto ${mainBranch}`);
    } else {
      execGitCommand(`git merge ${mainBranch}`, { silent: true });
      steps.push(`Merged ${mainBranch} into ${currentBranch}`);
    }

    // Restore stashed changes
    if (hasChanges) {
      execGitCommand("git stash pop", { silent: true });
      steps.push("Restored stashed changes");
    }

    return createSuccessResponse(`Synced ${currentBranch} with ${mainBranch}`, {
      currentBranch,
      mainBranch,
      strategy,
      steps,
      operation: "sync-with-main",
    });
  } catch (error) {
    return createErrorResponse(`Sync failed: ${error.message}`);
  }
}

/**
 * Clean up merged branches
 */
async function cleanupBranches(_force) {
  if (!isGitRepository()) {
    return createErrorResponse("Not a git repository");
  }

  try {
    const mainBranch = getMainBranch();

    // Get list of merged branches
    const mergedBranches = execGitCommand(`git branch --merged ${mainBranch}`, {
      silent: true,
    })
      .split("\n")
      .map((branch) => branch.trim().replace(/^\*?\s*/, ""))
      .filter(
        (branch) => branch && branch !== mainBranch && !branch.startsWith("("),
      );

    if (mergedBranches.length === 0) {
      return createSuccessResponse("No merged branches to clean up");
    }

    // Delete merged branches
    const deletedBranches = [];
    for (const branch of mergedBranches) {
      try {
        execGitCommand(`git branch -d ${branch}`, { silent: true });
        deletedBranches.push(branch);
      } catch (e) {
        // Continue with other branches if one fails
      }
    }

    // Clean up remote tracking branches
    try {
      execGitCommand("git remote prune origin", { silent: true });
    } catch (e) {
      // Ignore remote prune errors
    }

    return createSuccessResponse(
      `Cleaned up ${deletedBranches.length} merged branches`,
      {
        deletedBranches,
        operation: "cleanup-branches",
      },
    );
  } catch (error) {
    return createErrorResponse(`Cleanup failed: ${error.message}`);
  }
}

/**
 * Get GitHub Flow status
 */
async function getGitHubFlowStatus() {
  if (!isGitRepository()) {
    return createErrorResponse("Not a git repository");
  }

  try {
    const currentBranch = getCurrentBranch();
    const mainBranch = getMainBranch();
    const hasChanges = hasUncommittedChanges();

    // Get list of feature branches
    const branches = execGitCommand("git branch", { silent: true })
      .split("\n")
      .map((branch) => branch.trim().replace(/^\*?\s*/, ""))
      .filter((branch) => branch && branch !== mainBranch);

    const featureBranches = branches.filter(
      (b) =>
        b.startsWith("feature/") ||
        b.startsWith("fix/") ||
        b.startsWith("docs/") ||
        b.startsWith("chore/"),
    );

    // Get recent commits
    const recentCommits = execGitCommand("git log --oneline -10", {
      silent: true,
    })
      .split("\n")
      .filter((line) => line.trim());

    // Get remote status
    let remoteStatus = "unknown";
    try {
      const status = execGitCommand("git status -b --porcelain", {
        silent: true,
      });
      const statusLine = status.split("\n")[0];
      if (statusLine.includes("ahead")) {
        remoteStatus = "ahead";
      } else if (statusLine.includes("behind")) {
        remoteStatus = "behind";
      } else {
        remoteStatus = "up-to-date";
      }
    } catch (e) {
      // Ignore remote status errors
    }

    // Check for open PRs
    let openPRs = [];
    try {
      const prList = execGitCommand(
        "gh pr list --json number,title,headRefName",
        {
          silent: true,
        },
      );
      openPRs = JSON.parse(prList);
    } catch (e) {
      // Ignore PR list errors
    }

    const statusData = {
      currentBranch,
      mainBranch,
      hasUncommittedChanges: hasChanges,
      remoteStatus,
      branches: {
        feature: featureBranches,
        total: branches.length,
      },
      openPRs,
      recentCommits: recentCommits.slice(0, 5),
      operation: "status",
    };

    const statusText = `🚀 GitHub Flow Status

🌿 Current Branch: ${currentBranch}
🏠 Main Branch: ${mainBranch}
📡 Remote Status: ${remoteStatus}
${hasChanges ? "⚠️  Uncommitted changes present" : "✅ Working directory clean"}

📝 Feature Branches (${featureBranches.length}):
${featureBranches.length > 0 ? featureBranches.map((b) => `  • ${b}`).join("\n") : "  No feature branches"}

🔄 Open Pull Requests (${openPRs.length}):
${openPRs.length > 0 ? openPRs.map((pr) => `  • #${pr.number}: ${pr.title} (${pr.headRefName})`).join("\n") : "  No open PRs"}

📚 Recent Commits:
${recentCommits
  .slice(0, 5)
  .map((c) => `  ${c}`)
  .join("\n")}`;

    return createSuccessResponse(statusText, statusData);
  } catch (error) {
    return createErrorResponse(`Failed to get status: ${error.message}`);
  }
}

// Export individual functions for CLI usage
export {
  startBranch,
  finishBranch,
  quickWorkflow,
  createPullRequest,
  mergePullRequest,
  syncWithMain,
  cleanupBranches,
  getGitHubFlowStatus,
};

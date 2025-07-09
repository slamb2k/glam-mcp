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
import { getConfig } from "../core/config.js";
import { GitClient } from "../clients/git-client.js";
import { SessionManager } from "../context/session-manager.js";

// Create singleton instances
const gitClient = new GitClient();
const sessionManager = SessionManager.getInstance({ autoSave: false });

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
    handler: async ({ name, type = "feature" }) => startBranch(name, type, undefined),
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
 * Start a new branch from main with enhanced context
 */
async function startBranch(name, type, allow_outdated_base) {
  if (!name) {
    return createErrorResponse("Branch name is required");
  }

  if (!isGitRepository()) {
    return createErrorResponse("Not a git repository");
  }

  const mainBranch = getMainBranch();
  
  // Get user preferences for branch naming
  const session = sessionManager.get();
  const conventions = session.preferences?.branchingConventions || {
    feature: 'feature/',
    fix: 'fix/',
    docs: 'docs/',
    chore: 'chore/'
  };
  
  const branchPrefix = conventions[type] || `${type}/`;
  const branchName = `${branchPrefix}${name}`;

  try {
    // Gather contextual information
    const [activeBranches, recentCommits, repoState] = await Promise.all([
      gitClient.getActiveBranches(),
      gitClient.getRecentCommits({ since: '7 days ago', limit: 20 }),
      gitClient.getRepoState()
    ]);
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

    const warnings = [];
    if (updateResult.divergence.behind > 0) {
      warnings.push(
        `Main branch is ${updateResult.divergence.behind} commits behind origin/${mainBranch}`
      );
    }

    // Show update steps to user
    updateResult.steps.forEach((step) => {
      if (
        step.includes("✅") ||
        step.includes("❌") ||
        step.includes("Attempting")
      ) {
        // Important steps are added to warnings
      warnings.push(step);
      }
    });

    // Handle different scenarios
    if (!updateResult.success && !updateResult.isUpdated) {
      // Main is outdated and couldn't be updated
      if (updateResult.networkError) {
        // Network issue - check config for whether to continue
        if (config.gitFlow.allowOutdatedBase) {
          warnings.push(
            `Could not update base branch (${mainBranch}) due to network issue. Continuing anyway due to config...`
          );
        } else {
          return createErrorResponse(
            `Cannot start new branch: base branch (${mainBranch}) needs updating but network is unavailable.\n` +
              `To work offline, set gitFlow.allowOutdatedBase: true in .glam.json`,
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
      } else if (updateResult.divergence.behind > 0) {
        // Behind but update failed (uncommitted changes on main?)
        if (config.gitFlow.allowOutdatedBase) {
          warnings.push(
            `Base branch (${mainBranch}) is outdated but cannot be updated. Continuing anyway due to config...`
          );
        } else {
          return createErrorResponse(
            `Cannot start new branch: base branch (${mainBranch}) is ${updateResult.divergence.behind} commits behind origin/${mainBranch} and could not be updated.\n` +
              `Please manually update ${mainBranch} or set gitFlow.allowOutdatedBase: true in .glam.json`,
          );
        }
      }
    }

    // Create and checkout new branch
    execGitCommand(`git checkout -b ${branchName}`, { silent: true });

    // Prepare contextual information
    const context = {
      activeBranches: activeBranches.length,
      recentActivity: {
        commits: recentCommits.length,
        authors: [...new Set(recentCommits.map(c => c.author))].length
      },
      suggestions: [],
      riskAssessment: {
        level: 'low',
        factors: []
      }
    };

    // Add suggestions
    if (name.includes('_') || name.includes(' ')) {
      context.suggestions.push({
        type: 'naming',
        value: 'Consider using kebab-case (dash-separated) for branch names'
      });
    }

    if (!name.match(/^[a-z0-9-]+$/)) {
      context.suggestions.push({
        type: 'naming',
        value: 'Consider using conventional commit style naming (lowercase, no special chars)'
      });
    }

    if (activeBranches.length > 10) {
      context.suggestions.push({
        type: 'cleanup',
        value: `You have ${activeBranches.length} active branches. Consider cleaning up merged branches.`
      });
    }

    // Risk assessment
    if (updateResult.divergence.behind > 0) {
      context.riskAssessment.factors.push({
        type: 'divergence',
        description: `Base branch is ${updateResult.divergence.behind} commits behind`,
        severity: 'medium'
      });
      context.riskAssessment.level = 'medium';
    }

    if (repoState.branchCount > 50) {
      context.riskAssessment.factors.push({
        type: 'branch-count',
        description: 'Repository has many branches',
        severity: 'low'
      });
    }

    // Add next steps suggestions
    context.suggestions.push({
      type: 'next-steps',
      value: 'Next: Make your changes, commit them, then use github_flow_finish to create a PR'
    });

    // Track operation in session
    sessionManager.addOperation({
      tool: 'github_flow_start',
      params: { name, type },
      result: { branch: branchName },
      timestamp: new Date().toISOString()
    });

    const metadata = {
      timestamp: new Date().toISOString(),
      repository: {
        fileCount: repoState.fileCount,
        branchCount: repoState.branchCount
      }
    };

    return createSuccessResponse(`Started ${type} branch: ${branchName}`, {
      branch: branchName,
      type,
      baseBranch: mainBranch,
      operation: "github-flow-start",
      warnings,
      context,
      metadata
    });
  } catch (error) {
    return createErrorResponse(`Failed to start branch: ${error.message}`);
  }
}

/**
 * Finish a branch by creating a pull request with enhanced context
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
    // Gather contextual information
    const [modifiedFiles, recentCommits] = await Promise.all([
      gitClient.getModifiedFiles(),
      execGitCommand('git log --oneline -20', { silent: true })
        .split('\n')
        .filter(line => line.trim())
    ]);

    // Analyze commit patterns
    const commitAnalysis = analyzeCommitPatterns(recentCommits);
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

    // Generate enhanced PR templates
    const prTemplates = generatePRTemplates(prTitle, modifiedFiles, commitAnalysis);
    
    // Generate description
    const prDescription =
      description ||
      prTemplates[0].content;

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

    // Prepare context
    const context = {
      modifiedFiles: modifiedFiles.length,
      commitAnalysis,
      prTemplates: prTemplates.slice(0, 3), // Top 3 templates
      suggestions: []
    };

    // Add suggestions
    if (modifiedFiles.length > 20) {
      context.suggestions.push({
        type: 'review',
        value: 'Large PR with many files. Consider breaking into smaller PRs for easier review.'
      });
    }

    if (!commitAnalysis.hasTests && modifiedFiles.some(f => f.includes('src/'))) {
      context.suggestions.push({
        type: 'testing',
        value: 'No test files detected. Consider adding tests for your changes.'
      });
    }

    // Track operation
    sessionManager.addOperation({
      tool: 'github_flow_finish',
      params: { title: prTitle, draft },
      result: { prUrl: result.prUrl },
      timestamp: new Date().toISOString()
    });

    const metadata = {
      timestamp: new Date().toISOString(),
      filesChanged: modifiedFiles.length,
      commitCount: commitAnalysis.totalCommits
    };

    return createSuccessResponse(
      `Created PR for ${currentBranch}: ${prTitle}`,
      { ...result, context, metadata },
    );
  } catch (error) {
    return createErrorResponse(`Failed to finish branch: ${error.message}`);
  }
}

/**
 * Analyze commit patterns from recent commits
 */
function analyzeCommitPatterns(commits) {
  const types = [];
  const hasTests = commits.some(c => c.toLowerCase().includes('test'));
  const hasDocs = commits.some(c => c.toLowerCase().includes('doc'));
  
  // Extract conventional commit types
  commits.forEach(commit => {
    const match = commit.match(/^[a-f0-9]+ (feat|fix|docs|test|refactor|style|chore|perf):/);
    if (match) {
      types.push(match[1]);
    }
  });

  return {
    types: [...new Set(types)],
    totalCommits: commits.length,
    hasTests,
    hasDocs,
    conventional: types.length > commits.length * 0.5
  };
}

/**
 * Generate PR templates based on context
 */
function generatePRTemplates(title, modifiedFiles, commitAnalysis) {
  const templates = [];
  
  // Standard template
  const standardTemplate = `## Changes
- ${title}

## Type of Change
${commitAnalysis.types.map(t => `- [x] ${t}`).join('\n') || '- [ ] feature\n- [ ] bug fix\n- [ ] documentation'}

## Testing
- [ ] Manual testing completed
- [ ] All tests pass
${commitAnalysis.hasTests ? '- [x] Tests added/updated' : '- [ ] Tests added/updated'}

## Files Changed (${modifiedFiles.length})
${modifiedFiles.slice(0, 10).map(f => `- ${f}`).join('\n')}
${modifiedFiles.length > 10 ? `\n... and ${modifiedFiles.length - 10} more files` : ''}

## Checklist
- [ ] Code follows project style guidelines
- [ ] Self-review completed
${commitAnalysis.hasDocs ? '- [x] Documentation updated' : '- [ ] Documentation updated if needed'}

🤖 Generated with [Glam MCP](https://github.com/slamb2k/glam-mcp)`;

  templates.push({
    name: 'standard',
    content: standardTemplate
  });

  // Minimal template
  templates.push({
    name: 'minimal',
    content: `${title}\n\nChanges:\n${modifiedFiles.slice(0, 5).map(f => `- ${f}`).join('\n')}`
  });

  // Detailed template
  if (commitAnalysis.conventional) {
    const detailedTemplate = `## Summary
${title}

## Motivation and Context
<!--- Why is this change required? What problem does it solve? -->

## Detailed Changes
${commitAnalysis.types.includes('feat') ? '### New Features\n- \n' : ''}
${commitAnalysis.types.includes('fix') ? '### Bug Fixes\n- \n' : ''}
${commitAnalysis.types.includes('refactor') ? '### Refactoring\n- \n' : ''}

## Testing Instructions
<!--- How can reviewers test these changes? -->

## Breaking Changes
<!--- List any breaking changes -->
- None

## Additional Notes
<!--- Any additional information -->`;

    templates.push({
      name: 'detailed',
      content: detailedTemplate
    });
  }

  return templates;
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

🤖 Generated with [Glam MCP](https://github.com/slamb2k/glam-mcp)`;

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
 * Get GitHub Flow status with enhanced insights
 */
async function getGitHubFlowStatus() {
  if (!isGitRepository()) {
    return createErrorResponse("Not a git repository");
  }

  try {
    const currentBranch = getCurrentBranch();
    const mainBranch = getMainBranch();
    const hasChanges = hasUncommittedChanges();
    
    // Get enhanced repository information
    const [repoState, activeBranches] = await Promise.all([
      gitClient.getRepoState(),
      gitClient.getActiveBranches()
    ]);

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

    // Identify stale branches
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const staleBranches = activeBranches.filter(
      b => new Date(b.lastActivity) < thirtyDaysAgo
    );

    // Generate insights
    const insights = {
      branchActivity: {
        active: activeBranches.length,
        stale: staleBranches.length,
        total: branches.length
      },
      staleBranches: staleBranches.map(b => ({
        name: b.name,
        lastActivity: b.lastActivity,
        author: b.author
      })),
      recommendations: []
    };

    // Add recommendations
    if (staleBranches.length > 0) {
      insights.recommendations.push({
        type: 'cleanup',
        priority: 'medium',
        action: `Clean up ${staleBranches.length} stale branches`,
        command: 'github_flow_cleanup'
      });
    }

    if (hasChanges && currentBranch !== mainBranch) {
      insights.recommendations.push({
        type: 'commit',
        priority: 'high',
        action: 'Commit your changes before switching branches',
        command: 'auto_commit'
      });
    }

    if (openPRs.length > 3) {
      insights.recommendations.push({
        type: 'review',
        priority: 'medium',
        action: `Review and merge ${openPRs.length} open pull requests`,
        command: 'github_flow_merge_pr'
      });
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
      insights,
      metadata: {
        timestamp: new Date().toISOString(),
        repository: {
          fileCount: repoState.fileCount,
          branchCount: repoState.branchCount
        }
      },
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

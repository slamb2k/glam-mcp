/**
 * Utility Tools
 * Additional helper tools for git operations and repository management
 */

import { execSync } from "child_process";
import fs from "fs";
import path from "path";
import {
  isGitRepository,
  getMainBranch,
  getCurrentBranch,
  getChangedFiles,
  getRecentCommits,
  getRemoteUrl,
  getMergedBranches,
  execGitCommand,
} from "../utils/git-helpers.js";
import {
  createSuccessResponse,
  createErrorResponse,
} from "../utils/responses.js";
import { GitClient } from "../clients/git-client.js";
import { SessionManager } from "../context/session-manager.js";

// Create singleton instances
const gitClient = new GitClient();
const sessionManager = SessionManager.getInstance({ autoSave: false });

/**
 * Register utility tools
 */
export function registerUtilityTools(server) {
  // Enhanced repository status
  server.addTool({
    name: "get_status",
    description: "Get enhanced repository status with contextual information and suggestions. Use this when you need comprehensive information about the current state of the repository including branch status, file changes, and workflow recommendations.",
    inputSchema: {
      type: "object",
      properties: {
        include_history: {
          type: "boolean",
          description: "Include historical status information",
          default: true,
        },
        include_suggestions: {
          type: "boolean",
          description: "Include workflow suggestions",
          default: true,
        },
      },
    },
    handler: async (params) => getEnhancedStatus(params),
  });

  // Repository information
  server.addTool({
    name: "repo_info",
    description: "Get comprehensive repository information and statistics with actionable insights. Use this when you need detailed metrics about repository structure, code quality indicators, and improvement suggestions.",
    inputSchema: {
      type: "object",
      properties: {
        include_stats: {
          type: "boolean",
          description: "Include detailed statistics",
          default: true,
        },
        include_branches: {
          type: "boolean",
          description: "Include branch information",
          default: true,
        },
        include_commits: {
          type: "boolean",
          description: "Include recent commits",
          default: true,
        },
        include_quality: {
          type: "boolean",
          description: "Include code quality metrics",
          default: true,
        },
      },
    },
    handler: async (params) => getRepoInfo(params),
  });

  // Repository map visualization
  server.addTool({
    name: "repo_map",
    description: "Generate a visual map of the repository structure with file counts and sizes. Use this to understand project organization and identify large or complex areas.",
    inputSchema: {
      type: "object",
      properties: {
        max_depth: {
          type: "number",
          description: "Maximum directory depth to display",
          default: 3,
        },
        show_hidden: {
          type: "boolean",
          description: "Include hidden files and directories",
          default: false,
        },
        sort_by: {
          type: "string",
          enum: ["name", "size", "files"],
          description: "Sort directories by",
          default: "name",
        },
      },
    },
    handler: async (params) => generateRepoMap(params),
  });

  // Change analysis
  server.addTool({
    name: "analyze_changes",
    description: "Analyze current changes and suggest commit messages",
    inputSchema: {
      type: "object",
      properties: {
        detailed: {
          type: "boolean",
          description: "Include detailed file analysis",
          default: false,
        },
      },
    },
    handler: async (params) => analyzeChanges(params),
  });

  // Branch management
  server.addTool({
    name: "list_branches",
    description: "List and categorize all branches",
    inputSchema: {
      type: "object",
      properties: {
        include_remote: {
          type: "boolean",
          description: "Include remote branches",
          default: false,
        },
        merged_only: {
          type: "boolean",
          description: "Show only merged branches",
          default: false,
        },
      },
    },
    handler: async (params) => listBranches(params),
  });

  // Commit history
  server.addTool({
    name: "commit_history",
    description: "Get formatted commit history with filtering options",
    inputSchema: {
      type: "object",
      properties: {
        count: {
          type: "number",
          description: "Number of commits to show",
          default: 20,
        },
        author: {
          type: "string",
          description: "Filter by author",
        },
        since: {
          type: "string",
          description: 'Show commits since date (e.g., "1 week ago")',
        },
        grep: {
          type: "string",
          description: "Search commit messages",
        },
      },
    },
    handler: async (params) => getCommitHistory(params),
  });

  // File operations
  server.addTool({
    name: "git_file_status",
    description: "Get detailed status of files in repository",
    inputSchema: {
      type: "object",
      properties: {
        path: {
          type: "string",
          description: "Specific path to check (optional)",
        },
      },
    },
    handler: async (params) => getFileStatus(params),
  });

  // Diff operations
  server.addTool({
    name: "show_diff",
    description: "Show diff for specific files or commits",
    inputSchema: {
      type: "object",
      properties: {
        target: {
          type: "string",
          description: "File path, commit hash, or branch name",
        },
        staged: {
          type: "boolean",
          description: "Show staged changes only",
          default: false,
        },
        stat: {
          type: "boolean",
          description: "Show diff statistics",
          default: false,
        },
      },
    },
    handler: async (params) => showDiff(params),
  });

  // Search operations
  server.addTool({
    name: "search_code",
    description: "Search for code patterns in repository history",
    inputSchema: {
      type: "object",
      properties: {
        pattern: {
          type: "string",
          description: "Search pattern (regex supported)",
        },
        file_pattern: {
          type: "string",
          description: "File pattern to search in",
        },
        all_history: {
          type: "boolean",
          description: "Search entire git history",
          default: false,
        },
      },
      required: ["pattern"],
    },
    handler: async (params) => searchCode(params),
  });

  // Tag operations
  server.addTool({
    name: "tag_operations",
    description: "Create, list, or delete git tags",
    inputSchema: {
      type: "object",
      properties: {
        operation: {
          type: "string",
          enum: ["list", "create", "delete"],
          description: "Tag operation to perform",
        },
        tag_name: {
          type: "string",
          description: "Tag name (for create/delete operations)",
        },
        message: {
          type: "string",
          description: "Tag message (for create operation)",
        },
        commit: {
          type: "string",
          description: "Commit hash to tag (defaults to HEAD)",
        },
      },
      required: ["operation"],
    },
    handler: async (params) => tagOperations(params),
  });

  // Stash operations
  server.addTool({
    name: "stash_operations",
    description: "Manage git stash (save, list, apply, drop)",
    inputSchema: {
      type: "object",
      properties: {
        operation: {
          type: "string",
          enum: ["save", "list", "apply", "pop", "drop", "clear"],
          description: "Stash operation to perform",
        },
        message: {
          type: "string",
          description: "Stash message (for save operation)",
        },
        index: {
          type: "number",
          description: "Stash index (for apply/drop operations)",
          default: 0,
        },
      },
      required: ["operation"],
    },
    handler: async (params) => stashOperations(params),
  });

  // Repository health check
  server.addTool({
    name: "repo_health_check",
    description: "Check repository health and suggest improvements",
    inputSchema: {
      type: "object",
      properties: {
        fix_issues: {
          type: "boolean",
          description: "Automatically fix detected issues",
          default: false,
        },
      },
    },
    handler: async (params) => repoHealthCheck(params),
  });

  // Cleanup merged branches
  server.addTool({
    name: "cleanup_merged_branches",
    description: "Remove local branches that have been merged to main/master",
    inputSchema: {
      type: "object",
      properties: {
        dry_run: {
          type: "boolean",
          description: "Show what would be deleted without actually deleting",
          default: false,
        },
        include_remote: {
          type: "boolean",
          description: "Also prune remote tracking branches",
          default: true,
        },
        force: {
          type: "boolean",
          description: "Skip confirmation prompts",
          default: false,
        },
      },
    },
    handler: async (params) => cleanupMergedBranches(params),
  });

  // Branch protection management
  server.addTool({
    name: "branch_protection",
    description: "Manage GitHub branch protection rules",
    inputSchema: {
      type: "object",
      properties: {
        branch: {
          type: "string",
          description: "Branch to protect (defaults to main)",
          default: "main",
        },
        operation: {
          type: "string",
          enum: ["enable", "disable", "status"],
          description: "Operation to perform",
          default: "enable",
        },
        require_pr_reviews: {
          type: "boolean",
          description: "Require pull request reviews before merging",
          default: true,
        },
        dismiss_stale_reviews: {
          type: "boolean",
          description: "Dismiss stale PR reviews when new commits are pushed",
          default: true,
        },
        require_status_checks: {
          type: "boolean",
          description: "Require status checks to pass before merging",
          default: true,
        },
        strict_status_checks: {
          type: "boolean",
          description: "Require branches to be up-to-date before merging",
          default: true,
        },
        status_check_contexts: {
          type: "array",
          items: { type: "string" },
          description: "Required status check contexts",
          default: ["lint", "test", "build"],
        },
        enforce_admins: {
          type: "boolean",
          description: "Apply rules to administrators",
          default: false,
        },
        allow_force_pushes: {
          type: "boolean",
          description: "Allow force pushes to the branch",
          default: false,
        },
        allow_deletions: {
          type: "boolean",
          description: "Allow branch deletion",
          default: false,
        },
        required_approving_review_count: {
          type: "number",
          description: "Number of required approving reviews",
          default: 0,
        },
      },
    },
    handler: async (params) => branchProtection(params),
  });

  // Search TODO comments
  server.addTool({
    name: "search_todos",
    description: "Search for TODO, FIXME, HACK, and other code comments that need attention. Use this to identify technical debt and pending tasks in the codebase.",
    inputSchema: {
      type: "object",
      properties: {
        patterns: {
          type: "array",
          items: { type: "string" },
          description: "Patterns to search for",
          default: ["TODO", "FIXME", "HACK", "XXX", "OPTIMIZE", "REFACTOR"],
        },
        include_context: {
          type: "boolean",
          description: "Include surrounding code context",
          default: true,
        },
        group_by_type: {
          type: "boolean",
          description: "Group results by comment type",
          default: true,
        },
      },
    },
    handler: async (params) => searchTodos(params),
  });

  // Check dependencies
  server.addTool({
    name: "check_dependencies",
    description: "Analyze project dependencies for updates, vulnerabilities, and unused packages. Use this to maintain dependency health and security.",
    inputSchema: {
      type: "object",
      properties: {
        check_updates: {
          type: "boolean",
          description: "Check for outdated packages",
          default: true,
        },
        check_security: {
          type: "boolean",
          description: "Check for security vulnerabilities",
          default: true,
        },
        check_unused: {
          type: "boolean",
          description: "Check for unused dependencies",
          default: true,
        },
      },
    },
    handler: async (params) => checkDependencies(params),
  });

  // NPM package creation
  server.addTool({
    name: "create_npm_package",
    description: "Create an npm package from the current directory",
    inputSchema: {
      type: "object",
      properties: {
        package_name: {
          type: "string",
          description: "Package name (defaults to directory name)",
        },
        version: {
          type: "string",
          description: "Initial version",
          default: "1.0.0",
        },
        description: {
          type: "string",
          description: "Package description",
        },
        author: {
          type: "string",
          description: "Package author",
        },
        license: {
          type: "string",
          description: "Package license",
          default: "MIT",
        },
        entry_point: {
          type: "string",
          description: "Main entry point file",
          default: "index.js",
        },
        include_scripts: {
          type: "boolean",
          description: "Include common npm scripts",
          default: true,
        },
        create_readme: {
          type: "boolean",
          description: "Create README.md file",
          default: true,
        },
        initialize_git: {
          type: "boolean",
          description: "Initialize git repository if not present",
          default: true,
        },
      },
    },
    handler: async (params) => createNpmPackage(params),
  });
}

/**
 * Get enhanced repository information with metrics and suggestions
 */
async function getRepoInfo({
  include_stats = true,
  include_branches = true,
  include_commits = true,
  include_quality = true,
}) {
  if (!isGitRepository()) {
    return createErrorResponse("Not a git repository");
  }

  try {
    const session = sessionManager.get();
    const info = {
      currentBranch: getCurrentBranch(),
      mainBranch: getMainBranch(),
      remoteUrl: getRemoteUrl(),
      workingDirectory: process.cwd(),
    };

    // Get repository state from GitClient
    const repoState = await gitClient.getRepoState();
    const activeBranches = await gitClient.getActiveBranches();

    if (include_stats) {
      try {
        const totalCommits = execGitCommand("git rev-list --count HEAD", {
          silent: true,
        }).trim();
        const contributors = execGitCommand("git shortlog -sn --all", {
          silent: true,
        })
          .split("\n")
          .filter((line) => line.trim())
          .slice(0, 10)
          .map((line) => {
            const [commits, ...nameParts] = line.trim().split(/\s+/);
            return {
              name: nameParts.join(" "),
              commits: parseInt(commits),
            };
          });

        // Calculate repository size
        let repoSize = "unknown";
        try {
          const sizeOutput = execGitCommand("du -sh .git", { silent: true }).trim();
          repoSize = sizeOutput.split(/\s+/)[0];
        } catch (e) {
          // Ignore size calculation errors
        }

        info.statistics = {
          totalCommits: parseInt(totalCommits),
          contributors,
          fileCount: repoState.fileCount,
          repoSize,
        };
      } catch (e) {
        info.statistics = { error: "Could not gather statistics" };
      }
    }

    if (include_branches) {
      try {
        const branches = execGitCommand("git branch -a", { silent: true })
          .split("\n")
          .filter((line) => line.trim())
          .map((line) =>
            line
              .trim()
              .replace(/^\*?\s*/, "")
              .replace("remotes/origin/", ""),
          );

        // Identify stale branches
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        const staleBranches = activeBranches.filter(
          b => new Date(b.lastActivity) < thirtyDaysAgo
        );

        info.branches = {
          local: branches.filter((b) => !b.includes("origin/")),
          remote: branches.filter((b) => b.includes("origin/")),
          total: branches.length,
          active: activeBranches.length,
          stale: staleBranches.length,
        };
      } catch (e) {
        info.branches = { error: "Could not list branches" };
      }
    }

    if (include_commits) {
      info.recentCommits = getRecentCommits(10);
    }

    if (include_quality) {
      // Simple quality metrics
      const metrics = {
        filesByType: {},
        largeFiles: [],
        documentation: { hasReadme: false, hasDocs: false },
        testing: { hasTests: false, testFileCount: 0 },
        dependencies: {}
      };

      // Count files by type
      try {
        const files = execGitCommand("git ls-files", { silent: true })
          .split("\n")
          .filter(f => f.trim());
        
        files.forEach(file => {
          const ext = path.extname(file) || 'no-extension';
          metrics.filesByType[ext] = (metrics.filesByType[ext] || 0) + 1;
          
          // Check for documentation
          if (file.toLowerCase() === 'readme.md') metrics.documentation.hasReadme = true;
          if (file.includes('docs/')) metrics.documentation.hasDocs = true;
          
          // Count test files
          if (file.includes('.test.') || file.includes('.spec.') || file.includes('__tests__')) {
            metrics.testing.hasTests = true;
            metrics.testing.testFileCount++;
          }
        });

        // Find large files
        const largeFiles = execGitCommand("git ls-files -z | xargs -0 ls -la | sort -k5 -rn | head -10", { 
          silent: true,
          shell: true 
        }).split("\n").filter(line => line.trim());
        
        metrics.largeFiles = largeFiles.slice(0, 5).map(line => {
          const parts = line.split(/\s+/);
          if (parts.length > 8) {
            return {
              file: parts.slice(8).join(' '),
              size: parts[4]
            };
          }
          return null;
        }).filter(Boolean);
      } catch (e) {
        // Ignore file analysis errors
      }

      // Check dependencies if package.json exists
      if (fs.existsSync('package.json')) {
        try {
          const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
          metrics.dependencies = {
            production: Object.keys(packageJson.dependencies || {}).length,
            development: Object.keys(packageJson.devDependencies || {}).length,
            total: Object.keys({...packageJson.dependencies, ...packageJson.devDependencies}).length
          };
        } catch (e) {
          // Ignore package.json errors
        }
      }

      info.quality = metrics;
    }

    // Store metrics in session
    const repoMetrics = session.repoMetrics || [];
    repoMetrics.push({
      date: new Date().toISOString(),
      files: repoState.fileCount,
      branches: info.branches?.total || 0,
      commits: info.statistics?.totalCommits || 0
    });
    if (repoMetrics.length > 50) {
      repoMetrics.shift();
    }
    sessionManager.update({ repoMetrics });

    // Generate context and suggestions
    const context = {
      repoSize: categorizeRepoSize(repoState.fileCount),
      branchHealth: analyzeBranchHealth(info.branches),
      codebaseInsights: generateCodebaseInsights(info),
      suggestions: []
    };

    // Add suggestions based on analysis
    if (info.branches?.stale > 5) {
      context.suggestions.push({
        type: 'cleanup',
        priority: 'medium',
        message: `${info.branches.stale} stale branches detected. Consider running cleanup.`,
        tool: 'cleanup_merged_branches'
      });
    }

    if (info.quality?.dependencies?.total > 100) {
      context.suggestions.push({
        type: 'maintenance',
        priority: 'medium',
        message: 'Large number of dependencies. Consider auditing for unused packages.',
        tool: 'check_dependencies'
      });
    }

    if (!info.quality?.documentation?.hasReadme) {
      context.suggestions.push({
        type: 'documentation',
        priority: 'high',
        message: 'No README.md found. Consider adding project documentation.'
      });
    }

    if (!info.quality?.testing?.hasTests) {
      context.suggestions.push({
        type: 'testing',
        priority: 'high',
        message: 'No test files detected. Consider adding tests.',
        tool: 'run_tests'
      });
    }

    const metadata = {
      timestamp: new Date().toISOString(),
      toolVersion: '2.0.0'
    };

    return createSuccessResponse("Repository information retrieved", {
      ...info,
      context,
      metadata
    });
  } catch (error) {
    return createErrorResponse(
      `Failed to get repository info: ${error.message}`,
    );
  }
}

/**
 * Analyze current changes
 */
async function analyzeChanges({ detailed = false }) {
  if (!isGitRepository()) {
    return createErrorResponse("Not a git repository");
  }

  const changedFiles = getChangedFiles();
  if (changedFiles.length === 0) {
    return createSuccessResponse("No changes to analyze");
  }

  try {
    const analysis = {
      totalFiles: changedFiles.length,
      byStatus: {},
      byType: {},
      suggestions: [],
    };

    // Group by status
    changedFiles.forEach(({ status, file }) => {
      if (!analysis.byStatus[status]) {
        analysis.byStatus[status] = [];
      }
      analysis.byStatus[status].push(file);
    });

    // Group by file type
    changedFiles.forEach(({ file }) => {
      const ext = path.extname(file) || "no-extension";
      if (!analysis.byType[ext]) {
        analysis.byType[ext] = 0;
      }
      analysis.byType[ext]++;
    });

    // Generate suggestions
    if (changedFiles.some((f) => f.file.includes("test"))) {
      analysis.suggestions.push("test: Update test files");
    }
    if (
      changedFiles.some(
        (f) => f.file.includes("doc") || f.file.includes("README"),
      )
    ) {
      analysis.suggestions.push("docs: Update documentation");
    }
    if (changedFiles.some((f) => f.file === "package.json")) {
      analysis.suggestions.push("chore: Update dependencies");
    }
    if (changedFiles.some((f) => f.file.includes(".github"))) {
      analysis.suggestions.push("ci: Update workflow configuration");
    }

    // Default suggestions
    analysis.suggestions.push("feat: Add new feature");
    analysis.suggestions.push("fix: Fix issue");
    analysis.suggestions.push("refactor: Improve code structure");

    if (detailed) {
      analysis.detailedFiles = changedFiles;
    }

    return createSuccessResponse("Change analysis completed", analysis);
  } catch (error) {
    return createErrorResponse(`Analysis failed: ${error.message}`);
  }
}

/**
 * List branches with categorization
 */
async function listBranches({ include_remote = false, merged_only = false }) {
  if (!isGitRepository()) {
    return createErrorResponse("Not a git repository");
  }

  try {
    const mainBranch = getMainBranch();
    let command = "git branch";

    if (include_remote) {
      command += " -a";
    }

    if (merged_only) {
      command += ` --merged ${mainBranch}`;
    }

    const branches = execGitCommand(command, { silent: true })
      .split("\n")
      .filter((line) => line.trim())
      .map((line) => {
        const branch = line
          .trim()
          .replace(/^\*?\s*/, "")
          .replace("remotes/origin/", "");
        return {
          name: branch,
          current: line.startsWith("*"),
          remote: line.includes("remotes/"),
        };
      });

    // Categorize branches
    const categorized = {
      current: branches.find((b) => b.current)?.name || "unknown",
      feature: branches.filter((b) => b.name.startsWith("feature/")),
      release: branches.filter((b) => b.name.startsWith("release/")),
      hotfix: branches.filter((b) => b.name.startsWith("hotfix/")),
      main: branches.filter(
        (b) => b.name === mainBranch || b.name === "master",
      ),
      other: branches.filter(
        (b) =>
          !b.name.startsWith("feature/") &&
          !b.name.startsWith("release/") &&
          !b.name.startsWith("hotfix/") &&
          b.name !== mainBranch &&
          b.name !== "master",
      ),
    };

    return createSuccessResponse(`Found ${branches.length} branches`, {
      total: branches.length,
      categorized,
      merged_only,
    });
  } catch (error) {
    return createErrorResponse(`Failed to list branches: ${error.message}`);
  }
}

/**
 * Get commit history with filters
 */
async function getCommitHistory({ count = 20, author, since, grep }) {
  if (!isGitRepository()) {
    return createErrorResponse("Not a git repository");
  }

  try {
    let command = `git log --oneline -${count}`;

    if (author) {
      command += ` --author="${author}"`;
    }

    if (since) {
      command += ` --since="${since}"`;
    }

    if (grep) {
      command += ` --grep="${grep}"`;
    }

    const commits = execGitCommand(command, { silent: true })
      .split("\n")
      .filter((line) => line.trim())
      .map((line) => {
        const [hash, ...messageParts] = line.split(" ");
        return {
          hash,
          message: messageParts.join(" "),
        };
      });

    return createSuccessResponse(`Retrieved ${commits.length} commits`, {
      commits,
      filters: { author, since, grep },
    });
  } catch (error) {
    return createErrorResponse(
      `Failed to get commit history: ${error.message}`,
    );
  }
}

/**
 * Get file status
 */
async function getFileStatus({ path: filePath }) {
  if (!isGitRepository()) {
    return createErrorResponse("Not a git repository");
  }

  try {
    let command = "git status --porcelain";
    if (filePath) {
      command += ` "${filePath}"`;
    }

    const status = execGitCommand(command, { silent: true })
      .split("\n")
      .filter((line) => line.trim())
      .map((line) => {
        const [statusCode, ...fileParts] = line.split(" ");
        return {
          status: statusCode.trim(),
          file: fileParts.join(" ").trim(),
          staged: statusCode[0] !== " ",
          modified: statusCode[1] !== " ",
        };
      });

    return createSuccessResponse("File status retrieved", {
      files: status,
      totalFiles: status.length,
    });
  } catch (error) {
    return createErrorResponse(`Failed to get file status: ${error.message}`);
  }
}

/**
 * Show diff
 */
async function showDiff({ target, staged = false, stat = false }) {
  if (!isGitRepository()) {
    return createErrorResponse("Not a git repository");
  }

  try {
    let command = "git diff";

    if (staged) {
      command += " --staged";
    }

    if (stat) {
      command += " --stat";
    }

    if (target) {
      command += ` "${target}"`;
    }

    const diff = execGitCommand(command, { silent: true });

    return createSuccessResponse("Diff retrieved", {
      diff: diff || "No differences found",
      target,
      staged,
      stat,
    });
  } catch (error) {
    return createErrorResponse(`Failed to show diff: ${error.message}`);
  }
}

/**
 * Search code
 */
async function searchCode({ pattern, file_pattern, all_history = false }) {
  if (!isGitRepository()) {
    return createErrorResponse("Not a git repository");
  }

  try {
    let command = all_history ? "git log -S" : "git grep";
    command += ` "${pattern}"`;

    if (file_pattern && !all_history) {
      command += ` -- "${file_pattern}"`;
    }

    const results = execGitCommand(command, { silent: true })
      .split("\n")
      .filter((line) => line.trim());

    return createSuccessResponse(`Found ${results.length} matches`, {
      results,
      pattern,
      file_pattern,
      all_history,
    });
  } catch (error) {
    return createErrorResponse(`Search failed: ${error.message}`);
  }
}

/**
 * Tag operations
 */
async function tagOperations({
  operation,
  tag_name,
  message,
  commit = "HEAD",
}) {
  if (!isGitRepository()) {
    return createErrorResponse("Not a git repository");
  }

  try {
    switch (operation) {
      case "list":
        const tags = execGitCommand("git tag -l", { silent: true })
          .split("\n")
          .filter((line) => line.trim());
        return createSuccessResponse(`Found ${tags.length} tags`, { tags });

      case "create":
        if (!tag_name) {
          return createErrorResponse(
            "Tag name is required for create operation",
          );
        }
        let createCommand = `git tag`;
        if (message) {
          createCommand += ` -a "${tag_name}" -m "${message}"`;
        } else {
          createCommand += ` "${tag_name}"`;
        }
        if (commit !== "HEAD") {
          createCommand += ` ${commit}`;
        }
        execGitCommand(createCommand, { silent: true });
        return createSuccessResponse(`Created tag: ${tag_name}`, {
          tag: tag_name,
          commit,
        });

      case "delete":
        if (!tag_name) {
          return createErrorResponse(
            "Tag name is required for delete operation",
          );
        }
        execGitCommand(`git tag -d "${tag_name}"`, { silent: true });
        return createSuccessResponse(`Deleted tag: ${tag_name}`, {
          tag: tag_name,
        });

      default:
        return createErrorResponse(`Unknown operation: ${operation}`);
    }
  } catch (error) {
    return createErrorResponse(`Tag operation failed: ${error.message}`);
  }
}

/**
 * Stash operations
 */
async function stashOperations({ operation, message, index = 0 }) {
  if (!isGitRepository()) {
    return createErrorResponse("Not a git repository");
  }

  try {
    switch (operation) {
      case "save":
        const saveMessage =
          message || `Stash created at ${new Date().toISOString()}`;
        execGitCommand(`git stash save "${saveMessage}"`, { silent: true });
        return createSuccessResponse("Changes stashed", {
          message: saveMessage,
        });

      case "list":
        const stashes = execGitCommand("git stash list", { silent: true })
          .split("\n")
          .filter((line) => line.trim())
          .map((line, idx) => ({ index: idx, description: line }));
        return createSuccessResponse(`Found ${stashes.length} stashes`, {
          stashes,
        });

      case "apply":
        execGitCommand(`git stash apply stash@{${index}}`, { silent: true });
        return createSuccessResponse(`Applied stash at index ${index}`, {
          index,
        });

      case "pop":
        execGitCommand(`git stash pop stash@{${index}}`, { silent: true });
        return createSuccessResponse(`Popped stash at index ${index}`, {
          index,
        });

      case "drop":
        execGitCommand(`git stash drop stash@{${index}}`, { silent: true });
        return createSuccessResponse(`Dropped stash at index ${index}`, {
          index,
        });

      case "clear":
        execGitCommand("git stash clear", { silent: true });
        return createSuccessResponse("All stashes cleared");

      default:
        return createErrorResponse(`Unknown operation: ${operation}`);
    }
  } catch (error) {
    return createErrorResponse(`Stash operation failed: ${error.message}`);
  }
}

/**
 * Repository health check
 */
async function repoHealthCheck({ fix_issues = false }) {
  if (!isGitRepository()) {
    return createErrorResponse("Not a git repository");
  }

  try {
    const issues = [];
    const fixes = [];

    // Check for large files
    try {
      const largeFiles = execGitCommand(
        "git ls-files | xargs ls -l | awk '$5 > 1048576 {print $9, $5}'",
        { silent: true },
      );
      if (largeFiles.trim()) {
        issues.push("Large files detected in repository");
      }
    } catch (e) {
      // Ignore check errors
    }

    // Check for untracked files
    const untrackedFiles = getChangedFiles().filter((f) =>
      f.status.includes("??"),
    );
    if (untrackedFiles.length > 0) {
      issues.push(`${untrackedFiles.length} untracked files`);
    }

    // Check for merged branches
    const mergedBranches = getMergedBranches();
    if (mergedBranches.length > 0) {
      issues.push(`${mergedBranches.length} merged branches can be cleaned up`);

      if (fix_issues) {
        for (const branch of mergedBranches) {
          try {
            execGitCommand(`git branch -d ${branch}`, { silent: true });
            fixes.push(`Deleted merged branch: ${branch}`);
          } catch (e) {
            // Continue with other branches
          }
        }
      }
    }

    // Check for stale remote references
    try {
      const staleRefs = execGitCommand("git remote prune origin --dry-run", {
        silent: true,
      });
      if (staleRefs.trim()) {
        issues.push("Stale remote references detected");

        if (fix_issues) {
          execGitCommand("git remote prune origin", { silent: true });
          fixes.push("Pruned stale remote references");
        }
      }
    } catch (e) {
      // Ignore if no remote
    }

    // Check branch protection status
    const mainBranch = getMainBranch();
    const remoteUrl = getRemoteUrl();
    if (remoteUrl && remoteUrl.includes("github.com")) {
      const match = remoteUrl.match(
        /github\.com[:/]([^/]+)\/([^/.]+)(\.git)?$/,
      );
      if (match) {
        const [, owner, repo] = match;
        try {
          execSync(
            `gh api repos/${owner}/${repo}/branches/${mainBranch}/protection`,
            { stdio: "pipe" },
          );
          // Protection exists, all good
        } catch (e) {
          issues.push(`Branch protection not enabled on '${mainBranch}'`);
          if (!fix_issues) {
            health.recommendations = health.recommendations || [];
            health.recommendations.push(
              `Enable branch protection: glam protection enable --branch ${mainBranch}`,
            );
          }
        }
      }
    }

    const health = {
      issues,
      fixes,
      score: Math.max(0, 100 - issues.length * 10),
      recommendations: [],
    };

    // Add recommendations
    if (issues.length === 0) {
      health.recommendations.push("Repository is in good health! 🎉");
    } else {
      health.recommendations.push(
        "Consider running with fix_issues: true to auto-fix issues",
      );
      health.recommendations.push("Regularly clean up merged branches");
      health.recommendations.push("Keep repository size manageable");
    }

    return createSuccessResponse("Health check completed", health);
  } catch (error) {
    return createErrorResponse(`Health check failed: ${error.message}`);
  }
}

/**
 * Create NPM package from current directory
 */
async function createNpmPackage({
  package_name,
  version = "1.0.0",
  description,
  author,
  license = "MIT",
  entry_point = "index.js",
  include_scripts = true,
  create_readme = true,
  initialize_git = true,
}) {
  try {
    const currentDir = process.cwd();
    const defaultPackageName = path.basename(currentDir);
    const finalPackageName = package_name || defaultPackageName;

    // Check if package.json already exists
    const packageJsonPath = path.join(currentDir, "package.json");
    if (fs.existsSync(packageJsonPath)) {
      return createErrorResponse(
        "package.json already exists in current directory",
      );
    }

    // Initialize git repository if requested and not present
    if (initialize_git && !isGitRepository()) {
      try {
        execSync("git init", { cwd: currentDir, stdio: "pipe" });
      } catch (error) {
        return createErrorResponse(
          `Failed to initialize git repository: ${error.message}`,
        );
      }
    }

    // Create package.json
    const packageJson = {
      name: finalPackageName,
      version,
      description: description || `A Node.js package`,
      main: entry_point,
      author: author || "",
      license,
    };

    // Add common scripts if requested
    if (include_scripts) {
      packageJson.scripts = {
        start: "node index.js",
        test: 'echo "Error: no test specified" && exit 1',
        dev: "node index.js",
        build: 'echo "No build process specified"',
      };
    }

    // Add keywords array
    packageJson.keywords = [];

    // Add repository field if git is initialized
    if (isGitRepository()) {
      try {
        const remoteUrl = getRemoteUrl();
        if (remoteUrl) {
          packageJson.repository = {
            type: "git",
            url: remoteUrl,
          };
        }
      } catch (e) {
        // Ignore if no remote
      }
    }

    // Write package.json
    fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2));

    const createdFiles = ["package.json"];

    // Create entry point file if it doesn't exist
    const entryPointPath = path.join(currentDir, entry_point);
    if (!fs.existsSync(entryPointPath)) {
      const entryPointContent = `// ${finalPackageName}
// ${description || "A Node.js package"}

console.log('Hello from ${finalPackageName}!');

module.exports = {
  // Your exports here
};
`;
      fs.writeFileSync(entryPointPath, entryPointContent);
      createdFiles.push(entry_point);
    }

    // Create README.md if requested
    if (create_readme) {
      const readmePath = path.join(currentDir, "README.md");
      if (!fs.existsSync(readmePath)) {
        const readmeContent = `# ${finalPackageName}

${description || "A Node.js package"}

## Installation

\`\`\`bash
npm install ${finalPackageName}
\`\`\`

## Usage

\`\`\`javascript
const ${finalPackageName.replace(/[^a-zA-Z0-9]/g, "")} = require('${finalPackageName}');

// Your usage example here
\`\`\`

## License

${license}
`;
        fs.writeFileSync(readmePath, readmeContent);
        createdFiles.push("README.md");
      }
    }

    // Create .gitignore if git is initialized
    if (isGitRepository()) {
      const gitignorePath = path.join(currentDir, ".gitignore");
      if (!fs.existsSync(gitignorePath)) {
        const gitignoreContent = `# Dependencies
node_modules/

# Logs
logs
*.log
npm-debug.log*
yarn-debug.log*
yarn-error.log*

# Runtime data
pids
*.pid
*.seed
*.pid.lock

# Coverage directory used by tools like istanbul
coverage/

# nyc test coverage
.nyc_output

# Dependency directories
jspm_packages/

# Optional npm cache directory
.npm

# Optional eslint cache
.eslintcache

# Output of 'npm pack'
*.tgz

# Yarn Integrity file
.yarn-integrity

# dotenv environment variables file
.env

# IDE files
.vscode/
.idea/
*.swp
*.swo

# OS generated files
.DS_Store
.DS_Store?
._*
.Spotlight-V100
.Trashes
ehthumbs.db
Thumbs.db
`;
        fs.writeFileSync(gitignorePath, gitignoreContent);
        createdFiles.push(".gitignore");
      }
    }

    return createSuccessResponse("NPM package created successfully", {
      packageName: finalPackageName,
      version,
      description,
      author,
      license,
      entryPoint: entry_point,
      createdFiles,
      location: currentDir,
      nextSteps: [
        'Run "npm install" to install dependencies',
        "Edit package.json to add dependencies",
        "Start developing your package!",
        ...(isGitRepository()
          ? ['Make initial commit: git add . && git commit -m "Initial commit"']
          : []),
      ],
    });
  } catch (error) {
    return createErrorResponse(
      `Failed to create NPM package: ${error.message}`,
    );
  }
}

/**
 * Cleanup merged branches
 */
async function cleanupMergedBranches({
  dry_run = false,
  include_remote = true,
  force = false,
}) {
  if (!isGitRepository()) {
    return createErrorResponse("Not a git repository");
  }

  try {
    const mainBranch = getMainBranch();
    const currentBranch = getCurrentBranch();
    const mergedBranches = getMergedBranches(mainBranch);

    // Filter out current branch and main branch
    const branchesToDelete = mergedBranches.filter(
      (branch) =>
        branch !== currentBranch &&
        branch !== mainBranch &&
        branch !== "master",
    );

    if (branchesToDelete.length === 0) {
      return createSuccessResponse("No merged branches to clean up", {
        checkedBranches: mergedBranches.length,
        currentBranch,
        mainBranch,
      });
    }

    // Get additional info for each branch
    const branchInfo = branchesToDelete.map((branch) => {
      let lastCommit = "unknown";
      let lastCommitDate = "unknown";

      try {
        const info = execGitCommand(`git log -1 --format="%h %ar" ${branch}`, {
          silent: true,
        }).trim();
        const [hash, ...dateParts] = info.split(" ");
        lastCommit = hash;
        lastCommitDate = dateParts.join(" ");
      } catch (e) {
        // Ignore errors getting commit info
      }

      return {
        name: branch,
        lastCommit,
        lastCommitDate,
      };
    });

    if (dry_run) {
      return createSuccessResponse(
        `Found ${branchesToDelete.length} merged branches that would be deleted`,
        {
          branches: branchInfo,
          dryRun: true,
          includeRemote: include_remote,
        },
      );
    }

    // Delete the branches
    const deletedBranches = [];
    const failedBranches = [];

    for (const branch of branchesToDelete) {
      try {
        execGitCommand(`git branch -d ${branch}`, { silent: true });
        deletedBranches.push(branch);
      } catch (error) {
        // Try force delete if regular delete fails
        try {
          if (force) {
            execGitCommand(`git branch -D ${branch}`, { silent: true });
            deletedBranches.push(branch);
          } else {
            failedBranches.push({
              branch,
              reason:
                "Branch has unmerged changes (use --force to delete anyway)",
            });
          }
        } catch (e) {
          failedBranches.push({
            branch,
            reason: error.message,
          });
        }
      }
    }

    // Prune remote tracking branches if requested
    let prunedRemotes = false;
    if (include_remote && deletedBranches.length > 0) {
      try {
        execGitCommand("git remote prune origin", { silent: true });
        prunedRemotes = true;
      } catch (e) {
        // Ignore remote prune errors
      }
    }

    return createSuccessResponse(
      `Cleaned up ${deletedBranches.length} merged branches`,
      {
        deletedBranches,
        failedBranches,
        prunedRemotes,
        totalChecked: branchesToDelete.length,
      },
    );
  } catch (error) {
    return createErrorResponse(`Failed to cleanup branches: ${error.message}`);
  }
}

/**
 * Branch protection tool
 */
async function branchProtection({
  branch = "main",
  operation = "enable",
  require_pr_reviews = true,
  dismiss_stale_reviews = true,
  require_status_checks = true,
  strict_status_checks = true,
  status_check_contexts = ["lint", "test", "build"],
  enforce_admins = false,
  allow_force_pushes = false,
  allow_deletions = false,
  required_approving_review_count = 0,
}) {
  if (!isGitRepository()) {
    return createErrorResponse("Not a git repository");
  }

  try {
    const steps = [];

    // Get repository info
    const remoteUrl = getRemoteUrl();
    if (!remoteUrl || !remoteUrl.includes("github.com")) {
      return createErrorResponse("This tool requires a GitHub repository");
    }

    // Extract owner and repo name from remote URL
    const match = remoteUrl.match(/github\.com[:/]([^/]+)\/([^/.]+)(\.git)?$/);
    if (!match) {
      return createErrorResponse("Could not parse GitHub repository URL");
    }

    const [, owner, repo] = match;
    const repoPath = `${owner}/${repo}`;

    if (operation === "status") {
      // Check current branch protection status
      try {
        const protection = execSync(
          `gh api repos/${repoPath}/branches/${branch}/protection`,
          { encoding: "utf8" },
        );

        return createSuccessResponse(
          `Branch protection status for '${branch}'`,
          {
            branch,
            protected: true,
            settings: JSON.parse(protection),
            operation: "branch-protection-status",
          },
        );
      } catch (error) {
        return createSuccessResponse(`Branch '${branch}' is not protected`, {
          branch,
          protected: false,
          operation: "branch-protection-status",
        });
      }
    }

    if (operation === "disable") {
      // Remove branch protection
      try {
        execSync(
          `gh api repos/${repoPath}/branches/${branch}/protection -X DELETE`,
          { stdio: "pipe" },
        );
        steps.push(`✓ Removed protection from branch '${branch}'`);

        return createSuccessResponse(
          `Branch protection disabled for '${branch}'`,
          {
            branch,
            steps,
            operation: "branch-protection-disable",
          },
        );
      } catch (error) {
        return createErrorResponse(
          `Failed to disable branch protection: ${error.message}`,
        );
      }
    }

    // Enable branch protection
    const protectionCmd = [
      `gh api repos/${repoPath}/branches/${branch}/protection -X PUT`,
    ];

    // Configure required status checks
    if (require_status_checks && status_check_contexts.length > 0) {
      protectionCmd.push(
        `-f "required_status_checks[strict]=${strict_status_checks}"`,
      );
      status_check_contexts.forEach((context) => {
        protectionCmd.push(
          `-f "required_status_checks[contexts][]=${context}"`,
        );
      });
    } else {
      protectionCmd.push(`-f "required_status_checks=null"`);
    }

    // Configure PR reviews
    if (require_pr_reviews) {
      protectionCmd.push(
        `-f "required_pull_request_reviews[require_code_owner_reviews]=false"`,
      );
      protectionCmd.push(
        `-f "required_pull_request_reviews[required_approving_review_count]=${required_approving_review_count}"`,
      );
      protectionCmd.push(
        `-f "required_pull_request_reviews[dismiss_stale_reviews]=${dismiss_stale_reviews}"`,
      );
    } else {
      protectionCmd.push(`-f "required_pull_request_reviews=null"`);
    }

    // Other settings
    protectionCmd.push(`-f "enforce_admins=${enforce_admins}"`);
    protectionCmd.push(`-f "restrictions=null"`);
    protectionCmd.push(`-f "allow_force_pushes=${allow_force_pushes}"`);
    protectionCmd.push(`-f "allow_deletions=${allow_deletions}"`);

    const fullCmd = protectionCmd.join(" \\\n  ");

    try {
      execSync(fullCmd, { stdio: "pipe" });
      steps.push(`✓ Enabled branch protection for '${branch}'`);

      if (require_status_checks) {
        steps.push(
          `✓ Required status checks: ${status_check_contexts.join(", ")}`,
        );
      }
      if (require_pr_reviews) {
        steps.push(
          `✓ Required PR reviews: ${required_approving_review_count} approvals`,
        );
      }
      if (enforce_admins) {
        steps.push("✓ Protection applies to administrators");
      }

      return createSuccessResponse(
        `Branch protection enabled for '${branch}'`,
        {
          branch,
          settings: {
            requireStatusChecks: require_status_checks,
            statusCheckContexts: status_check_contexts,
            requirePRReviews: require_pr_reviews,
            requiredApprovals: required_approving_review_count,
            enforceAdmins: enforce_admins,
          },
          steps,
          operation: "branch-protection-enable",
        },
      );
    } catch (error) {
      return createErrorResponse(
        `Failed to enable branch protection: ${error.message}`,
      );
    }
  } catch (error) {
    return createErrorResponse(
      `Branch protection operation failed: ${error.message}`,
    );
  }
}

/**
 * Get enhanced repository status with contextual information
 */
async function getEnhancedStatus({
  include_history = true,
  include_suggestions = true,
}) {
  if (!isGitRepository()) {
    return createErrorResponse("Not a git repository");
  }

  try {
    const session = sessionManager.get();
    const statusHistory = session.statusHistory || [];
    
    // Get current status
    const currentBranch = getCurrentBranch();
    const mainBranch = getMainBranch();
    const changedFiles = getChangedFiles();
    
    // Get branch divergence
    const [ahead, behind] = await Promise.all([
      execGitCommand(`git rev-list --count ${mainBranch}..HEAD`, { silent: true }).trim(),
      execGitCommand(`git rev-list --count HEAD..${mainBranch}`, { silent: true }).trim()
    ]);
    
    // Categorize changed files
    const fileChanges = {
      modified: [],
      added: [],
      deleted: [],
      untracked: []
    };
    
    changedFiles.forEach(({ status, file }) => {
      switch(status) {
        case 'M': fileChanges.modified.push(file); break;
        case 'A': fileChanges.added.push(file); break;
        case 'D': fileChanges.deleted.push(file); break;
        case '??': fileChanges.untracked.push(file); break;
      }
    });
    
    // Check for stash
    let stashCount = 0;
    try {
      const stashList = execGitCommand("git stash list", { silent: true });
      stashCount = stashList.split('\n').filter(line => line.trim()).length;
    } catch (e) {
      // Ignore stash errors
    }
    
    // Store current status in history
    const currentStatus = {
      date: new Date().toISOString(),
      branch: currentBranch,
      changedFiles: changedFiles.length,
      ahead: parseInt(ahead),
      behind: parseInt(behind)
    };
    
    statusHistory.push(currentStatus);
    if (statusHistory.length > 100) {
      statusHistory.shift();
    }
    
    sessionManager.update({ statusHistory });
    
    // Generate context
    const context = {
      branchStatus: {
        diverged: parseInt(ahead) > 0 && parseInt(behind) > 0,
        ahead: parseInt(ahead),
        behind: parseInt(behind),
        syncNeeded: parseInt(ahead) > 0 || parseInt(behind) > 0
      },
      fileChanges: {
        total: changedFiles.length,
        byType: {
          modified: fileChanges.modified.length,
          added: fileChanges.added.length,
          deleted: fileChanges.deleted.length,
          untracked: fileChanges.untracked.length
        }
      },
      stash: {
        count: stashCount,
        hasStash: stashCount > 0
      },
      suggestions: []
    };
    
    // Add history analysis if requested
    if (include_history && statusHistory.length > 1) {
      const recentHistory = statusHistory.slice(-10);
      const avgChangedFiles = recentHistory.reduce((sum, s) => sum + s.changedFiles, 0) / recentHistory.length;
      
      context.trends = {
        avgChangedFiles: avgChangedFiles.toFixed(1),
        branchSwitches: new Set(recentHistory.map(s => s.branch)).size,
        recentActivity: recentHistory.length
      };
    }
    
    // Generate suggestions
    if (include_suggestions) {
      if (context.branchStatus.diverged) {
        context.suggestions.push({
          type: 'sync',
          priority: 'high',
          message: `Branch has diverged from ${mainBranch}. Consider rebasing or merging.`,
          commands: [`git rebase ${mainBranch}`, `git merge ${mainBranch}`]
        });
      } else if (context.branchStatus.behind > 0) {
        context.suggestions.push({
          type: 'update',
          priority: 'medium',
          message: `Branch is ${context.branchStatus.behind} commits behind ${mainBranch}.`,
          tool: 'sync_branch'
        });
      }
      
      if (changedFiles.length > 0) {
        context.suggestions.push({
          type: 'commit',
          priority: 'medium',
          message: `You have ${changedFiles.length} uncommitted changes.`,
          tool: 'smart_commit'
        });
      }
      
      if (stashCount > 3) {
        context.suggestions.push({
          type: 'cleanup',
          priority: 'low',
          message: `You have ${stashCount} stashed changes. Consider reviewing them.`,
          tool: 'stash_operations'
        });
      }
      
      // Check recent operations for workflow suggestions
      const recentOps = session.recentOperations || [];
      const lastOp = recentOps[recentOps.length - 1];
      
      if (lastOp?.tool === 'github_flow_start') {
        const timeSince = Date.now() - new Date(lastOp.timestamp).getTime();
        if (timeSince > 3600000 && changedFiles.length > 0) { // 1 hour
          context.suggestions.push({
            type: 'workflow',
            priority: 'medium',
            message: 'You started a branch a while ago. Ready to create a PR?',
            tool: 'github_flow_finish'
          });
        }
      }
    }
    
    const metadata = {
      timestamp: new Date().toISOString(),
      sessionId: session.sessionId
    };
    
    return createSuccessResponse("Repository status retrieved", {
      currentBranch,
      mainBranch,
      hasUncommittedChanges: changedFiles.length > 0,
      fileChanges,
      stashCount,
      context,
      metadata
    });
  } catch (error) {
    return createErrorResponse(`Failed to get status: ${error.message}`);
  }
}

/**
 * Generate repository structure map
 */
async function generateRepoMap({
  max_depth = 3,
  show_hidden = false,
  sort_by = "name"
}) {
  if (!isGitRepository()) {
    return createErrorResponse("Not a git repository");
  }

  try {
    const rootPath = process.cwd();
    const tree = await buildDirectoryTree(rootPath, 0, max_depth, show_hidden);
    
    // Sort tree based on criteria
    sortTree(tree, sort_by);
    
    // Generate visual representation
    const visualization = generateTreeVisualization(tree);
    
    // Calculate summary statistics
    const stats = calculateTreeStats(tree);
    
    const context = {
      insights: [],
      suggestions: []
    };
    
    // Add insights
    if (stats.maxDepth > 5) {
      context.insights.push('Deep directory nesting detected. Consider flattening structure.');
    }
    
    if (stats.largestDir.fileCount > 50) {
      context.insights.push(`${stats.largestDir.name} contains ${stats.largestDir.fileCount} files. Consider splitting.`);
    }
    
    const metadata = {
      timestamp: new Date().toISOString(),
      rootPath,
      maxDepth: max_depth
    };
    
    return createSuccessResponse("Repository map generated", {
      visualization,
      stats,
      context,
      metadata
    });
  } catch (error) {
    return createErrorResponse(`Failed to generate repo map: ${error.message}`);
  }
}

/**
 * Search for TODO comments
 */
async function searchTodos({
  patterns = ["TODO", "FIXME", "HACK", "XXX", "OPTIMIZE", "REFACTOR"],
  group_by_type = true
}) {
  if (!isGitRepository()) {
    return createErrorResponse("Not a git repository");
  }

  try {
    const results = [];
    
    // Build grep pattern
    const pattern = patterns.join('\\|');
    const grepCommand = `git grep -n -i "${pattern}" || true`;
    
    const output = execGitCommand(grepCommand, { silent: true });
    if (!output.trim()) {
      return createSuccessResponse("No TODOs found", { results: [] });
    }
    
    // Parse results
    output.split('\n').filter(line => line.trim()).forEach(line => {
      const match = line.match(/^([^:]+):(\d+):(.*)$/);
      if (match) {
        const [, file, lineNum, content] = match;
        
        // Identify which pattern matched
        let matchedPattern = null;
        for (const p of patterns) {
          if (content.toUpperCase().includes(p)) {
            matchedPattern = p;
            break;
          }
        }
        
        results.push({
          file,
          line: parseInt(lineNum),
          pattern: matchedPattern,
          content: content.trim()
        });
      }
    });
    
    // Group by type if requested
    let organized = results;
    if (group_by_type) {
      organized = {};
      patterns.forEach(p => { organized[p] = []; });
      
      results.forEach(r => {
        if (organized[r.pattern]) {
          organized[r.pattern].push(r);
        }
      });
      
      // Remove empty groups
      Object.keys(organized).forEach(key => {
        if (organized[key].length === 0) delete organized[key];
      });
    }
    
    // Generate summary
    const summary = {
      total: results.length,
      byType: {}
    };
    
    patterns.forEach(p => {
      const count = results.filter(r => r.pattern === p).length;
      if (count > 0) summary.byType[p] = count;
    });
    
    const context = {
      suggestions: []
    };
    
    if (results.length > 50) {
      context.suggestions.push({
        type: 'maintenance',
        priority: 'medium',
        message: `Found ${results.length} TODO comments. Consider addressing technical debt.`
      });
    }
    
    if (summary.byType.FIXME > 10) {
      context.suggestions.push({
        type: 'quality',
        priority: 'high',
        message: `${summary.byType.FIXME} FIXME comments found. These may indicate bugs.`
      });
    }
    
    const metadata = {
      timestamp: new Date().toISOString(),
      patterns: patterns
    };
    
    return createSuccessResponse("TODO search completed", {
      results: organized,
      summary,
      context,
      metadata
    });
  } catch (error) {
    return createErrorResponse(`Failed to search TODOs: ${error.message}`);
  }
}

/**
 * Check project dependencies
 */
async function checkDependencies({
  check_updates = true,
  check_security = true
}) {
  if (!fs.existsSync('package.json')) {
    return createErrorResponse("No package.json found");
  }

  try {
    const results = {
      updates: null,
      security: null,
      unused: null
    };
    
    // Check for updates
    if (check_updates) {
      try {
        const outdated = execSync('npm outdated --json', { encoding: 'utf8', stdio: 'pipe' });
        results.updates = JSON.parse(outdated || '{}');
      } catch (e) {
        // npm outdated exits with error if packages are outdated
        if (e.stdout) {
          try {
            results.updates = JSON.parse(e.stdout);
          } catch (parseError) {
            results.updates = { error: 'Could not parse outdated packages' };
          }
        }
      }
    }
    
    // Check security
    if (check_security) {
      try {
        const audit = execSync('npm audit --json', { encoding: 'utf8', stdio: 'pipe' });
        results.security = JSON.parse(audit);
      } catch (e) {
        if (e.stdout) {
          try {
            results.security = JSON.parse(e.stdout);
          } catch (parseError) {
            results.security = { error: 'Could not parse security audit' };
          }
        }
      }
    }
    
    // Generate analysis
    const analysis = {
      outdated: 0,
      vulnerable: 0,
      suggestions: []
    };
    
    if (results.updates && typeof results.updates === 'object') {
      analysis.outdated = Object.keys(results.updates).length;
    }
    
    if (results.security?.metadata) {
      analysis.vulnerable = results.security.metadata.vulnerabilities.total || 0;
    }
    
    // Generate suggestions
    if (analysis.vulnerable > 0) {
      analysis.suggestions.push({
        type: 'security',
        priority: 'critical',
        message: `${analysis.vulnerable} vulnerabilities found. Run npm audit fix.`,
        command: 'npm audit fix'
      });
    }
    
    if (analysis.outdated > 10) {
      analysis.suggestions.push({
        type: 'maintenance',
        priority: 'medium',
        message: `${analysis.outdated} outdated packages. Consider updating.`,
        command: 'npm update'
      });
    }
    
    const metadata = {
      timestamp: new Date().toISOString()
    };
    
    return createSuccessResponse("Dependency check completed", {
      results,
      analysis,
      metadata
    });
  } catch (error) {
    return createErrorResponse(`Failed to check dependencies: ${error.message}`);
  }
}

// Helper functions
function categorizeRepoSize(fileCount) {
  if (fileCount < 100) return 'small';
  if (fileCount < 1000) return 'medium';
  if (fileCount < 5000) return 'large';
  return 'very-large';
}

function analyzeBranchHealth(branches) {
  if (!branches || branches.error) return 'unknown';
  
  const staleRatio = branches.stale / branches.total;
  if (staleRatio > 0.5) return 'poor';
  if (staleRatio > 0.3) return 'fair';
  return 'good';
}

function generateCodebaseInsights(info) {
  const insights = [];
  
  if (info.quality?.testing?.testFileCount > 0) {
    const testRatio = info.quality.testing.testFileCount / info.statistics?.fileCount || 0;
    insights.push(`Test coverage ratio: ${(testRatio * 100).toFixed(1)}%`);
  }
  
  if (info.quality?.documentation?.hasReadme) {
    insights.push('Project has README documentation');
  }
  
  if (info.statistics?.contributors?.length > 5) {
    insights.push(`Active collaborative project with ${info.statistics.contributors.length} contributors`);
  }
  
  return insights;
}

async function buildDirectoryTree(dirPath, currentDepth, maxDepth, showHidden) {
  if (currentDepth >= maxDepth) return null;
  
  const stats = {
    name: path.basename(dirPath),
    path: dirPath,
    type: 'directory',
    children: [],
    fileCount: 0,
    totalSize: 0
  };
  
  try {
    const items = fs.readdirSync(dirPath);
    
    for (const item of items) {
      if (!showHidden && item.startsWith('.')) continue;
      if (item === 'node_modules' || item === '.git') continue;
      
      const itemPath = path.join(dirPath, item);
      const itemStats = fs.statSync(itemPath);
      
      if (itemStats.isDirectory()) {
        const subTree = await buildDirectoryTree(itemPath, currentDepth + 1, maxDepth, showHidden);
        if (subTree) {
          stats.children.push(subTree);
          stats.fileCount += subTree.fileCount;
          stats.totalSize += subTree.totalSize;
        }
      } else {
        stats.fileCount++;
        stats.totalSize += itemStats.size;
      }
    }
  } catch (e) {
    // Ignore permission errors
  }
  
  return stats;
}

function sortTree(tree, sortBy) {
  if (!tree || !tree.children) return;
  
  tree.children.sort((a, b) => {
    switch(sortBy) {
      case 'size': return b.totalSize - a.totalSize;
      case 'files': return b.fileCount - a.fileCount;
      default: return a.name.localeCompare(b.name);
    }
  });
  
  tree.children.forEach(child => sortTree(child, sortBy));
}

function generateTreeVisualization(tree, prefix = '', isLast = true) {
  if (!tree) return '';
  
  let result = prefix;
  result += isLast ? '└── ' : '├── ';
  result += `${tree.name}`;
  
  if (tree.type === 'directory') {
    result += ` (${tree.fileCount} files, ${formatSize(tree.totalSize)})`;
  }
  
  result += '\n';
  
  if (tree.children) {
    const childPrefix = prefix + (isLast ? '    ' : '│   ');
    tree.children.forEach((child, index) => {
      const isLastChild = index === tree.children.length - 1;
      result += generateTreeVisualization(child, childPrefix, isLastChild);
    });
  }
  
  return result;
}

function calculateTreeStats(tree) {
  let maxDepth = 0;
  let totalFiles = 0;
  let totalSize = 0;
  let largestDir = { name: '', fileCount: 0 };
  
  function traverse(node, depth = 0) {
    maxDepth = Math.max(maxDepth, depth);
    totalFiles += node.fileCount || 0;
    totalSize += node.totalSize || 0;
    
    if (node.fileCount > largestDir.fileCount) {
      largestDir = { name: node.path, fileCount: node.fileCount };
    }
    
    if (node.children) {
      node.children.forEach(child => traverse(child, depth + 1));
    }
  }
  
  traverse(tree);
  
  return { maxDepth, totalFiles, totalSize, largestDir };
}

function formatSize(bytes) {
  const units = ['B', 'KB', 'MB', 'GB'];
  let size = bytes;
  let unitIndex = 0;
  
  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex++;
  }
  
  return `${size.toFixed(1)}${units[unitIndex]}`;
}

// Export individual functions for CLI usage
export {
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
  createNpmPackage,
  cleanupMergedBranches,
  branchProtection,
  getEnhancedStatus,
  generateRepoMap,
  searchTodos,
  checkDependencies,
};

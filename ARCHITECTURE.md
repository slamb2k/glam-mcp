# Slambed MCP Server - Comprehensive Architecture Documentation

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [Architecture Overview](#architecture-overview)
3. [Complete Command Reference](#complete-command-reference)
4. [Core Design Patterns](#core-design-patterns)
5. [Module Architecture](#module-architecture)
6. [Data Flow and State Management](#data-flow-and-state-management)
7. [Workflow Optimizations](#workflow-optimizations)
8. [Error Handling Architecture](#error-handling-architecture)
9. [Configuration Management](#configuration-management)
10. [Extension Points and Plugin Architecture](#extension-points-and-plugin-architecture)
11. [Testing Strategy](#testing-strategy)
12. [Performance Considerations](#performance-considerations)
13. [Security Architecture](#security-architecture)
14. [Maintenance Guidelines](#maintenance-guidelines)
15. [Refactoring Considerations](#refactoring-considerations)

---

## Executive Summary

Slambed is a **hexagonal architecture** implementation providing git automation through dual interfaces:

- **MCP Server** for AI assistants (Claude, etc.)
- **CLI** for human developers

### Key Architectural Decisions

1. **Shared Business Logic** - Core logic is interface-agnostic
2. **Stateless Design** - No persistent state between invocations
3. **Fail-Safe Operations** - All operations can be rolled back
4. **Progressive Enhancement** - Basic features work offline, advanced features require network

### Technology Stack

- **Runtime**: Node.js 18+ (ES Modules)
- **MCP SDK**: `@modelcontextprotocol/sdk` v1.15.0
- **CLI Framework**: Commander.js v11.1.0
- **Git Operations**: Direct shell execution via `child_process`
- **Interactive UI**: Inquirer.js v9.2.12

---

## Architecture Overview

### Layered Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    User Interfaces                          │
├─────────────────────┬───────────────────────────────────────┤
│   MCP Protocol      │         CLI Commands                  │
│   (src/index.js)    │     (bin/slambed.js, etc.)          │
├─────────────────────┴───────────────────────────────────────┤
│                 Interface Adapters                          │
│          (Request/Response Translation)                     │
├─────────────────────────────────────────────────────────────┤
│                  Business Logic                             │
│              (src/tools/*.js)                               │
├─────────────────────────────────────────────────────────────┤
│                 Domain Services                             │
│            (src/utils/git-helpers.js)                       │
├─────────────────────────────────────────────────────────────┤
│              Infrastructure Layer                           │
│        (File System, Git CLI, Network)                      │
└─────────────────────────────────────────────────────────────┘
```

### Component Responsibilities

| Component          | File(s)                    | Responsibility                     | Dependencies        |
| ------------------ | -------------------------- | ---------------------------------- | ------------------- |
| **MCP Server**     | `src/index.js`             | Protocol handling, tool discovery  | MCP SDK             |
| **CLI Binaries**   | `bin/*.js`                 | Argument parsing, user interaction | Commander, Inquirer |
| **Tool Modules**   | `src/tools/*.js`           | Business logic implementation      | Utils, Config       |
| **Git Helpers**    | `src/utils/git-helpers.js` | Git command abstraction            | child_process       |
| **Response Utils** | `src/utils/responses.js`   | Response standardization           | None                |
| **Config**         | `src/config.js`            | Configuration management           | fs, path            |

---

## Complete Command Reference

### GitHub Flow Tools (8 tools)

| MCP Tool Name           | CLI Command                 | Aliases                  | Description                     | Required Params                 | Optional Params                                                |
| ----------------------- | --------------------------- | ------------------------ | ------------------------------- | ------------------------------- | -------------------------------------------------------------- |
| `github_flow_start`     | `slambed flow start <name>` | `slambed feature <name>` | Start new branch from main      | `name`                          | `type`, `allow_outdated_base`                                  |
| `github_flow_finish`    | `slambed flow finish`       | `slambed pr`             | Create PR from current branch   | -                               | `title`, `description`, `draft`, `auto_merge`, `delete_branch` |
| `github_flow_quick`     | `slambed flow quick <name>` | -                        | Complete flow: branch→commit→PR | `branch_name`, `commit_message` | `pr_title`, `pr_description`, `type`, `auto_merge`             |
| `github_flow_create_pr` | `slambed flow create-pr`    | `slambed pr`             | Create PR for current branch    | -                               | `title`, `description`, `draft`                                |
| `github_flow_merge_pr`  | `slambed flow merge <pr>`   | -                        | Merge a pull request            | -                               | `pr_number`, `merge_method`, `delete_branch`                   |
| `github_flow_sync`      | `slambed flow sync`         | `slambed sync`           | Sync current branch with main   | -                               | `strategy` (merge/rebase)                                      |
| `github_flow_cleanup`   | `slambed flow cleanup`      | -                        | Delete merged branches          | -                               | `force`                                                        |
| `github_flow_status`    | `slambed flow status`       | `slambed status`         | Show repository status          | -                               | -                                                              |

### Automation Tools (11 tools)

| MCP Tool Name             | CLI Command                            | Aliases           | Description                     | Required Params | Optional Params                                                                                                             |
| ------------------------- | -------------------------------------- | ----------------- | ------------------------------- | --------------- | --------------------------------------------------------------------------------------------------------------------------- |
| `auto_commit`             | `slambed auto commit`                  | `slambed done`    | Full automation workflow        | -               | `message`, `branch_name`, `auto_merge`, `delete_branch`, `run_format`, `run_lint`, `target_branch`, `branch_prefix`         |
| `quick_commit`            | `slambed auto quick`                   | `slambed commit`  | Fast commit with AI message     | -               | `message`, `run_format`, `auto_merge`                                                                                       |
| `smart_commit`            | `slambed auto smart`                   | -                 | Analyze and suggest commits     | -               | `execute`                                                                                                                   |
| `sync_branch`             | `slambed auto sync`                    | -                 | Sync with target branch         | -               | `target_branch`                                                                                                             |
| `squash_commits`          | `slambed auto squash`                  | -                 | Squash multiple commits         | -               | `count`, `message`                                                                                                          |
| `undo_commit`             | `slambed auto undo`                    | -                 | Undo last commit                | -               | `hard`                                                                                                                      |
| `batch_commit`            | `slambed auto batch`                   | -                 | Multiple logical commits        | `groups`        | `push`                                                                                                                      |
| `init_project`            | `slambed init-project`                 | -                 | Complete project setup          | -               | `project_name`, `description`, `author`, `license`, `template_type`, `repo_visibility`, `enable_branch_protection`          |
| `npm_publish`             | `slambed auto publish`                 | `slambed publish` | NPM publishing workflow         | -               | `version_type`, `custom_version`, `tag`, `run_tests`, `run_build`, `run_lint`, `create_release`, `auto_merge_pr`, `dry_run` |
| `create_pr_workflow`      | `slambed auto create-pr-workflow`      | -                 | Create GitHub Actions PR checks | -               | `workflow_name`, `node_version`, `include_lint`, `include_test`, `include_build`, `include_type_check`                      |
| `create_release_workflow` | `slambed auto create-release-workflow` | -                 | Create release automation       | -               | `workflow_name`, `node_version`, `release_type`, `auto_version_bump`, `version_bump_type`, `create_changelog`               |

### Utility Tools (12 tools)

| MCP Tool Name        | CLI Command                   | Aliases | Description              | Required Params | Optional Params                                                                                                     |
| -------------------- | ----------------------------- | ------- | ------------------------ | --------------- | ------------------------------------------------------------------------------------------------------------------- |
| `repo_info`          | `slambed util info`           | -       | Repository information   | -               | `include_stats`, `include_branches`, `include_commits`                                                              |
| `analyze_changes`    | `slambed util analyze`        | -       | Analyze current changes  | -               | `detailed`                                                                                                          |
| `list_branches`      | `slambed util branches`       | -       | List all branches        | -               | `include_remote`, `merged_only`                                                                                     |
| `commit_history`     | `slambed util history`        | -       | Show commit history      | -               | `count`, `author`, `since`, `grep`                                                                                  |
| `git_file_status`    | `slambed util file-status`    | -       | Detailed file status     | -               | `path`                                                                                                              |
| `show_diff`          | `slambed util diff`           | -       | Show differences         | -               | `target`, `staged`, `stat`                                                                                          |
| `search_code`        | `slambed util search`         | -       | Search in codebase       | `pattern`       | `file_pattern`, `all_history`                                                                                       |
| `tag_operations`     | `slambed util tag`            | -       | Manage git tags          | `operation`     | `tag_name`, `message`, `commit`                                                                                     |
| `stash_operations`   | `slambed util stash`          | -       | Manage stashes           | `operation`     | `message`, `index`                                                                                                  |
| `repo_health_check`  | `slambed util health`         | -       | Repository health check  | -               | `fix_issues`                                                                                                        |
| `create_npm_package` | `slambed util create-package` | -       | Create NPM package       | -               | `package_name`, `description`, `author`, `license`, `version`, `entry_point`                                        |
| `branch_protection`  | `slambed protection <op>`     | -       | Manage branch protection | `operation`     | `branch`, `require_pr_reviews`, `require_status_checks`, `status_check_contexts`, `required_approving_review_count` |

### CLI-Exclusive Commands

| Command               | Description                   | Example           | Context-Aware |
| --------------------- | ----------------------------- | ----------------- | ------------- |
| `slambed`             | Interactive mode              | `slambed`         | ✅ Yes        |
| `slambed --quick`     | Auto-execute suggested action | `slambed --quick` | ✅ Yes        |
| `slambed interactive` | Force interactive mode        | `slambed i`       | ✅ Yes        |
| `slambed <alias>`     | Execute user alias            | `slambed ship`    | ❌ No         |

---

## Core Design Patterns

### 1. Hexagonal Architecture (Ports & Adapters)

```javascript
// Port (Interface)
export interface Tool {
  name: string;
  description: string;
  inputSchema: JSONSchema;
  handler: (params: any) => Promise<ToolResponse>;
}

// Adapter (MCP)
class MCPAdapter {
  adaptTool(tool: Tool) {
    return {
      ...tool,
      handler: async (params) => {
        const result = await tool.handler(params);
        return this.formatForMCP(result);
      }
    };
  }
}

// Adapter (CLI)
class CLIAdapter {
  adaptTool(tool: Tool) {
    return async (options: CommanderOptions) => {
      const params = this.parseOptions(options);
      const result = await tool.handler(params);
      this.displayResult(result);
    };
  }
}
```

### 2. Command Pattern

Each tool implements the command pattern:

```javascript
// Command interface
class GitCommand {
  validate() {
    /* preconditions */
  }
  execute() {
    /* main logic */
  }
  rollback() {
    /* undo logic */
  }
}

// Concrete command
class StartBranchCommand extends GitCommand {
  constructor(name, type) {
    this.name = name;
    this.type = type;
  }

  validate() {
    if (!isGitRepository()) throw new Error("Not a git repo");
    if (branchExists(this.name)) throw new Error("Branch exists");
  }

  execute() {
    const branch = `${this.type}/${this.name}`;
    execGitCommand(`git checkout -b ${branch}`);
    return { branch };
  }

  rollback() {
    execGitCommand(`git checkout main`);
    execGitCommand(`git branch -D ${this.branch}`);
  }
}
```

### 3. Factory Pattern for Response Creation

```javascript
// Response factory
class ResponseFactory {
  static success(message, data = {}) {
    return {
      success: true,
      message,
      data,
      timestamp: new Date().toISOString(),
    };
  }

  static error(message, error = null) {
    return {
      success: false,
      message,
      error: error?.message || error,
      timestamp: new Date().toISOString(),
    };
  }
}
```

### 4. Strategy Pattern for Git Operations

```javascript
// Strategy interface
class SyncStrategy {
  sync(branch, target) {
    /* abstract */
  }
}

// Concrete strategies
class RebaseSyncStrategy extends SyncStrategy {
  sync(branch, target) {
    execGitCommand(`git rebase ${target}`);
  }
}

class MergeSyncStrategy extends SyncStrategy {
  sync(branch, target) {
    execGitCommand(`git merge ${target}`);
  }
}

// Context
class BranchSynchronizer {
  constructor(strategy) {
    this.strategy = strategy;
  }

  sync(branch, target) {
    return this.strategy.sync(branch, target);
  }
}
```

---

## Module Architecture

### Tool Module Structure

```
src/tools/
├── github-flow.js
│   ├── registerGitHubFlowTools()    # MCP registration
│   ├── startBranch()                # Core logic
│   ├── finishBranch()
│   ├── quickWorkflow()
│   └── ... (8 functions total)
│
├── automation.js
│   ├── registerAutomationTools()    # MCP registration
│   ├── autoCommit()                 # Core logic
│   ├── quickCommit()
│   ├── npmPublish()
│   └── ... (11 functions total)
│
└── utilities.js
    ├── registerUtilityTools()       # MCP registration
    ├── getRepoInfo()                # Core logic
    ├── analyzeChanges()
    ├── branchProtection()
    └── ... (12 functions total)
```

### Dependency Graph

```
┌─────────────┐     ┌──────────────┐     ┌─────────────┐
│   bin/*.js  │────▶│ src/tools/*  │────▶│ src/utils/* │
└─────────────┘     └──────────────┘     └─────────────┘
       │                    ▲                     │
       │                    │                     │
       ▼                    │                     ▼
┌─────────────┐     ┌──────────────┐     ┌─────────────┐
│ commander   │     │ src/index.js │     │ child_process│
└─────────────┘     └──────────────┘     └─────────────┘
                            │
                            ▼
                    ┌──────────────┐
                    │   MCP SDK    │
                    └──────────────┘
```

### Module Coupling Analysis

| Module           | Afferent Coupling | Efferent Coupling | Stability         |
| ---------------- | ----------------- | ----------------- | ----------------- |
| `git-helpers.js` | 3 (all tools)     | 1 (child_process) | 0.75 (stable)     |
| `responses.js`   | 4 (tools + index) | 0                 | 1.0 (very stable) |
| `config.js`      | 3 (all tools)     | 2 (fs, path)      | 0.6 (stable)      |
| `github-flow.js` | 2 (index, bin)    | 3 (utils, config) | 0.4 (flexible)    |

---

## Data Flow and State Management

### Request Flow (MCP)

```
1. MCP Client Request
   │
   ├─▶ StdioServerTransport
   │     │
   │     └─▶ Server.handleRequest()
   │           │
   │           ├─▶ Tool Lookup
   │           │
   │           ├─▶ Parameter Validation
   │           │
   │           ├─▶ Tool Handler Execution
   │           │     │
   │           │     ├─▶ Git Operations
   │           │     │
   │           │     └─▶ Response Creation
   │           │
   │           └─▶ MCP Response Formatting
   │
   └─▶ MCP Client Response
```

### Request Flow (CLI)

```
1. User Command
   │
   ├─▶ Commander.parse()
   │     │
   │     ├─▶ Alias Resolution
   │     │
   │     ├─▶ Context Detection (optional)
   │     │
   │     ├─▶ Interactive Prompts (if needed)
   │     │
   │     └─▶ Tool Function Call
   │           │
   │           ├─▶ Parameter Mapping
   │           │
   │           ├─▶ Tool Handler Execution
   │           │     │
   │           │     └─▶ (Same as MCP)
   │           │
   │           └─▶ Console Output
   │
   └─▶ Process Exit
```

### State Management

**Stateless Design Principles:**

1. **No Persistent State** - Each invocation is independent
2. **Configuration Loaded Fresh** - Config read on each operation
3. **Git State as Source of Truth** - Always query git for current state
4. **Idempotent Operations** - Running twice produces same result

```javascript
// Example: Stateless branch creation
async function startBranch(name, type) {
  // Fresh state queries
  const currentBranch = getCurrentBranch(); // Query git
  const mainBranch = getMainBranch(); // Query git/config
  const exists = branchExists(name); // Query git

  // Operation based on current state
  if (exists) {
    return createErrorResponse("Branch exists");
  }

  // Modify state
  execGitCommand(`git checkout -b ${type}/${name}`);

  // Return result (no state stored)
  return createSuccessResponse("Branch created");
}
```

---

## Workflow Optimizations

### 1. Feature Development Workflow

**Traditional Approach (10-15 steps):**

```bash
# 1. Switch to main
git checkout main

# 2. Update main
git pull origin main

# 3. Create feature branch
git checkout -b feature/user-auth

# 4. Make changes
# ... edit files ...

# 5. Stage changes
git add .

# 6. Commit
git commit -m "Add user authentication"

# 7. Push branch
git push -u origin feature/user-auth

# 8. Create PR (via web or CLI)
gh pr create --title "Add user authentication" --body "..."

# 9. Wait for checks
# ... manual monitoring ...

# 10. Merge PR
gh pr merge --auto --squash

# 11. Switch back to main
git checkout main

# 12. Pull updates
git pull origin main

# 13. Delete local branch
git branch -d feature/user-auth

# 14. Delete remote branch
git push origin --delete feature/user-auth
```

**Slambed Optimization (1 command):**

```bash
slambed auto commit -m "Add user authentication"
```

**Time Savings:** ~90% reduction (from ~5 minutes to ~30 seconds)

### 2. Quick Fix Workflow

**Context-Aware Automation:**

```javascript
// Slambed detects:
// - You're on main
// - You have uncommitted changes
// - Changes are in a single module

slambed --quick
// Automatically:
// 1. Creates fix/module-name-fix branch
// 2. Commits with AI-generated message
// 3. Pushes and creates PR
// 4. Enables auto-merge
// 5. Returns to main after merge
```

### 3. Release Workflow

**Traditional NPM Release (15+ steps):**

```bash
# Manual version bump, changelog, build, test, publish, tag, PR...
```

**Slambed Release (1 command):**

```bash
slambed publish --version minor
```

**Automated Steps:**

1. ✅ Run tests
2. ✅ Run linting
3. ✅ Build project
4. ✅ Bump version
5. ✅ Generate changelog
6. ✅ Create release branch
7. ✅ Commit changes
8. ✅ Create tag
9. ✅ Publish to NPM
10. ✅ Create GitHub release
11. ✅ Create PR
12. ✅ Auto-merge
13. ✅ Cleanup branches

### 4. Multi-Developer Workflow

**Conflict Prevention:**

```javascript
// Before creating branch
slambed flow start feature-x
// Automatically:
// - Fetches latest main
// - Checks for conflicts
// - Warns about stale base
// - Updates if possible
```

### 5. Code Review Workflow

**Automated PR Creation:**

```javascript
slambed pr
// Generates:
// - PR title from branch name
// - Description from commits
// - Adds labels based on changes
// - Links related issues
// - Assigns reviewers
```

---

## Error Handling Architecture

### Error Classification

```javascript
class ErrorTypes {
  static VALIDATION = "VALIDATION_ERROR"; // User input issues
  static GIT_STATE = "GIT_STATE_ERROR"; // Repository state issues
  static GIT_OPERATION = "GIT_OPERATION_ERROR"; // Git command failures
  static NETWORK = "NETWORK_ERROR"; // GitHub API issues
  static PERMISSION = "PERMISSION_ERROR"; // Access issues
  static CONFIGURATION = "CONFIGURATION_ERROR"; // Config problems
}
```

### Error Handling Layers

```
┌─────────────────────────────────┐
│      User Input Layer           │ ← Validation errors
├─────────────────────────────────┤
│      Business Logic Layer       │ ← State errors
├─────────────────────────────────┤
│      Git Operations Layer       │ ← Command errors
├─────────────────────────────────┤
│      Network Layer              │ ← API errors
└─────────────────────────────────┘
```

### Error Recovery Strategies

| Error Type    | Recovery Strategy        | Example                       |
| ------------- | ------------------------ | ----------------------------- |
| Validation    | Prompt for correct input | "Branch name required"        |
| Git State     | Suggest resolution       | "Uncommitted changes, stash?" |
| Git Operation | Rollback and retry       | "Merge conflict, resolve?"    |
| Network       | Offline mode or retry    | "GitHub unreachable, retry?"  |
| Permission    | Guide to fix             | "Branch protected, see admin" |

### Error Response Examples

```javascript
// Validation Error
{
  success: false,
  message: "Branch name 'main' is reserved",
  error: "VALIDATION_ERROR",
  suggestion: "Use a different branch name",
  timestamp: "2024-01-07T10:00:00Z"
}

// Git State Error
{
  success: false,
  message: "Cannot create PR: uncommitted changes",
  error: "GIT_STATE_ERROR",
  suggestion: "Commit or stash changes first",
  recovery: ["slambed commit", "git stash"],
  timestamp: "2024-01-07T10:00:00Z"
}
```

---

## Configuration Management

### Configuration Loading Pipeline

```
1. Built-in Defaults
   │
   ├─▶ System Config (~/.config/slambed/config.json)
   │     │
   │     ├─▶ User Config (~/.slambed.json)
   │     │     │
   │     │     ├─▶ Project Config (.slambed.json)
   │     │     │     │
   │     │     │     └─▶ Environment Variables (SLAMBED_*)
   │     │     │           │
   │     │     │           └─▶ Runtime Overrides
   │     │     │
   │     │     └─▶ Merged Configuration
   │     │
   │     └─▶ Validation
   │
   └─▶ Active Configuration
```

### Configuration Schema (Full)

```typescript
interface SlambedConfig {
  // Git Flow Settings
  gitFlow: {
    defaultBranch: string; // "main" | "master" | custom
    branchPrefixes: {
      feature: string; // "feature/"
      fix: string; // "fix/"
      docs: string; // "docs/"
      chore: string; // "chore/"
      release: string; // "release/"
      hotfix: string; // "hotfix/"
    };
    autoMerge: boolean; // Enable auto-merge on PRs
    deleteAfterMerge: boolean; // Delete branch after merge
    squashMerge: boolean; // Use squash merging
    allowOutdatedBase: boolean; // Allow ops on outdated base
    requireStatusChecks: boolean; // Require CI passes
    protectedBranches: string[]; // Branches to protect
  };

  // Automation Settings
  automation: {
    runFormat: boolean; // Run formatter
    runLint: boolean; // Run linter
    runTests: boolean; // Run tests
    runBuild: boolean; // Run build
    createPR: boolean; // Auto-create PRs
    prTemplate: string; // PR template name
    commitFormat: {
      type: "conventional" | "simple"; // Commit message format
      scopes: string[]; // Allowed scopes
      maxLength: number; // Max message length
    };
    hooks: {
      preCommit: string; // Pre-commit command
      postCommit: string; // Post-commit command
      prePush: string; // Pre-push command
    };
  };

  // Branch Naming
  branchNaming: {
    maxLength: number; // Max branch name length
    includeDate: boolean; // Add date to branch
    dateFormat: string; // Date format
    includeTicket: boolean; // Include ticket number
    ticketPattern: string; // Ticket regex pattern
    sanitization: {
      replaceSpaces: boolean; // Replace spaces
      toLowerCase: boolean; // Convert to lowercase
      removeSpecialChars: boolean; // Remove special chars
      allowedChars: string; // Allowed characters
    };
  };

  // NPM Settings
  npm: {
    registry: string; // NPM registry URL
    tag: string; // Default publish tag
    access: "public" | "restricted"; // Package access
    otp: boolean; // Require OTP
  };

  // GitHub Settings
  github: {
    apiUrl: string; // GitHub API URL
    owner: string; // Repo owner
    repo: string; // Repo name
    defaultReviewers: string[]; // Default PR reviewers
    labels: {
      feature: string; // Feature label
      bug: string; // Bug label
      documentation: string; // Docs label
    };
  };

  // UI Settings
  ui: {
    banner: "full" | "compact" | "none"; // Banner display
    colors: boolean; // Enable colors
    emoji: boolean; // Enable emoji
    progressBars: boolean; // Show progress
    confirmations: boolean; // Require confirmations
  };
}
```

### Environment Variable Mapping

```bash
# Git Flow
SLAMBED_GIT_FLOW_DEFAULT_BRANCH=develop
SLAMBED_GIT_FLOW_AUTO_MERGE=false
SLAMBED_GIT_FLOW_ALLOW_OUTDATED_BASE=true

# Automation
SLAMBED_AUTOMATION_RUN_TESTS=true
SLAMBED_AUTOMATION_RUN_FORMAT=false
SLAMBED_AUTOMATION_COMMIT_FORMAT_TYPE=conventional

# NPM
SLAMBED_NPM_REGISTRY=https://custom.registry.com
SLAMBED_NPM_TAG=beta

# UI
SLAMBED_UI_BANNER=none
SLAMBED_UI_COLORS=false
```

---

## Extension Points and Plugin Architecture

### Current Extension Points

1. **Tool Registration**

   ```javascript
   // Add custom tool module
   export function registerCustomTools(server) {
     server.addTool({
       name: "custom_tool",
       description: "My custom tool",
       inputSchema: {
         /* ... */
       },
       handler: async (params) => {
         /* ... */
       },
     });
   }
   ```

2. **Git Helpers**

   ```javascript
   // Extend git operations
   export function customGitOperation(params) {
     return execGitCommand("git custom", {
       silent: true,
       cwd: params.path,
     });
   }
   ```

3. **Configuration Providers**

   ```javascript
   // Add custom config source
   class DatabaseConfigProvider {
     async loadConfig() {
       const config = await db.query("SELECT * FROM config");
       return transformToSlambedConfig(config);
     }
   }
   ```

4. **Response Formatters**
   ```javascript
   // Custom output format
   class JsonLinesFormatter {
     format(response) {
       return JSON.stringify(response) + "\n";
     }
   }
   ```

### Future Plugin Architecture

```javascript
// Proposed plugin interface
interface SlambedPlugin {
  name: string;
  version: string;

  // Lifecycle hooks
  onLoad?(context: PluginContext): void;
  onUnload?(): void;

  // Extension points
  tools?: Tool[];
  commands?: CLICommand[];
  configProviders?: ConfigProvider[];
  gitHelpers?: GitHelper[];
  formatters?: ResponseFormatter[];

  // Event handlers
  onBeforeCommand?(command: string, args: any): void;
  onAfterCommand?(command: string, result: any): void;
  onError?(error: Error): void;
}

// Plugin loading
class PluginManager {
  loadPlugin(path: string) {
    const plugin = require(path);
    this.validatePlugin(plugin);
    this.registerPlugin(plugin);
  }
}
```

---

## Testing Strategy

### Test Architecture

```
test/
├── test-runner.js          # Custom test framework
├── unit/                   # Unit tests
│   ├── git-helpers.test.js
│   ├── responses.test.js
│   └── config.test.js
├── integration/            # Integration tests
│   ├── mcp-server.test.js
│   ├── cli-commands.test.js
│   └── workflows.test.js
└── fixtures/               # Test data
    ├── repos/
    └── configs/
```

### Test Categories

| Category        | Scope            | Speed      | Dependencies | When to Run |
| --------------- | ---------------- | ---------- | ------------ | ----------- |
| **Unit**        | Single function  | Fast (ms)  | Mocked       | Every save  |
| **Integration** | Multiple modules | Medium (s) | Real git     | Pre-commit  |
| **E2E**         | Full workflows   | Slow (min) | Real GitHub  | Pre-release |
| **Smoke**       | Critical paths   | Fast (s)   | Minimal      | Post-deploy |

### Test Patterns

```javascript
// Unit Test Pattern
describe("git-helpers", () => {
  let mockExec;

  beforeEach(() => {
    mockExec = jest.fn();
    jest.mock("child_process", { execSync: mockExec });
  });

  test("getCurrentBranch returns branch name", () => {
    mockExec.mockReturnValue("feature/test\n");
    expect(getCurrentBranch()).toBe("feature/test");
  });
});

// Integration Test Pattern
describe("github-flow", () => {
  let testRepo;

  beforeEach(async () => {
    testRepo = await createTestRepo();
  });

  afterEach(async () => {
    await cleanupTestRepo(testRepo);
  });

  test("complete workflow", async () => {
    process.chdir(testRepo);

    const result = await startBranch("test-feature", "feature");
    expect(result.success).toBe(true);

    // Make changes
    fs.writeFileSync("test.txt", "content");

    const commitResult = await autoCommit({
      message: "Test commit",
    });
    expect(commitResult.success).toBe(true);
  });
});
```

---

## Performance Considerations

### Performance Bottlenecks

| Operation     | Bottleneck      | Mitigation         | Impact |
| ------------- | --------------- | ------------------ | ------ |
| Git status    | File system I/O | Cache results      | High   |
| Branch list   | Git command     | Parallel execution | Medium |
| PR creation   | Network I/O     | Async operations   | High   |
| Config load   | File parsing    | Lazy loading       | Low    |
| AI commit msg | API call        | Local fallback     | Medium |

### Optimization Strategies

1. **Command Batching**

   ```javascript
   // Instead of multiple git calls
   const branch = execGitCommand("git branch --show-current");
   const status = execGitCommand("git status --porcelain");
   const remote = execGitCommand("git remote -v");

   // Batch into single call
   const info = execGitCommand(`
     git branch --show-current &&
     git status --porcelain &&
     git remote -v
   `);
   ```

2. **Parallel Execution**

   ```javascript
   // Parallel git operations
   const [branches, tags, remotes] = await Promise.all([
     execGitCommand("git branch -a"),
     execGitCommand("git tag -l"),
     execGitCommand("git remote -v"),
   ]);
   ```

3. **Lazy Configuration**

   ```javascript
   let _config;
   function getConfig() {
     if (!_config) {
       _config = loadConfig();
     }
     return _config;
   }
   ```

4. **Result Caching**

   ```javascript
   const cache = new Map();

   function getCachedGitInfo(command) {
     if (cache.has(command)) {
       const { result, time } = cache.get(command);
       if (Date.now() - time < 5000) {
         // 5s cache
         return result;
       }
     }

     const result = execGitCommand(command);
     cache.set(command, { result, time: Date.now() });
     return result;
   }
   ```

---

## Security Architecture

### Security Layers

1. **Input Validation**

   ```javascript
   // Prevent command injection
   function sanitizeBranchName(name) {
     // Remove shell metacharacters
     return name.replace(/[;&|`$()<>]/g, "");
   }
   ```

2. **Git Operation Safety**

   ```javascript
   // Safe command execution
   function execGitCommand(cmd, options = {}) {
     // Whitelist allowed commands
     const allowed = ["checkout", "branch", "commit", "push"];
     const parts = cmd.split(" ");

     if (!allowed.includes(parts[1])) {
       throw new Error("Unauthorized git command");
     }

     return execSync(cmd, {
       ...options,
       shell: false, // Prevent shell injection
     });
   }
   ```

3. **Credential Management**

   ```javascript
   // Never store credentials
   // Rely on git credential helpers
   // Use SSH keys or tokens
   ```

4. **API Security**
   ```javascript
   // GitHub API authentication
   function getGitHubClient() {
     const token = process.env.GITHUB_TOKEN;
     if (!token) {
       throw new Error("GitHub token required");
     }

     return new Octokit({
       auth: token,
       request: {
         timeout: 5000,
         retries: 3,
       },
     });
   }
   ```

### Security Best Practices

| Practice              | Implementation       | Rationale                    |
| --------------------- | -------------------- | ---------------------------- |
| Input sanitization    | Regex validation     | Prevent injection            |
| Command whitelisting  | Allowed command list | Limit attack surface         |
| No credential storage | Use system helpers   | Prevent leaks                |
| Minimal permissions   | Request only needed  | Principle of least privilege |
| Audit logging         | Log all operations   | Traceability                 |

---

## Maintenance Guidelines

### Code Organization Rules

1. **Module Boundaries**
   - Tools: Business logic only
   - Utils: Reusable helpers
   - Config: Configuration management
   - CLI: User interaction only

2. **Naming Conventions**

   ```javascript
   // Tools: verb + noun
   (startBranch(), finishBranch(), createPullRequest());

   // Utilities: get/set/is + noun
   (getCurrentBranch(), isGitRepository(), setConfig());

   // Responses: create + type + Response
   (createSuccessResponse(), createErrorResponse());
   ```

3. **Error Handling**
   ```javascript
   // Always return responses, don't throw
   try {
     const result = await operation();
     return createSuccessResponse("Success", result);
   } catch (error) {
     return createErrorResponse("Failed", error);
   }
   ```

### Adding New Features

1. **Add Tool Checklist**
   - [ ] Define tool in appropriate module
   - [ ] Add MCP registration
   - [ ] Export for CLI usage
   - [ ] Add CLI command
   - [ ] Write tests
   - [ ] Update documentation
   - [ ] Add to command reference

2. **Tool Implementation Template**
   ```javascript
   /**
    * Tool description
    * @param {Object} params - Tool parameters
    * @param {string} params.required - Required parameter
    * @param {string} [params.optional] - Optional parameter
    * @returns {Promise<ToolResponse>} Tool response
    */
   export async function newTool({ required, optional = "default" }) {
     // 1. Validation
     if (!required) {
       return createErrorResponse("Required parameter missing");
     }

     if (!isGitRepository()) {
       return createErrorResponse("Not a git repository");
     }

     try {
       // 2. Business logic
       const result = await performOperation(required, optional);

       // 3. Success response
       return createSuccessResponse("Operation completed", {
         result,
         operation: "new-tool",
       });
     } catch (error) {
       // 4. Error response
       return createErrorResponse(`Operation failed: ${error.message}`);
     }
   }
   ```

### Debugging Guidelines

1. **Enable Debug Logging**

   ```bash
   DEBUG=slambed:* slambed commit
   ```

2. **Common Issues**
   | Symptom | Likely Cause | Solution |
   |---------|--------------|----------|
   | "Not a git repository" | Wrong directory | Check cwd |
   | "Command not found" | Missing dependency | Check PATH |
   | "Permission denied" | Protected branch | Check settings |
   | "Network error" | Offline/firewall | Check connection |

3. **Debug Points**

   ```javascript
   // Add debug logging
   import debug from "debug";
   const log = debug("slambed:tool-name");

   export async function toolFunction(params) {
     log("Starting with params:", params);

     const result = await operation();
     log("Operation result:", result);

     return createSuccessResponse("Done", result);
   }
   ```

---

## Refactoring Considerations

### Current Technical Debt

1. **Git Command Execution**
   - Direct shell execution
   - String concatenation for commands
   - Limited error parsing

2. **Configuration System**
   - No schema validation
   - Manual merging logic
   - File-based only

3. **Testing**
   - Custom test runner
   - Limited mocking
   - No coverage tracking

### Refactoring Opportunities

1. **Abstract Git Operations**

   ```javascript
   // Current
   execSync(`git checkout -b ${branch}`);

   // Proposed
   await git.checkout({
     branch,
     create: true,
   });
   ```

2. **Plugin System**

   ```javascript
   // Enable third-party extensions
   class PluginHost {
     registerPlugin(plugin) {
       this.validatePlugin(plugin);
       this.plugins.push(plugin);
       plugin.onLoad(this.context);
     }
   }
   ```

3. **Type Safety**

   ```typescript
   // Add TypeScript for better maintainability
   interface Tool<T extends ToolParams = any> {
     name: string;
     description: string;
     inputSchema: JSONSchema<T>;
     handler: (params: T) => Promise<ToolResponse>;
   }
   ```

4. **Async Configuration**
   ```javascript
   // Support remote config sources
   class ConfigManager {
     async loadConfig() {
       const sources = [
         new FileConfigSource(),
         new EnvConfigSource(),
         new RemoteConfigSource(),
       ];

       return this.mergeConfigs(
         await Promise.all(sources.map((s) => s.load())),
       );
     }
   }
   ```

### Migration Path

1. **Phase 1: Type Safety**
   - Add TypeScript declarations
   - Gradual migration of modules
   - Maintain backward compatibility

2. **Phase 2: Git Abstraction**
   - Introduce git wrapper
   - Migrate commands gradually
   - Add better error handling

3. **Phase 3: Plugin System**
   - Define plugin interface
   - Create plugin loader
   - Migrate optional features

4. **Phase 4: Performance**
   - Add caching layer
   - Implement lazy loading
   - Optimize git operations

---

## Summary

Slambed's architecture achieves its goals through:

1. **Clean Architecture** - Clear separation between interfaces and business logic
2. **Extensibility** - Easy to add new tools following patterns
3. **Testability** - Modular design enables comprehensive testing
4. **Performance** - Optimized for common workflows
5. **Security** - Defense in depth approach
6. **Maintainability** - Clear patterns and guidelines

The dual-interface design ensures consistent behavior across MCP and CLI while optimizing the user experience for each interface type. The architecture is designed to scale with new features while maintaining backward compatibility.

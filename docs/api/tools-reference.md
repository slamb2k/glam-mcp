# Tools Reference

This document provides a comprehensive reference for all tools available in glam-mcp, organized by category.

## Tool Categories

1. [GitHub Flow Tools](#github-flow-tools) - Branch and PR management
2. [Automation Tools](#automation-tools) - Smart automation features
3. [Utility Tools](#utility-tools) - General development utilities
4. [Context Tools](#context-tools) - Session and context management
5. [Team Tools](#team-tools) - Collaboration features
6. [Safety Tools](#safety-tools) - Risk assessment and validation

## GitHub Flow Tools

### github_flow_start

Creates a new feature branch with smart naming and safety checks.

**Parameters**:
- `feature_name` (string, required): Brief description of the feature
- `branch_type` (string, optional): Type of branch (feature/bugfix/hotfix)
- `base_branch` (string, optional): Branch to create from

**Example**:
```json
{
  "feature_name": "user authentication",
  "branch_type": "feature"
}
```

**Response includes**:
- Branch name created
- Conflicts detected
- Team activity on related files
- Suggested next steps

---

### github_flow_pr

Creates a pull request with intelligent description generation.

**Parameters**:
- `title` (string, optional): PR title (auto-generated if not provided)
- `body` (string, optional): PR description  
- `draft` (boolean, optional): Create as draft PR
- `reviewers` (array, optional): Suggested reviewers

**Example**:
```json
{
  "draft": false,
  "reviewers": ["sarah", "john"]
}
```

**Response includes**:
- PR URL and number
- Auto-generated description
- Suggested reviewers based on code ownership
- CI/CD status
- Related issues linked

---

### github_flow_merge

Safely merges branches with comprehensive checks.

**Parameters**:
- `source_branch` (string, optional): Branch to merge from
- `target_branch` (string, optional): Branch to merge into
- `strategy` (string, optional): Merge strategy (merge/squash/rebase)
- `delete_source` (boolean, optional): Delete source branch after merge

**Example**:
```json
{
  "strategy": "squash",
  "delete_source": true
}
```

**Response includes**:
- Merge success status
- Conflicts resolved
- CI/CD verification
- Post-merge cleanup
- Team notifications

## Automation Tools

### auto_commit

Generates intelligent commit messages based on changes.

**Parameters**:
- `message` (string, optional): Override auto-generated message
- `type` (string, optional): Commit type (feat/fix/docs/style/refactor)
- `scope` (string, optional): Commit scope
- `breaking` (boolean, optional): Is this a breaking change?

**Example**:
```json
{
  "type": "feat",
  "scope": "auth"
}
```

**Response includes**:
- Generated commit message
- Files included
- Commit conventions followed
- Suggestions for better commits
- Warning about large changes

---

### auto_pr

Automates the entire PR creation workflow.

**Parameters**:
- `commit_message` (string, optional): Commit message
- `pr_title` (string, optional): PR title
- `auto_merge` (boolean, optional): Auto-merge when checks pass

**Example**:
```json
{
  "auto_merge": true
}
```

**Response includes**:
- All operations performed
- PR URL and status
- Merge conditions
- Rollback instructions

---

### sync_main

Synchronizes current branch with main branch.

**Parameters**:
- `strategy` (string, optional): Sync strategy (merge/rebase)
- `stash` (boolean, optional): Stash uncommitted changes

**Example**:
```json
{
  "strategy": "rebase",
  "stash": true
}
```

**Response includes**:
- Sync status
- Conflicts handled
- Changes integrated
- Next steps

## Utility Tools

### repo_map

Generates a visual map of the repository structure.

**Parameters**:
- `max_depth` (number, optional): Maximum directory depth
- `include_hidden` (boolean, optional): Include hidden files
- `format` (string, optional): Output format (tree/flat/json)

**Example**:
```json
{
  "max_depth": 3,
  "format": "tree"
}
```

**Response includes**:
- Repository structure
- File counts by type
- Size information
- Key directories highlighted

---

### search_todos

Finds all TODO comments in the codebase.

**Parameters**:
- `pattern` (string, optional): Custom TODO pattern
- `include_completed` (boolean, optional): Include completed TODOs
- `group_by` (string, optional): Group by file/author/date

**Example**:
```json
{
  "group_by": "author"
}
```

**Response includes**:
- TODO items found
- Priority indicators
- Author information
- File locations
- Age of TODOs

---

### check_dependencies

Analyzes project dependencies for issues.

**Parameters**:
- `check_updates` (boolean, optional): Check for updates
- `check_security` (boolean, optional): Run security audit
- `check_unused` (boolean, optional): Find unused dependencies

**Example**:
```json
{
  "check_updates": true,
  "check_security": true
}
```

**Response includes**:
- Outdated packages
- Security vulnerabilities
- Unused dependencies
- Update recommendations
- Risk assessment

## Context Tools

### get_session_context

Retrieves current session context and preferences.

**Parameters**: None

**Response includes**:
- Session ID and age
- User preferences
- Recent operations
- Current branch info
- Working directory

---

### update_preferences

Updates user preferences for the session.

**Parameters**:
- `preferences` (object, required): Preferences to update

**Example**:
```json
{
  "preferences": {
    "autoCommit": true,
    "verboseOutput": false,
    "defaultBranch": "develop"
  }
}
```

**Response includes**:
- Updated preferences
- Applied changes
- Validation results

---

### get_operation_history

Retrieves history of recent operations.

**Parameters**:
- `limit` (number, optional): Number of operations to return
- `filter` (string, optional): Filter by operation type

**Example**:
```json
{
  "limit": 10,
  "filter": "commit"
}
```

**Response includes**:
- Recent operations
- Timestamps
- Results
- Context at time of operation

## Team Tools

### check_team_activity

Checks current team activity on the repository.

**Parameters**:
- `scope` (string, optional): Scope of check (file/branch/repo)
- `time_range` (string, optional): Time range to check

**Example**:
```json
{
  "scope": "branch",
  "time_range": "24h"
}
```

**Response includes**:
- Active team members
- Branches being worked on
- Recent commits
- Potential conflicts
- Collaboration suggestions

---

### suggest_reviewers

Suggests appropriate code reviewers.

**Parameters**:
- `files` (array, optional): Specific files to consider
- `limit` (number, optional): Maximum reviewers to suggest

**Example**:
```json
{
  "limit": 3
}
```

**Response includes**:
- Suggested reviewers
- Expertise areas
- Availability indicators
- Recent review history
- Reasoning for suggestions

---

### find_code_owners

Identifies code owners for files or directories.

**Parameters**:
- `paths` (array, required): Paths to check ownership

**Example**:
```json
{
  "paths": ["src/auth", "src/models/user.js"]
}
```

**Response includes**:
- Code owners identified
- Ownership rules applied
- Contact information
- Recent contributions

## Safety Tools

### analyze_risk

Analyzes risk level of an operation or change.

**Parameters**:
- `operation` (string, required): Operation to analyze
- `context` (object, optional): Additional context

**Example**:
```json
{
  "operation": "merge_to_main",
  "context": {
    "hasTests": false,
    "reviewCount": 0
  }
}
```

**Response includes**:
- Risk level (low/medium/high/critical)
- Risk factors identified
- Mitigation strategies
- Confidence score
- Detailed breakdown

---

### validate_preconditions

Validates preconditions before an operation.

**Parameters**:
- `operation` (string, required): Operation to validate for
- `requirements` (array, optional): Additional requirements

**Example**:
```json
{
  "operation": "release",
  "requirements": ["all_tests_pass", "no_security_issues"]
}
```

**Response includes**:
- Validation results
- Failed preconditions
- How to fix issues
- Safe to proceed indicator

---

### suggest_recovery

Suggests recovery options after a failure.

**Parameters**:
- `error_type` (string, required): Type of error encountered
- `context` (object, optional): Error context

**Example**:
```json
{
  "error_type": "merge_conflict",
  "context": {
    "files": ["src/index.js"],
    "branches": ["main", "feature/auth"]
  }
}
```

**Response includes**:
- Recovery strategies
- Step-by-step instructions
- Risk assessment of each option
- Recommended approach
- Prevention tips

## Tool Discovery

### tool_search

Search for tools by keyword or capability.

**Parameters**:
- `keyword` (string, optional): Search keyword
- `category` (string, optional): Tool category
- `tag` (string, optional): Tool tag

**Example**:
```json
{
  "keyword": "commit",
  "category": "automation"
}
```

**Response includes**:
- Matching tools
- Relevance scores
- Usage examples
- Related tools

---

### tool_info

Get detailed information about a specific tool.

**Parameters**:
- `tool_name` (string, required): Name of the tool

**Example**:
```json
{
  "tool_name": "github_flow_start"
}
```

**Response includes**:
- Full documentation
- Parameter details
- Usage examples
- Common patterns
- Tips and tricks

## Usage Examples

### Example 1: Complete Feature Workflow

```javascript
// 1. Start a new feature
{
  "tool": "github_flow_start",
  "params": {
    "feature_name": "add user notifications"
  }
}

// 2. Make changes and commit
{
  "tool": "auto_commit",
  "params": {
    "type": "feat",
    "scope": "notifications"
  }
}

// 3. Create pull request
{
  "tool": "github_flow_pr",
  "params": {
    "draft": false
  }
}

// 4. Merge when ready
{
  "tool": "github_flow_merge",
  "params": {
    "strategy": "squash"
  }
}
```

### Example 2: Safety-First Deployment

```javascript
// 1. Check team activity
{
  "tool": "check_team_activity",
  "params": {
    "scope": "repo"
  }
}

// 2. Validate preconditions
{
  "tool": "validate_preconditions",
  "params": {
    "operation": "deploy"
  }
}

// 3. Analyze risk
{
  "tool": "analyze_risk",
  "params": {
    "operation": "production_deploy"
  }
}
```

## Response Patterns

All tools follow consistent response patterns:

1. **Success Response**:
```json
{
  "result": {
    "success": true,
    "data": { /* tool-specific data */ },
    "message": "Operation completed successfully"
  },
  "context": {
    "suggestions": ["Next step 1", "Next step 2"],
    "risks": { "level": "low", "factors": [] },
    "relatedTools": ["tool_1", "tool_2"]
  },
  "metadata": {
    "operation": "tool_name",
    "timestamp": "2024-01-09T10:00:00Z",
    "duration": 123
  }
}
```

2. **Error Response**:
```json
{
  "result": {
    "success": false,
    "error": {
      "code": "MERGE_CONFLICT",
      "message": "Merge conflict in 2 files",
      "details": { /* specific error info */ }
    }
  },
  "context": {
    "suggestions": ["How to resolve the error"],
    "relatedTools": ["suggest_recovery"]
  }
}
```

## Best Practices

1. **Use Tool Discovery**: Don't guess tool names, use `tool_search`
2. **Check Preconditions**: Use safety tools before risky operations
3. **Follow Suggestions**: The context suggestions guide optimal workflows
4. **Handle Errors**: Always have a plan for error responses
5. **Leverage Context**: Tools are context-aware and work better together
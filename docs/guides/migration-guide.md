# Migration Guide: From Glam to glam-mcp

This guide helps users migrate from the original glam CLI/MCP hybrid to the new pure MCP glam-mcp architecture.

## Overview of Changes

### Architecture Changes

| Feature | Glam (Old) | glam-mcp (New) |
|---------|---------------|----------------|
| Architecture | CLI + MCP hybrid | Pure MCP server |
| Command Interface | Direct CLI commands | MCP tools only |
| Installation | Global CLI tool | MCP server |
| Configuration | CLI config files | MCP + project config |
| Response Format | Simple text output | Enhanced responses |

### Key Improvements

1. **Rich Responses**: Every operation now returns context, suggestions, and metadata
2. **Session Management**: Maintains context across operations
3. **Team Awareness**: Detects and prevents conflicts
4. **Safety Analysis**: Risk assessment for all operations
5. **Pure MCP**: No CLI dependencies, works with any MCP client

## Installation Migration

### Removing Glam

1. **Uninstall global CLI**:
```bash
npm uninstall -g glam
```

2. **Remove CLI configuration**:
```bash
rm -rf ~/.glam
```

3. **Update package.json** (if locally installed):
```json
{
  "devDependencies": {
    // Remove this line
    "glam": "^1.0.0"
  }
}
```

### Installing glam-mcp

Follow the [Installation Guide](./installation.md) for detailed steps.

Quick setup for Claude Desktop:

```json
{
  "mcpServers": {
    "glam": {
      "command": "npx",
      "args": ["glam-mcp"],
      "env": {
        "GLAM_LOG_LEVEL": "info"
      }
    }
  }
}
```

## Configuration Migration

### Old Glam Config

```json
// ~/.glam/config.json
{
  "defaultBranch": "main",
  "autoMerge": false,
  "runTests": true
}
```

### New glam-mcp Config

Create `.glam.json` in your project root:

```json
{
  "gitFlow": {
    "defaultBranch": "main",
    "branchPrefixes": {
      "feature": "feat/",
      "bugfix": "fix/"
    }
  },
  "automation": {
    "autoMerge": false,
    "runTests": true,
    "runLint": true,
    "runFormat": true
  },
  "team": {
    "codeOwners": {
      "src/": ["@team"]
    }
  }
}
```

## Command Migration

### Basic Commands

| Glam CLI | glam-mcp via AI Assistant |
|-------------|---------------------------|
| `glam init` | "Initialize glam-mcp for this project" |
| `glam start feature-name` | "Start a new feature branch for feature-name" |
| `glam commit` | "Commit my changes" |
| `glam pr` | "Create a pull request" |
| `glam merge` | "Merge my branch" |

### Advanced Commands

| Glam CLI | glam-mcp via AI Assistant |
|-------------|---------------------------|
| `glam status` | "Show git status and team activity" |
| `glam check` | "Check if it's safe to merge" |
| `glam auto --all` | "Auto commit and create PR" |
| `glam sync` | "Sync my branch with main" |

## Workflow Migration

### Old Workflow (Glam CLI)

```bash
# Start feature
glam start user-auth

# Make changes
# ...

# Commit
glam commit -m "Add user authentication"

# Create PR
glam pr

# Merge
glam merge --squash
```

### New Workflow (glam-mcp)

With your AI assistant:

```
You: "I need to add user authentication"

AI: "I'll help you start a new feature for user authentication."
[Creates branch with smart naming and checks for conflicts]

You: "I've finished the implementation, can you commit it?"

AI: "I'll analyze your changes and create an appropriate commit."
[Generates conventional commit with all context]

You: "Create a PR please"

AI: "I'll create a comprehensive PR with all the necessary information."
[Creates PR with description, links issues, suggests reviewers]

You: "Is it safe to merge?"

AI: "Let me check for any risks or conflicts."
[Analyzes CI status, team activity, and provides risk assessment]
```

## Feature Comparison

### Response Differences

**Glam CLI Output**:
```
$ glam commit
✓ Changes committed
  message: "Add user authentication"
  files: 3 changed
```

**glam-mcp Response**:
```json
{
  "result": {
    "success": true,
    "message": "Changes committed successfully",
    "data": {
      "commit": "abc123",
      "message": "feat(auth): add user authentication system",
      "files": ["src/auth.js", "tests/auth.test.js", "README.md"]
    }
  },
  "context": {
    "suggestions": [
      "Push your changes: Your branch is 1 commit ahead",
      "Create a PR to merge your changes",
      "Run tests locally to verify"
    ],
    "risks": {
      "level": "low",
      "factors": []
    },
    "teamActivity": {
      "note": "No team members working on related files"
    }
  }
}
```

### New Features in glam-mcp

1. **Context Awareness**
   - Remembers your workflow
   - Adapts suggestions based on patterns
   - Maintains preferences

2. **Team Collaboration**
   - Real-time conflict detection
   - Smart reviewer suggestions
   - Code ownership awareness

3. **Safety Features**
   - Risk assessment before operations
   - Precondition validation
   - Recovery suggestions on failure

4. **Enhanced Automation**
   - Smarter commit messages
   - Comprehensive PR descriptions
   - Intelligent merge strategies

## Project Structure Changes

### Config File Locations

```
# Old (Glam)
project/
├── .glam.json       # Project config
├── .glam/           # Local cache
└── ~/.glam/         # Global config

# New (glam-mcp)
project/
├── .glam.json          # Project config
└── .sessions/          # Session data (optional)
```

### Environment Variables

| Glam | glam-mcp | Purpose |
|---------|----------|---------|
| `GLAM_TOKEN` | `GITHUB_TOKEN` | GitHub authentication |
| `GLAM_VERBOSE` | `GLAM_LOG_LEVEL=debug` | Verbose output |
| `GLAM_BRANCH` | `GLAM_DEFAULT_BRANCH` | Default branch |

## Troubleshooting Migration Issues

### Common Issues

1. **"Command not found" errors**
   - Solution: Remove glam aliases from shell config
   - Update scripts that use glam CLI

2. **Configuration not recognized**
   - Solution: Rename `.glam.json` to `.glam.json`
   - Update configuration structure (see above)

3. **Workflows need updating**
   - Solution: Use AI assistant natural language
   - Refer to [Quick Start Guide](./quick-start.md)

4. **Missing CLI features**
   - Solution: All features available via MCP tools
   - Ask AI assistant for equivalent commands

### Getting Help

If you encounter issues:

1. Check [GitHub Issues](https://github.com/slamb2k/glam-mcp/issues)
2. Review [FAQ](#frequently-asked-questions)
3. Ask in discussions

## Frequently Asked Questions

**Q: Can I use both glam and glam-mcp?**
A: Not recommended. They may conflict. Complete migration first.

**Q: Will my git history be affected?**
A: No, glam-mcp uses standard git operations.

**Q: Can I migrate gradually?**
A: Yes, but you'll get the best experience after full migration.

**Q: What about my custom scripts using glam?**
A: You'll need to update them to use the MCP interface or natural language commands.

**Q: Is there a compatibility mode?**
A: No, glam-mcp is a complete reimagining focused on AI-first interaction.

## Benefits After Migration

1. **Richer Interactions**: Every operation provides helpful context
2. **Smarter Automation**: AI understands your intent better
3. **Safer Operations**: Built-in risk assessment and conflict detection
4. **Better Collaboration**: Team awareness prevents conflicts
5. **Future-Proof**: Pure MCP architecture works with any MCP client

## Next Steps

1. Complete installation following the [Installation Guide](./installation.md)
2. Try the [Quick Start Tutorial](./quick-start.md)
3. Explore [Advanced Features](./advanced-features.md)
4. Read about [Enhanced Responses](../architecture/enhanced-response.md)

Welcome to glam-mcp - a more intelligent way to develop!
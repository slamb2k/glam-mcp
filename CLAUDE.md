# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

**Start MCP Server:**
```bash
npm start
# or with hot reload
npm run dev
```

**Testing:**
```bash
npm test        # Run all tests
npm run lint    # ESLint validation
npm run format  # Prettier formatting
npm run build   # Lint + test pipeline
```

**CLI Tools Testing:**
```bash
# Test individual CLI tools
./bin/slambed.js --help
./bin/slamb-commit.js --help  
./bin/slamb-flow.js --help

# Test MCP tool registration
node src/index.js --validate-tools
```

## Architecture Overview

This is a **dual-interface system** serving as both an MCP server and CLI tool suite for Git workflow automation.

### Core Components

**1. MCP Server (`src/index.js`)**
- Main entry point that registers all tools with MCP
- Handles tool validation and error reporting
- Supports both stdio and server transport modes

**2. Tool Categories (`src/tools/`)**
- **`git-flow.js`** - Traditional GitFlow operations (10 tools)
- **`automation.js`** - Workflow automation and project initialization (8 tools)  
- **`utilities.js`** - Repository analysis and utility operations (11 tools)

**3. Shared Utilities (`src/utils/`)**
- **`git-helpers.js`** - Centralized git operations with safety checks
- **`responses.js`** - Standardized MCP response formatting
- **`config.js`** - Hierarchical configuration system

**4. CLI Interfaces (`bin/`)**
- **`slambed.js`** - Unified CLI with all capabilities
- **`slamb-commit.js`** - Automation-focused interface
- **`slamb-flow.js`** - GitFlow-focused interface

### Tool Registration Pattern

Each tool category follows this pattern:
```javascript
export function registerToolCategory(server) {
  server.addTool({
    name: 'tool_name',
    description: 'Tool description',
    inputSchema: { /* JSON Schema */ },
    handler: async (params) => handlerFunction(params)
  });
}
```

All handlers return standardized responses via `createSuccessResponse()` or `createErrorResponse()`.

### Configuration System

**Configuration Sources (priority order):**
1. `.slambed.json` (project root)
2. `.slambed.config.json` (project root)  
3. `slambed.config.json` (project root)
4. `~/.slambed.json` (user home)
5. `~/.config/slambed/config.json` (user config)
6. Environment variables (`SLAMBED_*`)

**Configuration Structure:**
```javascript
{
  gitFlow: { defaultBranch, branchPrefixes, autoMerge },
  automation: { runFormat, runLint, runTests, createPR },
  branchNaming: { maxLength, includeDate, sanitization }
}
```

## Adding New Tools

**1. Choose the appropriate tool category file in `src/tools/`**

**2. Add tool registration:**
```javascript
server.addTool({
  name: 'your_tool_name',
  description: 'Tool description',
  inputSchema: {
    type: 'object',
    properties: {
      param: { type: 'string', description: 'Parameter description' }
    },
    required: ['param']
  },
  handler: async (params) => yourToolFunction(params)
});
```

**3. Implement handler function:**
```javascript
async function yourToolFunction({ param }) {
  if (!isGitRepository()) {
    return createErrorResponse('Not a git repository');
  }
  
  try {
    // Your logic here
    const result = execGitCommand('git command', { silent: true });
    
    return createSuccessResponse('Operation completed', {
      data: result,
      operation: 'your-operation'
    });
  } catch (error) {
    return createErrorResponse(`Operation failed: ${error.message}`);
  }
}
```

**4. Export the function and add to CLI if needed**

## Key Patterns

**Git Operations:**
- Always validate with `isGitRepository()` first
- Use `execGitCommand()` for git operations with proper error handling
- Check for uncommitted changes with `hasUncommittedChanges()` before destructive operations
- Use `getMainBranch()` instead of hardcoding 'main'

**Error Handling:**
- Wrap operations in try/catch blocks
- Use `createErrorResponse()` for consistent error formatting
- Provide actionable error messages
- Continue gracefully on non-critical failures

**Branch Operations:**
- Generate branch names with `generateBranchName()`
- Always check if branch exists before creating
- Clean up branches after successful merges
- Use feature prefixes from configuration

**PR Operations:**
- Requires GitHub CLI (`gh`) authentication
- Include detailed PR descriptions with change summaries
- Support auto-merge with safety checks
- Handle branch protection rules gracefully

## Testing

**Test Structure (`test/`):**
- **`test-runner.js`** - Custom test framework with environment validation
- **`git-helpers.test.js`** - Git operation tests
- **`configuration.test.js`** - Configuration system tests  
- **`mcp-server.test.js`** - MCP server functionality tests

**Test Requirements:**
- Node.js 18+, Git 2.0+, GitHub CLI installed
- Tests validate environment before running
- Each test suite is modular and independent

**Running Specific Tests:**
```bash
node test/git-helpers.test.js      # Test git operations
node test/configuration.test.js    # Test config system
node test/mcp-server.test.js      # Test MCP functionality
```

## Dependencies

**Core MCP:**
- `@modelcontextprotocol/sdk` - MCP server implementation

**CLI Framework:**
- `commander` - CLI argument parsing
- `inquirer` - Interactive prompts
- `chalk` - Terminal styling

**Git Operations:**
- `simple-git` - Git operations (used sparingly, prefer execGitCommand)
- GitHub CLI (`gh`) required for PR operations

**Development:**
- `eslint` - Code linting
- `prettier` - Code formatting
- `nodemon` - Development file watching

## Working with the Codebase

**When adding git operations:**
1. Use existing patterns in `git-helpers.js`
2. Always validate repository state first
3. Handle both local and remote scenarios
4. Test with various branch protection settings

**When adding automation:**
1. Follow the workflow pattern: validate → execute → format output
2. Support both CLI and MCP interfaces
3. Include progress reporting for long operations
4. Handle GitHub API rate limits

**When modifying configuration:**
1. Update schema validation in `config.js`
2. Add environment variable support
3. Test with different configuration sources
4. Document new options in README

**Integration Points:**
- MCP tools are automatically available to Claude Code
- CLI tools support both interactive and scripted usage
- Configuration affects both interfaces identically
- Error handling is consistent across all entry points
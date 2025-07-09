# glam-mcp - Development Guide

## Project Overview

glam-mcp is a pure MCP (Model Context Protocol) server that provides intelligent development experiences through rich, contextual responses. This project has been transformed from a hybrid CLI/MCP tool into a pure MCP server, focusing on enhancing AI assistant capabilities with deep development context, team awareness, and intelligent workflow orchestration.

## Current Architecture

### Core Components

1. **Pure MCP Server** (`src/index.js`)
   - No CLI dependencies or interfaces
   - Clean MCP protocol implementation
   - Rich response system with metadata and context

2. **Enhanced Response System** (`src/core/enhanced-response.js`)
   - Every tool returns structured responses with:
     - Core results (success/failure, data)
     - Context object (suggestions, risks, related tools, team activity)
     - Metadata (operation details, timestamps, affected files)

3. **Session Context Management** (`src/context/`)
   - Tracks current branch and repository state
   - Maintains operation history
   - Stores user preferences (in-memory)

4. **Response Enhancers** (`src/enhancers/`)
   - Modular enhancement pipeline
   - Metadata generation
   - Risk assessment
   - Suggestion generation
   - Team activity detection

### Tool Categories

1. **GitHub Flow Tools** (`src/tools/github-flow.js`)
   - `github_flow_start`: Branch creation with smart naming
   - `github_flow_pr`: PR creation with context
   - `github_flow_merge`: Safe merging with checks
   - Additional tools for status checking and issue management

2. **Automation Tools** (`src/tools/automation.js`)
   - `auto_commit`: Intelligent commit message generation
   - `auto_pr`: Automated PR workflows
   - `sync_main`: Branch synchronization
   - Various checklist and automation helpers

3. **Utility Tools** (`src/tools/utilities.js`)
   - `repo_map`: Repository structure visualization
   - `search_todos`: TODO comment finder
   - `check_dependencies`: Dependency analysis

## Development Workflow

### Running Tests
```bash
npm test                    # Run all tests
npm test -- --watch        # Watch mode
npm test -- --coverage     # Coverage report
```

### Key Test Files
- `tests/unit/core/enhanced-response.test.js` - Response system tests
- `tests/enhancers/*.test.js` - Individual enhancer tests
- `tests/integration/mcp-server.integration.test.js` - Full server tests

### Adding New Tools

1. Add tool definition to appropriate file in `src/tools/`
2. Include proper description with "when to use" guidance
3. Implement response using `createResponse()` helper
4. Enhancers will automatically enrich the response

Example:
```javascript
{
  name: "tool_name",
  description: "What it does. Use this when you need to...",
  inputSchema: { /* ... */ },
  handler: async (params) => {
    // Tool logic
    return createResponse(true, data, "Operation completed");
  }
}
```

### Response Enhancement Pipeline

The enhancement pipeline automatically enriches all tool responses:

1. **Base Response** → 2. **Metadata Enhancer** → 3. **Risk Enhancer** → 4. **Suggestions Enhancer** → 5. **Team Activity Enhancer**

Each enhancer adds its specific context without modifying others' contributions.

## Testing Guidelines

1. **Unit Tests**: Test individual components in isolation
2. **Integration Tests**: Test full MCP server behavior
3. **Enhancer Tests**: Verify each enhancer's contribution
4. **Mock Git Operations**: Use `tests/utils/mockGit.js` for Git operations

## Current Implementation Status

### Completed (✅)
- Pure MCP server architecture
- Enhanced response system
- Session context management
- Core enhancer pipeline
- Comprehensive test suite
- All existing tools migrated

### In Progress (🚧)
- Team awareness features
- Advanced conflict detection
- Session persistence options

### Future Enhancements (📋)
- Context tools implementation
- Team tools implementation
- Safety tools implementation
- Plugin system for custom tools
- Machine learning for pattern detection

## Important Notes

1. **No CLI Components**: This is a pure MCP server. All CLI functionality has been removed.

2. **Response Structure**: Every tool must return responses using the `createResponse()` helper to ensure proper enhancement.

3. **Session Context**: The session manager tracks state across operations but is currently in-memory only.

4. **Test Coverage**: Maintain high test coverage. Run `npm test -- --coverage` to check.

5. **Git Operations**: All Git operations should use the helpers in `src/utils/git-helpers.js`.

6. **Development Documents**: The `/.dev_docs/` directory contains internal development documents (ARCHITECTURE.md, VISION.md, etc.). These documents should NOT be referenced or used unless the user explicitly asks for them by name or path. They are kept for historical reference but are not part of the active codebase documentation.

## Debugging Tips

1. **MCP Communication**: Use MCP client debug mode to see raw responses
2. **Response Enhancement**: Check individual enhancer outputs in tests
3. **Session State**: Use `get_session_context` tool to inspect current state
4. **Git Issues**: Mock Git operations in tests to avoid environment dependencies

## Code Style

- Use ES modules (import/export)
- Async/await for asynchronous operations
- Descriptive function and variable names
- JSDoc comments for public APIs
- Comprehensive error handling with helpful messages

---

This guide is specifically for AI assistants working on the glam-mcp codebase. The project follows MCP best practices and emphasizes rich, contextual responses to enable intelligent development experiences.
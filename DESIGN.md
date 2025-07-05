Here is your content converted into **Markdown** format:

---

# Detailed Architecture Overview of Slambed

## Core Architecture: Dual-Interface Design

Slambed implements a sophisticated dual-interface architecture that serves both as an **MCP (Model Context Protocol) server** and a **CLI tool suite**. The key insight is that the business logic is shared between both interfaces, with thin adapters handling the interface-specific concerns.

---

## Entry Points and Interface Layers

### 1. MCP Server Entry Point (`src/index.js`)

- **Primary Class**: `SlamBedMCPServer`
- **Protocol**: Uses stdio transport for communication with MCP clients (like Claude)
- **Tool Registration**: Tools are registered via `addTool()` method
- **Request Handling**:
  - `ListToolsRequestSchema` – Returns available tools
  - `CallToolRequestSchema` – Executes tools with parameters

- **Error Handling**: Wrapped in `McpError` with proper error codes
- **Response Format**: Standardized text responses via `formatMCPResponse()`

---

### 2. CLI Entry Points (`bin/` directory)

Three specialized CLI interfaces:

#### `bin/slambed.js` – Main Unified CLI

- Full feature set with all tools
- Interactive mode with context detection
- Alias system for custom shortcuts
- Uses `commander.js` for argument parsing

#### `bin/slamb-flow.js` – GitHub Flow Focused

- Simplified interface for branch workflows
- Only GitHub Flow operations exposed

#### `bin/slamb-commit.js` – Automation Focused

- Commit and publishing workflows
- NPM publishing capabilities
- GitHub Actions workflow creation

---

## Tool Organization and Shared Logic

### Tool Categories

```
src/tools/
├── github-flow.js    (8 tools)  - Branch-based workflows
├── automation.js     (10 tools) - Complete automation workflows
└── utilities.js      (11 tools) - Repository analysis & utilities
```

### Dual Registration Pattern

Each tool file exports:

1. **Registration function for MCP**: `registerXXXTools(server)`
2. **Individual functions for CLI**:

   ```js
   export { startBranch, finishBranch, ... }
   ```

#### Example Pattern

```js
// Tool registration for MCP
export function registerGitHubFlowTools(server) {
  server.addTool({
    name: "github_flow_start",
    description: "...",
    inputSchema: { /* JSON Schema */ },
    handler: async (params) => startBranch(params.name, params.type)
  });
}

// Shared implementation
async function startBranch(name, type, allow_outdated_base) {
  // Business logic here
  return createSuccessResponse("Started branch", { data });
}

// Export for CLI usage
export { startBranch, finishBranch, ... };
```

---

## Response Handling and Error Management

### Unified Response Format

Both interfaces use the same response structure:

```json
{
  "success": true,
  "message": "string",
  "data": {},
  "timestamp": "ISO string"
}
```

### Interface-Specific Adaptations

#### MCP Interface

- Responses wrapped in MCP content format
- Errors throw `McpError` with error codes
- All output via return values

#### CLI Interface

- Console output with chalk formatting
- Interactive prompts via `inquirer`
- Process exit codes for errors
- Direct `console.log` for user feedback

---

## Configuration System

Hierarchical configuration loading (priority order):

1. Project `.slambed.json`
2. User home `~/.slambed.json`
3. User config `~/.config/slambed/config.json`
4. Environment variables `SLAMBED_*`

> Configuration affects both interfaces identically.

---

## Key Architectural Features

### 1. Separation of Concerns

- **Business Logic**: In tool implementations (pure functions)
- **MCP Adapter**: In `src/index.js` (protocol handling)
- **CLI Adapter**: In `bin/*.js` files (user interaction)
- **Shared Utilities**: In `src/utils/` (git operations, responses)

### 2. Stateless Tool Design

- Each tool function is stateless
- No shared state between invocations
- Configuration loaded fresh each time
- Enables concurrent execution

### 3. Error Boundary Strategy

- **MCP**: Errors caught and wrapped in `McpError`
- **CLI**: Errors shown with `chalk` formatting and exit codes
- **Tools**: Return error responses, don't throw
- **Git Operations**: Wrapped in try/catch with helpful messages

### 4. Interactive vs Programmatic

- **CLI**: Supports interactive prompts when TTY detected
- **MCP**: Always non-interactive, all params required
- **Shared**: Core functions accept all params, no prompting

---

## Interaction Flow Examples

### MCP Server Flow

```
Claude → MCP Request → SlamBedMCPServer
  → Tool Handler → Shared Implementation
  → createSuccessResponse() → formatMCPResponse()
  → MCP Response → Claude
```

### CLI Flow

```
User → CLI Command → Commander Parse
  → Interactive Prompts (if needed)
  → Shared Implementation
  → createSuccessResponse()
  → Console Output (chalk formatted)
  → Process Exit
```

---

## Advanced Features

### 1. Context-Aware Interactive Mode

The main slambed CLI detects repository state and suggests appropriate actions:

- Has changes? Suggests commit
- On feature branch? Suggests PR
- Behind main? Suggests sync

### 2. Alias System

Users can create `.slambed-aliases` files:

```txt
c=commit
p=pr
ship=auto commit --no-merge
```

### 3. Banner and Branding

- Full ASCII banner on help/startup
- Compact banner during operations
- No banner for quick commands

### 4. Tool Validation

- MCP server can validate all tools on startup with `--validate-tools` flag

---

## Summary

The architecture achieves excellent code reuse by:

1. Centralizing business logic in tool implementations
2. Using thin adapters for each interface type
3. Standardizing responses across interfaces
4. Sharing all utilities and helpers

> This design allows Slambed to provide identical functionality whether accessed via Claude (MCP) or command line (CLI), while optimizing the user experience for each interface type.

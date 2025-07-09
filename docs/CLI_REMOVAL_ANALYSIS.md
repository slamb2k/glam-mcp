# CLI Components Removal Analysis

## Overview

This document provides a comprehensive analysis of all CLI-related components in the slambed-mcp codebase that need to be removed to transform it into a pure MCP server.

## CLI Components to Remove

### 1. Binary Entry Points

All files in the `bin/` directory:
- `bin/slambed.js` - Main unified CLI interface
- `bin/slamb-commit.js` - Commit automation CLI
- `bin/slamb-flow.js` - GitHub Flow CLI

### 2. CLI-Specific Dependencies

Dependencies in `package.json` to remove:
- `commander` (^11.1.0) - CLI framework
- `chalk` (^5.3.0) - Terminal styling
- `inquirer` (^9.2.12) - Interactive prompts

### 3. CLI-Related Configuration

In `package.json`:
- Remove `bin` section entirely
- Remove CLI-related scripts if any

### 4. CLI Utility Files

Files that are CLI-specific:
- `src/utils/banner.js` - ASCII art banner display (CLI-only feature)

## Components to Refactor

### 1. Shared Tool Modules

These modules are used by both CLI and MCP server:
- `src/tools/automation.js`
- `src/tools/github-flow.js`
- `src/tools/utilities.js`

**Action**: Keep these modules but ensure they don't contain any CLI-specific code (like console.log statements or chalk formatting).

### 2. Utility Modules

- `src/utils/git-helpers.js` - Core git functionality (keep)
- `src/utils/responses.js` - Response formatting (keep for MCP)

## Dependency Analysis

### Direct CLI Dependencies
```
bin/slambed.js
├── commander
├── chalk
├── inquirer
├── fs (native)
├── path (native)
├── os (native)
└── src/utils/banner.js

bin/slamb-commit.js
├── commander
├── chalk
├── inquirer
└── src/utils/banner.js

bin/slamb-flow.js
├── commander
├── chalk
└── src/utils/banner.js
```

### Shared Dependencies
```
src/utils/banner.js
└── chalk

src/tools/*.js
└── simple-git (keep - needed for git operations)
```

## Removal Strategy

### Phase 1: Test Creation
1. Create tests to verify MCP server functionality without CLI
2. Create tests that check for absence of CLI components
3. Test that tool functions work independently of CLI

### Phase 2: Component Removal
1. Remove `bin/` directory entirely
2. Remove `src/utils/banner.js`
3. Update `package.json`:
   - Remove `bin` section
   - Remove commander, chalk, inquirer from dependencies

### Phase 3: Code Cleanup
1. Search for and remove any imports of removed packages
2. Remove any console.log or chalk formatting from tool modules
3. Ensure tool modules return data instead of printing to console

### Phase 4: Verification
1. Run all tests to ensure MCP server works
2. Verify no CLI code remains
3. Check that all git operations still function via MCP

## Files to Modify

### package.json
- Remove bin section
- Remove CLI dependencies
- Update description
- Update keywords

### Tool Modules
Check and clean these files for CLI-specific code:
- `src/tools/automation.js`
- `src/tools/github-flow.js`
- `src/tools/utilities.js`

Look for:
- Console.log statements
- Chalk formatting
- Process.exit calls
- Direct user prompts

## Expected Outcome

After removal:
- Pure MCP server in `src/index.js`
- Tool modules that return data/results
- No terminal-specific formatting
- No interactive prompts
- No binary executables

## Testing Checklist

- [ ] MCP server starts without errors
- [ ] All MCP tools function correctly
- [ ] No CLI imports remain
- [ ] No console output in tool functions
- [ ] Package.json has no CLI references
- [ ] Test coverage remains above 90%
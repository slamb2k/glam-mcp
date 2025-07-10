# API Changes Documentation

This document captures API changes discovered during test fixes to prevent future mismatches between tests and implementation.

## Tool API Changes

### Automation Tools

#### auto_commit Tool

**Old API Contract (from tests):**
```javascript
{
  feature: string,      // Feature name
  format: boolean,      // Run formatting
  lint: boolean,        // Run linting
  test: boolean,        // Run tests
  pr: boolean          // Create PR
}
```

**Current API Contract:**
```javascript
{
  message: string,           // Commit message (required for new commits)
  branch_name: string,       // Custom branch name (auto-generated if not provided)
  auto_merge: boolean,       // Automatically merge PR after creation (default: true)
  delete_branch: boolean,    // Delete branch after successful merge (default: true)
  run_format: boolean,       // Run code formatting (default: true)
  run_lint: boolean,         // Run linting (default: true)
  target_branch: string,     // Target branch for PR (default: "main")
  branch_prefix: string,     // Branch prefix (default: "feature/")
  branch_strategy: string    // Strategy for handling stale branches: 'auto', 'rebase', 'new'
}
```

**Key Changes:**
- Renamed `feature` to `message` (now represents commit message, not feature name)
- Added `branch_name` for explicit branch naming
- Renamed `format` to `run_format`
- Renamed `lint` to `run_lint`
- Removed `test` parameter
- Removed `pr` parameter (PR creation is now controlled by workflow)
- Added several new configuration options for better control

**Migration Guide:**
```javascript
// Old usage:
auto_commit({ feature: "my-feature", format: false, lint: false })

// New usage:
auto_commit({ message: "Add my feature", run_format: false, run_lint: false })
```

## Common Patterns

### Boolean Parameter Naming
- Old pattern: Simple names like `format`, `lint`, `test`
- New pattern: Action-based names like `run_format`, `run_lint`, `auto_merge`
- Rationale: More explicit about what the parameter does

### Branch Handling
- Old: Feature name used to generate branch
- New: Explicit branch name or auto-generation from commit message
- Rationale: More flexibility in branch naming strategies

## Testing Best Practices

1. **Always check actual implementation** before writing tests
2. **Use descriptive parameter names** that indicate action
3. **Document parameter purposes** in inputSchema descriptions
4. **Keep tests in sync** with API changes

## Future Considerations

1. Consider implementing API versioning for tools
2. Add deprecation warnings for changed parameters
3. Create automated API documentation from schemas
4. Implement contract testing to catch mismatches early
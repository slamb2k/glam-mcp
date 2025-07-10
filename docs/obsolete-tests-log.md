# Obsolete Tests Log

This document tracks tests that were removed or refactored due to being obsolete.

## Date: 2025-07-10

### Removed Tests

1. **tests/unit/utils/banner.test.js**
   - Reason: Banner utility was part of CLI components which were removed
   - Action: Deleted the test file
   - Justification: The banner functionality is no longer part of the MCP server

### Refactored Tests

1. **tests/unit/tools/tool-registry.test.js**
   - Issue: Looking for module in wrong location (src/tools/tool-registry.js instead of src/core/tool-registry.js)
   - Action: Fixed import path
   - Result: Test now references correct module location

2. **tests/unit/server/enhanced-server.test.js**
   - Issue: Looking for session-manager.js in src/core instead of src/context
   - Action: Fixed import path from "../../../src/core/session-manager.js" to "../../../src/context/session-manager.js"
   - Result: Test now references correct module location

### Disabled Tests (Marked as Obsolete)

1. **tests/unit/boost-coverage.test.js**
   - Reason: Synthetic test created solely to boost coverage metrics
   - Action: Added .skip() to describe block and marked as OBSOLETE
   - Future: Should be replaced with proper unit tests for the modules it tests

2. **tests/unit/final-coverage-boost.test.js**
   - Reason: Synthetic test created solely to boost coverage metrics
   - Action: Added .skip() to describe block and marked as OBSOLETE
   - Future: Should be replaced with proper unit tests for the modules it tests

## Summary

- Removed: 1 test file (banner.test.js)
- Refactored: 2 test files (fixed import paths)
- Disabled: 2 test files (synthetic coverage boosters)

These changes remove tests for functionality that no longer exists and fix import paths for tests that were looking for modules in the wrong locations. The synthetic coverage booster tests have been disabled rather than removed to maintain a record of what was tested and to provide guidance for future proper test implementation.
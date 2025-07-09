# Testing Strategy and Guidelines

## Overview

This document outlines the Test-Driven Development (TDD) approach and testing infrastructure for the glam-mcp project. We maintain a minimum of 90% code coverage across all metrics.

## Table of Contents

1. [Test-First Development](#test-first-development)
2. [Testing Infrastructure](#testing-infrastructure)
3. [Test Types and Examples](#test-types-and-examples)
4. [Mocking Strategies](#mocking-strategies)
5. [Running Tests](#running-tests)
6. [Continuous Integration](#continuous-integration)
7. [Troubleshooting](#troubleshooting)
8. [Extending the Test Suite](#extending-the-test-suite)

## Test-First Development

### TDD Workflow

1. **Write a failing test** - Define expected behavior before implementation
2. **Write minimal code** - Just enough to make the test pass
3. **Refactor** - Improve code quality while keeping tests green
4. **Repeat** - Continue for next feature/requirement

### TDD Benefits

- Better code design through upfront thinking
- Built-in regression protection
- Living documentation of expected behavior
- Confidence in refactoring

### Example TDD Cycle

```javascript
// Step 1: Write failing test
test('should create branch with valid name', async () => {
  const branchName = 'feature/new-feature';
  const result = await createBranch(branchName);
  expect(result.success).toBe(true);
  expect(result.branch).toBe(branchName);
});

// Step 2: Implement minimal code
export async function createBranch(name) {
  // Minimal implementation
  return { success: true, branch: name };
}

// Step 3: Refactor with validation
export async function createBranch(name) {
  if (!name || !name.match(/^[a-zA-Z0-9\-\/]+$/)) {
    throw new Error('Invalid branch name');
  }
  // Actual git operations...
  return { success: true, branch: name };
}
```

## Testing Infrastructure

### Technology Stack

- **Jest** - Testing framework with built-in assertion library
- **Husky** - Git hooks for pre-commit testing
- **lint-staged** - Run tests only on changed files
- **Coverage reporting** - Track and enforce 90% coverage

### Directory Structure

```
tests/
├── unit/              # Isolated function tests
├── integration/       # Component interaction tests
├── e2e/              # End-to-end workflow tests
├── fixtures/         # Test data and mocks
└── utils/            # Testing utilities
```

### Configuration Files

- `jest.config.js` - Jest configuration
- `.husky/pre-commit` - Git hook configuration
- `package.json` - Test scripts and lint-staged config

## Test Types and Examples

### Unit Tests

Test individual functions in isolation:

```javascript
// tests/unit/git-helpers.test.js
import { validateBranchName } from '../../src/utils/git-helpers.js';

describe('validateBranchName', () => {
  test('accepts valid branch names', () => {
    const validNames = [
      'feature/add-login',
      'bugfix/fix-typo',
      'release/v1.0.0',
      'hotfix-security-patch'
    ];
    
    validNames.forEach(name => {
      expect(validateBranchName(name)).toBe(true);
    });
  });
  
  test('rejects invalid branch names', () => {
    const invalidNames = [
      'feature with spaces',
      'feat@ure',
      '../../../etc/passwd',
      ''
    ];
    
    invalidNames.forEach(name => {
      expect(validateBranchName(name)).toBe(false);
    });
  });
});
```

### Integration Tests

Test interactions between components:

```javascript
// tests/integration/github-flow.integration.test.js
import { startGitHubFlow } from '../../src/tools/github-flow.js';
import { createMockGit } from '../utils/mockGit.js';

describe('GitHub Flow Integration', () => {
  let mockGit;
  
  beforeEach(() => {
    mockGit = createMockGit();
  });
  
  test('complete flow from branch to PR', async () => {
    const flowOptions = {
      branchName: 'feature/test',
      commitMessage: 'Add test feature',
      prTitle: 'Test PR'
    };
    
    const result = await startGitHubFlow(flowOptions, mockGit);
    
    expect(mockGit.checkoutBranch).toHaveBeenCalledWith('feature/test', 'main');
    expect(mockGit.add).toHaveBeenCalled();
    expect(mockGit.commit).toHaveBeenCalledWith('Add test feature');
    expect(mockGit.push).toHaveBeenCalled();
    expect(result.pr).toBeDefined();
  });
});
```

### End-to-End Tests

Test complete user workflows:

```javascript
// tests/e2e/complete-pr-flow.e2e.test.js
import { createTempDir, cleanupTempDir } from '../utils/testHelpers.js';
import { initializeRepository } from '../../src/tools/utilities.js';

describe('Complete PR Workflow E2E', () => {
  let tempDir;
  
  beforeEach(async () => {
    tempDir = await createTempDir();
  });
  
  afterEach(async () => {
    await cleanupTempDir(tempDir);
  });
  
  test('initialize repo, create feature, and merge PR', async () => {
    // Initialize repository
    const initResult = await initializeRepository({
      path: tempDir,
      name: 'test-repo'
    });
    expect(initResult.success).toBe(true);
    
    // Create feature branch and make changes
    // ... complete workflow test
  });
});
```

## Mocking Strategies

### When to Mock

- External services (GitHub API, file system)
- Time-dependent operations
- Network requests
- User input
- Random values

### Mocking Examples

#### Mock Git Operations

```javascript
import { createMockGit } from '../utils/mockGit.js';

const mockGit = createMockGit({
  status: jest.fn().mockResolvedValue({
    current: 'feature/test',
    modified: ['file1.js', 'file2.js']
  })
});
```

#### Mock File System

```javascript
import { createFileStructure } from '../utils/testHelpers.js';

await createFileStructure(tempDir, {
  'src/index.js': 'export default function() {}',
  'package.json': JSON.stringify({ name: 'test' }),
  '.gitignore': 'node_modules/'
});
```

#### Mock API Responses

```javascript
import { createMockAPIResponse } from '../utils/fixtures.js';

jest.mock('node-fetch');
fetch.mockResolvedValue({
  json: async () => createMockAPIResponse('/repos/owner/repo')
});
```

### Best Practices

1. **Mock at boundaries** - Mock external dependencies, not internal code
2. **Use factory functions** - Create reusable mock generators
3. **Verify mock calls** - Test that mocks were called correctly
4. **Reset between tests** - Clean state prevents test pollution

## Running Tests

### Basic Commands

```bash
# Run all tests
npm test

# Watch mode for development
npm run test:watch

# Generate coverage report
npm run test:coverage

# Run specific test file
npm test -- tests/unit/responses.test.js

# Run tests matching pattern
npm test -- --testNamePattern="should create branch"
```

### Pre-commit Testing

Tests automatically run on staged files before commit:
- ESLint fixes code style issues
- Prettier formats code
- Jest runs related tests

To skip (emergency only): `git commit --no-verify`

### Coverage Requirements

Minimum 90% coverage required for:
- Statements
- Branches
- Functions
- Lines

View detailed coverage: `open coverage/lcov-report/index.html`

## Continuous Integration

### GitHub Actions Workflow

Tests run automatically on:
- Pull request creation/update
- Merge to main branch
- Scheduled daily runs

### CI Configuration

```yaml
# .github/workflows/test.yml
name: Tests
on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - run: npm ci
      - run: npm run lint
      - run: npm run test:coverage
      - uses: codecov/codecov-action@v3
```

## Troubleshooting

### Common Issues

#### Tests Timing Out

```javascript
// Increase timeout for slow operations
test('slow operation', async () => {
  // ... test code
}, 30000); // 30 second timeout
```

#### Module Not Found

```javascript
// Ensure correct import paths for ES modules
import { myFunction } from '../src/utils/helpers.js'; // Note the .js extension
```

#### Coverage Not Meeting Threshold

1. Run coverage report: `npm run test:coverage`
2. Check "Uncovered Line #s" column
3. Write tests for uncovered code
4. Focus on untested branches and error cases

#### Mocks Not Working

```javascript
// Clear and restore mocks
beforeEach(() => {
  jest.clearAllMocks();
});

afterEach(() => {
  jest.restoreAllMocks();
});
```

### Debugging Tests

```javascript
// Add console logs
test('debugging example', () => {
  const result = complexFunction();
  console.log('Result:', result); // Temporary debug output
  expect(result).toBe(expected);
});

// Use debugger
test('debugger example', () => {
  debugger; // Pause here when running in debug mode
  const result = complexFunction();
  expect(result).toBe(expected);
});
```

## Extending the Test Suite

### Adding New Test Files

1. Create test file with `.test.js` suffix
2. Follow naming convention: `[module-name].test.js`
3. Import test utilities as needed
4. Group related tests with `describe`

### Creating Test Utilities

Add to `tests/utils/` for reusable test helpers:

```javascript
// tests/utils/customHelpers.js
export function createMockUser(overrides = {}) {
  return {
    id: 'test-user-id',
    name: 'Test User',
    email: 'test@example.com',
    ...overrides
  };
}
```

### Test Data Management

Use fixtures for complex test data:

```javascript
// tests/fixtures/repositories.js
export const sampleRepositories = {
  small: {
    name: 'small-repo',
    files: 10,
    branches: 2
  },
  large: {
    name: 'large-repo',
    files: 1000,
    branches: 50
  }
};
```

### Performance Testing

For performance-critical code:

```javascript
test('performs within acceptable time', () => {
  const start = performance.now();
  const result = performanceСriticalFunction();
  const duration = performance.now() - start;
  
  expect(duration).toBeLessThan(100); // Should complete in under 100ms
  expect(result).toBeDefined();
});
```

## Best Practices Summary

1. **Write tests first** - TDD leads to better design
2. **Keep tests simple** - One assertion per test when possible
3. **Use descriptive names** - Test names should explain what and why
4. **Isolate tests** - No dependencies between tests
5. **Mock external dependencies** - Keep tests fast and deterministic
6. **Test edge cases** - Empty inputs, errors, boundaries
7. **Maintain test quality** - Refactor tests like production code
8. **Run tests frequently** - Catch issues early
9. **Review test coverage** - But don't chase 100%
10. **Document complex tests** - Add comments for non-obvious logic

---

For more specific guidance, see:
- [Test Directory Structure](tests/README.md)
- [Coverage Guide](tests/COVERAGE.md)
- [Pre-commit Hooks](docs/PRE-COMMIT.md)
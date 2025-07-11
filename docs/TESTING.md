# Testing Guide for GLAM-MCP

This guide covers the testing strategy, tools, and best practices for the GLAM-MCP project.

## Table of Contents

- [Overview](#overview)
- [Test Structure](#test-structure)
- [Running Tests](#running-tests)
- [Writing Tests](#writing-tests)
- [Test Utilities](#test-utilities)
- [Coverage Requirements](#coverage-requirements)
- [CI/CD Integration](#cicd-integration)
- [Best Practices](#best-practices)

## Overview

GLAM-MCP uses Jest as its testing framework with ESM (ECMAScript Modules) support. The test suite includes:

- Unit tests for individual functions and modules
- Integration tests for tool handlers
- End-to-end tests for server functionality
- Comprehensive test utilities and helpers

## Test Structure

```
tests/
├── unit/                    # Unit tests
│   ├── core/               # Core module tests
│   ├── tools/              # Tool handler tests
│   ├── enhancers/          # Enhancer tests
│   ├── services/           # Service tests
│   └── utils/              # Utility tests
├── test-utils/             # Test utilities and helpers
│   ├── mocks.js           # Common mocks
│   ├── setup.js           # Test setup
│   └── tool-testing-helpers.js  # Tool test helpers
└── integration/            # Integration tests (if any)
```

## Running Tests

### Basic Commands

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage

# Generate and view coverage report
npm run coverage

# View coverage report only
npm run coverage:report
```

### Running Specific Tests

```bash
# Run a specific test file
npm test -- tests/unit/tools/github-flow.test.js

# Run tests matching a pattern
npm test -- --testNamePattern="should create branch"

# Run tests in a specific directory
npm test -- tests/unit/core
```

### Debugging Tests

```bash
# Run tests with verbose output
npm test -- --verbose

# Run tests with node inspector
node --inspect-brk --experimental-vm-modules node_modules/.bin/jest --runInBand
```

## Writing Tests

### Basic Test Structure

```javascript
import { jest } from '@jest/globals';
import { functionToTest } from '../src/module.js';

describe('Module Name', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });
  
  describe('functionToTest', () => {
    it('should do something specific', () => {
      const result = functionToTest('input');
      expect(result).toBe('expected output');
    });
    
    it('should handle errors gracefully', () => {
      expect(() => functionToTest(null)).toThrow('Invalid input');
    });
  });
});
```

### Testing Tool Handlers

```javascript
import { setupToolTest, toolAssertions } from '../../test-utils/tool-testing-helpers.js';

describe('My Tool Tests', () => {
  const testContext = setupToolTest('my-tool');
  
  beforeEach(async () => {
    await testContext.setup();
    
    // Register your tool
    const { registerMyTool } = await import('../../../src/tools/my-tool.js');
    registerMyTool(testContext.server);
  });
  
  afterEach(async () => {
    await testContext.teardown();
  });
  
  it('should handle tool operation', async () => {
    const tool = testContext.getTool('my_tool_name');
    const result = await tool.handler({ param: 'value' });
    
    toolAssertions.assertSuccess(result);
    expect(result.data).toHaveProperty('output');
  });
});
```

### Mocking Dependencies

```javascript
// Mock external modules
jest.unstable_mockModule('child_process', () => ({
  execSync: jest.fn()
}));

// Mock file system
const mockFs = {
  readFileSync: jest.fn(),
  writeFileSync: jest.fn(),
  existsSync: jest.fn()
};

jest.unstable_mockModule('fs', () => ({
  default: mockFs
}));

// Import after mocking
const { myFunction } = await import('../src/my-module.js');
```

## Test Utilities

### Mock Utilities (`tests/test-utils/mocks.js`)

```javascript
import { createMockServer, createMockContext } from './test-utils/mocks.js';

const mockServer = createMockServer();
const mockContext = createMockContext();
```

### Tool Testing Helpers (`tests/test-utils/tool-testing-helpers.js`)

The tool testing helpers provide comprehensive utilities for testing tool handlers:

```javascript
import {
  setupToolTest,      // Standard test setup/teardown
  toolAssertions,     // Common assertions
  inputSimulators,    // Input creation helpers
  sideEffectVerifiers,// Side effect verification
  ToolTestScenario,   // Complex scenario testing
  mockBuilders,       // Mock dependency builders
  testDataGenerators  // Test data generation
} from './test-utils/tool-testing-helpers.js';
```

#### Example: Testing with Tool Helpers

```javascript
// Set up test context
const testContext = setupToolTest('my-tool', {
  mockDependencies: {
    './config.js': { getConfig: jest.fn() }
  },
  mockEnvironment: {
    NODE_ENV: 'test'
  }
});

// Use input simulators
const fileInput = inputSimulators.createFileInput(
  '/test/file.txt',
  'content',
  { encoding: 'utf8' }
);

// Use mock builders
const mockFs = mockBuilders.buildMockFileSystem({
  '/test/file.txt': 'existing content'
});

// Verify side effects
sideEffectVerifiers.verifyFileSystemChanges(mockFs, {
  created: [{ path: '/test/new.txt' }],
  modified: [{ path: '/test/file.txt' }]
});

// Build complex scenarios
const scenario = new ToolTestScenario(tool)
  .addStep('Create file', { action: 'create', path: '/test.txt' })
  .addStep('Modify file', { action: 'modify', content: 'new' })
  .assertThat((result) => expect(result.success).toBe(true));

await scenario.execute();
```

## Coverage Requirements

### Coverage Thresholds

The project enforces the following coverage thresholds:

| Scope | Statements | Branches | Functions | Lines |
|-------|------------|----------|-----------|-------|
| Global | 70% | 70% | 70% | 70% |
| Core (`src/core/**`) | 80% | 80% | 80% | 80% |
| Tools (`src/tools/**`) | 60% | 60% | 60% | 60% |

### Viewing Coverage

```bash
# Generate coverage report
npm run test:coverage

# View summary in terminal
npm run coverage:report

# Open detailed HTML report
open coverage/lcov-report/index.html
```

### Coverage Reports

- **Terminal Report**: Quick summary with file breakdown
- **HTML Report**: Interactive report with line-by-line coverage
- **LCOV Report**: For CI integration
- **JSON Report**: For programmatic analysis

## CI/CD Integration

### GitHub Actions Workflows

1. **PR Checks** (`.github/workflows/pr-checks.yml`)
   - Runs tests on Node.js 18.x and 20.x
   - Enforces linting and formatting
   - Generates coverage reports
   - Posts coverage comments on PRs

2. **Coverage Report** (`.github/workflows/coverage-report.yml`)
   - Generates detailed coverage analysis
   - Creates coverage badges
   - Uploads to Codecov
   - Checks threshold compliance

3. **Coverage Diff** (`.github/workflows/coverage-diff.yml`)
   - Compares coverage between PR and base branch
   - Highlights coverage changes
   - Warns about coverage decreases

### Codecov Integration

The project uses Codecov for coverage tracking:

- View reports at: https://codecov.io/gh/[owner]/glam-mcp
- Configuration in `codecov.yml`
- Automatic PR comments with coverage changes

## Best Practices

### 1. Test Organization

- Group related tests using `describe` blocks
- Use descriptive test names that explain the expected behavior
- Keep tests focused on a single aspect
- Use `beforeEach` and `afterEach` for setup/teardown

### 2. Mocking Strategy

- Mock external dependencies (file system, network, child processes)
- Use the test utilities for consistent mocking
- Clear mocks between tests with `jest.clearAllMocks()`
- Verify mock calls when testing integrations

### 3. Async Testing

- Always use `async/await` for asynchronous tests
- Handle promise rejections properly
- Use `expect.rejects` for testing async errors

```javascript
it('should handle async errors', async () => {
  await expect(asyncFunction()).rejects.toThrow('Expected error');
});
```

### 4. Tool Testing

- Use `setupToolTest` for consistent test environment
- Test both success and failure cases
- Verify input validation
- Check side effects (file writes, command execution)
- Test error messages and response structure

### 5. Test Data

- Use test data generators for consistent test data
- Avoid hardcoding values when possible
- Create realistic test scenarios
- Test edge cases and boundary conditions

### 6. Performance

- Keep tests fast by mocking I/O operations
- Use `--runInBand` for debugging only
- Avoid unnecessary setup in tests
- Share expensive setup using `beforeAll`

### 7. Debugging Failed Tests

1. Run the specific test in isolation
2. Add `console.log` statements or use debugger
3. Check mock implementations
4. Verify test data and assertions
5. Use `--verbose` flag for more output

### 8. Writing New Tests

When adding new features:

1. Write tests first (TDD approach)
2. Cover happy path and error cases
3. Test edge cases and boundaries
4. Verify integration with existing code
5. Ensure coverage thresholds are met

## Common Patterns

### Testing Error Handling

```javascript
it('should handle missing required parameter', async () => {
  const tool = testContext.getTool('my_tool');
  const result = await tool.handler({});
  
  toolAssertions.assertFailure(result, 'Missing required parameter');
});
```

### Testing File Operations

```javascript
it('should read and transform file', async () => {
  mockFs.readFileSync.mockReturnValue('input content');
  
  const result = await fileProcessor.process('/test.txt');
  
  expect(mockFs.readFileSync).toHaveBeenCalledWith('/test.txt', 'utf8');
  expect(result).toBe('transformed content');
});
```

### Testing Command Execution

```javascript
it('should execute git command', async () => {
  mockExecSync.mockReturnValue('branch-name\n');
  
  const branch = await gitHelper.getCurrentBranch();
  
  expect(mockExecSync).toHaveBeenCalledWith(
    'git branch --show-current',
    expect.any(Object)
  );
  expect(branch).toBe('branch-name');
});
```

## Troubleshooting

### Common Issues

1. **Module not found errors**
   - Ensure mocks are defined before imports
   - Check relative import paths
   - Verify `jest.unstable_mockModule` usage

2. **Coverage not updating**
   - Clear Jest cache: `npx jest --clearCache`
   - Delete coverage directory
   - Run with `--no-cache` flag

3. **Async test timeouts**
   - Increase timeout: `jest.setTimeout(10000)`
   - Check for unresolved promises
   - Ensure proper async/await usage

4. **Mock not working**
   - Verify mock is defined before import
   - Check mock implementation
   - Use `jest.clearAllMocks()` in `beforeEach`

## Resources

- [Jest Documentation](https://jestjs.io/docs/getting-started)
- [Jest ESM Support](https://jestjs.io/docs/ecmascript-modules)
- [Testing Best Practices](https://github.com/goldbergyoni/javascript-testing-best-practices)
- [Codecov Documentation](https://docs.codecov.com/)

---

For questions or issues, please open an issue on GitHub or contact the maintainers.
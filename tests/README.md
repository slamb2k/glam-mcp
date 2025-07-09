# Test Directory Structure

This directory contains all tests for the glam-mcp project.

## Directory Organization

```
tests/
├── unit/           # Unit tests for individual functions/classes
├── integration/    # Integration tests for component interactions
├── e2e/           # End-to-end tests for complete workflows
├── fixtures/      # Test data and mock files
└── utils/         # Shared test utilities and helpers
```

## Test File Naming Conventions

- **Unit tests**: `[module-name].test.js` (e.g., `git-helpers.test.js`)
- **Integration tests**: `[feature-name].integration.test.js` (e.g., `github-flow.integration.test.js`)
- **E2E tests**: `[workflow-name].e2e.test.js` (e.g., `complete-pr-flow.e2e.test.js`)

## Test Structure Guidelines

### Unit Tests
- Test individual functions in isolation
- Mock all external dependencies
- Focus on edge cases and error conditions
- Place in `tests/unit/` directory

### Integration Tests
- Test interactions between multiple components
- Use minimal mocking (only external services)
- Verify data flow between modules
- Place in `tests/integration/` directory

### E2E Tests
- Test complete user workflows
- No mocking unless absolutely necessary
- Test against real or test environments
- Place in `tests/e2e/` directory

## Running Tests

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage

# Run specific test type
npm test -- tests/unit
npm test -- tests/integration
npm test -- tests/e2e
```

## Test Coverage Requirements

- Minimum 90% coverage for all metrics:
  - Statements: 90%
  - Branches: 90%
  - Functions: 90%
  - Lines: 90%

## Best Practices

1. **Test Isolation**: Each test should be independent and not rely on other tests
2. **Clear Descriptions**: Use descriptive test names that explain what is being tested
3. **AAA Pattern**: Follow Arrange-Act-Assert pattern for test structure
4. **Mock External Dependencies**: Mock file system, network calls, and external services
5. **Test Data**: Use fixtures for complex test data, keep simple data inline
6. **Error Testing**: Always test error cases and edge conditions
7. **Performance**: Keep unit tests fast (< 100ms per test)

## Example Test Structure

```javascript
import { describe, test, expect, jest } from '@jest/globals';
import { functionToTest } from '../../src/module.js';

describe('Module Name', () => {
  describe('functionToTest', () => {
    test('should handle normal case', () => {
      // Arrange
      const input = 'test-input';
      const expected = 'expected-output';

      // Act
      const result = functionToTest(input);

      // Assert
      expect(result).toBe(expected);
    });

    test('should handle error case', () => {
      // Arrange
      const invalidInput = null;

      // Act & Assert
      expect(() => functionToTest(invalidInput)).toThrow('Expected error message');
    });
  });
});
```

## Shared Test Utilities

Common test utilities are available in `tests/utils/`:
- `mockGit.js` - Git operation mocks
- `testHelpers.js` - Common test helper functions
- `fixtures.js` - Test data generators

## Continuous Integration

Tests are automatically run on:
- Pull request creation/update
- Push to main branch
- Pre-commit hooks (subset of tests)

See `.github/workflows/` for CI configuration.
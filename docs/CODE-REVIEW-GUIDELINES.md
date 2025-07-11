# Code Review Guidelines for Test Coverage

This document establishes guidelines for reviewing code changes with a focus on maintaining and improving test coverage.

## Table of Contents

- [Overview](#overview)
- [Pre-Review Checklist](#pre-review-checklist)
- [Review Focus Areas](#review-focus-areas)
- [Coverage Requirements](#coverage-requirements)
- [Common Issues to Check](#common-issues-to-check)
- [Review Comments Examples](#review-comments-examples)
- [Approval Criteria](#approval-criteria)

## Overview

Code reviews are essential for maintaining code quality and test coverage. Every PR should be reviewed not just for functionality, but also for adequate testing and coverage impact.

## Pre-Review Checklist

Before starting a code review, ensure:

- [ ] CI checks are passing
- [ ] Coverage report is available
- [ ] PR description explains changes
- [ ] Tests are included for new code
- [ ] Coverage hasn't decreased significantly

## Review Focus Areas

### 1. Test Coverage

**New Code Coverage**
- All new functions/methods have tests
- Both success and error paths are tested
- Edge cases are covered
- Integration points are tested

**Coverage Metrics**
- Check the coverage report comment
- Review coverage diff between base and PR
- Ensure thresholds are met:
  - Global: 70%
  - Core modules: 80%
  - Tool modules: 60%

### 2. Test Quality

**Test Structure**
```javascript
// Good: Clear, focused test
it('should return user data when ID is valid', async () => {
  const user = await getUser('123');
  expect(user).toEqual({ id: '123', name: 'Test User' });
});

// Bad: Multiple assertions, unclear purpose
it('test user', () => {
  const user = getUser('123');
  expect(user).toBeTruthy();
  expect(user.id).toBe('123');
  expect(user.name).not.toBeNull();
  expect(user.email).toContain('@');
});
```

**Test Completeness**
- Happy path scenarios
- Error scenarios
- Boundary conditions
- Invalid input handling
- Async error handling

### 3. Mock Usage

**Appropriate Mocking**
```javascript
// Good: Mock external dependencies
jest.unstable_mockModule('fs', () => ({
  readFileSync: jest.fn()
}));

// Bad: Over-mocking internal logic
jest.unstable_mockModule('./business-logic', () => ({
  calculate: () => 42  // Don't mock core logic
}));
```

**Mock Verification**
- Mocks are properly cleared
- Mock calls are verified
- Return values are realistic

### 4. Tool Handler Tests

For tool handlers specifically check:

- Handler registration is tested
- Input validation is comprehensive
- Response format follows standards
- Side effects are verified
- Error messages are helpful

Example:
```javascript
// Should test all aspects
it('should validate required parameters', async () => {
  const tool = getTool('my_tool');
  const result = await tool.handler({});
  
  expect(result.success).toBe(false);
  expect(result.message).toContain('Missing required parameter');
});
```

## Coverage Requirements

### Minimum Coverage by File Type

| File Type | Minimum Coverage | Notes |
|-----------|------------------|-------|
| Core modules (`src/core/**`) | 80% | Critical functionality |
| Tool handlers (`src/tools/**`) | 60% | User-facing features |
| Utilities (`src/utils/**`) | 70% | Shared functionality |
| Services (`src/services/**`) | 70% | Business logic |
| New files | 70% | All new code |

### Coverage Decrease Policy

- **Minor decrease (<2%)**: Acceptable with justification
- **Moderate decrease (2-5%)**: Requires explanation and plan
- **Major decrease (>5%)**: Not acceptable without exceptional circumstances

## Common Issues to Check

### 1. Untested Code Paths

Look for:
- Uncovered error handlers
- Missing edge case tests
- Untested conditional branches
- Ignored async rejections

### 2. Test Anti-Patterns

**Avoid:**
- Tests that always pass
- Commented out tests
- Tests with no assertions
- Tests that test implementation details
- Flaky tests (timing-dependent)

**Example of bad test:**
```javascript
// This test doesn't actually test anything
it('should work', () => {
  const result = someFunction();
  expect(result).toBeDefined(); // Too generic
});
```

### 3. Missing Integration Tests

For changes that:
- Modify tool handlers
- Change server behavior
- Update core functionality
- Affect multiple modules

Ensure integration tests exist.

### 4. Inadequate Error Testing

```javascript
// Good: Specific error testing
it('should throw specific error for invalid input', async () => {
  await expect(processData(null))
    .rejects.toThrow('Data cannot be null');
});

// Bad: Generic error testing
it('should handle errors', async () => {
  try {
    await processData(null);
  } catch (e) {
    expect(e).toBeDefined(); // Not specific enough
  }
});
```

## Review Comments Examples

### Requesting Tests

```markdown
🧪 **Missing tests**: This new function `calculateMetrics()` doesn't have any test coverage. Please add tests for:
- Normal calculation scenario
- Edge case with empty input
- Error handling for invalid data
```

### Coverage Concern

```markdown
📊 **Coverage decrease**: This PR reduces coverage in `src/core/server.js` from 85% to 78%. Please add tests for the uncovered lines or explain why they cannot be tested.
```

### Test Quality

```markdown
💡 **Test improvement**: This test could be more specific. Instead of:
```javascript
expect(result).toBeTruthy();
```
Consider:
```javascript
expect(result).toEqual({ status: 'success', data: expectedData });
```
```

### Mock Usage

```markdown
⚠️ **Mock verification**: The `execSync` mock is called but never verified. Add:
```javascript
expect(mockExecSync).toHaveBeenCalledWith('git status', expect.any(Object));
```
```

## Approval Criteria

### ✅ Approve When

1. **Coverage is maintained or improved**
   - No significant decrease in coverage
   - New code has adequate tests
   - Thresholds are met

2. **Tests are high quality**
   - Clear test names and structure
   - Comprehensive scenarios covered
   - Appropriate use of mocks
   - No flaky tests

3. **CI is green**
   - All tests pass
   - Linting passes
   - Coverage thresholds met

### ⏸️ Request Changes When

1. **Insufficient test coverage**
   - New code lacks tests
   - Coverage decreases significantly
   - Critical paths untested

2. **Poor test quality**
   - Unclear or overly complex tests
   - Missing error scenarios
   - Inappropriate mocking
   - Test anti-patterns present

3. **Breaking changes**
   - Existing tests removed without justification
   - Test modifications that reduce coverage
   - Changes that make tests less reliable

### 🤔 Comment When

1. **Minor improvements possible**
   - Test could be clearer
   - Additional edge case might be useful
   - Mock could be better structured

2. **Questions about approach**
   - Alternative testing strategy
   - Clarification needed
   - Architectural concerns

## Review Process

1. **Check automated reports**
   - Review CI status
   - Check coverage reports
   - Look at coverage diff

2. **Review test files**
   - Verify tests exist for changes
   - Check test quality
   - Ensure comprehensive coverage

3. **Run tests locally (if needed)**
   ```bash
   git checkout pr-branch
   npm test -- --coverage
   npm run coverage:report
   ```

4. **Provide constructive feedback**
   - Be specific about issues
   - Suggest improvements
   - Provide examples when possible

5. **Follow up**
   - Verify requested changes made
   - Re-check coverage
   - Approve when criteria met

## Best Practices for Reviewers

1. **Be constructive**: Suggest specific improvements
2. **Be consistent**: Apply guidelines uniformly
3. **Be educational**: Explain why something matters
4. **Be pragmatic**: Consider context and constraints
5. **Be timely**: Review PRs promptly

## Templates

### PR Template Addition

Add to `.github/pull_request_template.md`:

```markdown
## Testing
- [ ] Tests added for new functionality
- [ ] All tests pass locally
- [ ] Coverage maintained or improved
- [ ] No tests were removed or disabled
```

### Review Checklist

```markdown
## Code Review Checklist
- [ ] Tests cover new functionality
- [ ] Error cases are tested
- [ ] Mocks are appropriate
- [ ] Coverage thresholds met
- [ ] No test anti-patterns
```

---

Remember: Good test coverage is not just about percentages, but about confidence that the code works correctly and will continue to work when changes are made.
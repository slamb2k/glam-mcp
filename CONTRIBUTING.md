# Contributing to glam-mcp

Thank you for your interest in contributing to glam-mcp! This guide will help you get started with contributing to the project.

## Table of Contents

1. [Code of Conduct](#code-of-conduct)
2. [Getting Started](#getting-started)
3. [Development Process](#development-process)
4. [Testing Requirements](#testing-requirements)
5. [Pull Request Process](#pull-request-process)
6. [Code Review](#code-review)
7. [Style Guide](#style-guide)

## Code of Conduct

This project adheres to a code of conduct. By participating, you are expected to uphold this code. Please be respectful and inclusive in all interactions.

## Getting Started

### Prerequisites

- Node.js 18.x or 20.x
- npm 8.x or higher
- Git

### Setup

1. Fork the repository
2. Clone your fork:
   ```bash
   git clone https://github.com/YOUR_USERNAME/glam-mcp.git
   cd glam-mcp
   ```
3. Install dependencies:
   ```bash
   npm install
   ```
4. Run tests to ensure everything works:
   ```bash
   npm test
   ```

### Development Environment

- VS Code is recommended (configurations are provided)
- Install recommended extensions when prompted
- Use the provided debug configurations

## Development Process

### 1. Create a Feature Branch

```bash
git checkout -b feature/your-feature-name
# or
git checkout -b fix/your-bug-fix
```

### 2. Make Your Changes

- Write code following our style guide
- Add tests for new functionality
- Update documentation as needed

### 3. Test Your Changes

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Check coverage
npm run coverage
```

### 4. Commit Your Changes

We follow conventional commits:

```bash
git commit -m "feat: add new feature"
git commit -m "fix: resolve bug in X"
git commit -m "docs: update README"
git commit -m "test: add tests for Y"
```

## Testing Requirements

### Test Coverage

All contributions must maintain or improve test coverage:

- **Global minimum**: 70%
- **Core modules**: 80%
- **New features**: 80%+
- **Bug fixes**: Must include regression tests

### Writing Tests

1. **Use TDD when possible**: Write tests first
2. **Follow existing patterns**: See [TEST-PATTERNS.md](docs/TEST-PATTERNS.md)
3. **Test all paths**: Success, error, and edge cases
4. **Use appropriate mocks**: Mock external dependencies only

Example test structure:

```javascript
import { jest } from "@jest/globals";

describe("MyFeature", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });
  
  it("should handle success case", async () => {
    const result = await myFunction("input");
    expect(result).toBe("expected");
  });
  
  it("should handle error case", async () => {
    await expect(myFunction(null)).rejects.toThrow("Invalid input");
  });
});
```

### Running Tests

```bash
# Run all tests
npm test

# Run specific test file
npm test -- tests/unit/tools/my-tool.test.js

# Run with coverage
npm run test:coverage

# View coverage report
npm run coverage:report
```

## Pull Request Process

### Before Submitting

1. **Ensure all tests pass**: `npm test`
2. **Check coverage**: `npm run coverage`
3. **Run linter**: `npm run lint`
4. **Update documentation**: If applicable
5. **Self-review**: Check your own code

### PR Template

When creating a PR, fill out the template completely:

- Describe your changes
- Select the type of change
- Confirm testing completed
- Note coverage impact

### After Submitting

1. **Wait for CI**: Ensure all checks pass
2. **Address feedback**: Respond to review comments
3. **Keep updated**: Rebase if needed
4. **Be patient**: Reviews may take time

## Code Review

Your PR will be reviewed for:

### Code Quality
- Follows project patterns
- Clear and maintainable
- Properly documented
- No unnecessary complexity

### Test Coverage
- Adequate test coverage
- Quality of tests
- No test anti-patterns
- Coverage thresholds met

### Review Guidelines

See [CODE-REVIEW-GUIDELINES.md](docs/CODE-REVIEW-GUIDELINES.md) for detailed review criteria.

## Style Guide

### JavaScript

- Use ES modules (`import`/`export`)
- Use `async`/`await` over promises
- Prefer `const` over `let`
- Use meaningful variable names

### Testing

- Clear test descriptions
- One assertion per test (when practical)
- Group related tests with `describe`
- Use `beforeEach` for common setup

### Comments

- Write self-documenting code
- Comment complex logic
- Use JSDoc for public APIs
- Keep comments up-to-date

### Git Commits

- Use conventional commits
- Keep commits focused
- Write clear commit messages
- Reference issues when applicable

## Additional Resources

- [Testing Guide](docs/TESTING.md)
- [Test Patterns](docs/TEST-PATTERNS.md)
- [Code Review Guidelines](docs/CODE-REVIEW-GUIDELINES.md)
- [Architecture Documentation](docs/architecture/)

## Getting Help

- Open an issue for bugs
- Start a discussion for questions
- Check existing issues first
- Provide minimal reproducible examples

## Recognition

Contributors are recognized in:
- GitHub contributors page
- Release notes
- Project documentation

Thank you for contributing to glam-mcp! 🎉
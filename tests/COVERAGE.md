# Code Coverage Guide

## Overview

This project uses Jest for code coverage reporting with a minimum threshold of 90% for all metrics.

## Running Coverage Reports

```bash
# Run tests with coverage report
npm run test:coverage

# Coverage report will be generated in:
# - Terminal output (text format)
# - coverage/ directory (HTML, LCOV formats)
```

## Coverage Thresholds

The project enforces the following minimum coverage thresholds:

- **Statements**: 90%
- **Branches**: 90%
- **Functions**: 90%
- **Lines**: 90%

Tests will fail if coverage falls below these thresholds.

## Viewing Coverage Reports

### Terminal Output
When you run `npm run test:coverage`, you'll see a summary table in the terminal showing coverage percentages for each file.

### HTML Report
Open `coverage/lcov-report/index.html` in a browser for an interactive coverage report with:
- File-by-file breakdown
- Line-by-line coverage visualization
- Uncovered line highlighting

### Coverage Badges
Coverage badges can be generated from the LCOV report using services like:
- Coveralls
- Codecov
- Custom badge generators

## Understanding Coverage Metrics

### Statements
Percentage of executable statements that have been executed by tests.

### Branches
Percentage of conditional branches (if/else, switch cases, ternary operators) that have been tested.

### Functions
Percentage of functions/methods that have been called during tests.

### Lines
Percentage of source lines that have been executed.

## Excluded Files

The following files are excluded from coverage:
- Test files (`*.test.js`, `*.spec.js`)
- Entry point (`src/index.js`)
- Generated files
- Configuration files

## Improving Coverage

### Finding Uncovered Code
1. Run `npm run test:coverage`
2. Check the "Uncovered Line #s" column in the terminal output
3. Open the HTML report for detailed line-by-line coverage

### Writing Tests for Uncovered Code
1. Identify uncovered functions/branches
2. Write unit tests targeting specific scenarios
3. Focus on edge cases and error conditions
4. Use coverage report to verify improvements

## CI Integration

Coverage reports are automatically generated during CI builds:
- Pull requests show coverage changes
- Coverage must meet thresholds for PR approval
- Reports are archived as build artifacts

## Best Practices

1. **Write tests first**: Follow TDD to ensure coverage from the start
2. **Test edge cases**: Don't just test the happy path
3. **Mock external dependencies**: Focus on testing your code, not third-party libraries
4. **Regular coverage checks**: Run coverage locally before pushing
5. **Incremental improvements**: When modifying code, improve coverage for that module

## Troubleshooting

### Coverage Not Updating
- Clear Jest cache: `npx jest --clearCache`
- Delete coverage directory and regenerate
- Ensure test files are actually running

### False Coverage
- Check for code that's executed during module loading
- Verify tests are actually asserting behavior
- Look for unreachable code that should be removed

### Performance Issues
- Use `--coverage` flag only when needed (not in watch mode)
- Consider using `collectCoverageFrom` to limit scope
- Run coverage in CI, not during regular development
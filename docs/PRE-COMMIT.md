# Pre-commit Hook Configuration

## Overview

This project uses Husky and lint-staged to run automated checks before each commit, ensuring code quality and test coverage.

## What Happens on Commit

When you run `git commit`, the following checks are performed automatically:

### For JavaScript files (*.js):
1. **ESLint** - Checks for code quality issues and auto-fixes where possible
2. **Prettier** - Formats code according to project standards
3. **Jest** - Runs tests related to changed files

### For JSON and Markdown files (*.json, *.md):
1. **Prettier** - Formats files according to project standards

If any check fails, the commit will be blocked.

## Installation

Pre-commit hooks are automatically installed when you run:
```bash
npm install
```

This runs the `prepare` script which initializes Husky.

## Bypassing Hooks (Emergency Only)

If you need to commit without running hooks (not recommended):
```bash
git commit --no-verify -m "Emergency commit"
```

⚠️ **Warning**: Only use this in emergencies. Always fix any issues and run tests before pushing.

## Configuration

### Husky Configuration
- Location: `.husky/pre-commit`
- Purpose: Triggers lint-staged on pre-commit

### Lint-staged Configuration
- Location: `package.json` → `lint-staged` section
- Customizable per file type

## Performance Optimization

The configuration is optimized for performance:
- Only runs on staged files
- Uses `--findRelatedTests` for Jest to only run affected tests
- Runs all checks in parallel where possible

## Troubleshooting

### Hooks Not Running
```bash
# Reinstall Husky
npx husky install
```

### Tests Taking Too Long
- Consider adding `.lintstagedrc.js` for more granular control
- Use `--passWithNoTests` flag (already configured)

### ESLint/Prettier Conflicts
- Run `npm run format` to fix formatting issues
- Check `.eslintrc` and `.prettierrc` for conflicts

## Customizing Hooks

To add more checks:
1. Edit `package.json` → `lint-staged` section
2. Add new patterns and commands

Example:
```json
{
  "lint-staged": {
    "*.ts": ["tsc --noEmit"],
    "*.css": ["stylelint --fix"]
  }
}
```

## Best Practices

1. **Fix issues locally** - Don't rely on CI to catch problems
2. **Keep hooks fast** - Under 10 seconds total
3. **Test hooks regularly** - Make intentional errors to verify they work
4. **Document custom hooks** - If you add new checks, document them
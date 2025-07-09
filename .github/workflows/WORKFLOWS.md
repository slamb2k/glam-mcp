# GitHub Actions Release Setup

## Overview

This repository uses GitHub Actions for automated testing and releases. We have two main workflows:
- **PR Checks** - Comprehensive validation for all pull requests
- **Release** - Automated publishing to npm and GitHub releases

## Required Secrets

### NPM Token (Required for Publishing)

To publish packages to npm, you need to configure an NPM token:

1. Go to [npmjs.com](https://www.npmjs.com) and sign in
2. Navigate to Access Tokens (click your profile → Access Tokens)
3. Generate a new token:
   - Type: "Automation" (recommended) or "Publish"
   - Name: `glam-mcp-github-actions`
4. Copy the token (you won't see it again!)
5. Add to GitHub repository:
   - Go to Settings → Secrets and variables → Actions
   - Click "New repository secret"
   - Name: `NPM_TOKEN`
   - Value: Your npm token
   - Click "Add secret"

### GitHub Token

The `GITHUB_TOKEN` is automatically provided by GitHub Actions. No configuration needed.

## Release Process

### Option 1: Tag-based Release (Recommended)

1. Update version in `package.json`:
   ```bash
   npm version patch  # or minor, major
   ```

2. Push the tag to trigger release:
   ```bash
   git push origin main --tags
   ```

3. The workflow will automatically:
   - Validate the version
   - Run tests on Node.js 18.x and 20.x
   - Generate changelog from commit history
   - Publish to npm
   - Create GitHub release with assets
   - Create PR for next version bump

### Option 2: Manual Release

1. Go to the [Actions tab](../../actions) in your repository
2. Select "Release" workflow
3. Click "Run workflow"
4. Enter:
   - Version (e.g., "1.2.3" without 'v' prefix)
   - Pre-release: Check if this is a beta/alpha release
5. Click "Run workflow"

## PR Checks Workflow

All pull requests automatically trigger comprehensive checks:
- Tests on Node.js 18.x and 20.x
- Linting and formatting
- Security audit
- Code quality analysis
- Coverage reporting (commented on PR)

## Versioning Guidelines

We follow [Semantic Versioning](https://semver.org/):
- **MAJOR** version (1.0.0 → 2.0.0): Breaking API changes
- **MINOR** version (1.0.0 → 1.1.0): New features, backwards compatible
- **PATCH** version (1.0.0 → 1.0.1): Bug fixes, backwards compatible

### Pre-releases

For beta/alpha releases:
```bash
npm version prerelease --preid=beta
# Results in: 1.0.0 → 1.0.1-beta.0
```

## Commit Message Format

For better changelogs, use conventional commits:
- `feat:` New features
- `fix:` Bug fixes
- `docs:` Documentation changes
- `chore:` Maintenance tasks
- `refactor:` Code refactoring
- `test:` Test additions/changes

Example:
```
feat: add enhanced response context
fix: resolve session timeout issue
docs: update installation guide
```

## Troubleshooting

### NPM Publication Fails
- Verify NPM_TOKEN is correctly set in repository secrets
- Check if the version already exists on npm
- Ensure package.json has the correct package name

### Tests Fail in CI but Pass Locally
- Check Node.js version matches CI (18.x or 20.x)
- Ensure all dependencies are in package.json
- Verify no local-only environment variables

### Release Workflow Not Triggering
- Ensure tag follows pattern: `v*.*.*` (e.g., v1.2.3)
- Check workflow permissions in repository settings
- Verify you're pushing to the correct branch

## Branch Protection

Recommended settings for the `main` branch:
1. Go to Settings → Branches
2. Add rule for `main`
3. Enable:
   - Require PR before merging
   - Require status checks (PR Checks workflow)
   - Require branches to be up to date
   - Require conversation resolution
   - Require signed commits (optional)

## Workflow Permissions

Ensure Actions have appropriate permissions:
1. Go to Settings → Actions → General
2. Under "Workflow permissions":
   - Select "Read and write permissions"
   - Check "Allow GitHub Actions to create and approve pull requests"

---

For more details, see the workflow files:
- [pr-checks.yml](./pr-checks.yml) - PR validation
- [release.yml](./release.yml) - Release automation
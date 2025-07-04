# GitHub Actions Release Setup

## Required Secrets

### NPM Token

1. Go to npmjs.com and create an access token
2. Add it as `NPM_TOKEN` in GitHub repository secrets

### GitHub Token

The `GITHUB_TOKEN` is automatically provided by GitHub Actions.

## Manual Release Trigger

You can manually trigger a release by:

1. Go to Actions tab in your repository
2. Select "Auto Release" workflow
3. Click "Run workflow"
4. Choose the version bump type (patch/minor/major)

## Automatic Releases

Releases will automatically trigger when code is pushed to the main branch.

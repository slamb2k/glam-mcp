#!/bin/bash

# Slambed MCP NPM Publishing Script
# This script helps publish the package to npm

set -e  # Exit on error

echo "🚀 Slambed MCP Publishing Script"
echo "================================"
echo ""

# Check if logged in to npm
echo "📋 Checking npm login status..."
npm whoami > /dev/null 2>&1 || {
    echo "❌ Not logged in to npm"
    echo "Please run: npm login"
    exit 1
}

echo "✅ Logged in as: $(npm whoami)"
echo ""

# Get current version
CURRENT_VERSION=$(node -p "require('./package.json').version")
echo "📦 Current version: $CURRENT_VERSION"
echo ""

# Ask for version bump
echo "Select version bump:"
echo "1) Patch (bug fixes) - $(npm version patch --no-git-tag-version --dry-run)"
echo "2) Minor (new features) - $(npm version minor --no-git-tag-version --dry-run)"
echo "3) Major (breaking changes) - $(npm version major --no-git-tag-version --dry-run)"
echo "4) No bump (publish current version)"
read -p "Enter choice (1-4): " VERSION_CHOICE

case $VERSION_CHOICE in
    1)
        NEW_VERSION=$(npm version patch --no-git-tag-version)
        ;;
    2)
        NEW_VERSION=$(npm version minor --no-git-tag-version)
        ;;
    3)
        NEW_VERSION=$(npm version major --no-git-tag-version)
        ;;
    4)
        NEW_VERSION=$CURRENT_VERSION
        ;;
    *)
        echo "❌ Invalid choice"
        exit 1
        ;;
esac

echo ""
echo "📦 Publishing version: $NEW_VERSION"
echo ""

# Run preparation
echo "🔧 Running preparation script..."
npm run prepare:publish || {
    echo "❌ Preparation failed. Fix issues and try again."
    exit 1
}

echo ""
echo "📋 Pre-publish checklist:"
echo "  ✓ Version bumped to $NEW_VERSION"
echo "  ✓ Tests passing"
echo "  ✓ Linting passing"
echo "  ✓ Package prepared"
echo ""

# Confirm publication
read -p "🚀 Ready to publish to npm? (y/N): " -n 1 -r
echo ""

if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "❌ Publication cancelled"
    # Revert version if it was bumped
    if [ "$VERSION_CHOICE" != "4" ]; then
        git checkout package.json
        echo "↩️  Reverted version bump"
    fi
    exit 1
fi

# Commit version bump
if [ "$VERSION_CHOICE" != "4" ]; then
    git add package.json package-lock.json
    git commit -m "chore(release): bump version to $NEW_VERSION"
    git tag -a "v$NEW_VERSION" -m "Release v$NEW_VERSION"
    echo "✅ Created git commit and tag"
fi

# Publish to npm
echo ""
echo "📤 Publishing to npm..."
npm publish || {
    echo "❌ Publication failed"
    exit 1
}

echo ""
echo "✅ Successfully published slambed-mcp@$NEW_VERSION to npm!"
echo ""

# Push to git
read -p "📤 Push to git? (y/N): " -n 1 -r
echo ""

if [[ $REPLY =~ ^[Yy]$ ]]; then
    git push origin main
    git push origin "v$NEW_VERSION"
    echo "✅ Pushed to git"
fi

echo ""
echo "🎉 Publication complete!"
echo ""
echo "Next steps:"
echo "  - Update release notes on GitHub"
echo "  - Announce the release"
echo "  - Monitor for issues"
echo ""
echo "View on npm: https://www.npmjs.com/package/slambed-mcp"
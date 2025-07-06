#!/usr/bin/env node

import fs from 'fs-extra';
import path from 'path';
import chalk from 'chalk';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.join(__dirname, '..');

/**
 * Prepare package for npm publishing
 */
async function prepareForPublish() {
  console.log(chalk.blue('\n📦 Preparing slambed-mcp for npm publishing...\n'));

  try {
    // 1. Check if we're in the right directory
    const packagePath = path.join(rootDir, 'package.json');
    if (!await fs.pathExists(packagePath)) {
      throw new Error('package.json not found');
    }

    const pkg = await fs.readJson(packagePath);
    console.log(chalk.green('✓'), `Package: ${pkg.name}@${pkg.version}`);

    // 2. Create .npmignore if doesn't exist
    const npmignorePath = path.join(rootDir, '.npmignore');
    if (!await fs.pathExists(npmignorePath)) {
      const npmignoreContent = `# Development files
.git/
.github/
.vscode/
.idea/
*.log
*.lock
.DS_Store

# Test files
test/
tests/
__tests__/
*.test.js
*.spec.js

# Source control
.gitignore
.gitattributes

# CI/CD
.travis.yml
.gitlab-ci.yml
.circleci/

# Development dependencies
node_modules/
coverage/
.nyc_output/

# Environment files
.env
.env.*
!.env.example

# Build artifacts
dist/
build/
*.tgz

# Documentation source
docs-src/

# Examples that shouldn't be in package
examples/large-demos/

# Local configuration
.slambed/
*.local

# Temporary files
tmp/
temp/
`;
      await fs.writeFile(npmignorePath, npmignoreContent);
      console.log(chalk.green('✓'), 'Created .npmignore');
    }

    // 3. Ensure all required files exist
    const requiredFiles = [
      'README.md',
      'LICENSE',
      '.env.example',
      'bin/slambed.js',
      'bin/slamb-flow.js', 
      'bin/slamb-commit.js',
      'src/index.js'
    ];

    for (const file of requiredFiles) {
      const filePath = path.join(rootDir, file);
      if (!await fs.pathExists(filePath)) {
        console.log(chalk.yellow('⚠️'), `Missing required file: ${file}`);
      } else {
        console.log(chalk.green('✓'), `Found: ${file}`);
      }
    }

    // 4. Create .env.example if doesn't exist
    const envExamplePath = path.join(rootDir, '.env.example');
    if (!await fs.pathExists(envExamplePath)) {
      const envContent = `# Slambed MCP Configuration
# Copy this file to .env and fill in your API keys

# AI Service APIs (at least one required)
ANTHROPIC_API_KEY=your_anthropic_key_here
OPENAI_API_KEY=your_openai_key_here
PERPLEXITY_API_KEY=your_perplexity_key_here

# Optional AI Services
GOOGLE_API_KEY=your_google_key_here
MISTRAL_API_KEY=your_mistral_key_here
XAI_API_KEY=your_xai_key_here
OPENROUTER_API_KEY=your_openrouter_key_here

# Security (auto-generated if not provided)
JWT_SECRET=
ENCRYPTION_KEY=
SESSION_SECRET=

# Server Configuration
PORT=3000
NODE_ENV=development

# Database (optional, defaults to SQLite)
DATABASE_URL=sqlite://./data/slambed.db

# Redis (optional, for enhanced performance)
REDIS_URL=

# Feature Flags
ENABLE_LEARNING=true
ENABLE_COLLABORATION=true
ENABLE_RECOVERY=true
ENABLE_SECURITY=true
`;
      await fs.writeFile(envExamplePath, envContent);
      console.log(chalk.green('✓'), 'Created .env.example');
    }

    // 5. Ensure bin files are executable
    const binFiles = ['bin/slambed.js', 'bin/slamb-flow.js', 'bin/slamb-commit.js'];
    for (const binFile of binFiles) {
      const binPath = path.join(rootDir, binFile);
      if (await fs.pathExists(binPath)) {
        await fs.chmod(binPath, 0o755);
        console.log(chalk.green('✓'), `Made executable: ${binFile}`);
      }
    }

    // 6. Validate package.json
    const issues = [];
    
    if (!pkg.name) issues.push('Missing package name');
    if (!pkg.version) issues.push('Missing version');
    if (!pkg.description) issues.push('Missing description');
    if (!pkg.main) issues.push('Missing main entry point');
    if (!pkg.bin) issues.push('Missing bin entries');
    if (!pkg.license) issues.push('Missing license');
    if (!pkg.author) issues.push('Missing author');
    if (!pkg.repository) issues.push('Missing repository');
    
    if (issues.length > 0) {
      console.log(chalk.yellow('\n⚠️  Package.json issues:'));
      issues.forEach(issue => console.log(chalk.yellow(`   - ${issue}`)));
    } else {
      console.log(chalk.green('✓'), 'package.json validated');
    }

    // 7. Check dependencies
    console.log(chalk.blue('\n📋 Checking dependencies...'));
    
    // Look for any local file dependencies
    const deps = { ...pkg.dependencies, ...pkg.devDependencies };
    const localDeps = Object.entries(deps).filter(([name, version]) => 
      version.startsWith('file:') || version.startsWith('link:')
    );
    
    if (localDeps.length > 0) {
      console.log(chalk.red('❌'), 'Found local dependencies:');
      localDeps.forEach(([name, version]) => 
        console.log(chalk.red(`   - ${name}: ${version}`))
      );
      console.log(chalk.yellow('\n   These must be published separately or converted to npm packages'));
    } else {
      console.log(chalk.green('✓'), 'All dependencies are from npm registry');
    }

    // 8. Run tests
    console.log(chalk.blue('\n🧪 Running tests...'));
    try {
      execSync('npm test', { stdio: 'inherit', cwd: rootDir });
      console.log(chalk.green('✓'), 'Tests passed');
    } catch (error) {
      console.log(chalk.yellow('⚠️'), 'Tests failed - fix before publishing');
    }

    // 9. Build if needed
    if (pkg.scripts && pkg.scripts.build) {
      console.log(chalk.blue('\n🔨 Running build...'));
      try {
        execSync('npm run build', { stdio: 'inherit', cwd: rootDir });
        console.log(chalk.green('✓'), 'Build completed');
      } catch (error) {
        console.log(chalk.red('❌'), 'Build failed');
        throw error;
      }
    }

    // 10. Dry run
    console.log(chalk.blue('\n📦 Running npm pack (dry run)...'));
    try {
      const output = execSync('npm pack --dry-run', { cwd: rootDir, encoding: 'utf-8' });
      const lines = output.split('\n').filter(line => line.trim());
      console.log(chalk.green('✓'), `Package will include ${lines.length} files`);
      
      // Show package size
      const packOutput = execSync('npm pack', { cwd: rootDir, encoding: 'utf-8' });
      const tarballName = packOutput.trim().split('\n').pop();
      const stats = await fs.stat(path.join(rootDir, tarballName));
      const sizeMB = (stats.size / 1024 / 1024).toFixed(2);
      console.log(chalk.green('✓'), `Package size: ${sizeMB} MB`);
      
      // Clean up tarball
      await fs.remove(path.join(rootDir, tarballName));
    } catch (error) {
      console.log(chalk.red('❌'), 'Pack failed:', error.message);
    }

    // Summary
    console.log(chalk.blue('\n📋 Pre-publish checklist:'));
    console.log(chalk.white('  [ ] Fix any test failures'));
    console.log(chalk.white('  [ ] Update version in package.json'));
    console.log(chalk.white('  [ ] Update CHANGELOG.md'));
    console.log(chalk.white('  [ ] Commit all changes'));
    console.log(chalk.white('  [ ] Create git tag for version'));
    console.log(chalk.white('  [ ] Run: npm login'));
    console.log(chalk.white('  [ ] Run: npm publish'));
    
    console.log(chalk.blue('\n💡 To publish:'));
    console.log(chalk.white('  1. npm version patch/minor/major'));
    console.log(chalk.white('  2. git push --follow-tags'));
    console.log(chalk.white('  3. npm publish'));
    
    console.log(chalk.green('\n✅ Package is ready for publishing!\n'));

  } catch (error) {
    console.error(chalk.red('\n❌ Preparation failed:'), error.message);
    process.exit(1);
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  prepareForPublish();
}

export { prepareForPublish };
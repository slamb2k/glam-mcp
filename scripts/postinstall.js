#!/usr/bin/env node

import fs from 'fs-extra';
import path from 'path';
import os from 'os';
import chalk from 'chalk';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Post-installation script for slambed-mcp
 * Sets up necessary directories and configurations
 */

async function postInstall() {
  console.log(chalk.blue('\n🚀 Setting up Slambed MCP...\n'));

  try {
    // 1. Create user config directory
    const homeDir = os.homedir();
    const configDir = path.join(homeDir, '.slambed');
    await fs.ensureDir(configDir);
    console.log(chalk.green('✓ Created configuration directory'));

    // 2. Copy default configuration if doesn't exist
    const userConfig = path.join(configDir, 'config.json');
    if (!await fs.pathExists(userConfig)) {
      const defaultConfig = {
        version: '1.0',
        preferences: {
          editor: 'vscode',
          theme: 'auto',
          gitStyle: 'conventional'
        },
        api: {
          // Keys will be set by user
        },
        features: {
          learning: true,
          collaboration: true,
          recovery: true,
          security: true
        }
      };
      
      await fs.writeJson(userConfig, defaultConfig, { spaces: 2 });
      console.log(chalk.green('✓ Created default configuration'));
    }

    // 3. Create data directories
    const dataDir = path.join(configDir, 'data');
    const subdirs = ['snapshots', 'learning', 'cache', 'logs'];
    
    for (const subdir of subdirs) {
      await fs.ensureDir(path.join(dataDir, subdir));
    }
    console.log(chalk.green('✓ Created data directories'));

    // 4. Initialize database
    const dbDir = path.join(dataDir, 'db');
    await fs.ensureDir(dbDir);
    console.log(chalk.green('✓ Initialized database directory'));

    // 5. Set up environment template
    const envExample = path.join(configDir, '.env.example');
    if (!await fs.pathExists(envExample)) {
      const envContent = `# Slambed MCP Configuration
# Copy this file to .env and fill in your API keys

# AI Service APIs (at least one required)
ANTHROPIC_API_KEY=
OPENAI_API_KEY=
PERPLEXITY_API_KEY=

# Optional AI Services
GOOGLE_API_KEY=
MISTRAL_API_KEY=
XAI_API_KEY=
OPENROUTER_API_KEY=

# Security (auto-generated if not provided)
JWT_SECRET=
ENCRYPTION_KEY=
SESSION_SECRET=

# Database (optional, defaults to SQLite)
DATABASE_URL=

# Redis (optional, for enhanced performance)
REDIS_URL=

# Feature Flags
ENABLE_LEARNING=true
ENABLE_COLLABORATION=true
ENABLE_RECOVERY=true
ENABLE_SECURITY=true
`;
      
      await fs.writeFile(envExample, envContent);
      console.log(chalk.green('✓ Created environment template'));
    }

    // 6. Create Claude Desktop config helper
    const claudeConfigPath = path.join(configDir, 'claude-config.json');
    const claudeConfig = {
      mcpServers: {
        "slambed-mcp": {
          command: "node",
          args: [path.join(__dirname, '..', 'src', 'index.js')],
          cwd: path.join(__dirname, '..'),
          env: {
            // Will be populated from .env file
          }
        }
      }
    };
    
    await fs.writeJson(claudeConfigPath, claudeConfig, { spaces: 2 });
    console.log(chalk.green('✓ Created Claude Desktop config template'));

    // 7. Create quick start guide
    const quickStartPath = path.join(configDir, 'QUICKSTART.md');
    const quickStart = `# Slambed MCP Quick Start

## 1. Configure API Keys

Edit ~/.slambed/.env and add your API keys:
\`\`\`
ANTHROPIC_API_KEY=your_key_here
\`\`\`

## 2. Configure Claude Desktop

Copy the contents of ~/.slambed/claude-config.json to your Claude Desktop config.

## 3. Start Using Slambed

In Claude Desktop:
\`\`\`
slam("show me the project status")
slam("help me commit my changes")
\`\`\`

Or via CLI:
\`\`\`bash
slambed status
slambed commit
slambed --quick
\`\`\`

## Resources

- Documentation: https://github.com/your-username/slambed-mcp/docs
- Issues: https://github.com/your-username/slambed-mcp/issues
`;
    
    await fs.writeFile(quickStartPath, quickStart);
    console.log(chalk.green('✓ Created quick start guide'));

    // Success message
    console.log(chalk.blue('\n✨ Slambed MCP setup complete!\n'));
    console.log(chalk.yellow('Next steps:'));
    console.log(chalk.white('1. Configure your API keys in ~/.slambed/.env'));
    console.log(chalk.white('2. Add Slambed to Claude Desktop using ~/.slambed/claude-config.json'));
    console.log(chalk.white('3. Run "slambed --help" to get started\n'));
    
  } catch (error) {
    console.error(chalk.red('\n❌ Setup failed:'), error.message);
    console.log(chalk.yellow('\nYou can manually complete setup by:'));
    console.log(chalk.white('1. Creating ~/.slambed directory'));
    console.log(chalk.white('2. Copying .env.example to ~/.slambed/.env'));
    console.log(chalk.white('3. Adding your API keys\n'));
    process.exit(1);
  }
}

// Run post-install
postInstall().catch(console.error);
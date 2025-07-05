```
╔═══════════════════════════════════════════════════════════════════════════════════════════════════════════════╗
║                                                                                                               ║
║                                                                                                               ║
║⠀⠀  ⠀⠀⠀⠀⠀⠀⠀⣰⣿⣿⣿⡆⢀⣤⣤⣤⡀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀                                                                        ║
║⠀⠀⠀  ⠀⠀⠀⠀⠀⢠⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⢀⣀⣤⣀⠀⠀⠀⠀⠀                                                                         ║
║⠀  ⠀⠀⠀⠀⠀⠀⢀⣿⣿⣿⣿⠿⢿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣷⣀⡀⠀⠀                                                                         ║
║⠀⠀  ⠀⠀⠀⠀⠀⣼⣿⣿⣿⡟⢀⣿⣿⣿⣿⡟⢻⣿⣿⣿⣿⣿⣿⣿⣷⡄⠀           ▀██                     ▀██                  ▀██  ▄█▄       ║
║⠀⠀  ⠀⠀⢠⠆⢰⣿⣿⣿⣿⠁⣼⣿⣿⣿⡿⠀⣼⣿⣿⣿⠿⢿⣿⣿⣿⠇⠀     ▄▄▄▄   ██   ▄▄▄▄   ▄▄ ▄▄ ▄▄    ██ ▄▄▄    ▄▄▄▄    ▄▄ ██  ███       ║
║⠀  ⠀⠀⠀⣿⠀⣾⣿⣿⣿⡟⢰⣿⣿⣿⣿⠃⣸⣿⣿⣿⠏⢠⣿⣿⣿⡿⠀⠀     ██▄ ▀  ██  ▀▀ ▄██   ██ ██ ██   ██▀  ██ ▄█▄▄▄██ ▄▀  ▀██  ▀█▀       ║
║⠀  ⠀⠀⢸⡇⢠⣿⣿⣿⡿⠀⣾⣿⣿⣿⠇⢠⣿⣿⣿⡏⢠⣿⣿⣿⣿⠁⠀     ▄ ▀█▄▄  ██  ▄█▀ ██   ██ ██ ██   ██    █ ██      █▄   ██   █        ║
║⠀  ⠀⠀⣾⣧⡈⠛⢿⣿⠃⣸⣿⣿⣿⡏⢠⣿⣿⣿⡟⢀⣾⣿⣿⣿⠃⠀⠀⠀    █▀▄▄█▀ ▄██▄ ▀█▄▄▀█▀ ▄██ ██ ██▄  ▀█▄▄▄▀   ▀█▄▄▄▀ ▀█▄▄▀██▄  ▄        ║
║⠀  ⠀⠀⠿⣿⣿⣶⣄⡉⠀⢿⣿⣿⡟⠀⣾⣿⣿⡿⢀⣾⣿⣿⡿⠁⠀⠀⠀⠀                                                              ▀█▀       ║
║⠀⠀  ⠀⠀⠈⠉⠛⠛⠛⠒⠀⠈⠉⠁⠸⠿⠿⠿⠃⠾⠿⠟⠋⠀⠀⠀⠀⠀                                                                         ║
║                                                                                                                ║
║                                                                                                                ║
║                                  🚀 GitHub Flow Automation & MCP Server 🚀                                     ║
║                                                                                                                ║
║                                     Git workflows that pack a punch! ✊                                        ║
║                                                                                                                ║
╚════════════════════════════════════════════════════════════════════════════════════════════════════════════════╝
```

# Slambed MCP Server

**Comprehensive GitHub Flow Automation with MCP and CLI Support**

Transform your development workflow with powerful automation tools that handle everything from branch creation to PR merging. Slambed delivers git workflows that pack a punch! ✊

## ✨ Features

- **🤖 31+ Automation Tools** - Complete git workflow automation
- **⚡ Auto-Commit Workflows** - Branch → format → lint → commit → push → PR → merge
- **🚀 GitHub Flow** - Simple, branch-based workflow (no complex branching)
- **⚙️ GitHub Actions** - Automated CI/CD workflow creation
- **🧠 Smart Analysis** - AI-powered commit message suggestions
- **📦 Project Initialization** - Complete project setup automation
- **🔧 Dual Interface** - Both MCP server and CLI tools
- **⚙️ Configurable** - Hierarchical configuration system
- **🛡️ Safe Operations** - Built-in safety checks and rollback capabilities

## 🚀 Quick Start

### Simplified Commands

```bash
# Just run slambed - it knows what you need!
slambed                    # Smart interactive mode with context-aware suggestions

# Natural one-word commands
slambed commit             # Commit changes with AI-generated message
slambed pr                 # Create pull request from current branch
slambed sync               # Sync with main branch
slambed status             # Show repository status
slambed feature my-feature # Start a new feature branch

# Quick mode - one command does it all
slambed --quick            # Automatically perform the suggested action
```

### Classic Commands (still supported)

```bash
# Detailed control when you need it
slambed auto commit -m "Add user authentication"
slambed flow start feature-name
slambed util health
```

### MCP Integration

Add to your Claude Desktop config:

```json
{
  "mcpServers": {
    "slambed": {
      "command": "node",
      "args": ["/path/to/slambed-mcp/src/index.js"]
    }
  }
}
```

## 📋 Available Commands

### 🎯 Smart Mode (NEW!)

- `slambed` - Interactive mode with context-aware suggestions
- `slambed --quick` - Automatically perform the most likely action

### ⚡ Simplified Commands (NEW!)

- `slambed commit` - Smart commit workflow with AI message generation
- `slambed pr` - Create pull request from current branch
- `slambed sync` - Sync current branch with main
- `slambed status` - Show repository status
- `slambed publish` - Publish package to npm
- `slambed feature <name>` - Start a new feature branch

### 🤖 Automation Workflows

- `slambed auto commit` - Complete workflow: branch → format → lint → commit → push → PR → merge
- `slambed auto quick` - Quick commit with smart defaults
- `slambed auto smart` - Analyze changes and suggest commit message
- `slambed auto sync` - Sync current branch with target
- `slambed auto publish` - Automated npm publishing

### 🚀 GitHub Actions

- `slambed auto create-pr-workflow` - Create PR check workflow (lint, test, build)
- `slambed auto create-release-workflow` - Create automated release workflow

### 🌿 GitHub Flow

- `slambed flow start <name>` - Start a new branch from main
- `slambed flow finish` - Create PR for current branch
- `slambed flow quick <name>` - Quick: branch + commit + PR
- `slambed flow sync` - Sync current branch with main
- `slambed flow cleanup` - Clean up merged branches

### 🔧 Utilities

- `slambed util info` - Repository information
- `slambed util analyze` - Change analysis
- `slambed util health` - Repository health check
- `slambed util branches` - List and categorize branches

## 🎯 Examples

### Simplest Workflow Ever

```bash
# Start your work
slambed feature user-auth

# Make your changes...
# Then just run:
slambed

# Slambed detects you have changes and suggests committing
# Select "🚀 Commit changes" and you're done!
```

### One-Command Workflow

```bash
# Made some changes? Just run:
slambed --quick

# Slambed automatically:
# - Detects your changes
# - Creates a feature branch if needed
# - Generates an AI commit message
# - Pushes and creates a PR
# - Auto-merges when checks pass
```

### Natural Commands

```bash
# Commit your work
slambed commit

# Ready to ship?
slambed pr

# Stay in sync
slambed sync

# Check status
slambed status
```

### Custom Aliases

Create a `.slambed-aliases` file in your project or home directory:

```bash
# ~/.slambed-aliases
c=commit
p=pr
s=sync
ship=commit --no-merge
done=auto commit
```

Then use your shortcuts:

```bash
slambed c     # Same as: slambed commit
slambed ship  # Same as: slambed commit --no-merge
```

### Complete Feature Development (Classic)

```bash
# Start feature, make changes, then auto-commit
slamb-flow start user-auth
# ... make your changes ...
slambed auto commit -m "Implement user authentication"
```

### Project Initialization

```bash
# Initialize complete project with GitHub repo
slambed init-project --project-name "my-app" --description "My awesome app"
```

### GitHub Actions Setup

```bash
# Create PR check workflow (lint, test, build)
slambed auto create-pr-workflow --name "CI Pipeline"

# Create automated release workflow
slamb-commit create-release-workflow --type "both"
```

### Smart Development

```bash
# Let AI analyze your changes and suggest commits
slamb-commit smart --execute
```

## 🔧 Configuration

Create `.slambed.json` in your project:

```json
{
  "gitFlow": {
    "defaultBranch": "main",
    "autoMerge": true,
    "allowOutdatedBase": false
  },
  "automation": {
    "runFormat": true,
    "runLint": true,
    "runTests": false
  }
}
```

### Configuration Options

#### gitFlow.allowOutdatedBase (default: false)

Controls whether operations can proceed when the base branch (main/master) is outdated:

- `false` (default): Operations will fail if base branch is outdated and cannot be updated
- `true`: Operations will continue with warnings even if base branch is outdated

This is useful for:

- **Offline work**: Set to `true` when working without network access
- **CI environments**: May need `true` if CI has limited git access
- **Strict workflows**: Keep as `false` to ensure all work starts from latest base

Example scenarios:

```bash
# With allowOutdatedBase: false (default)
$ slambed auto commit
⚠️  Base branch (main) is 3 commits behind origin/main
  Fetched latest main from origin
  Attempting to update base branch...
  ✅ Successfully updated base branch
✓ Created branch: feature/add-authentication-2025-01-05

# With allowOutdatedBase: true
$ slambed auto commit
⚠️  Base branch (main) is 3 commits behind origin/main
⚠️  Could not update base branch due to network issue. Continuing anyway due to config...
✓ Created branch: feature/add-authentication-2025-01-05
```

## 🛠️ Installation

```bash
npm install -g slambed-mcp
```

Or clone and install locally:

```bash
git clone https://github.com/your-username/slambed-mcp.git
cd slambed-mcp
npm install
npm link
```

## License

MIT

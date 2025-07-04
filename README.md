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
║                                   🚀 Git Flow Automation & MCP Server 🚀                                      ║
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

### CLI Usage

```bash
# Main unified CLI
slambed auto commit -m "Add user authentication"

# Automation-focused CLI
slamb-commit auto -m "Fix login bug"

# Git flow-focused CLI
slamb-flow feature start user-profile
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

### Auto-Commit Workflows

- `slambed auto commit` - Complete automation workflow
- `slamb-commit quick` - Quick commit with smart defaults
- `slamb-commit smart` - AI-powered analysis and suggestions

### GitHub Actions Workflows

- `slambed auto create-pr-workflow` - Create PR check workflow (lint, test, build)
- `slamb-commit create-release-workflow` - Create automated release workflow

### GitHub Flow Operations

- `slamb-flow start <name>` - Start a new branch from main
- `slamb-flow finish` - Create PR for current branch
- `slamb-flow quick <name>` - Quick: branch + commit + PR
- `slamb-flow sync` - Sync current branch with main

### Utilities

- `slambed util info` - Repository information
- `slambed util analyze` - Change analysis
- `slambed util health` - Repository health check

## 🎯 Examples

### Complete Feature Development

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
    "autoMerge": true
  },
  "automation": {
    "runFormat": true,
    "runLint": true,
    "runTests": false
  }
}
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

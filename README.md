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

- **🤖 29+ Automation Tools** - Complete git workflow automation
- **⚡ Auto-Commit Workflows** - Branch → format → lint → commit → push → PR → merge
- **🚀 GitHub Flow** - Simple, branch-based workflow (no complex branching)
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

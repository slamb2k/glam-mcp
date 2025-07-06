# NPM Quick Start Guide

## Installation

```bash
npm install -g slambed-mcp
```

## Initial Setup

After installation, run the setup wizard:

```bash
slambed --setup
```

This will:
1. Create configuration directory at `~/.slambed`
2. Set up your API keys
3. Configure your preferences
4. Generate Claude Desktop configuration

## Basic Usage

### Interactive Mode (Default)
```bash
slambed
```

### Quick Mode
```bash
slambed --quick
```

### Natural Language Commands
```bash
slambed "show me the project status"
slambed "commit my changes with a good message"
slambed "deploy to staging"
```

### Specific Commands
```bash
slambed status      # Project status
slambed commit      # AI commit message
slambed pr          # Create pull request
slambed suggest     # Get suggestions
slambed team        # Team collaboration
```

## Claude Desktop Integration

### Option 1: Using npx (Recommended)
```bash
claude mcp add server npx --package=slambed-mcp mcp-server
```

### Option 2: Global Installation
```bash
npm install -g slambed-mcp
claude mcp add server slambed-mcp-server
```

### Option 3: Manual Configuration
Add to your Claude Desktop MCP settings:

```json
{
  "mcpServers": {
    "slambed": {
      "command": "npx",
      "args": ["--package=slambed-mcp", "mcp-server"],
      "env": {
        "GITHUB_TOKEN": "your-github-token"
      }
    }
  }
}
```

### Using SLAM Tools in Claude
Once configured, you can use SLAM tools in Claude:
- `slam_context` - Manage project context
- `slam_develop` - Development workflow
- `slam_commit` - Smart commits
- `slam_ship` - Deploy features
- `slam_learn` - Learn from patterns
- `slam_suggest` - Get suggestions
- `slam_collaborate` - Team features
- `slam_recover` - Time machine

## Required API Keys

At least one AI service API key is required:
- **ANTHROPIC_API_KEY** - For Claude models (recommended)
- **OPENAI_API_KEY** - For GPT models
- **PERPLEXITY_API_KEY** - For research features (recommended)

Set them in `~/.slambed/.env`:
```env
ANTHROPIC_API_KEY=your_key_here
PERPLEXITY_API_KEY=your_key_here
```

## Common Workflows

### Daily Development
```bash
slambed                  # Start interactive mode
slambed --quick          # Auto-execute next action
slambed status           # Check project status
slambed commit           # Commit with AI message
slambed pr               # Create pull request
```

### Team Collaboration
```bash
slambed team             # View team status
slambed team --start     # Start collaboration
slambed team --join ID   # Join session
```

### Recovery & Undo
```bash
slambed recover --save "before refactor"    # Create savepoint
slambed recover --undo 3                    # Undo 3 actions
slambed recover --restore "before refactor" # Restore savepoint
```

## Troubleshooting

### Command not found
Make sure npm global bin directory is in your PATH:
```bash
export PATH="$PATH:$(npm bin -g)"
```

### API Key Issues
Check your keys are set correctly:
```bash
cat ~/.slambed/.env
```

### MCP Connection Issues
1. Check Claude Desktop is running
2. Verify config in Claude Desktop settings
3. Try the manual configuration method
4. Check logs: `claude mcp logs slambed`
5. Restart Claude Desktop

## Getting Help

```bash
slambed help            # General help
slambed help tools      # List all tools
slambed help workflow   # Workflow examples
slambed --version       # Check version
```

## Updating

```bash
npm update -g slambed-mcp
```

## Uninstalling

```bash
npm uninstall -g slambed-mcp
```

For detailed documentation, visit:
- [Setup Guide](https://github.com/your-username/slambed-mcp/blob/main/docs/SETUP.md)
- [Usage Guide](https://github.com/your-username/slambed-mcp/blob/main/docs/USAGE.md)
- [API Reference](https://github.com/your-username/slambed-mcp/blob/main/docs/API.md)
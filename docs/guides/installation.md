# Installation Guide

This guide will help you install and configure glam-mcp for use with Claude Desktop or other MCP-compatible clients.

## Prerequisites

Before installing glam-mcp, ensure you have:

- **Node.js**: Version 18.0.0 or higher (20.x recommended)
- **npm**: Version 8.0.0 or higher
- **Git**: For version control operations
- **Operating System**: Windows, macOS, or Linux

### Verifying Prerequisites

```bash
# Check Node.js version
node --version  # Should output v18.0.0 or higher

# Check npm version
npm --version   # Should output 8.0.0 or higher

# Check Git version
git --version   # Any recent version
```

## Installation Methods

### Method 1: Install from npm (Recommended)

```bash
# Install globally
npm install -g glam-mcp

# Or install locally in a project
npm install glam-mcp
```

### Method 2: Install from Source

```bash
# Clone the repository
git clone https://github.com/slamb2k/slambed-mcp.git
cd slambed-mcp

# Install dependencies
npm install

# Link globally (optional)
npm link
```

### Method 3: Development Installation

For contributors or developers who want to modify glam-mcp:

```bash
# Clone with full history
git clone https://github.com/slamb2k/slambed-mcp.git
cd slambed-mcp

# Install dependencies including dev dependencies
npm install

# Run tests to verify setup
npm test

# Start in development mode
npm run dev
```

## Configuration

### Claude Desktop Configuration

1. Locate your Claude Desktop configuration file:
   - **macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`
   - **Windows**: `%APPDATA%\Claude\claude_desktop_config.json`
   - **Linux**: `~/.config/claude/claude_desktop_config.json`

2. Add glam-mcp to the MCP servers configuration:

```json
{
  "mcpServers": {
    "glam": {
      "command": "node",
      "args": ["/path/to/glam-mcp/src/index.js"],
      "env": {
        "GLAM_LOG_LEVEL": "info"
      }
    }
  }
}
```

If installed globally via npm:

```json
{
  "mcpServers": {
    "glam": {
      "command": "npx",
      "args": ["glam-mcp"],
      "env": {
        "GLAM_LOG_LEVEL": "info"
      }
    }
  }
}
```

### Environment Variables

glam-mcp supports the following environment variables:

| Variable | Description | Default |
|----------|-------------|---------|
| `GLAM_LOG_LEVEL` | Logging level (debug, info, warn, error) | `info` |
| `GLAM_SESSION_PATH` | Path to store session data | `./.sessions` |
| `GLAM_MAX_SESSIONS` | Maximum number of concurrent sessions | `1000` |
| `GLAM_SESSION_TIMEOUT` | Session timeout in milliseconds | `3600000` (1 hour) |
| `GITHUB_TOKEN` | GitHub personal access token for API operations | None |

### Project Configuration

Create a `.glam.json` file in your project root for project-specific settings:

```json
{
  "gitFlow": {
    "defaultBranch": "main",
    "branchPrefixes": {
      "feature": "feat/",
      "bugfix": "fix/",
      "hotfix": "hotfix/",
      "release": "release/"
    }
  },
  "automation": {
    "autoMerge": false,
    "runTests": true,
    "runLint": true,
    "runFormat": true
  },
  "team": {
    "codeOwners": {
      "src/core": ["@team-lead"],
      "src/tools": ["@tools-team"],
      "docs/": ["@docs-team"]
    }
  }
}
```

## Verification

After installation and configuration, verify that glam-mcp is working:

1. **Restart Claude Desktop** to load the new configuration

2. **Test the connection** by asking Claude:
   ```
   "Can you search for available glam-mcp tools?"
   ```

3. **Check logs** if there are issues:
   - Claude Desktop logs: Check the application's log viewer
   - glam-mcp logs: Set `GLAM_LOG_LEVEL=debug` for detailed output

## Troubleshooting

### Common Issues

#### 1. "Command not found" Error

**Solution**: Ensure Node.js is in your PATH:
```bash
which node
# Should output the path to node executable
```

#### 2. Permission Denied

**Solution**: Check file permissions:
```bash
chmod +x /path/to/glam-mcp/src/index.js
```

#### 3. Module Not Found

**Solution**: Reinstall dependencies:
```bash
cd /path/to/glam-mcp
rm -rf node_modules package-lock.json
npm install
```

#### 4. Claude Desktop Not Detecting glam-mcp

**Solution**: 
1. Verify the configuration file syntax (valid JSON)
2. Check the path to glam-mcp is correct
3. Restart Claude Desktop completely
4. Check Claude Desktop logs for error messages

### Getting Help

If you encounter issues not covered here:

1. Check the [GitHub Issues](https://github.com/slamb2k/slambed-mcp/issues)
2. Review the [FAQ](#frequently-asked-questions)
3. Create a new issue with:
   - Your OS and Node.js version
   - The exact error message
   - Your configuration (sanitized)
   - Steps to reproduce

## Frequently Asked Questions

**Q: Can I use glam-mcp with other MCP clients?**
A: Yes! glam-mcp is a standard MCP server and works with any MCP-compatible client.

**Q: How do I update glam-mcp?**
A: If installed via npm: `npm update -g glam-mcp`. If from source: `git pull && npm install`.

**Q: Can I run multiple instances of glam-mcp?**
A: Yes, configure each with different names in your MCP client configuration.

**Q: Where are session files stored?**
A: By default in `./.sessions` in your current directory. Configure with `GLAM_SESSION_PATH`.

## Next Steps

- Read the [Quick Start Guide](./quick-start.md) to learn basic usage
- Explore [Available Tools](../api/tools-reference.md) documentation
- Learn about [Advanced Features](./advanced-features.md)
- Join our [Community](https://github.com/slamb2k/slambed-mcp/discussions)
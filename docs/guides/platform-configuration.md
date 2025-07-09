# Platform Configuration Guide

This guide explains how to configure various MCP clients to work with glam-mcp.

## Supported Platforms

glam-mcp provides configuration tools for the following platforms:

1. **Claude Desktop** - Anthropic's desktop application
2. **VS Code Extensions**:
   - Cline
   - Continue
   - Cursor
   - Other MCP-compatible extensions

## Quick Setup

### Using MCP Tools

If you already have glam-mcp connected to your AI assistant:

```
You: "Set up glam-mcp configuration for my platform"

AI: "I'll help you set up glam-mcp. Let me detect your environment..."
[Detects available platforms and generates appropriate configurations]
```

### Using CLI Tool

glam-mcp includes a configuration CLI tool:

```bash
# Interactive setup
npx glam-config setup

# Generate specific platform config
npx glam-config generate claude-desktop

# List available platforms
npx glam-config list
```

## Platform-Specific Configuration

### Claude Desktop

Claude Desktop uses a JSON configuration file to manage MCP servers.

#### Configuration Location

- **macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`
- **Windows**: `%APPDATA%\Claude\claude_desktop_config.json`
- **Linux**: `~/.config/claude/claude_desktop_config.json`

#### Example Configuration

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

#### Setup Steps

1. **Close Claude Desktop** before editing configuration
2. **Create directory** if it doesn't exist
3. **Add configuration** to the JSON file
4. **Restart Claude Desktop**
5. **Verify** by asking Claude to list glam-mcp tools

### VS Code Extensions

#### Cline

Add to VS Code settings (`.vscode/settings.json` or user settings):

```json
{
  "cline.mcpServers": {
    "glam": {
      "command": "npx",
      "args": ["glam-mcp"],
      "env": {
        "GLAM_LOG_LEVEL": "info"
      },
      "cwd": "${workspaceFolder}"
    }
  }
}
```

#### Continue

```json
{
  "continue.mcpServers": [
    {
      "name": "glam",
      "command": "npx",
      "args": ["glam-mcp"],
      "env": {
        "GLAM_LOG_LEVEL": "info"
      }
    }
  ]
}
```

#### Cursor

```json
{
  "cursor.mcpServers": {
    "glam": {
      "command": "npx",
      "args": ["glam-mcp"],
      "environment": {
        "GLAM_LOG_LEVEL": "info"
      }
    }
  }
}
```

## Configuration Options

### Command Types

1. **Using npx** (Recommended for global installations):
   ```json
   {
     "command": "npx",
     "args": ["glam-mcp"]
   }
   ```

2. **Direct path** (For local installations):
   ```json
   {
     "command": "node",
     "args": ["/absolute/path/to/glam-mcp/src/index.js"]
   }
   ```

### Environment Variables

Configure glam-mcp behavior through environment variables:

```json
{
  "env": {
    "GLAM_LOG_LEVEL": "debug",        // Logging level
    "GLAM_SESSION_PATH": "./.sessions", // Session storage
    "GITHUB_TOKEN": "ghp_..."          // GitHub authentication
  }
}
```

### Log Levels

- `debug` - Detailed debugging information
- `info` - General information (default)
- `warn` - Warnings only
- `error` - Errors only

## Using Configuration Tools

### List Available Platforms

```bash
npx glam-config list
```

Or with MCP:
```
"List available configuration platforms"
```

### Generate Configuration

```bash
# Generate and display
npx glam-config generate claude-desktop

# Generate and save
npx glam-config generate claude-desktop -o config.json

# Generate with options
npx glam-config generate vscode --extension cline --log-level debug
```

Or with MCP:
```
"Generate Claude Desktop configuration for glam-mcp"
```

### Validate Configuration

```bash
npx glam-config validate claude-desktop ./config.json
```

Or with MCP:
```
"Validate my Claude Desktop configuration file"
```

### Test Connection

```bash
npx glam-config test claude-desktop ./config.json
```

Or with MCP:
```
"Test glam-mcp connection with my configuration"
```

## Troubleshooting

### Claude Desktop Issues

1. **glam-mcp not appearing**:
   - Ensure configuration file is valid JSON
   - Check file permissions
   - Restart Claude Desktop completely
   - Check logs in Claude Desktop

2. **Connection errors**:
   - Verify Node.js is installed and in PATH
   - Try absolute paths instead of npx
   - Check GLAM_LOG_LEVEL=debug for details

### VS Code Extension Issues

1. **Extension not detecting MCP server**:
   - Reload VS Code window (Ctrl/Cmd + R)
   - Check extension output panel
   - Verify settings.json syntax

2. **Permission denied**:
   - Ensure glam-mcp has execute permissions
   - Check workspace trust settings

### General Issues

1. **"Command not found"**:
   ```bash
   # Install globally
   npm install -g glam-mcp
   
   # Or use full path
   "command": "node",
   "args": ["/full/path/to/glam-mcp/src/index.js"]
   ```

2. **Version mismatch**:
   ```bash
   # Check version
   npx glam-mcp --version
   
   # Update to latest
   npm update -g glam-mcp
   ```

## Advanced Configuration

### Multiple Environments

Create different configurations for different projects:

```json
{
  "mcpServers": {
    "glam-dev": {
      "command": "npx",
      "args": ["glam-mcp"],
      "env": {
        "GLAM_LOG_LEVEL": "debug",
        "GLAM_SESSION_PATH": "./dev-sessions"
      }
    },
    "glam-prod": {
      "command": "npx",
      "args": ["glam-mcp"],
      "env": {
        "GLAM_LOG_LEVEL": "error",
        "GLAM_SESSION_PATH": "./prod-sessions"
      }
    }
  }
}
```

### Custom Scripts

Create wrapper scripts for complex setups:

```bash
#!/bin/bash
# glam-wrapper.sh
export GITHUB_TOKEN=$(cat ~/.github-token)
export GLAM_LOG_LEVEL=${DEBUG:+debug}
exec npx glam-mcp "$@"
```

Then use in configuration:
```json
{
  "command": "/path/to/glam-wrapper.sh",
  "args": []
}
```

## Best Practices

1. **Use npx** for global installations - easier updates
2. **Set appropriate log levels** - debug for development, info for daily use
3. **Secure sensitive data** - use environment variables for tokens
4. **Test configurations** - use the test command before relying on it
5. **Keep configurations in version control** - especially workspace settings

## Next Steps

- Learn about [Available Tools](../api/tools-reference.md)
- Explore [Advanced Features](./advanced-features.md)
- Read about [Session Management](./session-management.md)
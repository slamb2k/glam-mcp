# glam-mcp Documentation

Welcome to the glam-mcp documentation! This comprehensive guide covers everything you need to know about using and extending glam-mcp.

## Quick Links

- 🚀 [Quick Start Guide](./guides/quick-start.md) - Get started in 5 minutes
- 📦 [Installation Guide](./guides/installation.md) - Detailed setup instructions
- 🔄 [Migration Guide](./guides/migration-guide.md) - Migrate from slambed
- 🛠️ [API Reference](./api/tools-reference.md) - Complete tool documentation

## Documentation Structure

### 📚 Guides

User-focused documentation for getting started and using glam-mcp effectively.

- **[Installation Guide](./guides/installation.md)**  
  Complete installation instructions for all platforms
  
- **[Quick Start Guide](./guides/quick-start.md)**  
  Learn basic usage and common workflows

- **[Migration Guide](./guides/migration-guide.md)**  
  Migrate from slambed CLI to glam-mcp

- **[Developer Guide](./guides/developer-guide.md)**  
  Extend glam-mcp with custom tools and enhancers

- **[Platform Configuration Guide](./guides/platform-configuration.md)**  
  Configure MCP clients (Claude Desktop, VS Code, etc.)

### 🏗️ Architecture

Technical documentation about system design and implementation.

- **[Architecture Overview](./architecture/overview.md)**  
  System design, components, and data flow

- **[Enhanced Response System](./architecture/enhanced-response.md)**  
  Deep dive into the response enhancement pipeline

### 🔧 API Reference

Complete reference documentation for all tools and APIs.

- **[Tools Reference](./api/tools-reference.md)**  
  Comprehensive documentation of all available tools

## Key Concepts

### Enhanced Responses

Every tool in glam-mcp returns rich, structured responses:

```javascript
{
  result: {       // What happened
    success: boolean,
    data: any,
    message: string
  },
  context: {      // Intelligent assistance
    suggestions: string[],
    risks: object,
    teamActivity: object,
    bestPractices: string[]
  },
  metadata: {     // Execution details
    operation: string,
    timestamp: string,
    affectedFiles: string[]
  }
}
```

### Tool Categories

1. **GitHub Flow Tools** - Branch and PR management
2. **Automation Tools** - Smart commits and workflows
3. **Utility Tools** - Development utilities
4. **Context Tools** - Session management
5. **Team Tools** - Collaboration features
6. **Safety Tools** - Risk assessment

### Session Context

glam-mcp maintains context across operations:
- User preferences
- Recent operations
- Current repository state
- Team activity

## Common Use Cases

### Starting a New Feature

```
You: "Start a new feature for user notifications"

AI + glam-mcp: Creates branch, checks conflicts, suggests setup steps
```

### Creating Pull Requests

```
You: "Create a PR for my current branch"

AI + glam-mcp: Generates description, suggests reviewers, links issues
```

### Safety Checks

```
You: "Is it safe to merge to main?"

AI + glam-mcp: Analyzes risks, checks CI, detects conflicts
```

## Getting Help

### Support Resources

- 📖 [GitHub Wiki](https://github.com/slamb2k/slambed-mcp/wiki) - Additional guides
- 💬 [Discussions](https://github.com/slamb2k/slambed-mcp/discussions) - Community help
- 🐛 [Issue Tracker](https://github.com/slamb2k/slambed-mcp/issues) - Report bugs
- 📝 [Changelog](../CHANGELOG.md) - Version history

### Troubleshooting

Common issues and solutions:

1. **Tool not found**
   - Check MCP client configuration
   - Verify glam-mcp is running

2. **No response enhancement**
   - Check session initialization
   - Verify enhancers are loaded

3. **Git operations fail**
   - Ensure git is initialized
   - Check repository permissions

## Contributing

We welcome contributions! See our [Developer Guide](./guides/developer-guide.md) for:

- Setting up development environment
- Creating custom tools
- Writing tests
- Submitting pull requests

## Index

### All Documentation Files

#### Guides
- [Installation Guide](./guides/installation.md)
- [Quick Start Guide](./guides/quick-start.md)
- [Migration Guide](./guides/migration-guide.md)
- [Developer Guide](./guides/developer-guide.md)
- [Platform Configuration Guide](./guides/platform-configuration.md)

#### Architecture
- [Architecture Overview](./architecture/overview.md)
- [Enhanced Response System](./architecture/enhanced-response.md)

#### API Reference
- [Tools Reference](./api/tools-reference.md)

#### Project Documentation
- [Main README](../README.md)
- [CHANGELOG](../CHANGELOG.md)
- [CLAUDE.md](../CLAUDE.md) - AI assistant instructions

## Version

This documentation is for glam-mcp version 2.0.0. For documentation of other versions, see the [releases page](https://github.com/slamb2k/slambed-mcp/releases).

---

*Last updated: January 2024*
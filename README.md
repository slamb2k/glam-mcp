# glam-mcp

[![PR Checks](https://github.com/slamb2k/slambed-mcp/actions/workflows/pr-checks.yml/badge.svg)](https://github.com/slamb2k/slambed-mcp/actions/workflows/pr-checks.yml)

A pure MCP (Model Context Protocol) server that provides intelligent development experiences through rich, contextual responses for AI assistants. glam-mcp transforms AI-assisted development into a "pair programming with a senior developer" experience.

## Overview

glam-mcp is a Model Context Protocol server designed to enhance AI assistant capabilities with deep development context, team awareness, and intelligent workflow orchestration. By providing rich metadata, contextual suggestions, and safety analysis with every operation, glam-mcp enables AI assistants to deliver more intelligent and helpful development experiences.

## Key Features

### 🎯 Pure MCP Architecture
- Clean MCP server implementation without CLI dependencies
- Rich, contextual responses that guide AI assistants
- Stateful session tracking for intelligent suggestions

### 🧠 Enhanced Response System
Every tool response includes:
- **Core Results**: Operation success/failure and data
- **Context Object**: Suggestions, risks, related tools, team activity, best practices
- **Metadata**: Operation type, timestamp, affected files, session context

### 👥 Team Awareness
- Detect when team members are working on related code
- Suggest appropriate reviewers based on file ownership
- Warn about potential conflicts before they occur
- Track recent team activity on branches and files

### 🛡️ Built-in Safety
- Risk assessment for every operation
- Conflict detection and prevention
- Precondition validation
- Recovery suggestions for errors

### 🔧 Comprehensive Toolset
- **GitHub Flow Tools**: Branch creation, PR management, issue tracking
- **Automation Tools**: Smart commits, PR creation, release workflows
- **Context Tools**: Session tracking, preference management, operation history
- **Team Tools**: Activity monitoring, reviewer suggestions, conflict detection
- **Safety Tools**: Risk analysis, conflict checking, precondition validation

## Installation

```bash
npm install glam-mcp
```

## Configuration

Add to your Claude Desktop configuration (`~/.claude/claude_desktop_config.json`):

```json
{
  "mcpServers": {
    "glam": {
      "command": "node",
      "args": ["/path/to/glam-mcp/src/index.js"]
    }
  }
}
```

For other MCP clients, refer to their specific configuration documentation.

## Usage

Once configured, glam-mcp tools are available to your AI assistant. The AI will intelligently orchestrate these tools based on your natural language requests.

### Example Workflows

**Starting a new feature:**
```
"I need to create a new feature for user authentication"
```
The AI assistant will use glam-mcp to:
- Check for existing related work
- Create an appropriate branch
- Set up the initial structure
- Suggest next steps

**Creating a pull request:**
```
"Let's create a PR for this feature"
```
Slambed provides:
- Automatic commit grouping
- PR description generation
- Reviewer suggestions based on touched files
- Conflict warnings

## Tool Categories

### GitHub Flow Tools
- `github_flow_start`: Start feature development with branch creation
- `github_flow_pr`: Create PRs with intelligent defaults
- `github_check_pr_status`: Monitor PR checks and reviews

### Automation Tools
- `auto_commit`: Smart commit with conventional messages
- `auto_pr`: Automated PR creation with context
- `pr_review_checklist`: Generate review checklists

### Context Tools
- `get_session_context`: Retrieve current session state
- `set_user_preference`: Store user preferences
- `get_recent_operations`: View operation history

### Team Tools
- `check_team_activity`: Monitor team work on related code
- `find_related_work`: Discover relevant branches/PRs
- `suggest_reviewers`: Get reviewer recommendations

### Safety Tools
- `analyze_operation_risk`: Assess operation risks
- `check_for_conflicts`: Detect potential conflicts
- `validate_preconditions`: Ensure safe operations

## Architecture

```
src/
├── index.js              # MCP server entry point
├── tools/                # Tool implementations
│   ├── github-flow.js    # GitHub workflow tools
│   ├── automation.js     # Automation tools
│   ├── context.js        # Context management tools
│   ├── team.js          # Team collaboration tools
│   └── safety.js        # Safety and validation tools
├── enhancers/           # Response enrichment
│   ├── metadata.js      # Operation metadata
│   ├── suggestions.js   # Next step suggestions
│   ├── risk.js          # Risk assessment
│   └── team.js          # Team activity
├── context/             # Session management
│   └── session.js       # Session state tracking
└── utils/               # Utilities
    ├── git-helpers.js   # Git operations
    └── responses.js     # Response formatting
```

## Response Structure

Every tool returns a rich response:

```javascript
{
  success: true,
  data: { /* operation-specific data */ },
  context: {
    suggestions: ["next steps..."],
    risks: ["potential issues..."],
    relatedTools: ["tool_name"],
    teamActivity: { /* current team work */ },
    bestPractices: ["recommendations..."]
  },
  metadata: {
    operation: "tool_name",
    timestamp: "2024-01-09T10:00:00Z",
    affectedFiles: ["file1.js", "file2.js"],
    sessionContext: { /* session state */ }
  }
}
```

## Development

```bash
# Install dependencies
npm install

# Run tests
npm test

# Start in development mode
npm run dev
```

## CI/CD Pipeline

This project uses GitHub Actions for continuous integration and deployment. The pipeline ensures code quality and stability through automated testing and checks.

### Pull Request Checks

Every pull request triggers the following checks:

- **Multiple Node.js Versions**: Tests run on Node.js 18.x and 20.x
- **Test Suite**: Full test suite with coverage reporting
- **Code Linting**: ESLint checks for code quality
- **Format Checking**: Prettier validation for consistent formatting
- **Security Audit**: npm audit for dependency vulnerabilities
- **Build Verification**: Ensures the project builds successfully
- **Auto-labeling**: PRs are automatically labeled based on changed files

### Branch Protection

The `main` branch is protected with the following requirements:

- All CI checks must pass
- Branches must be up to date before merging
- Conversation resolution required before merging

### Running CI Locally

You can run the same checks locally before pushing:

```bash
# Run all tests with coverage
npm test -- --coverage

# Check linting
npm run lint

# Check formatting
npm run format:check

# Run security audit
npm audit
```

## Contributing

Contributions are welcome! Please ensure all CI checks pass before submitting your PR. The automated checks will provide feedback on any issues that need to be addressed.

## License

MIT License - see LICENSE file for details

## Support

- Issues: [GitHub Issues](https://github.com/slambrouskii/slambed-mcp/issues)
- Documentation: [Full Documentation](https://github.com/slambrouskii/slambed-mcp/wiki)

---

Built with ❤️ to make AI-assisted development more intelligent and collaborative.
# Usage Guide - Slambed MCP

Complete guide to using the Slambed MCP intelligent development assistant and all its SLAM tools.

## 🚀 Quick Start

### Basic Commands

```bash
# Universal natural language interface
slam("show me the project status")
slam("create a feature branch for user authentication")
slam("suggest next steps for my development")
slam("start a team collaboration session")
```

### Interactive Mode

```bash
# Start interactive mode with context-aware suggestions
slambed

# Quick mode - automatically perform most likely action
slambed --quick
```

## 🛠️ The 9 SLAM Tools

### 1. 🎯 slam - Universal AI Interface

The main entry point for natural language commands.

**Usage:**
```javascript
// Via MCP in Claude Desktop
slam("deploy my changes to staging")
slam("what should I work on next?")
slam("help me fix this bug in authentication")

// Via CLI
slambed "analyze my git history"
slambed "optimize my workflow"
```

**Features:**
- Natural language processing for any development task
- Context-aware command interpretation
- Intelligent routing to appropriate tools
- Help system and command suggestions

**Examples:**
```bash
slam("I need to commit my changes with a good message")
# → Routes to slam_commit for AI-generated commit message

slam("show me what's happening in my project")  
# → Routes to slam_context for comprehensive status

slam("I want to collaborate with my team")
# → Routes to slam_collaborate for team features
```

---

### 2. 📊 slam_context - Rich Project Intelligence

Comprehensive project analysis and status reporting.

**Actions:**
- `status` - Get detailed project status
- `analyze` - Deep project analysis
- `files` - File system analysis
- `git` - Git repository status
- `dependencies` - Dependency analysis

**Usage:**
```javascript
// Get comprehensive project status
slam_context("status")

// Analyze specific aspects
slam_context("analyze", { type: "performance" })
slam_context("git", { detailed: true })
slam_context("dependencies", { outdated: true })
```

**Response Format:**
```json
{
  "project": {
    "name": "my-project",
    "type": "Node.js",
    "health": "good"
  },
  "git": {
    "branch": "feature/auth",
    "commits": 15,
    "uncommitted": ["src/auth.js", "tests/auth.test.js"]
  },
  "files": {
    "total": 245,
    "modified": 3,
    "recent": ["src/auth.js", "README.md"]
  },
  "dependencies": {
    "total": 42,
    "outdated": 2,
    "vulnerable": 0
  }
}
```

**CLI Equivalent:**
```bash
slambed status      # Basic status
slambed analyze     # Deep analysis
```

---

### 3. 💡 slam_suggest - Intelligent Suggestions

AI-powered development suggestions based on project context.

**Actions:**
- `get` - Get current suggestions
- `next` - Get next recommended action
- `workflow` - Workflow optimization suggestions
- `code` - Code improvement suggestions

**Usage:**
```javascript
// Get current suggestions
slam_suggest("get")

// Get next recommended action
slam_suggest("next")

// Get workflow suggestions
slam_suggest("workflow", { area: "testing" })

// Code-specific suggestions
slam_suggest("code", { file: "src/auth.js" })
```

**Response Format:**
```json
{
  "suggestions": [
    {
      "type": "commit",
      "priority": "high",
      "title": "Commit authentication changes",
      "description": "You have uncommitted changes in auth module",
      "action": "slam_commit generate",
      "confidence": 0.9
    },
    {
      "type": "test",
      "priority": "medium", 
      "title": "Add unit tests",
      "description": "Auth module missing test coverage",
      "action": "slam_develop test --file=src/auth.js",
      "confidence": 0.7
    }
  ]
}
```

**CLI Equivalent:**
```bash
slambed suggest     # Get suggestions
slambed next        # Next action
```

---

### 4. ⚡ slam_develop - Development Acceleration

Code development, testing, and build automation.

**Actions:**
- `start` - Start development server
- `test` - Run tests
- `build` - Build project
- `lint` - Code linting
- `format` - Code formatting
- `run` - Run custom scripts

**Usage:**
```javascript
// Start development
slam_develop("start")
slam_develop("start", { port: 3001, env: "development" })

// Testing
slam_develop("test")
slam_develop("test", { file: "auth.test.js", watch: true })

// Build and formatting
slam_develop("build", { production: true })
slam_develop("format", { files: ["src/**/*.js"] })

// Custom scripts
slam_develop("run", { script: "deploy:staging" })
```

**Response Format:**
```json
{
  "success": true,
  "action": "test",
  "results": {
    "tests": 24,
    "passed": 22,
    "failed": 2,
    "coverage": "87%"
  },
  "output": "Test output...",
  "duration": 1243
}
```

**CLI Equivalent:**
```bash
slambed dev         # Start development
slambed test        # Run tests
slambed build       # Build project
```

---

### 5. 🚢 slam_ship - Deployment & Release

Automated deployment and release management.

**Actions:**
- `deploy` - Deploy to environment
- `release` - Create release
- `promote` - Promote between environments
- `rollback` - Rollback deployment
- `status` - Deployment status

**Usage:**
```javascript
// Deploy to environments
slam_ship("deploy", { 
  environment: "staging",
  branch: "feature/auth"
})

slam_ship("deploy", {
  environment: "production", 
  tag: "v1.2.0"
})

// Release management
slam_ship("release", { 
  version: "1.2.0",
  changelog: true 
})

// Operations
slam_ship("promote", { 
  from: "staging", 
  to: "production" 
})

slam_ship("rollback", { 
  environment: "production",
  version: "1.1.9"
})
```

**Response Format:**
```json
{
  "success": true,
  "action": "deploy",
  "environment": "staging",
  "deployment": {
    "id": "deploy-123",
    "status": "success",
    "url": "https://staging.example.com",
    "health": "healthy"
  },
  "duration": 45000
}
```

**CLI Equivalent:**
```bash
slambed ship               # Deploy to default
slambed deploy staging     # Deploy to staging  
slambed release 1.2.0      # Create release
```

---

### 6. 📝 slam_commit - AI-Powered Git Operations

Intelligent git operations with AI-generated commit messages.

**Actions:**
- `generate` - Generate commit message
- `commit` - Commit with AI message
- `amend` - Amend last commit
- `history` - Analyze commit history
- `branch` - Branch operations

**Usage:**
```javascript
// Generate commit message
slam_commit("generate")
slam_commit("generate", { 
  type: "feat",
  scope: "auth",
  files: ["src/auth.js"]
})

// Commit operations
slam_commit("commit", { 
  message: "feat(auth): implement JWT authentication",
  push: true 
})

// History analysis
slam_commit("history", { 
  count: 10,
  analyze: true 
})

// Branch operations
slam_commit("branch", { 
  action: "create",
  name: "feature/new-auth",
  from: "main"
})
```

**Response Format:**
```json
{
  "success": true,
  "action": "generate",
  "message": {
    "title": "feat(auth): implement JWT authentication system",
    "body": "- Add JWT token generation and validation\n- Implement middleware for route protection\n- Add user session management\n- Include comprehensive error handling",
    "type": "feat",
    "scope": "auth",
    "confidence": 0.95
  },
  "files": ["src/auth.js", "src/middleware/auth.js"],
  "stats": {
    "additions": 145,
    "deletions": 12
  }
}
```

**CLI Equivalent:**
```bash
slambed commit             # AI commit
slambed commit -m "msg"    # Manual message
```

---

### 7. 🤝 slam_collaborate - Team Collaboration

Real-time team collaboration and workspace sharing.

**Actions:**
- `start` - Start collaboration session
- `join` - Join existing session
- `invite` - Invite team members
- `status` - Team status
- `chat` - Team chat
- `lock` - File locking
- `share` - Share workspace

**Usage:**
```javascript
// Start collaboration
slam_collaborate("start", {
  name: "Auth Feature Sprint",
  members: ["alice@team.com", "bob@team.com"]
})

// Join session
slam_collaborate("join", { 
  sessionId: "collab-123" 
})

// Team operations
slam_collaborate("invite", {
  email: "charlie@team.com",
  role: "developer"
})

slam_collaborate("chat", {
  message: "Ready to review the auth changes"
})

// File operations
slam_collaborate("lock", { 
  file: "src/auth.js",
  duration: 3600 
})
```

**Response Format:**
```json
{
  "success": true,
  "action": "start",
  "session": {
    "id": "collab-123",
    "name": "Auth Feature Sprint",
    "members": [
      {
        "id": "user-1",
        "name": "Alice",
        "status": "online",
        "cursor": { "file": "src/auth.js", "line": 45 }
      }
    ],
    "chat": {
      "enabled": true,
      "messages": 12
    },
    "locks": {
      "src/auth.js": "user-1"
    }
  }
}
```

**CLI Equivalent:**
```bash
slambed team               # Team status
slambed collaborate        # Start session
```

---

### 8. 🧠 slam_learn - Personalization & Learning

Adaptive learning system with user personalization.

**Actions:**
- `profile` - User profile management
- `preferences` - Set preferences
- `history` - Learning history
- `suggest` - Personalized suggestions
- `train` - Train models
- `privacy` - Privacy settings

**Usage:**
```javascript
// Profile management
slam_learn("profile")
slam_learn("profile", { 
  update: {
    editor: "vscode",
    theme: "dark",
    workingHours: { start: 9, end: 17 }
  }
})

// Preferences
slam_learn("preferences", {
  git: {
    commitStyle: "conventional",
    branchPrefix: "feature/",
    autoRebase: true
  },
  shortcuts: {
    "c": "commit",
    "p": "push"
  }
})

// Learning operations
slam_learn("train", { 
  feature: "commit_patterns",
  data: "recent_commits"
})

slam_learn("privacy", { 
  mode: "balanced",
  dataCollection: {
    commands: true,
    files: false,
    timing: true
  }
})
```

**Response Format:**
```json
{
  "success": true,
  "action": "profile",
  "profile": {
    "id": "user-123",
    "name": "Developer",
    "preferences": {
      "editor": "vscode",
      "theme": "dark",
      "gitStyle": "conventional"
    },
    "patterns": {
      "mostUsedCommands": ["commit", "status", "push"],
      "workingHours": "9-17",
      "productivity": {
        "peakHours": ["10-12", "14-16"],
        "avgCommitsPerDay": 8
      }
    },
    "suggestions": {
      "personalized": true,
      "accuracy": 0.87
    }
  }
}
```

**CLI Equivalent:**
```bash
slambed profile            # View profile
slambed learn              # Learning status
```

---

### 9. ⏰ slam_recover - Time Machine & Recovery

Advanced undo system with state snapshots and recovery.

**Actions:**
- `save` - Create savepoint
- `restore` - Restore to savepoint
- `undo` - Undo recent actions
- `history` - Action history
- `snapshot` - Create snapshot
- `list` - List recovery points

**Usage:**
```javascript
// Create savepoints
slam_recover("save", { 
  name: "Before auth refactor",
  description: "Stable state before major changes"
})

// Recovery operations
slam_recover("restore", { 
  savepoint: "auth-refactor-start" 
})

slam_recover("undo", { 
  count: 3,
  preview: true 
})

// History and snapshots
slam_recover("history", { 
  limit: 20,
  details: true 
})

slam_recover("snapshot", { 
  compress: true,
  include: ["src/", "tests/"]
})
```

**Response Format:**
```json
{
  "success": true,
  "action": "save",
  "savepoint": {
    "id": "save-123",
    "name": "Before auth refactor", 
    "timestamp": 1704067200000,
    "size": "2.3MB",
    "files": 45,
    "git": {
      "commit": "a1b2c3d",
      "branch": "feature/auth"
    }
  },
  "history": [
    {
      "action": "file_modified",
      "file": "src/auth.js",
      "timestamp": 1704067180000
    },
    {
      "action": "commit_created", 
      "commit": "a1b2c3d",
      "timestamp": 1704067100000
    }
  ]
}
```

**CLI Equivalent:**
```bash
slambed save "checkpoint"  # Create savepoint
slambed undo 3            # Undo 3 actions
slambed history           # Show history
```

---

## 🔄 Workflow Examples

### Daily Development Workflow

```javascript
// 1. Start your day
slam_context("status")
// → Shows: uncommitted changes, pending PRs, team activity

// 2. Get suggestions  
slam_suggest("next")
// → Suggests: "Commit auth changes, then start testing"

// 3. Commit work
slam_commit("generate")
// → Generates: "feat(auth): implement JWT middleware"

// 4. Continue development
slam_develop("test", { watch: true })
// → Runs tests in watch mode

// 5. Collaborate
slam_collaborate("status")  
// → Shows team activity and shared files
```

### Feature Development Workflow

```javascript
// 1. Create savepoint
slam_recover("save", { name: "Feature start" })

// 2. Start collaboration
slam_collaborate("start", { 
  name: "User Management Feature",
  members: ["team@company.com"]
})

// 3. Development loop
slam_develop("start")           // Start dev server
slam_suggest("code")            // Get code suggestions  
slam_commit("commit")           // Commit progress
slam_develop("test")            // Run tests

// 4. Deploy and release
slam_ship("deploy", { environment: "staging" })
slam_ship("release", { version: "1.1.0" })
```

### Team Collaboration Workflow

```javascript
// Team Lead
slam_collaborate("start", {
  name: "Sprint Planning",
  members: ["alice@team.com", "bob@team.com"]
})

// Team Members
slam_collaborate("join", { sessionId: "collab-123" })

// During collaboration
slam_collaborate("lock", { file: "src/feature.js" })
slam_collaborate("chat", { message: "Working on the API integration" })

// Share progress
slam_context("status")          // Share current status
slam_commit("generate")         // Show planned commits
```

### Crisis Recovery Workflow

```javascript
// 1. Assess situation
slam_context("analyze", { type: "issues" })

// 2. Check history
slam_recover("history", { details: true })

// 3. Undo problematic changes
slam_recover("undo", { count: 5, preview: true })

// 4. Restore from savepoint
slam_recover("restore", { savepoint: "stable-state" })

// 5. Verify recovery
slam_develop("test")
slam_ship("status")
```

---

## 🎛️ Advanced Configuration

### Learning System Configuration

```javascript
// Configure learning preferences
slam_learn("privacy", {
  mode: "balanced",           // strict, balanced, permissive
  dataCollection: {
    commands: true,           // Learn from command patterns
    files: false,             // Don't track file contents
    timing: true,             // Learn optimal timing
    errors: true              // Learn from errors
  },
  retention: "30d",           // Keep data for 30 days
  anonymization: true         // Anonymize personal data
})

// Set development preferences
slam_learn("preferences", {
  git: {
    commitStyle: "conventional",
    branchPrefix: "feature/",
    autoRebase: true,
    signCommits: true
  },
  editor: {
    name: "vscode",
    formatOnSave: true,
    linting: true
  },
  workflow: {
    testFirst: true,
    deployToStaging: true,
    requireReviews: true
  }
})
```

### Collaboration Configuration

```javascript
// Team workspace settings
slam_collaborate("configure", {
  workspace: {
    name: "Development Team",
    permissions: {
      "lead": ["read", "write", "admin"],
      "senior": ["read", "write", "review"],
      "junior": ["read", "write"]
    },
    lockDuration: 3600,       // 1 hour default
    chatEnabled: true,
    screenShare: true
  },
  notifications: {
    fileChanges: true,
    deployments: true,
    conflicts: true
  }
})
```

### Recovery System Configuration

```javascript
// Configure automatic snapshots
slam_recover("configure", {
  autoSave: {
    enabled: true,
    interval: 300,            // 5 minutes
    triggers: ["commit", "deploy", "test-fail"],
    maxSnapshots: 50
  },
  compression: {
    enabled: true,
    algorithm: "gzip",
    level: 6
  },
  retention: {
    snapshots: "7d",          // Keep snapshots for 7 days
    history: "30d",           // Keep history for 30 days
    savepoints: "90d"         // Keep manual savepoints for 90 days
  }
})
```

---

## 🔧 Integration Examples

### CI/CD Pipeline Integration

```yaml
# .github/workflows/slam-integration.yml
name: Slambed Integration
on: [push, pull_request]

jobs:
  slam-workflow:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      
      - name: Setup Slambed
        run: npm install -g slambed-mcp
        
      - name: Analyze Changes
        run: |
          slambed context analyze --type=changes
          slambed suggest code --files=changed
          
      - name: Test with Slambed
        run: slambed develop test --coverage
        
      - name: Deploy if Ready
        if: github.ref == 'refs/heads/main'
        run: slambed ship deploy --environment=production
```

### IDE Integration (VS Code)

```json
// .vscode/tasks.json
{
  "version": "2.0.0",
  "tasks": [
    {
      "label": "Slam: Get Suggestions",
      "type": "shell", 
      "command": "slambed suggest",
      "group": "build"
    },
    {
      "label": "Slam: Smart Commit",
      "type": "shell",
      "command": "slambed commit",
      "group": "build"
    },
    {
      "label": "Slam: Team Status",
      "type": "shell", 
      "command": "slambed team",
      "group": "build"
    }
  ]
}
```

### Docker Integration

```dockerfile
# Dockerfile with Slambed
FROM node:18-alpine

# Install Slambed
RUN npm install -g slambed-mcp

# Set up workspace
WORKDIR /app
COPY . .

# Configure Slambed
RUN slambed init-workspace --docker

# Start with collaboration enabled
CMD ["slambed", "collaborate", "--docker-mode"]
```

---

## 🚨 Troubleshooting

### Common Issues

#### MCP Connection Problems
```bash
# Check MCP status
slam_context("status", { mcp: true })

# Test connection
slambed test-connection

# Debug mode
DEBUG=slambed:mcp slambed status
```

#### Performance Issues
```bash
# Clear learning cache
slam_learn("clear-cache")

# Optimize snapshots
slam_recover("optimize")

# Check system resources
slam_context("analyze", { type: "performance" })
```

#### Collaboration Issues
```bash
# Check team connectivity
slam_collaborate("diagnose")

# Reset session
slam_collaborate("reset", { sessionId: "collab-123" })

# Sync workspace
slam_collaborate("sync", { force: true })
```

### Error Codes

| Code | Description | Solution |
|------|-------------|----------|
| `SLAM_001` | Tool not found | Check tool name spelling |
| `SLAM_002` | Invalid action | Use `slam("help", { tool: "tool_name" })` |
| `SLAM_003` | Permission denied | Check user permissions |
| `SLAM_004` | Network error | Check internet connection |
| `SLAM_005` | API limit exceeded | Wait or upgrade API plan |

### Getting Help

```javascript
// Tool-specific help
slam("help", { tool: "slam_commit" })
slam("help", { action: "deploy" })

// General help
slam("help")
slam("examples")
slam("troubleshoot")
```

---

## 📊 Monitoring & Analytics

### Usage Analytics

```javascript
// View your usage patterns
slam_learn("analytics", {
  period: "week",
  metrics: ["commands", "productivity", "collaboration"]
})

// Team analytics (for leads)
slam_collaborate("analytics", {
  team: true,
  metrics: ["activity", "conflicts", "efficiency"]
})
```

### Performance Monitoring

```javascript
// System performance
slam_context("performance", {
  history: "24h",
  metrics: ["response_time", "error_rate", "throughput"]
})

// Recovery system health
slam_recover("health", {
  checkSnapshots: true,
  checkHistory: true,
  checkDisk: true
})
```

---

## 🎓 Best Practices

### Development Workflow
1. **Start with context**: Always begin with `slam_context("status")`
2. **Follow suggestions**: Use `slam_suggest("next")` for guided development
3. **Commit frequently**: Use `slam_commit("generate")` for consistent messages
4. **Save checkpoints**: Use `slam_recover("save")` before major changes
5. **Collaborate actively**: Use `slam_collaborate` for team coordination

### Security Best Practices  
1. **Configure privacy**: Set appropriate `slam_learn("privacy")` settings
2. **Use role-based access**: Configure team permissions properly
3. **Regular backups**: Enable automatic snapshots in `slam_recover`
4. **Monitor access**: Review audit logs in security dashboard
5. **Rotate credentials**: Regularly update API keys and tokens

### Performance Optimization
1. **Cache management**: Regularly clear old caches and snapshots
2. **Selective learning**: Configure learning to focus on relevant patterns
3. **Batch operations**: Group related actions together
4. **Resource monitoring**: Monitor system resources and usage patterns
5. **Network optimization**: Use local caching where possible

---

**Next Steps**: See [Setup Guide](./SETUP.md) for installation instructions or [API Documentation](./API.md) for detailed API reference.
# Quick Start Guide

Welcome to glam-mcp! This guide will help you get started with basic operations.

## Overview

glam-mcp enhances your AI assistant with intelligent development tools that understand context, suggest best practices, and help prevent common mistakes. Think of it as adding a senior developer's expertise to your AI assistant.

## Basic Concepts

### Enhanced Responses

Every tool in glam-mcp returns rich, contextual information:

- **Result**: The actual operation outcome
- **Context**: Suggestions, warnings, related tools, and best practices
- **Metadata**: Timestamps, affected files, session information

### Session Context

glam-mcp maintains context across operations, remembering:
- Your current branch and repository state
- Recent operations and their outcomes
- Your preferences and patterns
- Team activity and potential conflicts

## Common Workflows

### 1. Starting a New Feature

Ask your AI assistant:
```
"Start a new feature branch for user authentication"
```

glam-mcp will:
- Create a branch with a smart name (e.g., `feat/user-authentication-2024-01-09`)
- Check for conflicts with team members
- Suggest related tasks and setup steps
- Track the feature in session context

### 2. Making Smart Commits

```
"Commit my changes with an appropriate message"
```

glam-mcp will:
- Analyze your changes
- Generate a conventional commit message
- Warn about potential issues (large files, secrets, etc.)
- Suggest additional actions (tests, documentation)

### 3. Creating Pull Requests

```
"Create a PR for my current branch"
```

glam-mcp will:
- Generate a comprehensive PR description
- Suggest reviewers based on code ownership
- Check CI status and test coverage
- Link related issues automatically

### 4. Safety Checks

```
"Check if it's safe to merge my branch"
```

glam-mcp will:
- Analyze potential conflicts
- Check team activity on related files
- Verify CI/CD status
- Assess risk level with explanations

## Example Conversations

### Scenario 1: Feature Development

**You**: "I need to add a password reset feature"

**AI + glam-mcp**: "I'll help you add a password reset feature. Let me start by creating a feature branch.

*Creates branch: `feat/password-reset-flow-2024-01-09`*

I've created the feature branch. Based on your codebase analysis:
- Found existing auth utilities in `src/auth/`
- Detected email service in `src/services/email.js`
- No team members currently working on auth files

Suggested next steps:
1. Create password reset token model
2. Add reset request endpoint
3. Implement email template
4. Add reset confirmation endpoint

Would you like me to start with any of these?"

### Scenario 2: Collaborative Safety

**You**: "Can you update the user model to add a last_login field?"

**AI + glam-mcp**: "I'll help you update the user model. Let me first check for any potential conflicts.

⚠️ **Team Activity Detected**:
- Sarah is currently working on `src/models/user.js` (branch: `feat/user-profiles`)
- Last modified: 2 hours ago

I recommend:
1. Sync with Sarah before making changes
2. Or create your changes in a separate branch and coordinate the merge

Would you like me to:
- Check what changes Sarah has made?
- Create a branch for your changes?
- Continue anyway (not recommended)?"

### Scenario 3: Smart Automation

**You**: "Commit and push my changes"

**AI + glam-mcp**: "I'll analyze your changes and create an appropriate commit.

**Changes detected**:
- Modified: `src/api/users.js` (added validation)
- Modified: `tests/api/users.test.js` (new test cases)
- Modified: `README.md` (updated API docs)

**Generated commit message**:
```
feat(api): add email validation to user registration

- Add email format validation using validator.js
- Include unit tests for validation logic  
- Update API documentation with validation rules
- Return 400 error for invalid email formats

Closes #123
```

✅ All checks passed:
- No large files
- No detected secrets
- Tests are included
- Documentation updated

Proceeding with commit and push..."

## Best Practices

### 1. Let Context Build

glam-mcp becomes more helpful as it learns your patterns:
- It remembers your branch naming preferences
- It learns your commit message style
- It tracks your common workflows

### 2. Review Suggestions

Always review glam-mcp's suggestions:
- Commit messages may need adjustment
- PR descriptions should be personalized
- Team conflicts need human judgment

### 3. Use Safety Features

Take advantage of built-in safety:
- Always check for conflicts before major changes
- Review risk assessments for merges
- Let glam-mcp check for common issues

### 4. Leverage Team Features

glam-mcp helps with collaboration:
- Find the right reviewers
- Avoid stepping on teammates' work
- Coordinate complex changes

## Common Commands

Here are phrases your AI assistant will understand with glam-mcp:

**Git Operations**:
- "Create a new feature branch"
- "Show me the current git status"
- "Commit my changes"
- "Push to remote"
- "Create a pull request"

**Safety Checks**:
- "Is it safe to merge?"
- "Check for conflicts"
- "Who's working on these files?"
- "Analyze risks"

**Automation**:
- "Set up CI/CD"
- "Create a release"
- "Update dependencies"
- "Run checks"

**Information**:
- "Show recent changes"
- "Find TODOs"
- "Show project structure"
- "Search for [term]"

## Tips for Success

1. **Be Specific**: "Create a PR" → "Create a PR for the user auth feature with testing details"

2. **Ask for Analysis**: "Should I merge?" → "Analyze the risks of merging my branch to main"

3. **Use Context**: Reference previous operations - glam-mcp remembers what you've been working on

4. **Explore Tools**: Ask "What tools are available for testing?" to discover capabilities

## Getting Help

- **See all tools**: "Show me all available glam-mcp tools"
- **Get tool info**: "How does the github_flow_start tool work?"
- **Best practices**: "What's the best way to handle merge conflicts?"
- **Troubleshooting**: "Why did my last operation fail?"

## Next Steps

Now that you understand the basics:

1. Try the [Tutorial: Your First Feature](./tutorial-first-feature.md)
2. Explore [Advanced Workflows](./advanced-features.md)
3. Learn about [Team Collaboration](./team-features.md)
4. Read the [Tool Reference](../api/tools-reference.md)

Remember: glam-mcp is designed to make you more productive while preventing common mistakes. Don't hesitate to explore and ask questions!
# Developer Guide

This guide covers how to extend and customize glam-mcp for your specific needs.

## Development Setup

### Prerequisites

- Node.js 18+ with npm 8+
- Git
- A code editor with JavaScript/ES6 support
- Basic understanding of MCP (Model Context Protocol)

### Setting Up Development Environment

1. **Clone the repository**:
```bash
git clone https://github.com/slamb2k/slambed-mcp.git
cd slambed-mcp
git checkout -b your-feature-branch
```

2. **Install dependencies**:
```bash
npm install
```

3. **Run tests to verify setup**:
```bash
npm test
```

4. **Start in development mode**:
```bash
npm run dev
```

## Project Structure

```
glam-mcp/
├── src/
│   ├── index.js              # Main MCP server entry
│   ├── core/                 # Core systems
│   │   ├── enhanced-response.js
│   │   ├── session-manager.js
│   │   └── tool-registry.js
│   ├── enhancers/           # Response enhancers
│   │   ├── base-enhancer.js
│   │   └── core/
│   ├── tools/               # Tool implementations
│   │   ├── github-flow.js
│   │   ├── automation.js
│   │   └── ...
│   └── utils/               # Utilities
├── tests/                   # Test suite
├── docs/                    # Documentation
└── examples/                # Usage examples
```

## Creating New Tools

### Tool Structure

Every tool must follow this structure:

```javascript
export function registerMyTools(server) {
  server.addTool({
    name: "my_tool_name",
    description: "What this tool does. Use this when you need to...",
    inputSchema: {
      type: "object",
      properties: {
        param1: {
          type: "string",
          description: "Parameter description"
        },
        param2: {
          type: "number",
          description: "Optional parameter",
          default: 10
        }
      },
      required: ["param1"]
    },
    handler: async (params) => {
      // Implementation
      return createResponse(success, data, message);
    },
    metadata: {
      category: ToolCategories.UTILITY,
      tags: ['custom', 'example'],
      riskLevel: 'low'
    }
  });
}
```

### Step-by-Step Tool Creation

1. **Create a new file** in `src/tools/`:
```javascript
// src/tools/my-custom-tools.js
import { createResponse } from '../utils/responses.js';
import { ToolCategories } from '../core/tool-registry.js';

export function registerMyCustomTools(server) {
  // Tool implementation
}
```

2. **Implement the tool logic**:
```javascript
server.addTool({
  name: "analyze_code_quality",
  description: "Analyzes code quality metrics. Use this to get insights about code health.",
  inputSchema: {
    type: "object",
    properties: {
      path: {
        type: "string",
        description: "Path to analyze"
      },
      metrics: {
        type: "array",
        items: { type: "string" },
        description: "Metrics to calculate",
        default: ["complexity", "duplication", "coverage"]
      }
    },
    required: ["path"]
  },
  handler: async ({ path, metrics }) => {
    try {
      // Your implementation
      const analysis = await analyzeCode(path, metrics);
      
      return createResponse(
        true,
        {
          path,
          metrics: analysis,
          score: calculateScore(analysis)
        },
        `Code quality analysis complete for ${path}`
      );
    } catch (error) {
      return createResponse(
        false,
        null,
        `Analysis failed: ${error.message}`
      );
    }
  }
});
```

3. **Register in main server**:
```javascript
// src/index.js
import { registerMyCustomTools } from './tools/my-custom-tools.js';

// In registerTools method
registerMyCustomTools(this);
```

4. **Add tests**:
```javascript
// tests/unit/tools/my-custom-tools.test.js
describe('My Custom Tools', () => {
  it('should analyze code quality', async () => {
    const result = await tool.handler({
      path: 'src/',
      metrics: ['complexity']
    });
    
    expect(result.result.success).toBe(true);
    expect(result.result.data.metrics).toBeDefined();
  });
});
```

## Creating Custom Enhancers

### Enhancer Structure

```javascript
import { BaseEnhancer } from './base-enhancer.js';

export class CustomEnhancer extends BaseEnhancer {
  constructor() {
    super('custom', 'Adds custom enhancements');
    this.priority = 150; // Higher = runs later
  }

  async enhance(response, context) {
    // Don't modify response directly
    const enhanced = { ...response };
    
    // Add your enhancements
    enhanced.context.customData = await this.analyze(context);
    
    return enhanced;
  }
  
  async analyze(context) {
    // Your analysis logic
    return {
      insight: "Custom insight",
      metric: 42
    };
  }
}
```

### Registering Enhancers

```javascript
// src/enhancers/index.js
import { CustomEnhancer } from './custom-enhancer.js';

export function setupEnhancers(pipeline) {
  // ... existing enhancers
  pipeline.register(new CustomEnhancer());
}
```

## Testing Guidelines

### Test Structure

```javascript
import { describe, it, expect, beforeEach } from '@jest/globals';
import { createMockGit } from '../../utils/mockGit.js';

describe('Feature Name', () => {
  let mockGit;
  
  beforeEach(() => {
    mockGit = createMockGit();
  });
  
  describe('specific functionality', () => {
    it('should do something specific', async () => {
      // Arrange
      const input = { /* test input */ };
      
      // Act
      const result = await functionUnderTest(input);
      
      // Assert
      expect(result).toBeDefined();
      expect(result.success).toBe(true);
    });
  });
});
```

### Testing Best Practices

1. **Mock external dependencies**:
```javascript
jest.mock('simple-git', () => createMockGit());
```

2. **Test response structure**:
```javascript
expect(response).toMatchObject({
  result: expect.any(Object),
  context: expect.any(Object),
  metadata: expect.any(Object)
});
```

3. **Test error cases**:
```javascript
it('should handle missing parameters', async () => {
  const result = await tool.handler({});
  expect(result.result.success).toBe(false);
  expect(result.result.message).toContain('required');
});
```

4. **Test enhancer integration**:
```javascript
it('should enhance response with metadata', async () => {
  const enhanced = await pipeline.enhance(baseResponse, context);
  expect(enhanced.metadata.timestamp).toBeDefined();
  expect(enhanced.context.suggestions).toBeInstanceOf(Array);
});
```

## Working with Session Context

### Accessing Session Data

```javascript
import { SessionManager } from '../core/session-manager.js';

// In your tool handler
const sessionManager = SessionManager.getInstance();
const session = sessionManager.getActiveSession();

// Get user preferences
const preferences = session.getPreferences();
const verboseMode = preferences.verboseOutput || false;

// Store operation result
session.addOperation({
  tool: 'my_tool',
  timestamp: new Date(),
  result: 'success',
  data: { /* operation data */ }
});
```

### Managing Session State

```javascript
// Update context
session.updateContext('lastAnalysis', {
  path: '/src',
  timestamp: new Date(),
  results: analysisResults
});

// Retrieve context
const lastAnalysis = session.getContext('lastAnalysis');
```

## Git Integration

### Using Git Helpers

```javascript
import { 
  getCurrentBranch,
  getModifiedFiles,
  getBranchStatus 
} from '../utils/git-helpers.js';

// In your tool
const branch = await getCurrentBranch();
const modifiedFiles = await getModifiedFiles();
const status = await getBranchStatus(branch);
```

### Safe Git Operations

```javascript
import { createResponse } from '../utils/responses.js';

// Always check before operations
const status = await git.status();
if (!status.isClean()) {
  return createResponse(
    false,
    null,
    "Working directory has uncommitted changes"
  );
}

// Perform operation with error handling
try {
  await git.checkout(['-b', branchName]);
  return createResponse(true, { branch: branchName }, "Branch created");
} catch (error) {
  return createResponse(false, null, `Failed: ${error.message}`);
}
```

## Performance Optimization

### Caching Strategies

```javascript
class CachedAnalyzer {
  constructor() {
    this.cache = new Map();
    this.cacheTimeout = 5 * 60 * 1000; // 5 minutes
  }
  
  async analyze(path) {
    const cacheKey = `analysis:${path}`;
    const cached = this.cache.get(cacheKey);
    
    if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
      return cached.data;
    }
    
    const result = await this.performAnalysis(path);
    this.cache.set(cacheKey, {
      data: result,
      timestamp: Date.now()
    });
    
    return result;
  }
}
```

### Async Operations

```javascript
// Parallel operations where possible
const [gitStatus, fileAnalysis, teamActivity] = await Promise.all([
  git.status(),
  analyzeFiles(files),
  checkTeamActivity()
]);

// Stream large data
async function* processLargeFile(path) {
  const stream = createReadStream(path);
  for await (const chunk of stream) {
    yield processChunk(chunk);
  }
}
```

## Error Handling

### Consistent Error Responses

```javascript
class ToolError extends Error {
  constructor(code, message, details = {}) {
    super(message);
    this.code = code;
    this.details = details;
  }
}

// In tool handler
try {
  // Tool logic
} catch (error) {
  if (error instanceof ToolError) {
    return createResponse(false, {
      error: {
        code: error.code,
        message: error.message,
        details: error.details
      }
    }, error.message);
  }
  
  // Unexpected error
  console.error('Unexpected error:', error);
  return createResponse(false, null, 'An unexpected error occurred');
}
```

### Recovery Suggestions

```javascript
// Always provide recovery suggestions on failure
if (!success) {
  response.context.suggestions = [
    "Check if you're on the correct branch",
    "Ensure you have the latest changes: git pull",
    "Try stashing your changes first: git stash"
  ];
  response.context.relatedTools = ['suggest_recovery'];
}
```

## Contributing

### Code Style

- Use ES6+ features
- Async/await over promises
- Descriptive variable names
- JSDoc comments for public APIs

### Pull Request Process

1. **Create feature branch**: `git checkout -b feat/your-feature`
2. **Write tests first**: TDD approach
3. **Implement feature**: Follow existing patterns
4. **Run all checks**:
   ```bash
   npm run lint
   npm test
   npm run format
   ```
5. **Update documentation**: If adding new features
6. **Submit PR**: With clear description

### Code Review Checklist

- [ ] Tests pass and cover new code
- [ ] Response structure follows convention
- [ ] Error handling is comprehensive
- [ ] Documentation is updated
- [ ] No console.log statements
- [ ] Security considerations addressed

## Debugging

### Enable Debug Mode

```bash
GLAM_LOG_LEVEL=debug npm run dev
```

### Debug Specific Components

```javascript
// Add debug logging
import debug from 'debug';
const log = debug('glam:my-component');

log('Processing request:', params);
```

### Common Issues

1. **Tool not found**: Check registration in index.js
2. **Enhancement not applied**: Verify enhancer priority
3. **Session data missing**: Check session initialization
4. **Git operations fail**: Verify git is initialized

## Security Considerations

### Input Validation

```javascript
// Always validate inputs
if (!params.path || typeof params.path !== 'string') {
  throw new ToolError('INVALID_INPUT', 'Path parameter is required');
}

// Sanitize file paths
const safePath = path.normalize(params.path);
if (safePath.includes('..')) {
  throw new ToolError('INVALID_PATH', 'Path traversal not allowed');
}
```

### Secrets Protection

```javascript
// Never log sensitive data
const sanitized = {
  ...params,
  token: params.token ? '[REDACTED]' : undefined
};
log('Request params:', sanitized);

// Detect secrets in responses
if (containsSecrets(data)) {
  return createResponse(false, null, 'Potential secrets detected');
}
```

## Resources

- [MCP Specification](https://modelcontextprotocol.io/docs)
- [Project Issues](https://github.com/slamb2k/slambed-mcp/issues)
- [Contributing Guide](../../CONTRIBUTING.md)
- [Architecture Overview](../architecture/overview.md)
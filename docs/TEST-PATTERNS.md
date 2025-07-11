# Test Patterns and Examples

This document provides specific test patterns and examples for common testing scenarios in glam-mcp.

## Table of Contents

1. [Tool Handler Testing Patterns](#tool-handler-testing-patterns)
2. [Enhancer Testing Patterns](#enhancer-testing-patterns)
3. [Mock Patterns](#mock-patterns)
4. [Async Testing Patterns](#async-testing-patterns)
5. [Error Testing Patterns](#error-testing-patterns)
6. [Integration Testing Patterns](#integration-testing-patterns)

## Tool Handler Testing Patterns

### Basic Tool Test Template

```javascript
import { jest } from "@jest/globals";
import { setupToolTest } from "../../test-utils/tool-testing-helpers.js";

// Mock dependencies first
const mockExecSync = jest.fn();
jest.unstable_mockModule("child_process", () => ({
  execSync: mockExecSync,
}));

// Import tool after mocks
const { registerMyTools } = await import("../../../src/tools/my-tools.js");

describe("My Tool", () => {
  const testContext = setupToolTest("my_tool");
  
  beforeEach(() => {
    testContext.setup();
    registerMyTools(testContext.server);
  });
  
  afterEach(() => {
    testContext.teardown();
  });
  
  describe("basic functionality", () => {
    it("should handle successful operation", async () => {
      // Arrange
      mockExecSync.mockReturnValue("success output");
      
      // Act
      const tool = testContext.registeredTools.find(t => t.name === "my_tool");
      const result = await tool.handler({ param: "value" });
      
      // Assert
      expect(result.success).toBe(true);
      expect(result.data.output).toBe("success output");
    });
  });
});
```

### Testing Tool Input Validation

```javascript
describe("input validation", () => {
  let tool;
  
  beforeEach(() => {
    tool = testContext.registeredTools.find(t => t.name === "my_tool");
  });
  
  it("should reject missing required parameters", async () => {
    const result = await tool.handler({});
    
    expect(result.success).toBe(false);
    expect(result.message).toContain("required");
  });
  
  it("should validate parameter types", async () => {
    const result = await tool.handler({ 
      count: "not-a-number" 
    });
    
    expect(result.success).toBe(false);
    expect(result.message).toContain("must be a number");
  });
  
  it("should validate parameter ranges", async () => {
    const result = await tool.handler({ 
      percentage: 150 
    });
    
    expect(result.success).toBe(false);
    expect(result.message).toContain("must be between 0 and 100");
  });
});
```

### Testing Tool Side Effects

```javascript
describe("side effects", () => {
  it("should create files with correct content", async () => {
    const mockWriteFileSync = jest.fn();
    mockFs.writeFileSync = mockWriteFileSync;
    
    const result = await tool.handler({
      filename: "test.txt",
      content: "Hello World"
    });
    
    expect(mockWriteFileSync).toHaveBeenCalledWith(
      "test.txt",
      "Hello World",
      "utf8"
    );
  });
  
  it("should execute commands in correct order", async () => {
    const commands = [];
    mockExecSync.mockImplementation((cmd) => {
      commands.push(cmd);
      return "";
    });
    
    await tool.handler({ 
      steps: ["init", "build", "test"] 
    });
    
    expect(commands).toEqual([
      "npm init -y",
      "npm run build",
      "npm test"
    ]);
  });
});
```

## Enhancer Testing Patterns

### Basic Enhancer Test

```javascript
import { MyEnhancer } from "../../../src/enhancers/my-enhancer.js";

describe("MyEnhancer", () => {
  let enhancer;
  let mockContext;
  
  beforeEach(() => {
    enhancer = new MyEnhancer();
    mockContext = {
      request: { id: "req-123" },
      sessionId: "session-456",
      user: { id: "user-789" }
    };
  });
  
  it("should enhance response with additional data", async () => {
    const response = {
      success: true,
      data: { result: "test" }
    };
    
    const enhanced = await enhancer.enhance(response, mockContext);
    
    expect(enhanced.metadata).toBeDefined();
    expect(enhanced.metadata.enhanced).toBe(true);
    expect(enhanced.metadata.enhancedBy).toBe("MyEnhancer");
  });
  
  it("should handle errors gracefully", async () => {
    const response = {
      success: false,
      error: "Something went wrong"
    };
    
    const enhanced = await enhancer.enhance(response, mockContext);
    
    expect(enhanced).toEqual(response);
    expect(enhanced.metadata).toBeUndefined();
  });
});
```

### Testing Enhancer Priority

```javascript
describe("enhancer priority", () => {
  it("should respect priority order", () => {
    const enhancer1 = new HighPriorityEnhancer();
    const enhancer2 = new LowPriorityEnhancer();
    
    expect(enhancer1.priority).toBeLessThan(enhancer2.priority);
  });
});
```

## Mock Patterns

### Mocking File System Operations

```javascript
const mockFs = {
  existsSync: jest.fn(),
  readFileSync: jest.fn(),
  writeFileSync: jest.fn(),
  mkdirSync: jest.fn(),
  readdirSync: jest.fn(),
  statSync: jest.fn(),
  unlinkSync: jest.fn(),
  rmSync: jest.fn(),
};

jest.unstable_mockModule("fs", () => ({
  default: mockFs,
  promises: {
    readFile: jest.fn(),
    writeFile: jest.fn(),
    mkdir: jest.fn(),
    unlink: jest.fn(),
  }
}));

// Usage in tests
beforeEach(() => {
  mockFs.existsSync.mockReturnValue(true);
  mockFs.readFileSync.mockImplementation((path) => {
    if (path === "package.json") {
      return JSON.stringify({
        name: "test-project",
        version: "1.0.0"
      });
    }
    throw new Error(`File not found: ${path}`);
  });
});
```

### Mocking Git Operations

```javascript
const mockGitHelpers = {
  isGitRepository: jest.fn(),
  getCurrentBranch: jest.fn(),
  getMainBranch: jest.fn(),
  hasUncommittedChanges: jest.fn(),
  getChangedFiles: jest.fn(),
  getRecentCommits: jest.fn(),
  execGitCommand: jest.fn(),
};

jest.unstable_mockModule("../../../src/utils/git-helpers.js", () => mockGitHelpers);

// Common git scenarios
function mockCleanRepository() {
  mockGitHelpers.isGitRepository.mockReturnValue(true);
  mockGitHelpers.getCurrentBranch.mockReturnValue("main");
  mockGitHelpers.getMainBranch.mockReturnValue("main");
  mockGitHelpers.hasUncommittedChanges.mockReturnValue(false);
  mockGitHelpers.getChangedFiles.mockReturnValue([]);
}

function mockDirtyRepository(changedFiles = ["src/index.js"]) {
  mockGitHelpers.isGitRepository.mockReturnValue(true);
  mockGitHelpers.hasUncommittedChanges.mockReturnValue(true);
  mockGitHelpers.getChangedFiles.mockReturnValue(changedFiles);
}
```

### Mocking HTTP Requests

```javascript
const mockFetch = jest.fn();
global.fetch = mockFetch;

// Mock successful response
mockFetch.mockResolvedValue({
  ok: true,
  status: 200,
  json: async () => ({ data: "test" }),
  text: async () => "test response",
});

// Mock error response
mockFetch.mockResolvedValue({
  ok: false,
  status: 404,
  statusText: "Not Found",
  json: async () => ({ error: "Not found" }),
});

// Mock network error
mockFetch.mockRejectedValue(new Error("Network error"));
```

## Async Testing Patterns

### Testing Async Functions

```javascript
describe("async operations", () => {
  it("should handle async success", async () => {
    const result = await asyncFunction();
    expect(result).toBe("success");
  });
  
  it("should handle async errors", async () => {
    await expect(asyncFunction()).rejects.toThrow("Expected error");
  });
  
  it("should handle promise rejection", async () => {
    const promise = asyncFunction();
    await expect(promise).rejects.toMatchObject({
      code: "ERROR_CODE",
      message: expect.stringContaining("error")
    });
  });
});
```

### Testing Concurrent Operations

```javascript
it("should handle concurrent operations", async () => {
  const operations = [
    asyncOperation1(),
    asyncOperation2(),
    asyncOperation3(),
  ];
  
  const results = await Promise.all(operations);
  
  expect(results).toHaveLength(3);
  expect(results[0]).toBe("result1");
  expect(results[1]).toBe("result2");
  expect(results[2]).toBe("result3");
});

it("should handle race conditions", async () => {
  const result = await Promise.race([
    slowOperation(),
    fastOperation(),
    timeout(1000),
  ]);
  
  expect(result).toBe("fast-result");
});
```

### Testing Streaming Operations

```javascript
it("should handle stream processing", async () => {
  const chunks = [];
  const stream = createReadStream("test.txt");
  
  stream.on("data", (chunk) => chunks.push(chunk));
  
  await new Promise((resolve, reject) => {
    stream.on("end", resolve);
    stream.on("error", reject);
  });
  
  expect(chunks).toHaveLength(3);
  expect(Buffer.concat(chunks).toString()).toBe("expected content");
});
```

## Error Testing Patterns

### Testing Error Types

```javascript
describe("error handling", () => {
  it("should throw specific error type", () => {
    expect(() => {
      validateInput(null);
    }).toThrow(ValidationError);
  });
  
  it("should include error details", () => {
    try {
      performOperation();
    } catch (error) {
      expect(error).toBeInstanceOf(OperationError);
      expect(error.code).toBe("OPERATION_FAILED");
      expect(error.details).toEqual({
        reason: "Invalid state",
        context: expect.any(Object)
      });
    }
  });
});
```

### Testing Error Recovery

```javascript
it("should retry on transient errors", async () => {
  let attempts = 0;
  mockApi.call.mockImplementation(() => {
    attempts++;
    if (attempts < 3) {
      throw new Error("Transient error");
    }
    return { success: true };
  });
  
  const result = await retryableOperation();
  
  expect(attempts).toBe(3);
  expect(result.success).toBe(true);
});

it("should fallback on permanent errors", async () => {
  mockPrimaryService.call.mockRejectedValue(new Error("Service down"));
  mockFallbackService.call.mockResolvedValue({ data: "fallback" });
  
  const result = await operationWithFallback();
  
  expect(result.data).toBe("fallback");
  expect(mockPrimaryService.call).toHaveBeenCalledTimes(1);
  expect(mockFallbackService.call).toHaveBeenCalledTimes(1);
});
```

## Integration Testing Patterns

### Testing Tool Chains

```javascript
describe("tool chain integration", () => {
  it("should execute tools in sequence", async () => {
    // Initialize repository
    const initResult = await server.callTool("init_repository", {
      name: "test-project"
    });
    expect(initResult.success).toBe(true);
    
    // Create feature branch
    const branchResult = await server.callTool("create_branch", {
      name: "feature/test"
    });
    expect(branchResult.success).toBe(true);
    
    // Make changes
    mockFs.writeFileSync("test.js", "console.log('test');");
    
    // Commit changes
    const commitResult = await server.callTool("commit", {
      message: "Add test file"
    });
    expect(commitResult.success).toBe(true);
    
    // Create PR
    const prResult = await server.callTool("create_pr", {
      title: "Test PR",
      body: "Test description"
    });
    expect(prResult.success).toBe(true);
    expect(prResult.data.pr_url).toContain("pull/");
  });
});
```

### Testing With Real File System

```javascript
import { mkdtempSync } from "fs";
import { tmpdir } from "os";
import { join } from "path";
import { rmSync } from "fs";

describe("real file system operations", () => {
  let tempDir;
  
  beforeEach(() => {
    tempDir = mkdtempSync(join(tmpdir(), "test-"));
    process.chdir(tempDir);
  });
  
  afterEach(() => {
    process.chdir(__dirname);
    rmSync(tempDir, { recursive: true, force: true });
  });
  
  it("should create project structure", async () => {
    const result = await createProject({
      name: "my-app",
      template: "react"
    });
    
    expect(existsSync("my-app")).toBe(true);
    expect(existsSync("my-app/package.json")).toBe(true);
    expect(existsSync("my-app/src")).toBe(true);
  });
});
```

### Testing With Mock Server

```javascript
import { createMockMCPServer } from "../../test-utils/mock-server.js";

describe("MCP server integration", () => {
  let server;
  
  beforeEach(async () => {
    server = await createMockMCPServer({
      tools: ["git", "github", "automation"],
      enhancers: ["metadata", "suggestions"]
    });
  });
  
  afterEach(async () => {
    await server.close();
  });
  
  it("should handle tool calls with enhancement", async () => {
    const response = await server.callTool("git_status", {});
    
    expect(response.success).toBe(true);
    expect(response.metadata).toBeDefined();
    expect(response.suggestions).toBeDefined();
  });
});
```

## Common Test Utilities

### Custom Assertions

```javascript
// Add to test setup
expect.extend({
  toBeValidToolResponse(received) {
    const pass = 
      received &&
      typeof received === "object" &&
      "success" in received &&
      typeof received.success === "boolean" &&
      (received.success ? "data" in received : "message" in received);
    
    return {
      pass,
      message: () => 
        pass
          ? "Expected not to be a valid tool response"
          : "Expected to be a valid tool response with success, and data/message",
    };
  },
  
  toContainFile(received, filepath) {
    const files = Array.isArray(received) ? received : [];
    const pass = files.some(f => 
      typeof f === "string" ? f === filepath : f.path === filepath
    );
    
    return {
      pass,
      message: () =>
        pass
          ? `Expected files not to contain ${filepath}`
          : `Expected files to contain ${filepath}`,
    };
  }
});
```

### Test Data Builders

```javascript
export const builders = {
  gitStatus: (overrides = {}) => ({
    branch: "main",
    upstream: "origin/main",
    ahead: 0,
    behind: 0,
    staged: [],
    modified: [],
    untracked: [],
    ...overrides
  }),
  
  pullRequest: (overrides = {}) => ({
    number: 123,
    title: "Test PR",
    body: "Test description",
    state: "open",
    user: { login: "testuser" },
    base: { ref: "main" },
    head: { ref: "feature/test" },
    ...overrides
  }),
  
  commit: (overrides = {}) => ({
    sha: "abc123",
    message: "Test commit",
    author: {
      name: "Test User",
      email: "test@example.com",
      date: new Date().toISOString()
    },
    ...overrides
  })
};
```

### Scenario Helpers

```javascript
export class TestScenario {
  constructor(name) {
    this.name = name;
    this.steps = [];
    this.assertions = [];
  }
  
  given(description, setup) {
    this.steps.push({ type: "given", description, fn: setup });
    return this;
  }
  
  when(description, action) {
    this.steps.push({ type: "when", description, fn: action });
    return this;
  }
  
  then(description, assertion) {
    this.steps.push({ type: "then", description, fn: assertion });
    return this;
  }
  
  async run() {
    console.log(`Scenario: ${this.name}`);
    for (const step of this.steps) {
      console.log(`  ${step.type}: ${step.description}`);
      await step.fn();
    }
  }
}

// Usage
const scenario = new TestScenario("User creates and merges PR")
  .given("a clean repository", () => {
    mockCleanRepository();
  })
  .when("user creates a feature branch", async () => {
    await tool.handler({ name: "feature/new" });
  })
  .when("user commits changes", async () => {
    await tool.handler({ message: "Add feature" });
  })
  .then("PR should be created successfully", async () => {
    const result = await createPR();
    expect(result.success).toBe(true);
  });

await scenario.run();
```

## Performance Testing

```javascript
describe("performance", () => {
  it("should complete within time limit", async () => {
    const start = Date.now();
    
    await performOperation();
    
    const duration = Date.now() - start;
    expect(duration).toBeLessThan(1000); // 1 second
  });
  
  it("should handle large datasets", async () => {
    const largeArray = Array(10000).fill(null).map((_, i) => ({
      id: i,
      data: `item-${i}`
    }));
    
    const start = Date.now();
    const result = await processArray(largeArray);
    const duration = Date.now() - start;
    
    expect(result).toHaveLength(10000);
    expect(duration).toBeLessThan(5000); // 5 seconds
  });
});
```

This document provides comprehensive patterns for testing various aspects of the glam-mcp project. Use these patterns as templates and adapt them to your specific testing needs.
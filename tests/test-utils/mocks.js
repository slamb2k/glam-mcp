/**
 * Common mock utilities for testing
 */

import { jest } from '@jest/globals';
import { execSync } from 'child_process';

/**
 * Creates a mock MCP server instance
 */
export function createMockServer() {
  return {
    setRequestHandler: jest.fn(),
    onerror: null,
    name: 'test-server',
    version: '1.0.0',
    vendor: 'test-vendor',
  };
}

/**
 * Creates a mock transport
 */
export function createMockTransport() {
  return {
    send: jest.fn(),
    receive: jest.fn(),
    close: jest.fn(),
  };
}

/**
 * Creates a mock context with common properties
 */
export function createMockContext(overrides = {}) {
  return {
    operation: 'test-operation',
    workingDirectory: '/test/dir',
    currentBranch: 'main',
    gitRemote: 'origin',
    sessionId: 'test-session-123',
    preferences: {
      autoCommit: false,
      verboseMode: false,
    },
    recentOperations: [],
    ...overrides,
  };
}

/**
 * Creates a mock response object
 */
export function createMockResponse(overrides = {}) {
  return {
    success: true,
    data: {},
    message: 'Success',
    timestamp: new Date().toISOString(),
    metadata: {},
    context: {},
    risks: [],
    suggestions: [],
    teamActivity: [],
    ...overrides,
  };
}

/**
 * Creates a mock tool handler
 */
export function createMockToolHandler(returnValue = { success: true }) {
  return jest.fn().mockResolvedValue(returnValue);
}

/**
 * Creates a mock enhancer
 */
export function createMockEnhancer(name = 'MockEnhancer') {
  return class MockEnhancer {
    constructor(config = {}) {
      this.config = config;
      this.name = name;
      this.priority = config.priority || 100;
    }

    async enhance(response, context) {
      return {
        ...response,
        enhanced: true,
        enhancedBy: name,
      };
    }

    isEnabled() {
      return true;
    }
  };
}

/**
 * Mock for execSync
 */
export function createExecSyncMock(responses = {}) {
  return jest.fn((cmd) => {
    // Default responses for common commands
    const defaultResponses = {
      'git status --porcelain': '',
      'git branch --show-current': 'main',
      'git remote -v': 'origin\thttps://github.com/user/repo.git (fetch)',
      'git log --oneline -10': 'abc123 Latest commit\ndef456 Previous commit',
      'git diff --cached --name-only': '',
      'npm --version': '10.0.0',
      'node --version': 'v20.0.0',
      ...responses,
    };

    for (const [pattern, response] of Object.entries(defaultResponses)) {
      if (cmd.includes(pattern)) {
        return response;
      }
    }

    throw new Error(`Command not mocked: ${cmd}`);
  });
}

/**
 * Mock for fs.promises
 */
export function createFsMock(files = {}) {
  return {
    readFile: jest.fn(async (path) => {
      if (files[path]) {
        return files[path];
      }
      throw new Error(`ENOENT: no such file or directory, open '${path}'`);
    }),
    writeFile: jest.fn(async (path, content) => {
      files[path] = content;
    }),
    mkdir: jest.fn(),
    access: jest.fn(async (path) => {
      if (!files[path] && !path.endsWith('/')) {
        throw new Error(`ENOENT: no such file or directory, access '${path}'`);
      }
    }),
    readdir: jest.fn(async () => []),
    stat: jest.fn(async (path) => ({
      isDirectory: () => path.endsWith('/'),
      isFile: () => !path.endsWith('/'),
      size: files[path]?.length || 0,
      mtime: new Date(),
    })),
  };
}

/**
 * Mock for tool registry
 */
export function createMockToolRegistry(tools = []) {
  const registry = new Map();
  tools.forEach(tool => registry.set(tool.name, tool));

  return {
    registerTool: jest.fn((tool) => {
      registry.set(tool.name, tool);
    }),
    getTool: jest.fn((name) => registry.get(name)),
    getAllTools: jest.fn(() => Array.from(registry.values())),
    getToolsByCategory: jest.fn((category) => 
      Array.from(registry.values()).filter(t => t.category === category)
    ),
    hasTool: jest.fn((name) => registry.has(name)),
    clear: jest.fn(() => registry.clear()),
  };
}

/**
 * Mock for session manager
 */
export function createMockSessionManager(initialSession = {}) {
  const session = { ...initialSession };

  return {
    getSession: jest.fn(() => session),
    updateSession: jest.fn((updates) => Object.assign(session, updates)),
    getPreferences: jest.fn(() => session.preferences || {}),
    setPreference: jest.fn((key, value) => {
      if (!session.preferences) session.preferences = {};
      session.preferences[key] = value;
    }),
    addRecentOperation: jest.fn((op) => {
      if (!session.recentOperations) session.recentOperations = [];
      session.recentOperations.push(op);
    }),
    clearSession: jest.fn(() => {
      Object.keys(session).forEach(key => delete session[key]);
    }),
  };
}

/**
 * Helper to setup common mocks for tests
 */
export function setupCommonMocks() {
  const mocks = {
    execSync: createExecSyncMock(),
    fs: createFsMock(),
    server: createMockServer(),
    transport: createMockTransport(),
    toolRegistry: createMockToolRegistry(),
    sessionManager: createMockSessionManager(),
  };

  // Mock child_process
  jest.mock('child_process', () => ({
    execSync: mocks.execSync,
  }));

  // Mock fs/promises
  jest.mock('fs/promises', () => mocks.fs);

  return mocks;
}

/**
 * Clears all mocks
 */
export function clearAllMocks() {
  jest.clearAllMocks();
  jest.resetModules();
}

/**
 * Creates a mock API response
 */
export function createMockApiResponse(status = 200, data = {}) {
  return {
    ok: status >= 200 && status < 300,
    status,
    statusText: status === 200 ? 'OK' : 'Error',
    json: async () => data,
    text: async () => JSON.stringify(data),
    headers: new Map([['content-type', 'application/json']]),
  };
}

/**
 * Creates a mock error
 */
export function createMockError(message = 'Test error', code = 'TEST_ERROR') {
  const error = new Error(message);
  error.code = code;
  return error;
}
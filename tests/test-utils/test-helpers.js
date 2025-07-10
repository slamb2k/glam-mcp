/**
 * Test helper utilities
 */

import { jest } from '@jest/globals';

/**
 * Waits for all promises to resolve
 */
export async function flushPromises() {
  await new Promise(resolve => setImmediate(resolve));
}

/**
 * Creates a deferred promise for testing async flows
 */
export function createDeferred() {
  let resolve, reject;
  const promise = new Promise((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

/**
 * Helper to test async errors
 */
export async function expectAsyncError(asyncFn, errorMatcher) {
  try {
    await asyncFn();
    throw new Error('Expected function to throw');
  } catch (error) {
    if (typeof errorMatcher === 'string') {
      expect(error.message).toContain(errorMatcher);
    } else if (errorMatcher instanceof RegExp) {
      expect(error.message).toMatch(errorMatcher);
    } else if (typeof errorMatcher === 'object') {
      expect(error).toMatchObject(errorMatcher);
    } else {
      throw error;
    }
  }
}

/**
 * Creates a test scenario builder
 */
export function createScenario() {
  const setup = [];
  const assertions = [];
  
  return {
    given: function(description, setupFn) {
      setup.push({ description, fn: setupFn });
      return this;
    },
    when: function(description, actionFn) {
      this.action = { description, fn: actionFn };
      return this;
    },
    then: function(description, assertFn) {
      assertions.push({ description, fn: assertFn });
      return this;
    },
    async run() {
      // Run setup
      for (const { fn } of setup) {
        await fn();
      }
      
      // Run action
      const result = await this.action.fn();
      
      // Run assertions
      for (const { fn } of assertions) {
        await fn(result);
      }
      
      return result;
    }
  };
}

/**
 * Mock timer utilities
 */
export const mockTimers = {
  setup() {
    jest.useFakeTimers();
  },
  
  cleanup() {
    jest.useRealTimers();
  },
  
  async advance(ms) {
    jest.advanceTimersByTime(ms);
    await flushPromises();
  },
  
  async runAll() {
    jest.runAllTimers();
    await flushPromises();
  }
};

/**
 * Creates a spy that tracks calls with context
 */
export function createContextSpy(name = 'spy') {
  const calls = [];
  
  const spy = jest.fn((...args) => {
    const context = {
      args,
      timestamp: Date.now(),
      stack: new Error().stack,
    };
    calls.push(context);
    return spy.mockImplementation?.(...args) || undefined;
  });
  
  spy.getCalls = () => calls;
  spy.getCall = (index) => calls[index];
  spy.reset = () => {
    calls.length = 0;
    spy.mockReset();
  };
  
  return spy;
}

/**
 * Test data builders
 */
export const builders = {
  gitCommit: (overrides = {}) => ({
    hash: 'abc123def456',
    author: 'Test User',
    email: 'test@example.com',
    message: 'Test commit',
    date: new Date().toISOString(),
    ...overrides,
  }),
  
  gitBranch: (overrides = {}) => ({
    name: 'feature/test-branch',
    remote: 'origin',
    upstream: 'origin/feature/test-branch',
    ahead: 0,
    behind: 0,
    ...overrides,
  }),
  
  file: (overrides = {}) => ({
    path: '/test/file.js',
    content: 'console.log("test");',
    size: 20,
    modified: new Date().toISOString(),
    ...overrides,
  }),
  
  error: (overrides = {}) => ({
    message: 'Test error',
    code: 'TEST_ERROR',
    stack: new Error().stack,
    ...overrides,
  }),
};

/**
 * Matcher utilities
 */
export const matchers = {
  toBeValidResponse: (received) => {
    const pass = 
      received &&
      typeof received === 'object' &&
      'success' in received &&
      typeof received.success === 'boolean';
    
    return {
      pass,
      message: () => 
        pass 
          ? `Expected ${JSON.stringify(received)} not to be a valid response`
          : `Expected ${JSON.stringify(received)} to be a valid response with 'success' property`,
    };
  },
  
  toHaveBeenCalledWithMatch: (received, pattern) => {
    const calls = received.mock.calls;
    const pass = calls.some(args => 
      args.some(arg => {
        if (typeof pattern === 'string') {
          return String(arg).includes(pattern);
        } else if (pattern instanceof RegExp) {
          return pattern.test(String(arg));
        }
        return false;
      })
    );
    
    return {
      pass,
      message: () =>
        pass
          ? `Expected not to be called with arguments matching ${pattern}`
          : `Expected to be called with arguments matching ${pattern}`,
    };
  },
};

/**
 * Environment helpers
 */
export const env = {
  original: {},
  
  setup(vars = {}) {
    this.original = { ...process.env };
    Object.assign(process.env, vars);
  },
  
  cleanup() {
    process.env = { ...this.original };
  },
  
  with(vars, fn) {
    this.setup(vars);
    try {
      return fn();
    } finally {
      this.cleanup();
    }
  },
};

/**
 * Test lifecycle helpers
 */
export function setupTestSuite(setupFn, teardownFn) {
  beforeEach(async () => {
    await setupFn?.();
  });
  
  afterEach(async () => {
    await teardownFn?.();
    jest.clearAllMocks();
  });
  
  afterAll(() => {
    jest.restoreAllMocks();
  });
}

/**
 * Snapshot testing helpers
 */
export function sanitizeSnapshot(obj) {
  return JSON.parse(JSON.stringify(obj, (key, value) => {
    // Sanitize timestamps
    if (key === 'timestamp' || key === 'date' || key === 'modified') {
      return '<timestamp>';
    }
    // Sanitize IDs
    if (key === 'id' || key === 'sessionId') {
      return '<id>';
    }
    // Sanitize paths
    if (typeof value === 'string' && value.includes('/')) {
      return value.replace(/\/[^/]+\/[^/]+/, '/<path>');
    }
    return value;
  }));
}
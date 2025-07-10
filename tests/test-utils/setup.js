/**
 * Global test setup
 */

import { jest } from '@jest/globals';

// Set test environment
process.env.NODE_ENV = 'test';

// Increase test timeout for CI environments
if (process.env.CI) {
  jest.setTimeout(30000);
}

// Add custom matchers
expect.extend({
  toBeValidResponse(received) {
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
  
  toHaveBeenCalledWithMatch(received, pattern) {
    if (!jest.isMockFunction(received)) {
      throw new Error('Expected a mock function');
    }
    
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
  
  toMatchSnapshot(received, propertyMatchers) {
    // Sanitize dynamic values before snapshot comparison
    const sanitized = JSON.parse(JSON.stringify(received, (key, value) => {
      if (key === 'timestamp' || key === 'date' || key === 'modified') {
        return '<timestamp>';
      }
      if (key === 'id' || key === 'sessionId') {
        return '<id>';
      }
      if (typeof value === 'string' && value.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)) {
        return '<uuid>';
      }
      return value;
    }));
    
    return expect(sanitized).toMatchSnapshot(propertyMatchers);
  },
});

// Global error handling
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection in test:', reason);
  throw reason;
});

// Suppress console output in tests unless DEBUG is set
if (!process.env.DEBUG) {
  global.console = {
    ...console,
    log: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
    // Keep error to see test failures
    error: console.error,
  };
}

// Clean up after all tests
afterAll(() => {
  // Restore console
  if (!process.env.DEBUG) {
    global.console = console;
  }
  
  // Clear all mocks
  jest.clearAllMocks();
  jest.restoreAllMocks();
});
import { jest, expect } from '@jest/globals';
import { promises as fs } from 'fs';
import path from 'path';
import os from 'os';

/**
 * Create a temporary directory for tests
 * @returns {Promise<string>} Path to temporary directory
 */
export async function createTempDir() {
  const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'glam-mcp-test-'));
  return tmpDir;
}

/**
 * Clean up a temporary directory
 * @param {string} dir - Directory path to clean up
 */
export async function cleanupTempDir(dir) {
  try {
    await fs.rm(dir, { recursive: true, force: true });
  } catch (error) {
    console.warn(`Failed to cleanup temp dir ${dir}:`, error.message);
  }
}

/**
 * Create a mock MCP request object
 * @param {string} method - Method name
 * @param {object} params - Method parameters
 * @returns {object} Mock request object
 */
export function createMockRequest(method, params = {}) {
  return {
    method,
    params,
    id: Math.random().toString(36).substring(7),
  };
}

/**
 * Create a mock session context
 * @param {object} overrides - Properties to override
 * @returns {object} Mock session context
 */
export function createMockSession(overrides = {}) {
  return {
    id: 'test-session-id',
    userId: 'test-user',
    projectPath: '/test/project',
    preferences: {},
    startTime: new Date().toISOString(),
    ...overrides,
  };
}

/**
 * Wait for a condition to be true
 * @param {Function} condition - Function that returns boolean
 * @param {number} timeout - Maximum wait time in ms
 * @param {number} interval - Check interval in ms
 * @returns {Promise<void>}
 */
export async function waitFor(condition, timeout = 5000, interval = 100) {
  const startTime = Date.now();
  
  while (Date.now() - startTime < timeout) {
    if (await condition()) {
      return;
    }
    await new Promise(resolve => setTimeout(resolve, interval));
  }
  
  throw new Error('Timeout waiting for condition');
}

/**
 * Create a spy that tracks calls and returns values
 * @param {any} returnValue - Value to return from spy
 * @returns {object} Spy object with jest.fn() and helpers
 */
export function createSpy(returnValue) {
  const spy = jest.fn().mockReturnValue(returnValue);
  
  return {
    fn: spy,
    calledWith: (...args) => spy.mock.calls.some(call => 
      JSON.stringify(call) === JSON.stringify(args)
    ),
    calledTimes: () => spy.mock.calls.length,
    lastCall: () => spy.mock.calls[spy.mock.calls.length - 1],
    reset: () => spy.mockClear(),
  };
}

/**
 * Mock console methods for testing
 * @returns {object} Object with restored console methods
 */
export function mockConsole() {
  const originalConsole = {
    log: console.log,
    error: console.error,
    warn: console.warn,
    info: console.info,
  };
  
  const mocks = {
    log: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    info: jest.fn(),
  };
  
  Object.assign(console, mocks);
  
  return {
    mocks,
    restore: () => Object.assign(console, originalConsole),
  };
}

/**
 * Create a test fixture from a template
 * @param {string} template - Template string with placeholders
 * @param {object} values - Values to replace placeholders
 * @returns {string} Processed template
 */
export function createFixture(template, values = {}) {
  let result = template;
  
  for (const [key, value] of Object.entries(values)) {
    result = result.replace(new RegExp(`{{${key}}}`, 'g'), value);
  }
  
  return result;
}

/**
 * Assert that an async function throws an error
 * @param {Function} fn - Async function to test
 * @param {string|RegExp} expectedError - Expected error message or pattern
 */
export async function expectAsyncError(fn, expectedError) {
  let error;
  
  try {
    await fn();
  } catch (e) {
    error = e;
  }
  
  expect(error).toBeDefined();
  
  if (typeof expectedError === 'string') {
    expect(error.message).toBe(expectedError);
  } else if (expectedError instanceof RegExp) {
    expect(error.message).toMatch(expectedError);
  }
}

/**
 * Create a mock file system structure
 * @param {string} baseDir - Base directory for file structure
 * @param {object} structure - File structure object
 */
export async function createFileStructure(baseDir, structure) {
  for (const [filePath, content] of Object.entries(structure)) {
    const fullPath = path.join(baseDir, filePath);
    const dir = path.dirname(fullPath);
    
    await fs.mkdir(dir, { recursive: true });
    
    if (content !== null) {
      await fs.writeFile(fullPath, content, 'utf8');
    }
  }
}

/**
 * Deep freeze an object to prevent mutations in tests
 * @param {object} obj - Object to freeze
 * @returns {object} Frozen object
 */
export function deepFreeze(obj) {
  Object.freeze(obj);
  
  Object.getOwnPropertyNames(obj).forEach(prop => {
    if (obj[prop] !== null
      && (typeof obj[prop] === 'object' || typeof obj[prop] === 'function')
      && !Object.isFrozen(obj[prop])) {
      deepFreeze(obj[prop]);
    }
  });
  
  return obj;
}
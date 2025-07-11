/**
 * Test Helpers for Tool Testing
 * Task 33: Create Test Helpers for Tool Testing
 * 
 * Provides a framework for testing tool handlers with:
 * - Standard setup and teardown procedures
 * - Common assertions for tool outputs
 * - Utilities for simulating tool inputs
 * - Helpers for verifying tool side effects
 */

import { jest } from '@jest/globals';
import { 
  createMockServer, 
  createMockContext,
  createMockToolHandler 
} from './mocks.js';

/**
 * Standard tool test setup
 * Creates necessary mocks and environment for tool testing
 */
export function setupToolTest(toolName, options = {}) {
  const {
    mockDependencies = {},
    mockEnvironment = {},
    mockFileSystem = {},
    enableLogging = false
  } = options;
  
  const testContext = {
    server: createMockServer(),
    context: createMockContext(),
    registeredTools: [],
    mockConsole: {
      log: jest.fn(),
      error: jest.fn(),
      warn: jest.fn()
    },
    originalConsole: null,
    cleanupFunctions: []
  };
  
  // Setup function to be called in beforeEach
  testContext.setup = async () => {
    // Clear all mocks
    jest.clearAllMocks();
    
    // Reset registered tools
    testContext.registeredTools = [];
    testContext.server.addTool = jest.fn((tool) => {
      testContext.registeredTools.push(tool);
    });
    
    // Mock console if logging is disabled
    if (!enableLogging) {
      testContext.originalConsole = global.console;
      global.console = testContext.mockConsole;
    }
    
    // Apply mock dependencies
    Object.entries(mockDependencies).forEach(([dep, mock]) => {
      jest.doMock(dep, () => mock);
    });
    
    // Apply environment variables
    Object.entries(mockEnvironment).forEach(([key, value]) => {
      process.env[key] = value;
    });
    
    // Setup file system mocks if provided
    if (Object.keys(mockFileSystem).length > 0) {
      const mockFs = {
        existsSync: jest.fn((path) => mockFileSystem[path] !== undefined),
        readFileSync: jest.fn((path) => {
          if (mockFileSystem[path]) {
            return mockFileSystem[path];
          }
          throw new Error(`ENOENT: no such file or directory, open '${path}'`);
        }),
        writeFileSync: jest.fn(),
        mkdirSync: jest.fn(),
        unlinkSync: jest.fn()
      };
      
      jest.doMock('fs', () => ({ default: mockFs }));
      testContext.mockFs = mockFs;
    }
    
    return testContext;
  };
  
  // Teardown function to be called in afterEach
  testContext.teardown = async () => {
    // Restore console
    if (testContext.originalConsole) {
      global.console = testContext.originalConsole;
    }
    
    // Clean up environment variables
    Object.keys(mockEnvironment).forEach(key => {
      delete process.env[key];
    });
    
    // Run any cleanup functions
    for (const cleanup of testContext.cleanupFunctions) {
      await cleanup();
    }
    testContext.cleanupFunctions = [];
    
    // Clear module registry
    jest.resetModules();
  };
  
  // Helper to get a registered tool by name
  testContext.getTool = (name) => {
    return testContext.registeredTools.find(t => t.name === name);
  };
  
  // Helper to register cleanup function
  testContext.addCleanup = (fn) => {
    testContext.cleanupFunctions.push(fn);
  };
  
  return testContext;
}

/**
 * Common assertions for tool outputs
 */
export const toolAssertions = {
  /**
   * Assert tool response has expected structure
   */
  assertValidToolResponse(response) {
    expect(response).toBeDefined();
    expect(response).toHaveProperty('success');
    expect(typeof response.success).toBe('boolean');
    
    if (response.success) {
      expect(response).toHaveProperty('message');
      if (response.data !== undefined) {
        expect(response).toHaveProperty('data');
      }
    } else {
      expect(response).toHaveProperty('message');
      if (response.error) {
        expect(response).toHaveProperty('error');
      }
    }
  },
  
  /**
   * Assert successful tool response
   */
  assertSuccess(response, expectedData = {}) {
    this.assertValidToolResponse(response);
    expect(response.success).toBe(true);
    
    if (Object.keys(expectedData).length > 0) {
      expect(response.data).toMatchObject(expectedData);
    }
  },
  
  /**
   * Assert failed tool response
   */
  assertFailure(response, expectedError = null) {
    this.assertValidToolResponse(response);
    expect(response.success).toBe(false);
    
    if (expectedError) {
      if (typeof expectedError === 'string') {
        expect(response.message).toContain(expectedError);
      } else if (expectedError instanceof RegExp) {
        expect(response.message).toMatch(expectedError);
      } else {
        expect(response.error).toMatchObject(expectedError);
      }
    }
  },
  
  /**
   * Assert tool has required metadata
   */
  assertToolMetadata(tool, expectedMetadata = {}) {
    expect(tool).toBeDefined();
    expect(tool).toHaveProperty('name');
    expect(tool).toHaveProperty('description');
    expect(tool).toHaveProperty('inputSchema');
    expect(tool).toHaveProperty('handler');
    
    // Check input schema
    expect(tool.inputSchema).toHaveProperty('type', 'object');
    if (tool.inputSchema.required) {
      expect(Array.isArray(tool.inputSchema.required)).toBe(true);
    }
    
    // Check additional metadata
    Object.entries(expectedMetadata).forEach(([key, value]) => {
      expect(tool[key]).toEqual(value);
    });
  },
  
  /**
   * Assert tool handles validation correctly
   */
  async assertValidation(tool, invalidInputs, validInputs) {
    // Test invalid inputs
    for (const { input, expectedError } of invalidInputs) {
      const response = await tool.handler(input);
      this.assertFailure(response, expectedError);
    }
    
    // Test valid inputs
    for (const input of validInputs) {
      const response = await tool.handler(input);
      this.assertSuccess(response);
    }
  }
};

/**
 * Utilities for simulating tool inputs
 */
export const inputSimulators = {
  /**
   * Create file input simulation
   */
  createFileInput(path, content, options = {}) {
    const {
      encoding = 'utf8',
      permissions = '644',
      size = null,
      modified = new Date()
    } = options;
    
    return {
      path,
      content,
      encoding,
      permissions,
      size: size || Buffer.byteLength(content, encoding),
      modified: modified.toISOString(),
      exists: true
    };
  },
  
  /**
   * Create command execution simulation
   */
  createCommandInput(command, args = [], options = {}) {
    const {
      cwd = process.cwd(),
      env = process.env,
      stdin = null,
      timeout = 30000
    } = options;
    
    return {
      command,
      args,
      options: {
        cwd,
        env,
        stdin,
        timeout
      }
    };
  },
  
  /**
   * Create API request simulation
   */
  createApiInput(method, endpoint, options = {}) {
    const {
      headers = {},
      body = null,
      query = {},
      auth = null
    } = options;
    
    return {
      method: method.toUpperCase(),
      endpoint,
      headers,
      body,
      query,
      auth
    };
  },
  
  /**
   * Create batch operation input
   */
  createBatchInput(items, options = {}) {
    const {
      parallel = false,
      maxConcurrent = 5,
      stopOnError = false,
      progressCallback = null
    } = options;
    
    return {
      items,
      options: {
        parallel,
        maxConcurrent,
        stopOnError,
        progressCallback
      }
    };
  }
};

/**
 * Helpers for verifying tool side effects
 */
export const sideEffectVerifiers = {
  /**
   * Verify file system changes
   */
  verifyFileSystemChanges(mockFs, expectedChanges) {
    const { created = [], modified = [], deleted = [] } = expectedChanges;
    
    // Verify created files
    created.forEach(({ path, content, calls = 1 }) => {
      expect(mockFs.writeFileSync).toHaveBeenCalledTimes(calls);
      if (content !== undefined) {
        expect(mockFs.writeFileSync).toHaveBeenCalledWith(
          path,
          content,
          expect.any(Object)
        );
      }
    });
    
    // Verify modified files
    modified.forEach(({ path, operations }) => {
      if (operations.includes('read')) {
        expect(mockFs.readFileSync).toHaveBeenCalledWith(path, expect.any(String));
      }
      if (operations.includes('write')) {
        expect(mockFs.writeFileSync).toHaveBeenCalledWith(
          path,
          expect.any(String),
          expect.any(Object)
        );
      }
    });
    
    // Verify deleted files
    deleted.forEach(path => {
      expect(mockFs.unlinkSync).toHaveBeenCalledWith(path);
    });
  },
  
  /**
   * Verify command executions
   */
  verifyCommandExecutions(mockExec, expectedCommands) {
    expectedCommands.forEach(({ command, args, times = 1, order = null }) => {
      const fullCommand = args ? `${command} ${args.join(' ')}` : command;
      
      // Verify call count
      const calls = mockExec.mock.calls.filter(call => 
        call[0].includes(command)
      );
      expect(calls).toHaveLength(times);
      
      // Verify order if specified
      if (order !== null) {
        const allCalls = mockExec.mock.calls;
        expect(allCalls[order][0]).toContain(command);
      }
    });
  },
  
  /**
   * Verify API calls
   */
  verifyApiCalls(mockApi, expectedCalls) {
    expectedCalls.forEach(({ method, endpoint, times = 1, body = null }) => {
      const calls = mockApi.mock.calls.filter(call => {
        const [callMethod, callEndpoint] = call;
        return callMethod === method && callEndpoint.includes(endpoint);
      });
      
      expect(calls).toHaveLength(times);
      
      if (body !== null) {
        expect(calls[0][2]).toMatchObject(body);
      }
    });
  },
  
  /**
   * Verify event emissions
   */
  verifyEvents(mockEmitter, expectedEvents) {
    expectedEvents.forEach(({ event, data = null, times = 1 }) => {
      expect(mockEmitter.emit).toHaveBeenCalledWith(
        event,
        data ? expect.objectContaining(data) : expect.anything()
      );
      
      const eventCalls = mockEmitter.emit.mock.calls.filter(
        call => call[0] === event
      );
      expect(eventCalls).toHaveLength(times);
    });
  },
  
  /**
   * Verify state changes
   */
  verifyStateChanges(getState, expectedStates) {
    const states = [];
    
    // Capture state at each checkpoint
    expectedStates.forEach((checkpoint, index) => {
      const currentState = getState();
      states.push(currentState);
      
      if (checkpoint.expected) {
        expect(currentState).toMatchObject(checkpoint.expected);
      }
      
      if (checkpoint.changed && index > 0) {
        checkpoint.changed.forEach(key => {
          expect(currentState[key]).not.toEqual(states[index - 1][key]);
        });
      }
    });
  }
};

/**
 * Tool test scenario builder
 * Helps create complex test scenarios with multiple steps
 */
export class ToolTestScenario {
  constructor(tool) {
    this.tool = tool;
    this.steps = [];
    this.context = {};
    this.assertions = [];
  }
  
  /**
   * Add a step to the scenario
   */
  addStep(description, input, expectedOutput = null) {
    this.steps.push({
      description,
      input,
      expectedOutput,
      assertions: []
    });
    return this;
  }
  
  /**
   * Add context that persists across steps
   */
  withContext(key, value) {
    this.context[key] = value;
    return this;
  }
  
  /**
   * Add assertion to the last step
   */
  assertThat(assertion) {
    if (this.steps.length === 0) {
      throw new Error('No steps added yet');
    }
    
    this.steps[this.steps.length - 1].assertions.push(assertion);
    return this;
  }
  
  /**
   * Add global assertion
   */
  assertScenario(assertion) {
    this.assertions.push(assertion);
    return this;
  }
  
  /**
   * Execute the scenario
   */
  async execute() {
    const results = [];
    const scenarioContext = { ...this.context };
    
    for (const step of this.steps) {
      // Merge step input with scenario context
      const input = {
        ...step.input,
        _context: scenarioContext
      };
      
      try {
        // Execute the tool
        const output = await this.tool.handler(input);
        
        // Store result
        results.push({
          step: step.description,
          input: step.input,
          output,
          success: true
        });
        
        // Check expected output
        if (step.expectedOutput) {
          expect(output).toMatchObject(step.expectedOutput);
        }
        
        // Run step assertions
        for (const assertion of step.assertions) {
          await assertion(output, scenarioContext);
        }
        
        // Update context with output
        if (output.data) {
          Object.assign(scenarioContext, output.data);
        }
      } catch (error) {
        results.push({
          step: step.description,
          input: step.input,
          error,
          success: false
        });
        
        // Re-throw unless we expected failure
        if (!step.expectFailure) {
          throw error;
        }
      }
    }
    
    // Run scenario assertions
    for (const assertion of this.assertions) {
      await assertion(results, scenarioContext);
    }
    
    return {
      results,
      context: scenarioContext,
      success: results.every(r => r.success || r.expectFailure)
    };
  }
}

/**
 * Mock builders for common tool dependencies
 */
export const mockBuilders = {
  /**
   * Build mock file system
   */
  buildMockFileSystem(files = {}) {
    const fs = {
      ...files,
      _writeHistory: [],
      _readHistory: []
    };
    
    const mockFs = {
      existsSync: jest.fn(path => fs[path] !== undefined),
      readFileSync: jest.fn((path, encoding = 'utf8') => {
        fs._readHistory.push({ path, encoding });
        if (fs[path] === undefined) {
          throw new Error(`ENOENT: no such file or directory, open '${path}'`);
        }
        return fs[path];
      }),
      writeFileSync: jest.fn((path, content, options = {}) => {
        fs._writeHistory.push({ path, content, options });
        fs[path] = content;
      }),
      mkdirSync: jest.fn(),
      unlinkSync: jest.fn(path => {
        delete fs[path];
      }),
      readdirSync: jest.fn(path => {
        const prefix = path.endsWith('/') ? path : path + '/';
        return Object.keys(fs)
          .filter(p => p.startsWith(prefix))
          .map(p => p.slice(prefix.length).split('/')[0])
          .filter((v, i, a) => a.indexOf(v) === i);
      }),
      _writeHistory: fs._writeHistory,
      _readHistory: fs._readHistory
    };
    
    return mockFs;
  },
  
  /**
   * Build mock child process
   */
  buildMockChildProcess(responses = {}) {
    return {
      execSync: jest.fn((command, options = {}) => {
        for (const [pattern, response] of Object.entries(responses)) {
          if (command.includes(pattern)) {
            if (response instanceof Error) {
              throw response;
            }
            return response;
          }
        }
        return '';
      }),
      spawn: jest.fn(),
      exec: jest.fn((command, callback) => {
        for (const [pattern, response] of Object.entries(responses)) {
          if (command.includes(pattern)) {
            if (response instanceof Error) {
              callback(response);
            } else {
              callback(null, response, '');
            }
            return;
          }
        }
        callback(null, '', '');
      })
    };
  },
  
  /**
   * Build mock HTTP client
   */
  buildMockHttpClient(responses = {}) {
    return {
      get: jest.fn(async (url, options = {}) => {
        const response = responses[`GET ${url}`] || responses[url];
        if (response instanceof Error) throw response;
        return response || { data: {} };
      }),
      post: jest.fn(async (url, data, options = {}) => {
        const response = responses[`POST ${url}`] || responses[url];
        if (response instanceof Error) throw response;
        return response || { data: {} };
      }),
      put: jest.fn(async (url, data, options = {}) => {
        const response = responses[`PUT ${url}`] || responses[url];
        if (response instanceof Error) throw response;
        return response || { data: {} };
      }),
      delete: jest.fn(async (url, options = {}) => {
        const response = responses[`DELETE ${url}`] || responses[url];
        if (response instanceof Error) throw response;
        return response || { data: {} };
      })
    };
  }
};

/**
 * Test data generators
 */
export const testDataGenerators = {
  /**
   * Generate random file paths
   */
  generateFilePath(options = {}) {
    const {
      root = '/tmp',
      depth = 2,
      extension = '.txt'
    } = options;
    
    const dirs = [];
    for (let i = 0; i < depth; i++) {
      dirs.push(`dir${Math.floor(Math.random() * 100)}`);
    }
    
    const filename = `file_${Date.now()}${extension}`;
    return `${root}/${dirs.join('/')}/${filename}`;
  },
  
  /**
   * Generate test file content
   */
  generateFileContent(type = 'text', size = 'small') {
    const sizes = {
      small: 100,
      medium: 1000,
      large: 10000
    };
    
    const generators = {
      text: (size) => 'a'.repeat(size),
      json: (size) => JSON.stringify({
        data: Array(Math.floor(size / 20)).fill({ key: 'value' })
      }),
      xml: (size) => `<?xml version="1.0"?><root>${'<item>test</item>'.repeat(Math.floor(size / 20))}</root>`,
      csv: (size) => Array(Math.floor(size / 10)).fill('col1,col2,col3').join('\n')
    };
    
    const targetSize = sizes[size] || size;
    const generator = generators[type] || generators.text;
    
    return generator(targetSize);
  },
  
  /**
   * Generate command with arguments
   */
  generateCommand(options = {}) {
    const {
      base = 'echo',
      args = ['test'],
      flags = []
    } = options;
    
    const allArgs = [...flags, ...args];
    return {
      command: base,
      args: allArgs,
      full: `${base} ${allArgs.join(' ')}`
    };
  }
};

export default {
  setupToolTest,
  toolAssertions,
  inputSimulators,
  sideEffectVerifiers,
  ToolTestScenario,
  mockBuilders,
  testDataGenerators
};
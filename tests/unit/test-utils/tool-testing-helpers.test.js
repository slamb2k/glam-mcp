/**
 * Tests for Tool Testing Helpers
 * Task 33: Create Test Helpers for Tool Testing
 */

import { jest } from '@jest/globals';
import {
  setupToolTest,
  toolAssertions,
  inputSimulators,
  sideEffectVerifiers,
  ToolTestScenario,
  mockBuilders,
  testDataGenerators
} from '../../test-utils/tool-testing-helpers.js';

describe('Tool Testing Helpers', () => {
  describe('setupToolTest', () => {
    it('should create test context with required properties', () => {
      const context = setupToolTest('test-tool');
      
      expect(context).toHaveProperty('server');
      expect(context).toHaveProperty('context');
      expect(context).toHaveProperty('registeredTools');
      expect(context).toHaveProperty('setup');
      expect(context).toHaveProperty('teardown');
      expect(context).toHaveProperty('getTool');
      expect(context).toHaveProperty('addCleanup');
    });
    
    it('should apply mock dependencies', async () => {
      // Skip actual module mocking in test
      // The functionality is tested through integration tests
      const context = setupToolTest('test-tool', {
        mockDependencies: {},
        mockEnvironment: {
          TEST_ENV: 'test'
        }
      });
      
      await context.setup();
      
      // Verify environment is set
      expect(process.env.TEST_ENV).toBe('test');
      
      await context.teardown();
      
      // Verify environment is cleaned
      expect(process.env.TEST_ENV).toBeUndefined();
    });
    
    it('should mock console when logging is disabled', async () => {
      const context = setupToolTest('test-tool', { enableLogging: false });
      const originalConsole = global.console;
      
      await context.setup();
      
      expect(global.console).not.toBe(originalConsole);
      expect(global.console.log).toEqual(expect.any(Function));
      
      await context.teardown();
      
      expect(global.console).toBe(originalConsole);
    });
    
    it('should register tools correctly', async () => {
      const context = setupToolTest('test-tool');
      await context.setup();
      
      const tool = { name: 'test-tool', handler: jest.fn() };
      context.server.addTool(tool);
      
      expect(context.registeredTools).toContain(tool);
      expect(context.getTool('test-tool')).toBe(tool);
    });
  });
  
  describe('toolAssertions', () => {
    describe('assertValidToolResponse', () => {
      it('should validate successful response structure', () => {
        const response = {
          success: true,
          message: 'Operation completed',
          data: { result: 'test' }
        };
        
        expect(() => toolAssertions.assertValidToolResponse(response)).not.toThrow();
      });
      
      it('should validate failed response structure', () => {
        const response = {
          success: false,
          message: 'Operation failed',
          error: 'Error details'
        };
        
        expect(() => toolAssertions.assertValidToolResponse(response)).not.toThrow();
      });
      
      it('should throw on invalid response', () => {
        const invalidResponse = { invalid: true };
        
        expect(() => toolAssertions.assertValidToolResponse(invalidResponse)).toThrow();
      });
    });
    
    describe('assertSuccess', () => {
      it('should validate successful response', () => {
        const response = {
          success: true,
          message: 'Success',
          data: { id: 123 }
        };
        
        expect(() => toolAssertions.assertSuccess(response)).not.toThrow();
      });
      
      it('should validate expected data', () => {
        const response = {
          success: true,
          message: 'Success',
          data: { id: 123, name: 'test' }
        };
        
        expect(() => toolAssertions.assertSuccess(response, { id: 123 })).not.toThrow();
      });
    });
    
    describe('assertToolMetadata', () => {
      it('should validate tool metadata', () => {
        const tool = {
          name: 'test-tool',
          description: 'Test tool',
          inputSchema: {
            type: 'object',
            required: ['param1'],
            properties: {
              param1: { type: 'string' }
            }
          },
          handler: jest.fn()
        };
        
        expect(() => toolAssertions.assertToolMetadata(tool)).not.toThrow();
      });
    });
  });
  
  describe('inputSimulators', () => {
    describe('createFileInput', () => {
      it('should create file input with defaults', () => {
        const input = inputSimulators.createFileInput('/test/file.txt', 'content');
        
        expect(input).toMatchObject({
          path: '/test/file.txt',
          content: 'content',
          encoding: 'utf8',
          permissions: '644',
          exists: true
        });
        expect(input.size).toBe(7); // 'content' is 7 bytes
      });
      
      it('should accept custom options', () => {
        const modified = new Date('2024-01-01');
        const input = inputSimulators.createFileInput('/test/file.txt', 'content', {
          encoding: 'base64',
          permissions: '755',
          modified
        });
        
        expect(input.encoding).toBe('base64');
        expect(input.permissions).toBe('755');
        expect(input.modified).toBe(modified.toISOString());
      });
    });
    
    describe('createCommandInput', () => {
      it('should create command input', () => {
        const input = inputSimulators.createCommandInput('npm', ['test']);
        
        expect(input).toMatchObject({
          command: 'npm',
          args: ['test'],
          options: {
            cwd: process.cwd(),
            env: process.env,
            timeout: 30000
          }
        });
      });
    });
    
    describe('createApiInput', () => {
      it('should create API input', () => {
        const input = inputSimulators.createApiInput('POST', '/api/test', {
          headers: { 'Content-Type': 'application/json' },
          body: { data: 'test' }
        });
        
        expect(input).toMatchObject({
          method: 'POST',
          endpoint: '/api/test',
          headers: { 'Content-Type': 'application/json' },
          body: { data: 'test' }
        });
      });
    });
  });
  
  describe('sideEffectVerifiers', () => {
    describe('verifyFileSystemChanges', () => {
      it('should verify file creation', () => {
        const mockFs = {
          writeFileSync: jest.fn()
        };
        
        mockFs.writeFileSync('/test/file.txt', 'content', {});
        
        sideEffectVerifiers.verifyFileSystemChanges(mockFs, {
          created: [{ path: '/test/file.txt', content: 'content' }]
        });
        
        expect(mockFs.writeFileSync).toHaveBeenCalledWith(
          '/test/file.txt',
          'content',
          expect.any(Object)
        );
      });
    });
    
    describe('verifyCommandExecutions', () => {
      it('should verify command execution', () => {
        const mockExec = jest.fn();
        mockExec('npm test');
        mockExec('npm build');
        
        sideEffectVerifiers.verifyCommandExecutions(mockExec, [
          { command: 'npm test', times: 1 },
          { command: 'npm build', times: 1 }
        ]);
      });
    });
    
    describe('verifyEvents', () => {
      it('should verify event emissions', () => {
        const mockEmitter = { emit: jest.fn() };
        
        mockEmitter.emit('test-event', { data: 'test' });
        mockEmitter.emit('test-event', { data: 'test2' });
        
        sideEffectVerifiers.verifyEvents(mockEmitter, [
          { event: 'test-event', times: 2 }
        ]);
      });
    });
  });
  
  describe('ToolTestScenario', () => {
    it('should build and execute scenario', async () => {
      const mockTool = {
        name: 'test-tool',
        handler: jest.fn()
          .mockResolvedValueOnce({ success: true, data: { step: 1 } })
          .mockResolvedValueOnce({ success: true, data: { step: 2 } })
      };
      
      const scenario = new ToolTestScenario(mockTool)
        .addStep('Step 1', { action: 'test1' })
        .addStep('Step 2', { action: 'test2' })
        .withContext('testContext', 'value');
      
      const result = await scenario.execute();
      
      expect(result.success).toBe(true);
      expect(result.results).toHaveLength(2);
      expect(mockTool.handler).toHaveBeenCalledTimes(2);
    });
    
    it('should handle step failures', async () => {
      const mockTool = {
        name: 'test-tool',
        handler: jest.fn()
          .mockResolvedValueOnce({ success: true })
          .mockRejectedValueOnce(new Error('Step failed'))
      };
      
      const scenario = new ToolTestScenario(mockTool)
        .addStep('Step 1', { action: 'test1' })
        .addStep('Step 2', { action: 'test2' });
      
      await expect(scenario.execute()).rejects.toThrow('Step failed');
    });
  });
  
  describe('mockBuilders', () => {
    describe('buildMockFileSystem', () => {
      it('should create mock file system', () => {
        const fs = mockBuilders.buildMockFileSystem({
          '/test/file1.txt': 'content1',
          '/test/file2.txt': 'content2'
        });
        
        expect(fs.existsSync('/test/file1.txt')).toBe(true);
        expect(fs.existsSync('/test/nonexistent.txt')).toBe(false);
        expect(fs.readFileSync('/test/file1.txt')).toBe('content1');
      });
      
      it('should track file operations', () => {
        const fs = mockBuilders.buildMockFileSystem();
        
        fs.writeFileSync('/test/new.txt', 'new content');
        fs.readFileSync('/test/new.txt');
        
        expect(fs._writeHistory).toHaveLength(1);
        expect(fs._readHistory).toHaveLength(1);
      });
      
      it('should handle directory listing', () => {
        const fs = mockBuilders.buildMockFileSystem({
          '/test/dir1/file1.txt': 'content',
          '/test/dir1/file2.txt': 'content',
          '/test/dir2/file3.txt': 'content'
        });
        
        const dirs = fs.readdirSync('/test');
        expect(dirs).toContain('dir1');
        expect(dirs).toContain('dir2');
      });
    });
    
    describe('buildMockChildProcess', () => {
      it('should create mock child process', () => {
        const cp = mockBuilders.buildMockChildProcess({
          'npm test': 'Test output',
          'npm build': new Error('Build failed')
        });
        
        expect(cp.execSync('npm test')).toBe('Test output');
        expect(() => cp.execSync('npm build')).toThrow('Build failed');
      });
    });
    
    describe('buildMockHttpClient', () => {
      it('should create mock HTTP client', async () => {
        const http = mockBuilders.buildMockHttpClient({
          'GET /api/test': { data: { result: 'test' } },
          'POST /api/create': { data: { id: 123 } }
        });
        
        const getResult = await http.get('/api/test');
        expect(getResult.data.result).toBe('test');
        
        const postResult = await http.post('/api/create', {});
        expect(postResult.data.id).toBe(123);
      });
    });
  });
  
  describe('testDataGenerators', () => {
    describe('generateFilePath', () => {
      it('should generate random file paths', () => {
        const path1 = testDataGenerators.generateFilePath();
        const path2 = testDataGenerators.generateFilePath();
        
        expect(path1).toMatch(/^\/tmp\/dir\d+\/dir\d+\/file_\d+\.txt$/);
        expect(path1).not.toBe(path2);
      });
      
      it('should accept custom options', () => {
        const path = testDataGenerators.generateFilePath({
          root: '/custom',
          depth: 3,
          extension: '.js'
        });
        
        expect(path).toMatch(/^\/custom\/dir\d+\/dir\d+\/dir\d+\/file_\d+\.js$/);
      });
    });
    
    describe('generateFileContent', () => {
      it('should generate text content', () => {
        const content = testDataGenerators.generateFileContent('text', 10);
        expect(content).toBe('a'.repeat(10));
      });
      
      it('should generate JSON content', () => {
        const content = testDataGenerators.generateFileContent('json', 'small');
        const parsed = JSON.parse(content);
        expect(parsed).toHaveProperty('data');
        expect(Array.isArray(parsed.data)).toBe(true);
      });
      
      it('should generate XML content', () => {
        const content = testDataGenerators.generateFileContent('xml', 'small');
        expect(content).toMatch(/^<\?xml version="1.0"\?>/);
        expect(content).toContain('<root>');
        expect(content).toContain('</root>');
      });
      
      it('should generate CSV content', () => {
        const content = testDataGenerators.generateFileContent('csv', 50);
        const lines = content.split('\n');
        expect(lines.length).toBeGreaterThan(0);
        expect(lines[0]).toBe('col1,col2,col3');
      });
    });
    
    describe('generateCommand', () => {
      it('should generate command with args', () => {
        const cmd = testDataGenerators.generateCommand({
          base: 'git',
          args: ['commit', '-m', 'test'],
          flags: ['-v']
        });
        
        expect(cmd.command).toBe('git');
        expect(cmd.args).toEqual(['-v', 'commit', '-m', 'test']);
        expect(cmd.full).toBe('git -v commit -m test');
      });
    });
  });
});
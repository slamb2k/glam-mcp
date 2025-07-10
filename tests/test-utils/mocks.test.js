/**
 * Tests for mock utilities
 */

import {
  createMockServer,
  createMockTransport,
  createMockContext,
  createMockResponse,
  createMockToolHandler,
  createMockEnhancer,
  createExecSyncMock,
  createFsMock,
  createMockToolRegistry,
  createMockSessionManager,
  setupCommonMocks,
  clearAllMocks,
  createMockApiResponse,
  createMockError,
} from './mocks.js';

describe('Mock Utilities', () => {
  describe('createMockServer', () => {
    it('should create a mock server with required properties', () => {
      const server = createMockServer();
      
      expect(server).toHaveProperty('setRequestHandler');
      expect(server.setRequestHandler).toBeDefined();
      expect(server.name).toBe('test-server');
      expect(server.version).toBe('1.0.0');
      expect(server.vendor).toBe('test-vendor');
    });
  });

  describe('createMockTransport', () => {
    it('should create a mock transport with required methods', () => {
      const transport = createMockTransport();
      
      expect(transport.send).toBeDefined();
      expect(transport.receive).toBeDefined();
      expect(transport.close).toBeDefined();
    });
  });

  describe('createMockContext', () => {
    it('should create a mock context with default values', () => {
      const context = createMockContext();
      
      expect(context.operation).toBe('test-operation');
      expect(context.workingDirectory).toBe('/test/dir');
      expect(context.currentBranch).toBe('main');
      expect(context.preferences.autoCommit).toBe(false);
    });

    it('should allow overriding default values', () => {
      const context = createMockContext({
        operation: 'custom-op',
        currentBranch: 'develop',
      });
      
      expect(context.operation).toBe('custom-op');
      expect(context.currentBranch).toBe('develop');
      expect(context.workingDirectory).toBe('/test/dir'); // Default preserved
    });
  });

  describe('createMockResponse', () => {
    it('should create a valid response object', () => {
      const response = createMockResponse();
      
      expect(response).toBeValidResponse();
      expect(response.success).toBe(true);
      expect(response.data).toEqual({});
      expect(response.risks).toEqual([]);
      expect(response.suggestions).toEqual([]);
    });

    it('should allow customization', () => {
      const response = createMockResponse({
        success: false,
        error: 'Test error',
        risks: [{ level: 'high', description: 'Risk' }],
      });
      
      expect(response.success).toBe(false);
      expect(response.error).toBe('Test error');
      expect(response.risks).toHaveLength(1);
    });
  });

  describe('createMockToolHandler', () => {
    it('should create a mock function that returns success', async () => {
      const handler = createMockToolHandler();
      const result = await handler('test');
      
      expect(handler).toHaveBeenCalledWith('test');
      expect(result).toEqual({ success: true });
    });

    it('should allow custom return values', async () => {
      const customReturn = { success: false, error: 'Failed' };
      const handler = createMockToolHandler(customReturn);
      const result = await handler();
      
      expect(result).toEqual(customReturn);
    });
  });

  describe('createMockEnhancer', () => {
    it('should create a mock enhancer class', async () => {
      const MockEnhancer = createMockEnhancer('TestEnhancer');
      const enhancer = new MockEnhancer({ priority: 50 });
      
      expect(enhancer.name).toBe('TestEnhancer');
      expect(enhancer.priority).toBe(50);
      expect(enhancer.isEnabled()).toBe(true);
      
      const response = { success: true };
      const enhanced = await enhancer.enhance(response, {});
      
      expect(enhanced.enhanced).toBe(true);
      expect(enhanced.enhancedBy).toBe('TestEnhancer');
    });
  });

  describe('createExecSyncMock', () => {
    it('should return predefined responses for common commands', () => {
      const execSync = createExecSyncMock();
      
      expect(execSync('git status --porcelain')).toBe('');
      expect(execSync('git branch --show-current')).toBe('main');
      expect(execSync('npm --version')).toBe('10.0.0');
    });

    it('should allow custom responses', () => {
      const execSync = createExecSyncMock({
        'custom command': 'custom response',
      });
      
      expect(execSync('custom command')).toBe('custom response');
    });

    it('should throw for unmocked commands', () => {
      const execSync = createExecSyncMock();
      
      expect(() => execSync('unknown command')).toThrow('Command not mocked');
    });
  });

  describe('createFsMock', () => {
    it('should create a mock file system', async () => {
      const fs = createFsMock({
        '/test/file.txt': 'content',
      });
      
      const content = await fs.readFile('/test/file.txt');
      expect(content).toBe('content');
      
      await expect(fs.readFile('/missing.txt')).rejects.toThrow('ENOENT');
    });

    it('should allow writing files', async () => {
      const fs = createFsMock();
      
      await fs.writeFile('/test/new.txt', 'new content');
      const content = await fs.readFile('/test/new.txt');
      expect(content).toBe('new content');
    });
  });

  describe('createMockToolRegistry', () => {
    it('should create a functional tool registry', () => {
      const tools = [
        { name: 'tool1', category: 'test' },
        { name: 'tool2', category: 'test' },
        { name: 'tool3', category: 'other' },
      ];
      
      const registry = createMockToolRegistry(tools);
      
      expect(registry.getAllTools()).toHaveLength(3);
      expect(registry.getTool('tool1')).toEqual(tools[0]);
      expect(registry.getToolsByCategory('test')).toHaveLength(2);
      expect(registry.hasTool('tool1')).toBe(true);
      expect(registry.hasTool('missing')).toBe(false);
    });
  });

  describe('createMockSessionManager', () => {
    it('should manage session state', () => {
      const session = createMockSessionManager({
        user: 'test',
      });
      
      expect(session.getSession()).toEqual({ user: 'test' });
      
      session.updateSession({ branch: 'main' });
      expect(session.getSession()).toEqual({ user: 'test', branch: 'main' });
      
      session.setPreference('theme', 'dark');
      expect(session.getPreferences()).toEqual({ theme: 'dark' });
      
      session.clearSession();
      expect(session.getSession()).toEqual({});
    });
  });

  describe('setupCommonMocks', () => {
    it('should setup all common mocks', () => {
      const mocks = setupCommonMocks();
      
      expect(mocks.execSync).toBeDefined();
      expect(mocks.fs).toBeDefined();
      expect(mocks.server).toBeDefined();
      expect(mocks.transport).toBeDefined();
      expect(mocks.toolRegistry).toBeDefined();
      expect(mocks.sessionManager).toBeDefined();
    });
  });

  describe('createMockApiResponse', () => {
    it('should create a mock fetch response', async () => {
      const response = createMockApiResponse(200, { result: 'success' });
      
      expect(response.ok).toBe(true);
      expect(response.status).toBe(200);
      expect(await response.json()).toEqual({ result: 'success' });
      expect(await response.text()).toBe('{"result":"success"}');
    });

    it('should handle error responses', () => {
      const response = createMockApiResponse(404, { error: 'Not found' });
      
      expect(response.ok).toBe(false);
      expect(response.status).toBe(404);
    });
  });

  describe('createMockError', () => {
    it('should create an error with code', () => {
      const error = createMockError('Something failed', 'ERR_TEST');
      
      expect(error.message).toBe('Something failed');
      expect(error.code).toBe('ERR_TEST');
      expect(error).toBeInstanceOf(Error);
    });
  });
});
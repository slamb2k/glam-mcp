/**
 * Utilities Tool Integration Tests
 * Task 34: Implement Tests for Remaining Tool Handlers
 */

import { jest } from '@jest/globals';
import { 
  setupToolTest,
  toolAssertions,
  mockBuilders
} from '../../test-utils/tool-testing-helpers.js';

describe('Utilities Tool Integration Tests', () => {
  const testContext = setupToolTest('utilities-tools', {
    mockEnvironment: {
      TEST_MODE: 'true'
    }
  });
  
  let mockExecSync;
  let mockFs;
  let mockPath;
  
  beforeEach(async () => {
    await testContext.setup();
    
    // Create mocks
    mockExecSync = jest.fn();
    mockFs = mockBuilders.buildMockFileSystem({
      '/test/package.json': JSON.stringify({
        name: 'test-project',
        version: '1.0.0',
        scripts: {
          test: 'jest',
          build: 'webpack'
        }
      }),
      '/test/README.md': '# Test Project',
      '/test/src/index.js': 'console.log("hello");'
    });
    
    mockPath = {
      join: jest.fn((...parts) => parts.join('/')),
      dirname: jest.fn(p => p.split('/').slice(0, -1).join('/')),
      basename: jest.fn(p => p.split('/').pop()),
      extname: jest.fn(p => {
        const parts = p.split('.');
        return parts.length > 1 ? '.' + parts.pop() : '';
      })
    };
    
    // Mock dependencies
    jest.unstable_mockModule('child_process', () => ({
      execSync: mockExecSync
    }));
    
    jest.unstable_mockModule('fs', () => ({
      default: mockFs,
      promises: mockFs.promises
    }));
    
    jest.unstable_mockModule('path', () => ({
      default: mockPath
    }));
    
    // Import and register tools after mocking
    const { registerUtilityTools } = await import('../../../src/tools/utilities.js');
    registerUtilityTools(testContext.server);
  });
  
  afterEach(async () => {
    await testContext.teardown();
  });
  
  describe('System Command Execution', () => {
    it('should execute shell commands', async () => {
      mockExecSync.mockReturnValue('Command output\n');
      
      const shellTool = testContext.getTool('shell_command');
      const result = await shellTool.handler({
        command: 'ls -la'
      });
      
      toolAssertions.assertSuccess(result);
      expect(result.data.output).toContain('Command output');
      expect(mockExecSync).toHaveBeenCalledWith('ls -la', expect.any(Object));
    });
    
    it('should handle command execution errors', async () => {
      mockExecSync.mockImplementation(() => {
        const error = new Error('Command failed');
        error.stderr = 'Error output';
        throw error;
      });
      
      const shellTool = testContext.getTool('shell_command');
      const result = await shellTool.handler({
        command: 'invalid-command'
      });
      
      toolAssertions.assertFailure(result);
      expect(result.message).toContain('Command failed');
    });
    
    it('should respect working directory option', async () => {
      mockExecSync.mockReturnValue('');
      
      const shellTool = testContext.getTool('shell_command');
      await shellTool.handler({
        command: 'pwd',
        cwd: '/custom/path'
      });
      
      expect(mockExecSync).toHaveBeenCalledWith('pwd', {
        encoding: 'utf8',
        cwd: '/custom/path'
      });
    });
  });
  
  describe('File Operations', () => {
    it('should read file contents', async () => {
      const readFileTool = testContext.getTool('read_file');
      const result = await readFileTool.handler({
        path: '/test/README.md'
      });
      
      toolAssertions.assertSuccess(result);
      expect(result.data.content).toBe('# Test Project');
      expect(result.data.path).toBe('/test/README.md');
    });
    
    it('should handle file not found', async () => {
      const readFileTool = testContext.getTool('read_file');
      const result = await readFileTool.handler({
        path: '/test/nonexistent.txt'
      });
      
      toolAssertions.assertFailure(result);
      expect(result.message).toContain('no such file');
    });
    
    it('should write file contents', async () => {
      const writeFileTool = testContext.getTool('write_file');
      const result = await writeFileTool.handler({
        path: '/test/new-file.txt',
        content: 'New file content'
      });
      
      toolAssertions.assertSuccess(result);
      expect(mockFs.writeFileSync).toHaveBeenCalledWith(
        '/test/new-file.txt',
        'New file content',
        'utf8'
      );
    });
    
    it('should list directory contents', async () => {
      mockFs.readdirSync = jest.fn().mockReturnValue(['file1.js', 'file2.js', 'README.md']);
      
      const listDirTool = testContext.getTool('list_directory');
      const result = await listDirTool.handler({
        path: '/test/src'
      });
      
      toolAssertions.assertSuccess(result);
      expect(result.data.files).toContain('file1.js');
      expect(result.data.count).toBe(3);
    });
  });
  
  describe('JSON Operations', () => {
    it('should parse JSON data', async () => {
      const parseJsonTool = testContext.getTool('parse_json');
      const result = await parseJsonTool.handler({
        content: '{"name": "test", "value": 123}'
      });
      
      toolAssertions.assertSuccess(result);
      expect(result.data.parsed).toEqual({
        name: 'test',
        value: 123
      });
    });
    
    it('should handle invalid JSON', async () => {
      const parseJsonTool = testContext.getTool('parse_json');
      const result = await parseJsonTool.handler({
        content: 'invalid json'
      });
      
      toolAssertions.assertFailure(result);
      expect(result.message).toContain('Invalid JSON');
    });
    
    it('should format JSON data', async () => {
      const formatJsonTool = testContext.getTool('format_json');
      const result = await formatJsonTool.handler({
        data: { name: 'test', items: [1, 2, 3] },
        indent: 4
      });
      
      toolAssertions.assertSuccess(result);
      expect(result.data.formatted).toContain('    "name": "test"');
    });
  });
  
  describe('Text Processing', () => {
    it('should encode text to base64', async () => {
      const base64Tool = testContext.getTool('base64_encode');
      const result = await base64Tool.handler({
        content: 'Hello, World!'
      });
      
      toolAssertions.assertSuccess(result);
      expect(result.data.encoded).toBe('SGVsbG8sIFdvcmxkIQ==');
    });
    
    it('should decode base64 text', async () => {
      const base64DecodeTool = testContext.getTool('base64_decode');
      const result = await base64DecodeTool.handler({
        content: 'SGVsbG8sIFdvcmxkIQ=='
      });
      
      toolAssertions.assertSuccess(result);
      expect(result.data.decoded).toBe('Hello, World!');
    });
    
    it('should calculate text hash', async () => {
      const hashTool = testContext.getTool('calculate_hash');
      const result = await hashTool.handler({
        content: 'test data',
        algorithm: 'sha256'
      });
      
      toolAssertions.assertSuccess(result);
      expect(result.data.hash).toMatch(/^[a-f0-9]{64}$/);
    });
  });
  
  describe('Environment and System Info', () => {
    it('should get environment variables', async () => {
      process.env.TEST_VAR = 'test_value';
      
      const envTool = testContext.getTool('get_env_var');
      const result = await envTool.handler({
        name: 'TEST_VAR'
      });
      
      toolAssertions.assertSuccess(result);
      expect(result.data.value).toBe('test_value');
      
      delete process.env.TEST_VAR;
    });
    
    it('should get system information', async () => {
      const sysInfoTool = testContext.getTool('get_system_info');
      const result = await sysInfoTool.handler({});
      
      toolAssertions.assertSuccess(result);
      expect(result.data).toHaveProperty('platform');
      expect(result.data).toHaveProperty('arch');
      expect(result.data).toHaveProperty('node_version');
    });
  });
  
  describe('URL and Network Utilities', () => {
    it('should parse URLs', async () => {
      const urlParseTool = testContext.getTool('parse_url');
      const result = await urlParseTool.handler({
        url: 'https://example.com:8080/path?query=value#hash'
      });
      
      toolAssertions.assertSuccess(result);
      expect(result.data.protocol).toBe('https:');
      expect(result.data.hostname).toBe('example.com');
      expect(result.data.port).toBe('8080');
      expect(result.data.pathname).toBe('/path');
    });
    
    it('should build URLs from components', async () => {
      const urlBuildTool = testContext.getTool('build_url');
      const result = await urlBuildTool.handler({
        protocol: 'https',
        hostname: 'api.example.com',
        pathname: '/v1/users',
        query: { id: '123', format: 'json' }
      });
      
      toolAssertions.assertSuccess(result);
      expect(result.data.url).toBe('https://api.example.com/v1/users?id=123&format=json');
    });
  });
  
  describe('NPM Package Creation', () => {
    it('should create NPM package structure', async () => {
      mockExecSync.mockReturnValue('');
      
      const createPackageTool = testContext.getTool('create_npm_package');
      const result = await createPackageTool.handler({
        name: 'my-new-package',
        description: 'A test package',
        author: 'Test Author',
        path: '/test/packages'
      });
      
      toolAssertions.assertSuccess(result);
      expect(mockFs.mkdirSync).toHaveBeenCalled();
      expect(mockFs.writeFileSync).toHaveBeenCalledWith(
        expect.stringContaining('package.json'),
        expect.stringContaining('my-new-package')
      );
    });
    
    it('should initialize git repository if requested', async () => {
      mockExecSync.mockReturnValue('');
      
      const createPackageTool = testContext.getTool('create_npm_package');
      await createPackageTool.handler({
        name: 'git-package',
        git: true,
        path: '/test/packages'
      });
      
      expect(mockExecSync).toHaveBeenCalledWith(
        'git init',
        expect.objectContaining({ cwd: expect.stringContaining('git-package') })
      );
    });
  });
  
  describe('Complex Utility Workflows', () => {
    it('should perform batch file operations', async () => {
      const files = [
        '/test/file1.txt',
        '/test/file2.txt',
        '/test/file3.txt'
      ];
      
      // Create files
      for (const file of files) {
        mockFs.writeFileSync(file, 'content');
      }
      
      // Test batch read
      const readFileTool = testContext.getTool('read_file');
      const results = await Promise.all(
        files.map(file => readFileTool.handler({ path: file }))
      );
      
      expect(results.every(r => r.success)).toBe(true);
    });
    
    it('should handle file transformation pipeline', async () => {
      // Read -> Transform -> Write pipeline
      mockFs.writeFileSync('/test/input.json', '{"value": 42}');
      
      // Read
      const readTool = testContext.getTool('read_file');
      const readResult = await readTool.handler({ path: '/test/input.json' });
      
      // Parse
      const parseTool = testContext.getTool('parse_json');
      const parseResult = await parseTool.handler({ content: readResult.data.content });
      
      // Modify
      const modified = { ...parseResult.data.parsed, value: 100 };
      
      // Format
      const formatTool = testContext.getTool('format_json');
      const formatResult = await formatTool.handler({ data: modified });
      
      // Write
      const writeTool = testContext.getTool('write_file');
      const writeResult = await writeTool.handler({
        path: '/test/output.json',
        content: formatResult.data.formatted
      });
      
      expect(writeResult.success).toBe(true);
      expect(mockFs.readFileSync('/test/output.json')).toContain('"value": 100');
    });
  });
});
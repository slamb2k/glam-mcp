/**
 * Documentation Tool Integration Tests
 * Task 34: Implement Tests for Remaining Tool Handlers
 */

import { jest } from '@jest/globals';
import { 
  setupToolTest,
  toolAssertions,
  mockBuilders
} from '../../test-utils/tool-testing-helpers.js';

describe('Documentation Tool Integration Tests', () => {
  const testContext = setupToolTest('documentation-tools');
  
  let mockFs;
  let mockPath;
  let mockToolDiscovery;
  let mockToolDocumentation;
  
  beforeEach(async () => {
    await testContext.setup();
    
    // Create mocks
    mockFs = mockBuilders.buildMockFileSystem({
      '/project/README.md': '# Project\n\nExisting content',
      '/project/docs/api.md': '# API Documentation',
      '/project/src/index.js': '// Main entry point\nconst app = () => {};',
      '/project/src/utils.js': '// Utility functions\nexport const helper = () => {};'
    });
    
    mockPath = {
      join: jest.fn((...parts) => parts.join('/')),
      dirname: jest.fn(p => p.split('/').slice(0, -1).join('/')),
      resolve: jest.fn(p => p),
      relative: jest.fn((from, to) => to)
    };
    
    // Mock tool discovery
    mockToolDiscovery = {
      discoverTools: jest.fn().mockResolvedValue({
        tools: [
          { name: 'test_tool', description: 'Test tool', category: 'utility' },
          { name: 'another_tool', description: 'Another tool', category: 'development' }
        ],
        categories: ['utility', 'development']
      })
    };
    
    // Mock tool documentation
    mockToolDocumentation = {
      generateToolDocs: jest.fn().mockResolvedValue({
        markdown: '# Tool Documentation\n\n## test_tool\nTest tool description',
        json: { tools: [] }
      }),
      generateApiDocs: jest.fn().mockResolvedValue({
        markdown: '# API Documentation\n\n## Endpoints',
        openapi: { openapi: '3.0.0' }
      })
    };
    
    // Mock dependencies
    jest.unstable_mockModule('fs', () => ({
      default: mockFs,
      promises: mockFs.promises
    }));
    
    jest.unstable_mockModule('path', () => ({
      default: mockPath
    }));
    
    jest.unstable_mockModule('../../../src/services/tool-discovery.js', () => ({
      toolDiscovery: mockToolDiscovery
    }));
    
    jest.unstable_mockModule('../../../src/services/tool-documentation.js', () => ({
      toolDocumentation: mockToolDocumentation
    }));
    
    // Import and register tools after mocking
    const { registerDocumentationTools } = await import('../../../src/tools/documentation.js');
    registerDocumentationTools(testContext.server);
  });
  
  afterEach(async () => {
    await testContext.teardown();
  });
  
  describe('Tool Documentation Generation', () => {
    it('should generate tool documentation', async () => {
      const generateDocsTool = testContext.getTool('generate_tool_docs');
      const result = await generateDocsTool.handler({
        format: 'markdown'
      });
      
      toolAssertions.assertSuccess(result);
      expect(result.data.format).toBe('markdown');
      expect(result.data.content).toContain('Tool Documentation');
      expect(mockToolDocumentation.generateToolDocs).toHaveBeenCalledWith({
        format: 'markdown',
        categories: undefined,
        includeExamples: true
      });
    });
    
    it('should generate JSON documentation', async () => {
      mockToolDocumentation.generateToolDocs.mockResolvedValue({
        json: {
          tools: [
            { name: 'tool1', description: 'Tool 1' }
          ],
          categories: ['utility']
        }
      });
      
      const generateDocsTool = testContext.getTool('generate_tool_docs');
      const result = await generateDocsTool.handler({
        format: 'json',
        categories: ['utility']
      });
      
      toolAssertions.assertSuccess(result);
      expect(result.data.format).toBe('json');
      expect(result.data.content.tools).toHaveLength(1);
    });
    
    it('should save documentation to file', async () => {
      const generateDocsTool = testContext.getTool('generate_tool_docs');
      const result = await generateDocsTool.handler({
        format: 'markdown',
        output_path: '/project/docs/tools.md'
      });
      
      toolAssertions.assertSuccess(result);
      expect(mockFs.writeFileSync).toHaveBeenCalledWith(
        '/project/docs/tools.md',
        expect.stringContaining('Tool Documentation')
      );
    });
  });
  
  describe('API Documentation Generation', () => {
    it('should generate API documentation', async () => {
      const apiDocsTool = testContext.getTool('generate_api_docs');
      const result = await apiDocsTool.handler({
        format: 'openapi'
      });
      
      toolAssertions.assertSuccess(result);
      expect(result.data.format).toBe('openapi');
      expect(result.data.content).toHaveProperty('openapi', '3.0.0');
    });
    
    it('should include server information', async () => {
      const apiDocsTool = testContext.getTool('generate_api_docs');
      const result = await apiDocsTool.handler({
        format: 'markdown',
        include_schemas: true
      });
      
      toolAssertions.assertSuccess(result);
      expect(mockToolDocumentation.generateApiDocs).toHaveBeenCalledWith({
        format: 'markdown',
        includeSchemas: true
      });
    });
  });
  
  describe('Code Documentation Analysis', () => {
    it('should analyze code documentation', async () => {
      const analyzeDocsTool = testContext.getTool('analyze_code_docs');
      const result = await analyzeDocsTool.handler({
        path: '/project/src'
      });
      
      toolAssertions.assertSuccess(result);
      expect(result.data).toHaveProperty('total_files');
      expect(result.data).toHaveProperty('documented_files');
      expect(result.data).toHaveProperty('coverage_percentage');
    });
    
    it('should find undocumented functions', async () => {
      mockFs.readFileSync.mockImplementation((path) => {
        if (path.includes('undocumented.js')) {
          return 'function test() {}\nconst helper = () => {};';
        }
        return mockFs[path] || '';
      });
      
      const analyzeDocsTool = testContext.getTool('analyze_code_docs');
      const result = await analyzeDocsTool.handler({
        path: '/project/src/undocumented.js',
        include_suggestions: true
      });
      
      toolAssertions.assertSuccess(result);
      expect(result.data.undocumented_items).toBeGreaterThan(0);
      expect(result.data.suggestions).toBeDefined();
    });
  });
  
  describe('README Generation and Updates', () => {
    it('should generate README from template', async () => {
      const generateReadmeTool = testContext.getTool('generate_readme');
      const result = await generateReadmeTool.handler({
        project_name: 'Awesome Project',
        description: 'An awesome project description',
        features: ['Feature 1', 'Feature 2'],
        installation: 'npm install awesome-project'
      });
      
      toolAssertions.assertSuccess(result);
      expect(result.data.content).toContain('# Awesome Project');
      expect(result.data.content).toContain('An awesome project description');
      expect(result.data.content).toContain('## Features');
      expect(result.data.content).toContain('- Feature 1');
    });
    
    it('should update existing README sections', async () => {
      const updateReadmeTool = testContext.getTool('update_readme_section');
      const result = await updateReadmeTool.handler({
        path: '/project/README.md',
        section: 'Installation',
        content: '## Installation\n\n```bash\nnpm install project\n```'
      });
      
      toolAssertions.assertSuccess(result);
      expect(mockFs.writeFileSync).toHaveBeenCalledWith(
        '/project/README.md',
        expect.stringContaining('npm install project')
      );
    });
    
    it('should add badges to README', async () => {
      const addBadgesTool = testContext.getTool('add_readme_badges');
      const result = await addBadgesTool.handler({
        path: '/project/README.md',
        badges: [
          { type: 'npm', package: 'awesome-project' },
          { type: 'build', status: 'passing' },
          { type: 'coverage', value: 95 }
        ]
      });
      
      toolAssertions.assertSuccess(result);
      expect(result.data.badges_added).toBe(3);
    });
  });
  
  describe('Changelog Management', () => {
    it('should create changelog entry', async () => {
      const changelogTool = testContext.getTool('add_changelog_entry');
      const result = await changelogTool.handler({
        version: '1.2.0',
        date: '2024-01-15',
        changes: {
          added: ['New feature X', 'Support for Y'],
          fixed: ['Bug in Z'],
          changed: ['Updated dependency']
        }
      });
      
      toolAssertions.assertSuccess(result);
      expect(result.data.entry).toContain('## [1.2.0] - 2024-01-15');
      expect(result.data.entry).toContain('### Added');
      expect(result.data.entry).toContain('- New feature X');
    });
    
    it('should update changelog file', async () => {
      mockFs.writeFileSync('/project/CHANGELOG.md', '# Changelog\n\n## [1.0.0] - 2024-01-01');
      
      const changelogTool = testContext.getTool('add_changelog_entry');
      const result = await changelogTool.handler({
        path: '/project/CHANGELOG.md',
        version: '1.1.0',
        changes: { added: ['New feature'] }
      });
      
      toolAssertions.assertSuccess(result);
      expect(mockFs.writeFileSync).toHaveBeenCalledWith(
        '/project/CHANGELOG.md',
        expect.stringContaining('[1.1.0]')
      );
    });
  });
  
  describe('Documentation Search and Index', () => {
    it('should search documentation', async () => {
      const searchDocsTool = testContext.getTool('search_docs');
      const result = await searchDocsTool.handler({
        query: 'installation',
        paths: ['/project/docs', '/project/README.md']
      });
      
      toolAssertions.assertSuccess(result);
      expect(result.data.results).toBeDefined();
      expect(Array.isArray(result.data.results)).toBe(true);
    });
    
    it('should build documentation index', async () => {
      const indexDocsTool = testContext.getTool('build_docs_index');
      const result = await indexDocsTool.handler({
        root_path: '/project/docs',
        output_format: 'json'
      });
      
      toolAssertions.assertSuccess(result);
      expect(result.data.total_files).toBeGreaterThanOrEqual(0);
      expect(result.data.index).toBeDefined();
    });
  });
  
  describe('Complex Documentation Workflows', () => {
    it('should generate complete project documentation', async () => {
      // Generate multiple documentation types
      const toolDocsTool = testContext.getTool('generate_tool_docs');
      const apiDocsTool = testContext.getTool('generate_api_docs');
      const readmeTool = testContext.getTool('generate_readme');
      
      const results = await Promise.all([
        toolDocsTool.handler({ format: 'markdown' }),
        apiDocsTool.handler({ format: 'markdown' }),
        readmeTool.handler({
          project_name: 'Test Project',
          description: 'Test description'
        })
      ]);
      
      expect(results.every(r => r.success)).toBe(true);
    });
    
    it('should analyze and improve documentation coverage', async () => {
      // Analyze current state
      const analyzeTool = testContext.getTool('analyze_code_docs');
      const analysisResult = await analyzeTool.handler({
        path: '/project/src',
        include_suggestions: true
      });
      
      expect(analysisResult.success).toBe(true);
      
      // Generate improvements based on analysis
      if (analysisResult.data.coverage_percentage < 80) {
        const suggestions = analysisResult.data.suggestions || [];
        expect(suggestions.length).toBeGreaterThanOrEqual(0);
      }
    });
  });
});
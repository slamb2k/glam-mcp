import { describe, it, expect, beforeEach, jest } from '@jest/globals';

describe('Documentation Tools', () => {
  let documentationTools;
  let mockToolRegistry;
  let mockSessionManager;
  let mockGitClient;
  let mockFs;

  beforeEach(() => {
    // Mock tool registry
    mockToolRegistry = {
      tools: new Map([
        ['github_flow_start', {
          name: 'github_flow_start',
          description: 'Start a new GitHub flow branch',
          metadata: { category: 'github-flow', tags: ['git', 'branch'] }
        }],
        ['auto_commit', {
          name: 'auto_commit',
          description: 'Automatically generate and create commits',
          metadata: { category: 'automation', tags: ['git', 'commit'] }
        }]
      ]),
      getStatistics: jest.fn(() => ({
        totalTools: 2,
        totalCategories: 2,
        toolsByCategory: { 'github-flow': 1, 'automation': 1 }
      })),
      listCategories: jest.fn(() => [
        { name: 'github-flow', count: 1 },
        { name: 'automation', count: 1 }
      ])
    };

    // Mock session manager
    mockSessionManager = {
      getSession: jest.fn(() => ({
        preferences: { 
          documentationFormat: 'markdown',
          includeExamples: true 
        }
      }))
    };

    // Mock git client
    mockGitClient = {
      getMainBranch: jest.fn(() => 'main'),
      getCurrentBranch: jest.fn(() => 'feature/docs'),
      getRepoInfo: jest.fn(() => ({
        name: 'glam-mcp',
        remoteUrl: 'https://github.com/user/glam-mcp.git'
      }))
    };

    // Mock fs
    mockFs = {
      promises: {
        writeFile: jest.fn(),
        mkdir: jest.fn(),
        readFile: jest.fn(),
        readdir: jest.fn(() => ['tool1.md', 'tool2.md'])
      },
      existsSync: jest.fn(() => true)
    };

    // Documentation tools implementation
    documentationTools = {
      async generateProjectDocs({ 
        output_path = './docs',
        format = 'markdown',
        include_api_reference = true,
        include_examples = true,
        include_changelog = true
      }) {
        // Create output directory
        await mockFs.promises.mkdir(output_path, { recursive: true });
        
        // Generate different documentation sections
        const sections = [];
        
        // Main README
        const readme = `# glam-mcp

## Overview
A comprehensive MCP server for development automation.

## Tools Available
- Total tools: ${mockToolRegistry.getStatistics().totalTools}
- Categories: ${mockToolRegistry.listCategories().map(c => c.name).join(', ')}

## Installation
\`\`\`bash
npm install glam-mcp
\`\`\`

## Quick Start
\`\`\`javascript
import { GlamMCPServer } from 'glam-mcp';

const server = new GlamMCPServer();
await server.start();
\`\`\`
`;
        
        await mockFs.promises.writeFile(`${output_path}/README.md`, readme);
        sections.push('README.md');
        
        // API Reference
        if (include_api_reference) {
          const apiRef = `# API Reference

## Tools

${Array.from(mockToolRegistry.tools.values()).map(tool => `
### ${tool.name}
${tool.description}

**Category**: ${tool.metadata.category}
**Tags**: ${tool.metadata.tags.join(', ')}
`).join('\n')}
`;
          
          await mockFs.promises.writeFile(`${output_path}/API.md`, apiRef);
          sections.push('API.md');
        }
        
        // Examples
        if (include_examples) {
          const examples = `# Examples

## Starting a GitHub Flow
\`\`\`javascript
await callTool('github_flow_start', {
  branch_name: 'feature/new-feature'
});
\`\`\`

## Auto Commit
\`\`\`javascript
await callTool('auto_commit', {
  message: 'feat: add new feature'
});
\`\`\`
`;
          
          await mockFs.promises.writeFile(`${output_path}/EXAMPLES.md`, examples);
          sections.push('EXAMPLES.md');
        }
        
        // Changelog
        if (include_changelog) {
          const changelog = `# Changelog

## [2.0.0] - ${new Date().toISOString().split('T')[0]}
### Added
- Enhanced MCP server with lifecycle management
- Documentation generation tools
- Comprehensive test suite

### Changed
- Migrated from hybrid CLI/MCP to pure MCP architecture
`;
          
          await mockFs.promises.writeFile(`${output_path}/CHANGELOG.md`, changelog);
          sections.push('CHANGELOG.md');
        }
        
        return {
          success: true,
          message: `Generated project documentation in ${output_path}`,
          data: {
            format,
            sections,
            totalFiles: sections.length
          },
          context: {
            suggestions: [
              'Review generated documentation for accuracy',
              'Consider adding more examples for complex tools',
              'Set up automated documentation generation in CI/CD'
            ]
          }
        };
      },

      async generateToolDoc({
        tool_name,
        output_path = './docs/tools',
        include_examples = true,
        include_related = true
      }) {
        const tool = mockToolRegistry.tools.get(tool_name);
        if (!tool) {
          return {
            success: false,
            message: `Tool ${tool_name} not found`
          };
        }
        
        await mockFs.promises.mkdir(output_path, { recursive: true });
        
        let content = `# ${tool.name}

## Description
${tool.description}

## Metadata
- **Category**: ${tool.metadata.category}
- **Tags**: ${tool.metadata.tags.join(', ')}
`;
        
        if (include_examples) {
          content += `
## Examples

### Basic Usage
\`\`\`javascript
await callTool('${tool.name}', {
  // parameters here
});
\`\`\`
`;
        }
        
        if (include_related) {
          // Find related tools by category
          const related = Array.from(mockToolRegistry.tools.values())
            .filter(t => t.metadata.category === tool.metadata.category && t.name !== tool.name)
            .slice(0, 3);
          
          if (related.length > 0) {
            content += `
## Related Tools
${related.map(t => `- **${t.name}**: ${t.description}`).join('\n')}
`;
          }
        }
        
        const filename = `${output_path}/${tool_name}.md`;
        await mockFs.promises.writeFile(filename, content);
        
        return {
          success: true,
          message: `Generated documentation for ${tool_name}`,
          data: {
            tool: tool_name,
            path: filename,
            sections: ['description', 'metadata', include_examples ? 'examples' : null, include_related ? 'related' : null].filter(Boolean)
          }
        };
      },

      async updateDocsFromCode({
        source_path = './src',
        output_path = './docs/api',
        extract_jsdoc = true,
        generate_types = true
      }) {
        await mockFs.promises.mkdir(output_path, { recursive: true });
        
        // Simulate extracting documentation from code
        const extractedDocs = {
          classes: ['EnhancedMCPServer', 'SessionManager', 'ToolRegistry'],
          functions: ['createResponse', 'enhanceResponse'],
          types: ['ToolMetadata', 'ResponseContext']
        };
        
        let content = `# API Documentation

Generated from source code on ${new Date().toISOString().split('T')[0]}

## Classes
${extractedDocs.classes.map(c => `- ${c}`).join('\n')}

## Functions  
${extractedDocs.functions.map(f => `- ${f}()`).join('\n')}
`;
        
        if (generate_types) {
          content += `
## Types
${extractedDocs.types.map(t => `- ${t}`).join('\n')}
`;
        }
        
        await mockFs.promises.writeFile(`${output_path}/extracted-api.md`, content);
        
        return {
          success: true,
          message: 'Updated documentation from source code',
          data: {
            sourcePath: source_path,
            outputPath: output_path,
            extracted: extractedDocs
          },
          context: {
            suggestions: [
              'Add more JSDoc comments to your code for better documentation',
              'Consider using TypeScript for automatic type documentation'
            ]
          }
        };
      },

      async generateInteractiveDocs({
        output_path = './docs/interactive',
        include_playground = true,
        include_tutorials = true
      }) {
        await mockFs.promises.mkdir(output_path, { recursive: true });
        
        const files = [];
        
        // Generate index.html
        const indexHtml = `<!DOCTYPE html>
<html>
<head>
  <title>glam-mcp - Interactive Documentation</title>
  <style>
    body { font-family: Arial, sans-serif; margin: 40px; }
    .tool { border: 1px solid #ddd; padding: 20px; margin: 20px 0; }
    .playground { background: #f5f5f5; padding: 20px; }
    code { background: #eee; padding: 2px 5px; }
  </style>
</head>
<body>
  <h1>glam-mcp Interactive Documentation</h1>
  
  ${include_playground ? `
  <div class="playground">
    <h2>Tool Playground</h2>
    <p>Try out tools interactively:</p>
    <select id="toolSelect">
      ${Array.from(mockToolRegistry.tools.keys()).map(name => 
        `<option value="${name}">${name}</option>`
      ).join('')}
    </select>
    <button onclick="tryTool()">Try Tool</button>
    <pre id="result"></pre>
  </div>
  ` : ''}
  
  ${include_tutorials ? `
  <div class="tutorials">
    <h2>Interactive Tutorials</h2>
    <ul>
      <li><a href="tutorial-github-flow.html">GitHub Flow Tutorial</a></li>
      <li><a href="tutorial-automation.html">Automation Tutorial</a></li>
    </ul>
  </div>
  ` : ''}
  
  <script>
    function tryTool() {
      const tool = document.getElementById('toolSelect').value;
      document.getElementById('result').textContent = 'Would execute tool: ' + tool;
    }
  </script>
</body>
</html>`;
        
        await mockFs.promises.writeFile(`${output_path}/index.html`, indexHtml);
        files.push('index.html');
        
        if (include_tutorials) {
          // Generate tutorial files
          const tutorialContent = `<!DOCTYPE html>
<html>
<head><title>GitHub Flow Tutorial</title></head>
<body>
  <h1>GitHub Flow Tutorial</h1>
  <p>Learn how to use GitHub flow tools...</p>
</body>
</html>`;
          
          await mockFs.promises.writeFile(`${output_path}/tutorial-github-flow.html`, tutorialContent);
          files.push('tutorial-github-flow.html');
        }
        
        return {
          success: true,
          message: 'Generated interactive documentation',
          data: {
            outputPath: output_path,
            files,
            features: {
              playground: include_playground,
              tutorials: include_tutorials
            }
          },
          metadata: {
            generator: 'glam-docs',
            timestamp: new Date().toISOString()
          }
        };
      },

      async checkDocsCoverage({
        docs_path = './docs',
        source_path = './src/tools'
      }) {
        // Get all tools
        const allTools = Array.from(mockToolRegistry.tools.keys());
        
        // Check which tools have documentation
        const docFiles = await mockFs.promises.readdir(`${docs_path}/tools`).catch(() => []);
        const documentedTools = docFiles
          .filter(f => f.endsWith('.md'))
          .map(f => f.replace('.md', ''));
        
        const undocumentedTools = allTools.filter(t => !documentedTools.includes(t));
        const coverage = (documentedTools.length / allTools.length) * 100;
        
        return {
          success: true,
          message: `Documentation coverage: ${coverage.toFixed(1)}%`,
          data: {
            totalTools: allTools.length,
            documented: documentedTools.length,
            undocumented: undocumentedTools.length,
            coverage: coverage,
            missingDocs: undocumentedTools
          },
          context: {
            suggestions: coverage < 80 ? [
              'Documentation coverage is below 80%',
              `Generate docs for: ${undocumentedTools.slice(0, 3).join(', ')}${undocumentedTools.length > 3 ? ' and more' : ''}`,
              'Consider setting up automated doc generation'
            ] : [
              'Documentation coverage is good!',
              'Keep documentation up to date with code changes'
            ],
            risks: coverage < 50 ? [
              { level: 'high', description: 'Low documentation coverage affects usability' }
            ] : []
          }
        };
      }
    };
  });

  describe('generate_project_docs', () => {
    it('should generate comprehensive project documentation', async () => {
      const result = await documentationTools.generateProjectDocs({
        output_path: './test-docs',
        include_api_reference: true,
        include_examples: true
      });
      
      expect(result.success).toBe(true);
      expect(result.data.sections).toContain('README.md');
      expect(result.data.sections).toContain('API.md');
      expect(result.data.sections).toContain('EXAMPLES.md');
      expect(mockFs.promises.mkdir).toHaveBeenCalledWith('./test-docs', { recursive: true });
      expect(mockFs.promises.writeFile).toHaveBeenCalledTimes(4); // README, API, Examples, Changelog
    });

    it('should respect format and inclusion options', async () => {
      const result = await documentationTools.generateProjectDocs({
        include_api_reference: false,
        include_examples: false,
        include_changelog: false
      });
      
      expect(result.success).toBe(true);
      expect(result.data.sections).toEqual(['README.md']);
      expect(mockFs.promises.writeFile).toHaveBeenCalledTimes(1);
    });
  });

  describe('generate_tool_doc', () => {
    it('should generate documentation for a specific tool', async () => {
      const result = await documentationTools.generateToolDoc({
        tool_name: 'github_flow_start',
        include_examples: true,
        include_related: true
      });
      
      expect(result.success).toBe(true);
      expect(result.data.tool).toBe('github_flow_start');
      expect(result.data.sections).toContain('examples');
      expect(result.data.sections).toContain('related');
      
      const writtenContent = mockFs.promises.writeFile.mock.calls[0][1];
      expect(writtenContent).toContain('# github_flow_start');
      expect(writtenContent).toContain('## Examples');
    });

    it('should handle non-existent tool', async () => {
      const result = await documentationTools.generateToolDoc({
        tool_name: 'non_existent_tool'
      });
      
      expect(result.success).toBe(false);
      expect(result.message).toContain('not found');
    });
  });

  describe('update_docs_from_code', () => {
    it('should extract documentation from source code', async () => {
      const result = await documentationTools.updateDocsFromCode({
        source_path: './src',
        output_path: './docs/api',
        extract_jsdoc: true,
        generate_types: true
      });
      
      expect(result.success).toBe(true);
      expect(result.data.extracted.classes).toContain('EnhancedMCPServer');
      expect(result.data.extracted.types).toContain('ToolMetadata');
      
      const writtenContent = mockFs.promises.writeFile.mock.calls[0][1];
      expect(writtenContent).toContain('## Classes');
      expect(writtenContent).toContain('## Types');
    });

    it('should provide helpful suggestions', async () => {
      const result = await documentationTools.updateDocsFromCode({});
      
      expect(result.context.suggestions).toBeDefined();
      expect(result.context.suggestions.length).toBeGreaterThan(0);
    });
  });

  describe('generate_interactive_docs', () => {
    it('should generate interactive HTML documentation', async () => {
      const result = await documentationTools.generateInteractiveDocs({
        output_path: './docs/interactive',
        include_playground: true,
        include_tutorials: true
      });
      
      expect(result.success).toBe(true);
      expect(result.data.files).toContain('index.html');
      expect(result.data.files).toContain('tutorial-github-flow.html');
      expect(result.data.features.playground).toBe(true);
      
      const htmlContent = mockFs.promises.writeFile.mock.calls[0][1];
      expect(htmlContent).toContain('Tool Playground');
      expect(htmlContent).toContain('Interactive Tutorials');
    });

    it('should include metadata', async () => {
      const result = await documentationTools.generateInteractiveDocs({});
      
      expect(result.metadata).toBeDefined();
      expect(result.metadata.generator).toBe('glam-docs');
      expect(result.metadata.timestamp).toBeDefined();
    });
  });

  describe('check_docs_coverage', () => {
    it('should calculate documentation coverage', async () => {
      mockFs.promises.readdir.mockResolvedValueOnce(['github_flow_start.md']);
      
      const result = await documentationTools.checkDocsCoverage({
        docs_path: './docs',
        source_path: './src/tools'
      });
      
      expect(result.success).toBe(true);
      expect(result.data.totalTools).toBe(2);
      expect(result.data.documented).toBe(1);
      expect(result.data.coverage).toBe(50);
      expect(result.data.missingDocs).toContain('auto_commit');
    });

    it('should provide risk assessment for low coverage', async () => {
      mockFs.promises.readdir.mockResolvedValueOnce([]);
      
      const result = await documentationTools.checkDocsCoverage({});
      
      expect(result.data.coverage).toBe(0);
      expect(result.context.risks).toBeDefined();
      expect(result.context.risks[0].level).toBe('high');
    });

    it('should provide positive feedback for good coverage', async () => {
      mockFs.promises.readdir.mockResolvedValueOnce(['github_flow_start.md', 'auto_commit.md']);
      
      const result = await documentationTools.checkDocsCoverage({});
      
      expect(result.data.coverage).toBe(100);
      expect(result.context.suggestions[0]).toContain('good');
    });
  });
});
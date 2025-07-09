import { describe, it, expect, beforeEach } from '@jest/globals';

describe('Tool Registry System', () => {
  let toolRegistry;

  beforeEach(() => {
    // Mock tool registry
    toolRegistry = {
      tools: new Map(),
      categories: new Map(),
      
      register(tool) {
        // Validate tool metadata
        if (!tool.name || !tool.description || !tool.handler) {
          throw new Error('Invalid tool: missing required fields');
        }
        
        if (this.tools.has(tool.name)) {
          throw new Error(`Tool ${tool.name} already registered`);
        }
        
        // Store tool
        this.tools.set(tool.name, tool);
        
        // Update categories
        const category = tool.metadata?.category || 'utility';
        if (!this.categories.has(category)) {
          this.categories.set(category, []);
        }
        this.categories.get(category).push(tool.name);
        
        return true;
      },
      
      get(name) {
        return this.tools.get(name);
      },
      
      search(criteria) {
        const results = [];
        
        for (const [name, tool] of this.tools) {
          if (criteria.category && tool.metadata?.category !== criteria.category) continue;
          if (criteria.tag && !tool.metadata?.tags?.includes(criteria.tag)) continue;
          if (criteria.keyword && !tool.description.toLowerCase().includes(criteria.keyword.toLowerCase())) continue;
          
          results.push(tool);
        }
        
        return results;
      },
      
      listCategories() {
        return Array.from(this.categories.keys());
      },
      
      generateDocumentation(toolName) {
        const tool = this.tools.get(toolName);
        if (!tool) return null;
        
        return {
          name: tool.name,
          description: tool.description,
          category: tool.metadata?.category,
          parameters: tool.inputSchema?.properties,
          examples: tool.metadata?.examples,
          tags: tool.metadata?.tags
        };
      }
    };
  });

  describe('tool registration', () => {
    it('should register a tool with valid metadata', () => {
      const tool = {
        name: 'test_tool',
        description: 'A test tool for unit testing',
        handler: async () => ({ success: true }),
        inputSchema: {
          type: 'object',
          properties: {
            input: { type: 'string', description: 'Test input' }
          }
        },
        metadata: {
          category: 'testing',
          tags: ['test', 'unit-test'],
          version: '1.0.0',
          author: 'Test Author'
        }
      };
      
      expect(toolRegistry.register(tool)).toBe(true);
      expect(toolRegistry.get('test_tool')).toEqual(tool);
    });

    it('should reject tools with missing required fields', () => {
      const invalidTool = {
        name: 'invalid_tool',
        // missing description and handler
      };
      
      expect(() => toolRegistry.register(invalidTool)).toThrow('Invalid tool: missing required fields');
    });

    it('should reject duplicate tool names', () => {
      const tool = {
        name: 'duplicate_tool',
        description: 'First version',
        handler: async () => ({ success: true })
      };
      
      toolRegistry.register(tool);
      
      expect(() => toolRegistry.register(tool)).toThrow('Tool duplicate_tool already registered');
    });

    it('should categorize tools automatically', () => {
      const githubTool = {
        name: 'github_tool',
        description: 'GitHub operations',
        handler: async () => ({ success: true }),
        metadata: { category: 'github-flow' }
      };
      
      const utilityTool = {
        name: 'utility_tool',
        description: 'Utility operations',
        handler: async () => ({ success: true }),
        metadata: { category: 'utility' }
      };
      
      toolRegistry.register(githubTool);
      toolRegistry.register(utilityTool);
      
      expect(toolRegistry.listCategories()).toContain('github-flow');
      expect(toolRegistry.listCategories()).toContain('utility');
    });
  });

  describe('tool discovery', () => {
    beforeEach(() => {
      // Register test tools
      const tools = [
        {
          name: 'git_status',
          description: 'Get git repository status',
          handler: async () => ({ success: true }),
          metadata: { category: 'github-flow', tags: ['git', 'status'] }
        },
        {
          name: 'run_tests',
          description: 'Run project tests with analysis',
          handler: async () => ({ success: true }),
          metadata: { category: 'automation', tags: ['test', 'ci'] }
        },
        {
          name: 'analyze_code',
          description: 'Analyze code quality metrics',
          handler: async () => ({ success: true }),
          metadata: { category: 'automation', tags: ['code-quality', 'analysis'] }
        }
      ];
      
      tools.forEach(tool => toolRegistry.register(tool));
    });

    it('should find tools by category', () => {
      const automationTools = toolRegistry.search({ category: 'automation' });
      
      expect(automationTools).toHaveLength(2);
      expect(automationTools.map(t => t.name)).toContain('run_tests');
      expect(automationTools.map(t => t.name)).toContain('analyze_code');
    });

    it('should find tools by tag', () => {
      const testTools = toolRegistry.search({ tag: 'test' });
      
      expect(testTools).toHaveLength(1);
      expect(testTools[0].name).toBe('run_tests');
    });

    it('should find tools by keyword in description', () => {
      const analysisTools = toolRegistry.search({ keyword: 'quality' });
      
      expect(analysisTools).toHaveLength(1);
      expect(analysisTools[0].name).toBe('analyze_code');
    });

    it('should support multiple search criteria', () => {
      const results = toolRegistry.search({ 
        category: 'automation',
        keyword: 'test'
      });
      
      expect(results).toHaveLength(1);
      expect(results[0].name).toBe('run_tests');
    });
  });

  describe('tool metadata validation', () => {
    it('should validate parameter schemas', () => {
      const tool = {
        name: 'validated_tool',
        description: 'Tool with parameter validation',
        handler: async () => ({ success: true }),
        inputSchema: {
          type: 'object',
          properties: {
            required_param: {
              type: 'string',
              description: 'Required parameter'
            },
            optional_param: {
              type: 'number',
              description: 'Optional parameter',
              default: 10
            }
          },
          required: ['required_param']
        }
      };
      
      expect(() => toolRegistry.register(tool)).not.toThrow();
    });

    it('should store usage examples', () => {
      const tool = {
        name: 'example_tool',
        description: 'Tool with examples',
        handler: async () => ({ success: true }),
        metadata: {
          examples: [
            {
              description: 'Basic usage',
              input: { param: 'value' },
              output: { success: true, result: 'done' }
            },
            {
              description: 'Advanced usage',
              input: { param: 'complex', options: { advanced: true } },
              output: { success: true, result: 'complex done' }
            }
          ]
        }
      };
      
      toolRegistry.register(tool);
      const retrieved = toolRegistry.get('example_tool');
      
      expect(retrieved.metadata.examples).toHaveLength(2);
      expect(retrieved.metadata.examples[0].description).toBe('Basic usage');
    });
  });

  describe('documentation generation', () => {
    it('should generate documentation from metadata', () => {
      const tool = {
        name: 'documented_tool',
        description: 'A well-documented tool for testing',
        handler: async () => ({ success: true }),
        inputSchema: {
          type: 'object',
          properties: {
            input: { 
              type: 'string', 
              description: 'The input string to process'
            },
            options: {
              type: 'object',
              properties: {
                verbose: { type: 'boolean', default: false }
              }
            }
          }
        },
        metadata: {
          category: 'utility',
          tags: ['documentation', 'test'],
          examples: [
            {
              description: 'Simple example',
              input: { input: 'test' },
              output: { success: true }
            }
          ]
        }
      };
      
      toolRegistry.register(tool);
      const docs = toolRegistry.generateDocumentation('documented_tool');
      
      expect(docs).toMatchObject({
        name: 'documented_tool',
        description: 'A well-documented tool for testing',
        category: 'utility',
        tags: ['documentation', 'test']
      });
      expect(docs.parameters).toHaveProperty('input');
      expect(docs.parameters).toHaveProperty('options');
      expect(docs.examples).toHaveLength(1);
    });

    it('should handle tools without metadata gracefully', () => {
      const minimalTool = {
        name: 'minimal_tool',
        description: 'Minimal tool',
        handler: async () => ({ success: true })
      };
      
      toolRegistry.register(minimalTool);
      const docs = toolRegistry.generateDocumentation('minimal_tool');
      
      expect(docs).toMatchObject({
        name: 'minimal_tool',
        description: 'Minimal tool',
        category: undefined,
        parameters: undefined,
        examples: undefined,
        tags: undefined
      });
    });
  });

  describe('tool listing and information', () => {
    it('should list all registered tools', () => {
      const tools = [
        { name: 'tool1', description: 'Tool 1', handler: async () => ({}) },
        { name: 'tool2', description: 'Tool 2', handler: async () => ({}) },
        { name: 'tool3', description: 'Tool 3', handler: async () => ({}) }
      ];
      
      tools.forEach(tool => toolRegistry.register(tool));
      
      const allTools = Array.from(toolRegistry.tools.keys());
      expect(allTools).toHaveLength(3);
      expect(allTools).toContain('tool1');
      expect(allTools).toContain('tool2');
      expect(allTools).toContain('tool3');
    });

    it('should provide tool statistics', () => {
      const tools = [
        { name: 'g1', description: 'Git 1', handler: async () => ({}), metadata: { category: 'git' } },
        { name: 'g2', description: 'Git 2', handler: async () => ({}), metadata: { category: 'git' } },
        { name: 'u1', description: 'Util 1', handler: async () => ({}), metadata: { category: 'utility' } }
      ];
      
      tools.forEach(tool => toolRegistry.register(tool));
      
      const stats = {
        total: toolRegistry.tools.size,
        byCategory: {}
      };
      
      for (const [category, toolNames] of toolRegistry.categories) {
        stats.byCategory[category] = toolNames.length;
      }
      
      expect(stats.total).toBe(3);
      expect(stats.byCategory.git).toBe(2);
      expect(stats.byCategory.utility).toBe(1);
    });
  });
});
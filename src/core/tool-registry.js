/**
 * Tool Registration System
 * Centralized system for registering, discovering, and managing MCP tools
 */

import { EventEmitter } from 'events';

/**
 * Tool metadata schema
 */
export const ToolMetadataSchema = {
  name: { type: 'string', required: true },
  description: { type: 'string', required: true },
  category: { type: 'string', default: 'utility' },
  tags: { type: 'array', default: [] },
  version: { type: 'string', default: '1.0.0' },
  author: { type: 'string' },
  examples: { type: 'array' },
  relatedTools: { type: 'array' },
  riskLevel: { type: 'string', enum: ['low', 'medium', 'high'], default: 'low' },
  requiresAuth: { type: 'boolean', default: false },
  experimental: { type: 'boolean', default: false }
};

/**
 * Tool categories
 */
export const ToolCategories = {
  CONTEXT: 'context',
  GITHUB_FLOW: 'github-flow',
  AUTOMATION: 'automation',
  SAFETY: 'safety',
  TEAM: 'team',
  UTILITY: 'utility',
  PERFORMANCE: 'performance',
  DOCUMENTATION: 'documentation'
};

/**
 * Tool Registry class
 */
export class ToolRegistry extends EventEmitter {
  constructor() {
    super();
    this.tools = new Map();
    this.categories = new Map();
    this.tags = new Map();
    this.aliases = new Map();
  }

  /**
   * Register a new tool
   */
  register(tool) {
    // Validate required fields
    if (!tool.name || typeof tool.name !== 'string') {
      throw new Error('Tool name is required and must be a string');
    }
    
    if (!tool.description || typeof tool.description !== 'string') {
      throw new Error('Tool description is required and must be a string');
    }
    
    if (!tool.handler || typeof tool.handler !== 'function') {
      throw new Error('Tool handler is required and must be a function');
    }
    
    // Check for duplicate registration
    if (this.tools.has(tool.name)) {
      throw new Error(`Tool ${tool.name} already registered`);
    }
    
    // Normalize metadata
    const metadata = this.normalizeMetadata(tool.metadata || {});
    
    // Create tool record
    const toolRecord = {
      name: tool.name,
      description: tool.description,
      handler: tool.handler,
      inputSchema: tool.inputSchema || { type: 'object', properties: {} },
      metadata,
      registeredAt: new Date().toISOString()
    };
    
    // Store tool
    this.tools.set(tool.name, toolRecord);
    
    // Update category index
    this.addToCategory(metadata.category, tool.name);
    
    // Update tag index
    metadata.tags.forEach(tag => this.addToTag(tag, tool.name));
    
    // Emit registration event
    this.emit('toolRegistered', { name: tool.name, category: metadata.category });
    
    return true;
  }

  /**
   * Unregister a tool
   */
  unregister(toolName) {
    const tool = this.tools.get(toolName);
    if (!tool) {
      throw new Error(`Tool ${toolName} not found`);
    }
    
    // Remove from indexes
    this.removeFromCategory(tool.metadata.category, toolName);
    tool.metadata.tags.forEach(tag => this.removeFromTag(tag, toolName));
    
    // Remove aliases
    for (const [alias, name] of this.aliases) {
      if (name === toolName) {
        this.aliases.delete(alias);
      }
    }
    
    // Remove tool
    this.tools.delete(toolName);
    
    // Emit event
    this.emit('toolUnregistered', { name: toolName });
    
    return true;
  }

  /**
   * Get a tool by name
   */
  get(toolName) {
    // Check aliases first
    const actualName = this.aliases.get(toolName) || toolName;
    return this.tools.get(actualName);
  }

  /**
   * Search for tools
   */
  search(criteria = {}) {
    const results = [];
    
    for (const [name, tool] of this.tools) {
      let matches = true;
      
      // Category filter
      if (criteria.category && tool.metadata.category !== criteria.category) {
        matches = false;
      }
      
      // Tag filter
      if (criteria.tag && !tool.metadata.tags.includes(criteria.tag)) {
        matches = false;
      }
      
      // Keyword search in name and description
      if (criteria.keyword) {
        const keyword = criteria.keyword.toLowerCase();
        const inName = tool.name.toLowerCase().includes(keyword);
        const inDescription = tool.description.toLowerCase().includes(keyword);
        const inTags = tool.metadata.tags.some(tag => 
          tag.toLowerCase().includes(keyword)
        );
        
        if (!inName && !inDescription && !inTags) {
          matches = false;
        }
      }
      
      // Risk level filter
      if (criteria.riskLevel && tool.metadata.riskLevel !== criteria.riskLevel) {
        matches = false;
      }
      
      // Experimental filter
      if (criteria.experimental !== undefined && 
          tool.metadata.experimental !== criteria.experimental) {
        matches = false;
      }
      
      if (matches) {
        results.push(tool);
      }
    }
    
    // Sort results by relevance if keyword was provided
    if (criteria.keyword) {
      const keyword = criteria.keyword.toLowerCase();
      results.sort((a, b) => {
        // Exact name match ranks highest
        const aNameMatch = a.name.toLowerCase() === keyword ? 2 : 
                          a.name.toLowerCase().includes(keyword) ? 1 : 0;
        const bNameMatch = b.name.toLowerCase() === keyword ? 2 : 
                          b.name.toLowerCase().includes(keyword) ? 1 : 0;
        
        return bNameMatch - aNameMatch;
      });
    }
    
    return results;
  }

  /**
   * List all categories
   */
  listCategories() {
    const categories = [];
    
    for (const [category, tools] of this.categories) {
      categories.push({
        name: category,
        count: tools.size,
        tools: Array.from(tools)
      });
    }
    
    return categories.sort((a, b) => b.count - a.count);
  }

  /**
   * List all tags
   */
  listTags() {
    const tags = [];
    
    for (const [tag, tools] of this.tags) {
      tags.push({
        name: tag,
        count: tools.size,
        tools: Array.from(tools)
      });
    }
    
    return tags.sort((a, b) => b.count - a.count);
  }

  /**
   * Get tools by category
   */
  getByCategory(category) {
    const toolNames = this.categories.get(category);
    if (!toolNames) return [];
    
    return Array.from(toolNames).map(name => this.tools.get(name));
  }

  /**
   * Get tools by tag
   */
  getByTag(tag) {
    const toolNames = this.tags.get(tag);
    if (!toolNames) return [];
    
    return Array.from(toolNames).map(name => this.tools.get(name));
  }

  /**
   * Add an alias for a tool
   */
  addAlias(alias, toolName) {
    if (!this.tools.has(toolName)) {
      throw new Error(`Tool ${toolName} not found`);
    }
    
    if (this.aliases.has(alias) || this.tools.has(alias)) {
      throw new Error(`Alias ${alias} already exists`);
    }
    
    this.aliases.set(alias, toolName);
    return true;
  }

  /**
   * Generate documentation for a tool
   */
  generateDocumentation(toolName) {
    const tool = this.get(toolName);
    if (!tool) return null;
    
    const doc = {
      name: tool.name,
      description: tool.description,
      category: tool.metadata.category,
      tags: tool.metadata.tags,
      version: tool.metadata.version,
      author: tool.metadata.author,
      registeredAt: tool.registeredAt,
      riskLevel: tool.metadata.riskLevel,
      experimental: tool.metadata.experimental,
      requiresAuth: tool.metadata.requiresAuth,
      parameters: this.documentParameters(tool.inputSchema),
      examples: tool.metadata.examples || [],
      relatedTools: tool.metadata.relatedTools || []
    };
    
    // Add usage information
    doc.usage = this.generateUsageString(tool);
    
    return doc;
  }

  /**
   * Generate documentation for all tools
   */
  generateFullDocumentation() {
    const docs = {
      overview: {
        totalTools: this.tools.size,
        categories: this.listCategories(),
        tags: this.listTags()
      },
      tools: []
    };
    
    // Group by category
    const byCategory = {};
    
    for (const [name, tool] of this.tools) {
      const category = tool.metadata.category;
      if (!byCategory[category]) {
        byCategory[category] = [];
      }
      
      byCategory[category].push(this.generateDocumentation(name));
    }
    
    docs.toolsByCategory = byCategory;
    
    return docs;
  }

  /**
   * Get registry statistics
   */
  getStatistics() {
    const stats = {
      totalTools: this.tools.size,
      totalCategories: this.categories.size,
      totalTags: this.tags.size,
      totalAliases: this.aliases.size,
      toolsByCategory: {},
      toolsByRiskLevel: { low: 0, medium: 0, high: 0 },
      experimentalTools: 0,
      authRequiredTools: 0
    };
    
    // Calculate detailed statistics
    for (const [name, tool] of this.tools) {
      const category = tool.metadata.category;
      stats.toolsByCategory[category] = (stats.toolsByCategory[category] || 0) + 1;
      
      stats.toolsByRiskLevel[tool.metadata.riskLevel]++;
      
      if (tool.metadata.experimental) stats.experimentalTools++;
      if (tool.metadata.requiresAuth) stats.authRequiredTools++;
    }
    
    return stats;
  }

  /**
   * Validate tool compatibility
   */
  validateCompatibility(toolName, context = {}) {
    const tool = this.get(toolName);
    if (!tool) {
      throw new Error(`Tool ${toolName} not found`);
    }
    
    const issues = [];
    
    // Check auth requirements
    if (tool.metadata.requiresAuth && !context.authenticated) {
      issues.push({
        type: 'auth',
        message: 'Tool requires authentication'
      });
    }
    
    // Check experimental status
    if (tool.metadata.experimental && !context.allowExperimental) {
      issues.push({
        type: 'experimental',
        message: 'Tool is experimental and may be unstable'
      });
    }
    
    // Check risk level
    if (tool.metadata.riskLevel === 'high' && !context.allowHighRisk) {
      issues.push({
        type: 'risk',
        message: 'Tool has high risk level'
      });
    }
    
    return {
      compatible: issues.length === 0,
      issues
    };
  }

  // Private helper methods
  
  normalizeMetadata(metadata) {
    return {
      category: metadata.category || ToolCategories.UTILITY,
      tags: Array.isArray(metadata.tags) ? metadata.tags : [],
      version: metadata.version || '1.0.0',
      author: metadata.author || 'Unknown',
      examples: metadata.examples || [],
      relatedTools: metadata.relatedTools || [],
      riskLevel: metadata.riskLevel || 'low',
      requiresAuth: metadata.requiresAuth || false,
      experimental: metadata.experimental || false,
      ...metadata
    };
  }
  
  addToCategory(category, toolName) {
    if (!this.categories.has(category)) {
      this.categories.set(category, new Set());
    }
    this.categories.get(category).add(toolName);
  }
  
  removeFromCategory(category, toolName) {
    const tools = this.categories.get(category);
    if (tools) {
      tools.delete(toolName);
      if (tools.size === 0) {
        this.categories.delete(category);
      }
    }
  }
  
  addToTag(tag, toolName) {
    if (!this.tags.has(tag)) {
      this.tags.set(tag, new Set());
    }
    this.tags.get(tag).add(toolName);
  }
  
  removeFromTag(tag, toolName) {
    const tools = this.tags.get(tag);
    if (tools) {
      tools.delete(toolName);
      if (tools.size === 0) {
        this.tags.delete(tag);
      }
    }
  }
  
  documentParameters(schema) {
    if (!schema || !schema.properties) return {};
    
    const params = {};
    
    for (const [name, prop] of Object.entries(schema.properties)) {
      params[name] = {
        type: prop.type,
        description: prop.description || 'No description',
        required: schema.required?.includes(name) || false,
        default: prop.default
      };
      
      // Handle nested objects
      if (prop.type === 'object' && prop.properties) {
        params[name].properties = this.documentParameters(prop);
      }
      
      // Handle enums
      if (prop.enum) {
        params[name].enum = prop.enum;
      }
    }
    
    return params;
  }
  
  generateUsageString(tool) {
    const params = [];
    
    if (tool.inputSchema?.properties) {
      const required = tool.inputSchema.required || [];
      
      for (const [name, prop] of Object.entries(tool.inputSchema.properties)) {
        if (required.includes(name)) {
          params.push(`${name}: <${prop.type}>`);
        } else {
          params.push(`[${name}: <${prop.type}>]`);
        }
      }
    }
    
    return `${tool.name}(${params.join(', ')})`;
  }
}

// Create singleton instance
export const toolRegistry = new ToolRegistry();

/**
 * Tool registration decorator
 */
export function registerTool(metadata = {}) {
  return function(target, propertyKey, descriptor) {
    const originalMethod = descriptor.value;
    
    // Create tool definition
    const tool = {
      name: metadata.name || propertyKey,
      description: metadata.description || `Tool ${propertyKey}`,
      handler: originalMethod,
      inputSchema: metadata.inputSchema,
      metadata
    };
    
    // Register tool
    toolRegistry.register(tool);
    
    return descriptor;
  };
}
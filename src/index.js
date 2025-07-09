#!/usr/bin/env node

/**
 * glam-mcp Server
 * Comprehensive GitHub Flow Automation with MCP Support
 */

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ErrorCode,
  ListToolsRequestSchema,
  McpError,
} from "@modelcontextprotocol/sdk/types.js";

// Import tool registrations
import { registerGitHubFlowTools } from "./tools/github-flow.js";
import { registerAutomationTools } from "./tools/automation.js";
import { registerUtilityTools } from "./tools/utilities.js";
import { registerContextTools } from "./tools/context.js";
import { registerTeamTools } from "./tools/team.js";
import { registerSafetyTools } from "./tools/safety.js";
import { registerDocumentationTools } from "./tools/documentation.js";
import { registerConfigTools } from "./tools/config.js";

// Import tool registry
import { toolRegistry, ToolCategories } from "./core/tool-registry.js";
import { toolDiscovery } from "./services/tool-discovery.js";
import { toolDocumentation } from "./services/tool-documentation.js";

// Import utilities
import { showBanner } from "./utils/banner.js";

class GlamMCPServer {
  constructor() {
    this.server = new Server(
      {
        name: "glam-mcp",
        version: "1.0.0",
      },
      {
        capabilities: {
          tools: {},
        },
      },
    );

    this.setupToolHandlers();
    this.setupErrorHandling();
  }

  setupToolHandlers() {
    // Handle tool listing
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      return {
        tools: this.tools.map((tool) => ({
          name: tool.name,
          description: tool.description,
          inputSchema: tool.inputSchema,
        })),
      };
    });

    // Handle tool execution
    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;

      const tool = this.tools.find((t) => t.name === name);
      if (!tool) {
        throw new McpError(ErrorCode.MethodNotFound, `Tool ${name} not found`);
      }

      try {
        const result = await tool.handler(args || {});
        return {
          content: [
            {
              type: "text",
              text:
                result.message ||
                result.text ||
                JSON.stringify(result, null, 2),
            },
          ],
        };
      } catch (error) {
        throw new McpError(
          ErrorCode.InternalError,
          `Tool execution failed: ${error.message}`,
        );
      }
    });
  }

  setupErrorHandling() {
    this.server.onerror = (error) => {
      console.error("[MCP Error]", error);
    };

    process.on("SIGINT", async () => {
      await this.server.close();
      process.exit(0);
    });
  }

  registerTools() {
    this.tools = [];

    // Register all tool categories
    registerGitHubFlowTools(this);
    registerAutomationTools(this);
    registerUtilityTools(this);
    registerContextTools(this);
    registerTeamTools(this);
    registerSafetyTools(this);
    registerDocumentationTools(this);
    registerConfigTools(this);
    
    // Register registry management tools
    this.registerRegistryTools();

    console.log(`[glam-mcp] Registered ${this.tools.length} tools`);
    console.log(`[glam-mcp] Tool Registry: ${toolRegistry.getStatistics().totalTools} tools cataloged`);
  }

  addTool(tool) {
    this.tools.push(tool);
    
    // Also register in the centralized registry
    try {
      const metadata = {
        category: this.inferCategory(tool.name),
        tags: this.inferTags(tool),
        ...tool.metadata
      };
      
      toolRegistry.register({
        ...tool,
        metadata
      });
    } catch (e) {
      // Tool might already be registered
    }
  }
  
  registerRegistryTools() {
    // Tool discovery
    this.addTool({
      name: "tool_search",
      description: "Search for tools by keyword, category, or capability. Use this to discover available tools.",
      inputSchema: {
        type: "object",
        properties: {
          keyword: {
            type: "string",
            description: "Keyword to search for"
          },
          category: {
            type: "string",
            enum: Object.values(ToolCategories),
            description: "Tool category to filter by"
          },
          tag: {
            type: "string",
            description: "Tag to filter by"
          }
        }
      },
      handler: async (params) => {
        const results = toolRegistry.search(params);
        return {
          success: true,
          message: `Found ${results.length} tools`,
          data: results.map(tool => ({
            name: tool.name,
            description: tool.description,
            category: tool.metadata.category,
            tags: tool.metadata.tags
          }))
        };
      },
      metadata: {
        category: ToolCategories.UTILITY,
        tags: ['discovery', 'search', 'registry']
      }
    });
    
    // Tool information
    this.addTool({
      name: "tool_info",
      description: "Get detailed information about a specific tool including parameters and examples.",
      inputSchema: {
        type: "object",
        properties: {
          tool_name: {
            type: "string",
            description: "Name of the tool"
          }
        },
        required: ["tool_name"]
      },
      handler: async ({ tool_name }) => {
        const doc = toolRegistry.generateDocumentation(tool_name);
        if (!doc) {
          return {
            success: false,
            message: `Tool ${tool_name} not found`
          };
        }
        
        return {
          success: true,
          message: `Tool information for ${tool_name}`,
          data: doc
        };
      },
      metadata: {
        category: ToolCategories.UTILITY,
        tags: ['documentation', 'info', 'registry']
      }
    });
    
    // List tools by category
    this.addTool({
      name: "tool_list_categories",
      description: "List all tool categories and their tool counts.",
      inputSchema: {
        type: "object",
        properties: {}
      },
      handler: async () => {
        const categories = toolRegistry.listCategories();
        return {
          success: true,
          message: `Found ${categories.length} categories`,
          data: categories
        };
      },
      metadata: {
        category: ToolCategories.UTILITY,
        tags: ['discovery', 'categories', 'registry']
      }
    });
    
    // Get workflow recommendations
    this.addTool({
      name: "tool_workflow_recommendations",
      description: "Get tool recommendations for specific workflows like development, review, or deployment.",
      inputSchema: {
        type: "object",
        properties: {
          workflow: {
            type: "string",
            enum: ["development", "review", "deployment", "maintenance"],
            description: "Workflow type"
          }
        },
        required: ["workflow"]
      },
      handler: async ({ workflow }) => {
        const recommendations = toolDiscovery.getWorkflowRecommendations(workflow);
        return {
          success: true,
          message: `Recommended tools for ${workflow} workflow`,
          data: recommendations.map(rec => ({
            name: rec.name,
            description: rec.description,
            reason: rec.recommendation.reason
          }))
        };
      },
      metadata: {
        category: ToolCategories.UTILITY,
        tags: ['workflow', 'recommendations', 'registry']
      }
    });
    
    // Natural language tool search
    this.addTool({
      name: "tool_search_natural",
      description: "Search for tools using natural language queries like 'how do I create a branch' or 'tools for testing'.",
      inputSchema: {
        type: "object",
        properties: {
          query: {
            type: "string",
            description: "Natural language query"
          }
        },
        required: ["query"]
      },
      handler: async ({ query }) => {
        const results = toolDiscovery.searchNatural(query);
        return {
          success: true,
          message: `Search results for: ${query}`,
          data: {
            intent: results.intent,
            entities: results.entities,
            tools: results.results.map(r => ({
              name: r.name,
              description: r.description,
              relevance: r.relevance
            }))
          }
        };
      },
      metadata: {
        category: ToolCategories.UTILITY,
        tags: ['search', 'natural-language', 'registry']
      }
    });
  }
  
  inferCategory(toolName) {
    if (toolName.includes('github_flow')) return ToolCategories.GITHUB_FLOW;
    if (toolName.includes('auto_') || toolName.includes('npm_')) return ToolCategories.AUTOMATION;
    if (toolName.includes('context') || toolName.includes('session')) return ToolCategories.CONTEXT;
    if (toolName.includes('team')) return ToolCategories.TEAM;
    if (toolName.includes('safety') || toolName.includes('risk')) return ToolCategories.SAFETY;
    return ToolCategories.UTILITY;
  }
  
  inferTags(tool) {
    const tags = [];
    const name = tool.name.toLowerCase();
    const desc = tool.description.toLowerCase();
    
    // Infer from name
    if (name.includes('git')) tags.push('git');
    if (name.includes('test')) tags.push('test');
    if (name.includes('commit')) tags.push('commit');
    if (name.includes('branch')) tags.push('branch');
    if (name.includes('pr') || name.includes('pull')) tags.push('pr');
    
    // Infer from description
    if (desc.includes('analyze')) tags.push('analysis');
    if (desc.includes('safety') || desc.includes('risk')) tags.push('safety');
    if (desc.includes('format') || desc.includes('lint')) tags.push('code-quality');
    
    return tags;
  }

  async start() {
    // Register all tools
    this.registerTools();

    // Start the server
    const transport = new StdioServerTransport();
    await this.server.connect(transport);

    console.log("[glam-mcp] Server started successfully");
  }
}

// Export for programmatic use
export { GlamMCPServer };

// Start server if run directly
if (import.meta.url === `file://${process.argv[1]}`) {
  // Show banner when starting directly
  showBanner('compact');
  
  const server = new GlamMCPServer();
  server.start().catch((error) => {
    console.error("[glam-mcp] Failed to start server:", error);
    process.exit(1);
  });
}

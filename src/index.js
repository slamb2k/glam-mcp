#!/usr/bin/env node

/**
 * Slambed MCP Server
 * Comprehensive Git Flow Automation with MCP and CLI Support
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { 
  CallToolRequestSchema,
  ErrorCode,
  ListToolsRequestSchema,
  McpError
} from '@modelcontextprotocol/sdk/types.js';

// Import tool registrations
import { registerGitFlowTools } from './tools/git-flow.js';
import { registerAutomationTools } from './tools/automation.js';
import { registerUtilityTools } from './tools/utilities.js';

class SlamBedMCPServer {
  constructor() {
    this.server = new Server(
      {
        name: 'slambed-mcp',
        version: '1.0.0',
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );

    this.setupToolHandlers();
    this.setupErrorHandling();
  }

  setupToolHandlers() {
    // Handle tool listing
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      return {
        tools: this.tools.map(tool => ({
          name: tool.name,
          description: tool.description,
          inputSchema: tool.inputSchema,
        })),
      };
    });

    // Handle tool execution
    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;
      
      const tool = this.tools.find(t => t.name === name);
      if (!tool) {
        throw new McpError(
          ErrorCode.MethodNotFound,
          `Tool ${name} not found`
        );
      }

      try {
        const result = await tool.handler(args || {});
        return {
          content: [
            {
              type: 'text',
              text: result.message || result.text || JSON.stringify(result, null, 2)
            }
          ]
        };
      } catch (error) {
        throw new McpError(
          ErrorCode.InternalError,
          `Tool execution failed: ${error.message}`
        );
      }
    });
  }

  setupErrorHandling() {
    this.server.onerror = (error) => {
      console.error('[MCP Error]', error);
    };

    process.on('SIGINT', async () => {
      await this.server.close();
      process.exit(0);
    });
  }

  registerTools() {
    this.tools = [];
    
    // Register all tool categories
    registerGitFlowTools(this);
    registerAutomationTools(this);
    registerUtilityTools(this);

    console.log(`[Slambed MCP] Registered ${this.tools.length} tools`);
  }

  addTool(tool) {
    this.tools.push(tool);
  }

  async start() {
    // Register all tools
    this.registerTools();

    // Start the server
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    
    console.log('[Slambed MCP] Server started successfully');
  }
}

// Export for programmatic use
export { SlamBedMCPServer };

// Start server if run directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const server = new SlamBedMCPServer();
  server.start().catch((error) => {
    console.error('[Slambed MCP] Failed to start server:', error);
    process.exit(1);
  });
}
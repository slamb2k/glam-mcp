#!/usr/bin/env node

/**
 * Slambed MCP Server
 * Comprehensive GitHub Flow Automation with MCP and CLI Support
 */

// In MCP mode, suppress all console output
if (process.argv[1] && (process.argv[1].includes('mcp') || process.env.MCP_MODE)) {
  process.env.MCP_MODE = 'true';
  
  // Suppress console methods  
  const noop = () => {};
  console.log = noop;
  console.error = noop;
  console.warn = noop;
  console.info = noop;
  console.debug = noop;
  
  // Also suppress process.stdout.write and stderr for dotenv
  const originalStdoutWrite = process.stdout.write;
  const originalStderrWrite = process.stderr.write;
  
  process.stdout.write = function(chunk, encoding, callback) {
    // Only allow JSON-RPC messages
    if (typeof chunk === 'string' && (chunk.includes('"jsonrpc"') || chunk === '\n')) {
      return originalStdoutWrite.call(process.stdout, chunk, encoding, callback);
    }
    return true;
  };
  
  process.stderr.write = function() {
    return true;
  };
}

import dotenv from 'dotenv';
dotenv.config();

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
import { registerSlamTools } from "./tools/slam-tools.js";

class SlamBedMCPServer {
  constructor() {
    this.server = new Server(
      {
        name: "slambed-mcp",
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
      // Don't log to console in MCP mode - it interferes with protocol
      // Errors are handled by the MCP protocol
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
    registerSlamTools(this);

    // Don't log to console in MCP mode - it interferes with protocol
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

    // Don't log to console in MCP mode - it interferes with protocol
  }
}

// Export for programmatic use
export { SlamBedMCPServer };

// Start server if run directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const server = new SlamBedMCPServer();
  server.start().catch((error) => {
    // Don't log to console in MCP mode - it interferes with protocol
    // Exit with error code to indicate failure
    process.exit(1);
  });
}

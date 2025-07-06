#!/usr/bin/env node

/**
 * Slambed MCP Server Executable
 * This starts the MCP server for Claude Desktop integration
 */

// Set MCP mode to disable console logging
process.env.MCP_MODE = 'true';

import { SlamBedMCPServer } from '../src/index.js';

// Start the server
const server = new SlamBedMCPServer();
server.start().catch(() => {
  process.exit(1);
});
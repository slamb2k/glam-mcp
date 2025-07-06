#!/usr/bin/env node

/**
 * Slambed MCP Default Executable
 * This allows `npx slambed-mcp` to work directly
 */

// Set MCP mode to disable console logging
process.env.MCP_MODE = 'true';

import { SlamBedMCPServer } from '../src/index.js';

// Start the server
const server = new SlamBedMCPServer();
server.start().catch(() => {
  process.exit(1);
});
#!/usr/bin/env node

/**
 * MCP Server Wrapper
 * This wrapper ensures proper execution when called via npx
 */

// Set MCP mode to disable console logging
process.env.MCP_MODE = 'true';

// Suppress all console output before any imports
const noop = () => {};
console.log = noop;
console.error = noop;
console.warn = noop;
console.info = noop;
console.debug = noop;

// Suppress stderr completely
const originalStderr = process.stderr.write;
process.stderr.write = () => true;

import { SlamBedMCPServer } from '../src/index.js';

// Start the server
const server = new SlamBedMCPServer();
server.start().catch(() => {
  process.exit(1);
});
#!/usr/bin/env node

// Set MCP mode FIRST before any requires/imports
process.env.MCP_MODE = 'true';

// Override console and process.stderr.write before ANYTHING else
const noop = () => {};
console.log = noop;
console.error = noop;
console.warn = noop;
console.info = noop;
console.debug = noop;

// Store original stderr write
const originalStderrWrite = process.stderr.write.bind(process.stderr);

// Override stderr write to suppress all output
process.stderr.write = function() {
  return true;
};

// Override stdout write to only allow JSON-RPC
const originalStdoutWrite = process.stdout.write.bind(process.stdout);
process.stdout.write = function(chunk, encoding, callback) {
  if (typeof chunk === 'string' && (chunk.includes('"jsonrpc"') || chunk === '\n')) {
    return originalStdoutWrite(chunk, encoding, callback);
  }
  return true;
};

// Now import after all overrides are in place
import { SlamBedMCPServer } from '../src/index.js';

// Start the server
const server = new SlamBedMCPServer();
server.start().catch(() => {
  process.exit(1);
});
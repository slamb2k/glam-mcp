#!/usr/bin/env node

import { spawn } from 'child_process';

console.log('Testing MCP server protocol...\n');

// Spawn the MCP server
const server = spawn('node', ['bin/mcp-server.js'], {
  stdio: ['pipe', 'pipe', 'pipe']
});

// Handle server output
let response = '';
server.stdout.on('data', (data) => {
  response += data.toString();
  console.log('Response:', data.toString());
});

server.stderr.on('data', (data) => {
  console.error('Error:', data.toString());
});

server.on('close', (code) => {
  console.log(`Server exited with code ${code}`);
});

// Send initialize request
const initRequest = JSON.stringify({
  jsonrpc: "2.0",
  id: 1,
  method: "initialize",
  params: {
    protocolVersion: "0.1.0",
    capabilities: {
      tools: {
        listChanged: true
      }
    },
    clientInfo: {
      name: "test-client",
      version: "1.0.0"
    }
  }
}) + '\n';

console.log('Sending initialize request...');
server.stdin.write(initRequest);

// Wait for response
setTimeout(() => {
  if (!response) {
    console.log('No response received - server may be blocking output');
  }
  
  // Send list tools request
  const listToolsRequest = JSON.stringify({
    jsonrpc: "2.0",
    id: 2,
    method: "tools/list",
    params: {}
  }) + '\n';
  
  console.log('\nSending list tools request...');
  server.stdin.write(listToolsRequest);
  
  // Close after a delay
  setTimeout(() => {
    server.stdin.end();
    process.exit(0);
  }, 2000);
}, 2000);
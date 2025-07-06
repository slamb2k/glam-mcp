#!/usr/bin/env node

import { writeFileSync, appendFileSync } from 'fs';

const logFile = '/tmp/mcp-debug.log';
writeFileSync(logFile, 'Starting MCP debug\n');

const log = (msg) => {
  appendFileSync(logFile, `${new Date().toISOString()} - ${msg}\n`);
};

log('Setting up environment');
process.env.MCP_MODE = 'true';

// Capture original methods
const originalStdoutWrite = process.stdout.write.bind(process.stdout);
const originalStderrWrite = process.stderr.write.bind(process.stderr);

// Override stdout to log what's being written
process.stdout.write = function(chunk, encoding, callback) {
  log(`STDOUT: ${chunk}`);
  return originalStdoutWrite(chunk, encoding, callback);
};

process.stderr.write = function(chunk, encoding, callback) {
  log(`STDERR: ${chunk}`);
  return originalStderrWrite(chunk, encoding, callback);
};

log('Importing server');
try {
  await import('./src/index.js');
  log('Server imported successfully');
} catch (error) {
  log(`Error importing server: ${error.message}\n${error.stack}`);
}
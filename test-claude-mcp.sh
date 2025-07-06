#!/bin/bash
# Test script for Claude Desktop MCP integration

echo "Testing different command formats for Claude Desktop MCP integration..."
echo ""

echo "Option 1: Using npx with arrays (recommended for Claude Desktop):"
echo 'claude mcp add server npx --package=slambed-mcp mcp-server'
echo ""

echo "Option 2: Direct path (after global install):"
echo 'npm install -g slambed-mcp'
echo 'claude mcp add server slambed-mcp-server'
echo ""

echo "Option 3: Manual MCP configuration in Claude Desktop settings:"
echo 'Add to MCP servers configuration:'
echo '{'
echo '  "command": "npx",'
echo '  "args": ["--package=slambed-mcp", "mcp-server"],'
echo '  "env": {'
echo '    "GITHUB_TOKEN": "your-github-token"'
echo '  }'
echo '}'
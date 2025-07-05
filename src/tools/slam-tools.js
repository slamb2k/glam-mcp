/**
 * SLAM Tools Registration
 * Advanced MCP tools for intelligent development workflows
 */

import slam_tool from '../mcp/tools/slam_mcp.js';
import slam_develop_tool from '../mcp/tools/slam_develop_mcp.js';
import slam_ship_tool from '../mcp/tools/slam_ship_mcp.js';
import slam_commit_tool from '../mcp/tools/slam_commit_mcp.js';
import slam_suggest_tool from '../mcp/tools/slam_suggest_mcp.js';
import slam_context_tool from '../mcp/tools/slam_context_mcp.js';

/**
 * Register SLAM tools with MCP server
 */
export function registerSlamTools(server) {
  // Core SLAM tool - Universal natural language interface
  server.addTool(slam_tool);
  
  // Development workflow tool
  server.addTool(slam_develop_tool);
  
  // Deployment tool
  server.addTool(slam_ship_tool);
  
  // AI-powered commit tool
  server.addTool(slam_commit_tool);
  
  // Predictive suggestions tool
  server.addTool(slam_suggest_tool);
  
  // Rich context visualization tool
  server.addTool(slam_context_tool);
  
  console.log('[Slambed MCP] Registered SLAM tools');
}
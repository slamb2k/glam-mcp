/**
 * SLAM Tools Registration
 * Advanced MCP tools for intelligent development workflows
 */

import slam_tool from '../mcp/tools/slam.js';
import slam_develop_tool from '../mcp/tools/slam_develop.js';
import slam_ship_tool from '../mcp/tools/slam_ship.js';
import slam_commit_tool from '../mcp/tools/slam_commit.js';
import slam_suggest_tool from '../mcp/tools/slam_suggest.js';
import slam_context_tool from '../mcp/tools/slam_context.js';
import slam_learn_tool from '../mcp/tools/slam_learn.js';
import slam_collaborate_tool from '../mcp/tools/slam_collaborate.js';
import slam_recover_tool from '../mcp/tools/slam_recover.js';

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
  
  // User personalization and learning tool
  server.addTool(slam_learn_tool);
  
  // Team collaboration tool
  server.addTool(slam_collaborate_tool);
  
  // Time machine recovery tool
  server.addTool(slam_recover_tool);
}
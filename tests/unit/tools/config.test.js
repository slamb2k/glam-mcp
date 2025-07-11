/**
 * Simple Tests for Configuration Tools
 * Task 34: Implement Tests for Remaining Tool Handlers
 */

import { jest } from '@jest/globals';
import { createMockServer } from '../../test-utils/mocks.js';
import { ToolCategories } from '../../../src/core/tool-registry.js';

describe('Configuration Tools - Simple Tests', () => {
  let mockServer;
  let registeredTools;
  
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Create mock server
    mockServer = createMockServer();
    registeredTools = [];
    mockServer.addTool = jest.fn((tool) => {
      registeredTools.push(tool);
    });
  });
  
  it('should verify config tools structure', async () => {
    // Import the module dynamically
    const { registerConfigTools } = await import('../../../src/tools/config.js');
    
    // Register tools
    registerConfigTools(mockServer);
    
    // Verify tools are registered
    expect(registeredTools.length).toBeGreaterThan(0);
    
    // Check for expected tools
    const toolNames = registeredTools.map(t => t.name);
    expect(toolNames).toContain('config_list_platforms');
    expect(toolNames).toContain('config_generate');
    expect(toolNames).toContain('config_validate');
    expect(toolNames).toContain('config_test_connection');
    expect(toolNames).toContain('config_get_instructions');
    expect(toolNames).toContain('config_auto_setup');
  });
  
  it('should verify tool metadata', async () => {
    const { registerConfigTools } = await import('../../../src/tools/config.js');
    registerConfigTools(mockServer);
    
    // Check each tool has proper structure
    registeredTools.forEach(tool => {
      expect(tool).toHaveProperty('name');
      expect(tool).toHaveProperty('description');
      expect(tool).toHaveProperty('inputSchema');
      expect(tool).toHaveProperty('handler');
      expect(tool).toHaveProperty('metadata');
      
      // Check metadata
      expect(tool.metadata).toHaveProperty('category');
      expect(tool.metadata.category).toBe(ToolCategories.UTILITY);
      expect(tool.metadata).toHaveProperty('tags');
      expect(Array.isArray(tool.metadata.tags)).toBe(true);
    });
  });
  
  it('should verify config_list_platforms tool', async () => {
    const { registerConfigTools } = await import('../../../src/tools/config.js');
    registerConfigTools(mockServer);
    
    const listPlatformsTool = registeredTools.find(t => t.name === 'config_list_platforms');
    expect(listPlatformsTool).toBeDefined();
    expect(listPlatformsTool.description).toContain('List available MCP client platforms');
    expect(listPlatformsTool.inputSchema.properties).toEqual({});
  });
  
  it('should verify config_generate tool schema', async () => {
    const { registerConfigTools } = await import('../../../src/tools/config.js');
    registerConfigTools(mockServer);
    
    const generateTool = registeredTools.find(t => t.name === 'config_generate');
    expect(generateTool).toBeDefined();
    expect(generateTool.inputSchema.required).toContain('platform');
    expect(generateTool.inputSchema.properties.platform.enum).toContain('claude-desktop');
    expect(generateTool.inputSchema.properties.platform.enum).toContain('vscode');
    expect(generateTool.inputSchema.properties).toHaveProperty('use_npx');
    expect(generateTool.inputSchema.properties).toHaveProperty('server_path');
    expect(generateTool.inputSchema.properties).toHaveProperty('log_level');
    expect(generateTool.inputSchema.properties).toHaveProperty('extension_type');
    expect(generateTool.inputSchema.properties).toHaveProperty('output_path');
  });
  
  it('should verify config_validate tool schema', async () => {
    const { registerConfigTools } = await import('../../../src/tools/config.js');
    registerConfigTools(mockServer);
    
    const validateTool = registeredTools.find(t => t.name === 'config_validate');
    expect(validateTool).toBeDefined();
    expect(validateTool.inputSchema.required).toContain('platform');
    expect(validateTool.inputSchema.oneOf).toBeDefined();
    expect(validateTool.inputSchema.properties).toHaveProperty('config_path');
    expect(validateTool.inputSchema.properties).toHaveProperty('config_content');
  });
  
  it('should verify config_test_connection tool', async () => {
    const { registerConfigTools } = await import('../../../src/tools/config.js');
    registerConfigTools(mockServer);
    
    const testConnectionTool = registeredTools.find(t => t.name === 'config_test_connection');
    expect(testConnectionTool).toBeDefined();
    expect(testConnectionTool.description).toContain('Test connection to glam-mcp');
    expect(testConnectionTool.inputSchema.required).toContain('platform');
  });
  
  it('should verify config_get_instructions tool', async () => {
    const { registerConfigTools } = await import('../../../src/tools/config.js');
    registerConfigTools(mockServer);
    
    const instructionsTool = registeredTools.find(t => t.name === 'config_get_instructions');
    expect(instructionsTool).toBeDefined();
    expect(instructionsTool.description).toContain('Get detailed setup instructions');
    expect(instructionsTool.inputSchema.properties.extension_type).toBeDefined();
  });
  
  it('should verify config_auto_setup tool', async () => {
    const { registerConfigTools } = await import('../../../src/tools/config.js');
    registerConfigTools(mockServer);
    
    const autoSetupTool = registeredTools.find(t => t.name === 'config_auto_setup');
    expect(autoSetupTool).toBeDefined();
    expect(autoSetupTool.description).toContain('Automatically detect the current environment');
    expect(autoSetupTool.inputSchema.properties).toHaveProperty('save');
    expect(autoSetupTool.inputSchema.properties).toHaveProperty('platforms');
  });
});
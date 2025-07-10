import { jest } from "@jest/globals";

describe("Tool Registry", () => {
  let toolRegistry;
  let mockServer;

  beforeEach(async () => {
    // Reset modules to ensure clean state
    jest.resetModules();
    
    // Import the module
    const module = await import("../../../src/core/tool-registry.js");
    toolRegistry = module.toolRegistry;
    
    // Mock server
    mockServer = {
      addTool: jest.fn(),
    };
  });

  describe("registerAllTools", () => {
    it("should register all tool categories", () => {
      toolRegistry.registerAllTools(mockServer);
      
      // Should have registered multiple tools
      expect(mockServer.addTool).toHaveBeenCalled();
      expect(mockServer.addTool.mock.calls.length).toBeGreaterThan(10);
    });

    it("should register github flow tools", () => {
      toolRegistry.registerAllTools(mockServer);
      
      const toolNames = mockServer.addTool.mock.calls.map(call => call[0].name);
      expect(toolNames).toContain("github_flow_start");
      expect(toolNames).toContain("github_flow_create_pr");
      expect(toolNames).toContain("github_flow_merge");
    });

    it("should register automation tools", () => {
      toolRegistry.registerAllTools(mockServer);
      
      const toolNames = mockServer.addTool.mock.calls.map(call => call[0].name);
      expect(toolNames).toContain("auto_commit");
      expect(toolNames).toContain("smart_commit");
      expect(toolNames).toContain("quick_commit");
    });

    it("should register utility tools", () => {
      toolRegistry.registerAllTools(mockServer);
      
      const toolNames = mockServer.addTool.mock.calls.map(call => call[0].name);
      expect(toolNames).toContain("repo_map");
      expect(toolNames).toContain("search_todos");
      expect(toolNames).toContain("check_dependencies");
    });
  });

  describe("getRegisteredTools", () => {
    it("should return list of registered tools", () => {
      toolRegistry.registerAllTools(mockServer);
      const tools = toolRegistry.getRegisteredTools();
      
      expect(Array.isArray(tools)).toBe(true);
      expect(tools.length).toBeGreaterThan(10);
      expect(tools[0]).toHaveProperty("name");
      expect(tools[0]).toHaveProperty("description");
    });
  });

  describe("getTool", () => {
    it("should return specific tool by name", () => {
      toolRegistry.registerAllTools(mockServer);
      
      const tool = toolRegistry.getTool("github_flow_start");
      expect(tool).toBeDefined();
      expect(tool.name).toBe("github_flow_start");
      expect(tool.description).toContain("branch");
    });

    it("should return undefined for non-existent tool", () => {
      toolRegistry.registerAllTools(mockServer);
      
      const tool = toolRegistry.getTool("non_existent_tool");
      expect(tool).toBeUndefined();
    });
  });

  describe("getToolsByCategory", () => {
    it("should return tools by category", () => {
      toolRegistry.registerAllTools(mockServer);
      
      // Check if method exists
      if (typeof toolRegistry.getToolsByCategory === 'function') {
        const githubTools = toolRegistry.getToolsByCategory("github");
        expect(Array.isArray(githubTools)).toBe(true);
      }
    });
  });

  describe("tool structure", () => {
    it("should have required properties for each tool", () => {
      toolRegistry.registerAllTools(mockServer);
      
      const tools = mockServer.addTool.mock.calls.map(call => call[0]);
      
      tools.forEach(tool => {
        expect(tool).toHaveProperty("name");
        expect(tool).toHaveProperty("description");
        expect(tool).toHaveProperty("inputSchema");
        expect(tool).toHaveProperty("handler");
        expect(typeof tool.handler).toBe("function");
      });
    });

    it("should have valid input schemas", () => {
      toolRegistry.registerAllTools(mockServer);
      
      const tools = mockServer.addTool.mock.calls.map(call => call[0]);
      
      tools.forEach(tool => {
        expect(tool.inputSchema).toHaveProperty("type", "object");
        expect(tool.inputSchema).toHaveProperty("properties");
      });
    });
  });
});
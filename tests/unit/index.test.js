import { jest } from "@jest/globals";
import { GlamMCPServer } from "../../src/index.js";
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { McpError, ErrorCode } from "@modelcontextprotocol/sdk/types.js";
import { toolRegistry } from "../../src/core/tool-registry.js";

// Mock dependencies
jest.mock("@modelcontextprotocol/sdk/server/index.js");
jest.mock("@modelcontextprotocol/sdk/server/stdio.js");
jest.mock("../../src/tools/github-flow.js", () => ({
  registerGitHubFlowTools: jest.fn(),
}));
jest.mock("../../src/tools/automation.js", () => ({
  registerAutomationTools: jest.fn(),
}));
jest.mock("../../src/tools/utilities.js", () => ({
  registerUtilityTools: jest.fn(),
}));
jest.mock("../../src/tools/context.js", () => ({
  registerContextTools: jest.fn(),
}));
jest.mock("../../src/tools/team.js", () => ({
  registerTeamTools: jest.fn(),
}));
jest.mock("../../src/tools/safety.js", () => ({
  registerSafetyTools: jest.fn(),
}));
jest.mock("../../src/tools/documentation.js", () => ({
  registerDocumentationTools: jest.fn(),
}));
jest.mock("../../src/tools/config.js", () => ({
  registerConfigTools: jest.fn(),
}));
jest.mock("../../src/utils/banner.js", () => ({
  showBanner: jest.fn(),
}));
jest.mock("../../src/core/tool-registry.js", () => ({
  toolRegistry: {
    register: jest.fn(),
    search: jest.fn(),
    getStatistics: jest.fn(() => ({ totalTools: 42 })),
    generateDocumentation: jest.fn(),
    listCategories: jest.fn(),
  },
  ToolCategories: {
    GITHUB_FLOW: "github-flow",
    AUTOMATION: "automation",
    UTILITY: "utility",
    CONTEXT: "context",
    TEAM: "team",
    SAFETY: "safety",
    DOCUMENTATION: "documentation",
    CONFIG: "config",
  },
}));
jest.mock("../../src/services/tool-discovery.js", () => ({
  toolDiscovery: {
    getWorkflowRecommendations: jest.fn(),
    searchNatural: jest.fn(),
  },
}));

// Capture console output
const originalConsoleLog = console.log;
const originalConsoleError = console.error;

describe("GlamMCPServer", () => {
  let server;
  let mockServerInstance;
  let mockTransport;
  let consoleOutput;
  let consoleErrorOutput;

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Capture console output
    consoleOutput = [];
    consoleErrorOutput = [];
    console.log = jest.fn((...args) => consoleOutput.push(args));
    console.error = jest.fn((...args) => consoleErrorOutput.push(args));

    // Mock Server instance
    mockServerInstance = {
      setRequestHandler: jest.fn(),
      connect: jest.fn(),
      close: jest.fn(),
      onerror: null,
    };
    Server.mockImplementation(() => mockServerInstance);

    // Mock StdioServerTransport
    mockTransport = {};
    StdioServerTransport.mockImplementation(() => mockTransport);

    server = new GlamMCPServer();
  });

  afterEach(() => {
    console.log = originalConsoleLog;
    console.error = originalConsoleError;
  });

  describe("constructor", () => {
    it("should create a server with correct configuration", () => {
      expect(Server).toHaveBeenCalledWith(
        {
          name: "glam-mcp",
          version: "1.0.0",
        },
        {
          capabilities: {
            tools: {},
          },
        }
      );
    });

    it("should setup tool handlers", () => {
      expect(mockServerInstance.setRequestHandler).toHaveBeenCalledTimes(2);
    });

    it("should setup error handling", () => {
      expect(mockServerInstance.onerror).toBeDefined();
    });
  });

  describe("registerTools", () => {
    it("should register all tool categories", () => {
      const toolRegistrations = [
        "registerGitHubFlowTools",
        "registerAutomationTools",
        "registerUtilityTools",
        "registerContextTools",
        "registerTeamTools",
        "registerSafetyTools",
        "registerDocumentationTools",
        "registerConfigTools",
      ];

      server.registerTools();

      for (const registration of toolRegistrations) {
        const module = jest.requireMock(`../../src/tools/${registration.replace("register", "").replace("Tools", "").toLowerCase()}.js`);
        expect(module[registration]).toHaveBeenCalledWith(server);
      }
    });

    it("should register registry tools", () => {
      server.registerTools();
      
      const registeredTools = server.tools.map(t => t.name);
      expect(registeredTools).toContain("tool_search");
      expect(registeredTools).toContain("tool_info");
      expect(registeredTools).toContain("tool_list_categories");
      expect(registeredTools).toContain("tool_workflow_recommendations");
      expect(registeredTools).toContain("tool_search_natural");
    });

    it("should log registration statistics", () => {
      server.registerTools();
      
      expect(consoleOutput.some(args => 
        args[0].includes("[glam-mcp] Registered") && args[0].includes("tools")
      )).toBe(true);
      expect(consoleOutput.some(args => 
        args[0].includes("[glam-mcp] Tool Registry:") && args[0].includes("42")
      )).toBe(true);
    });
  });

  describe("addTool", () => {
    it("should add tool to the tools array", () => {
      const tool = {
        name: "test_tool",
        description: "Test tool",
        handler: jest.fn(),
      };

      server.addTool(tool);

      expect(server.tools).toContain(tool);
    });

    it("should register tool in the centralized registry", () => {
      const tool = {
        name: "github_flow_test",
        description: "Test tool",
        handler: jest.fn(),
      };

      server.addTool(tool);

      expect(toolRegistry.register).toHaveBeenCalledWith(
        expect.objectContaining({
          name: "github_flow_test",
          metadata: expect.objectContaining({
            category: "github-flow",
          }),
        })
      );
    });

    it("should handle registry registration errors gracefully", () => {
      toolRegistry.register.mockImplementationOnce(() => {
        throw new Error("Already registered");
      });

      const tool = {
        name: "test_tool",
        description: "Test tool",
        handler: jest.fn(),
      };

      // Should not throw
      expect(() => server.addTool(tool)).not.toThrow();
      expect(server.tools).toContain(tool);
    });
  });

  describe("tool request handlers", () => {
    let listToolsHandler;
    let callToolHandler;

    beforeEach(() => {
      server.registerTools();
      
      // Get the registered handlers
      const calls = mockServerInstance.setRequestHandler.mock.calls;
      listToolsHandler = calls.find(call => call[0].type === "list_tools")[1];
      callToolHandler = calls.find(call => call[0].type === "call_tool")[1];
    });

    describe("ListToolsRequestSchema handler", () => {
      it("should return all registered tools", async () => {
        const result = await listToolsHandler();

        expect(result.tools).toBeDefined();
        expect(result.tools.length).toBeGreaterThan(0);
        expect(result.tools[0]).toHaveProperty("name");
        expect(result.tools[0]).toHaveProperty("description");
        expect(result.tools[0]).toHaveProperty("inputSchema");
      });
    });

    describe("CallToolRequestSchema handler", () => {
      it("should execute the requested tool", async () => {
        const mockResult = { success: true, message: "Tool executed" };
        const mockTool = server.tools.find(t => t.name === "tool_search");
        mockTool.handler = jest.fn().mockResolvedValue(mockResult);

        const result = await callToolHandler({
          params: {
            name: "tool_search",
            arguments: { keyword: "test" },
          },
        });

        expect(mockTool.handler).toHaveBeenCalledWith({ keyword: "test" });
        expect(result.content[0].text).toContain("Tool executed");
      });

      it("should throw error for unknown tool", async () => {
        await expect(
          callToolHandler({
            params: {
              name: "unknown_tool",
              arguments: {},
            },
          })
        ).rejects.toThrow(McpError);
      });

      it("should handle tool execution errors", async () => {
        const mockTool = server.tools.find(t => t.name === "tool_search");
        mockTool.handler = jest.fn().mockRejectedValue(new Error("Tool failed"));

        await expect(
          callToolHandler({
            params: {
              name: "tool_search",
              arguments: {},
            },
          })
        ).rejects.toThrow("Tool execution failed");
      });

      it("should handle results without message property", async () => {
        const mockResult = { text: "Alternative text format" };
        const mockTool = server.tools.find(t => t.name === "tool_search");
        mockTool.handler = jest.fn().mockResolvedValue(mockResult);

        const result = await callToolHandler({
          params: {
            name: "tool_search",
            arguments: {},
          },
        });

        expect(result.content[0].text).toBe("Alternative text format");
      });

      it("should stringify non-text results", async () => {
        const mockResult = { data: { key: "value" }, success: true };
        const mockTool = server.tools.find(t => t.name === "tool_search");
        mockTool.handler = jest.fn().mockResolvedValue(mockResult);

        const result = await callToolHandler({
          params: {
            name: "tool_search",
            arguments: {},
          },
        });

        expect(result.content[0].text).toContain('"key": "value"');
      });
    });
  });

  describe("registry tools", () => {
    beforeEach(() => {
      server.registerTools();
    });

    describe("tool_search", () => {
      it("should search tools in registry", async () => {
        const mockResults = [
          { name: "tool1", description: "Test tool 1", metadata: { category: "utility", tags: ["test"] } },
          { name: "tool2", description: "Test tool 2", metadata: { category: "automation", tags: ["test"] } },
        ];
        toolRegistry.search.mockReturnValue(mockResults);

        const searchTool = server.tools.find(t => t.name === "tool_search");
        const result = await searchTool.handler({ keyword: "test" });

        expect(toolRegistry.search).toHaveBeenCalledWith({ keyword: "test" });
        expect(result.success).toBe(true);
        expect(result.data).toHaveLength(2);
      });
    });

    describe("tool_info", () => {
      it("should get tool documentation", async () => {
        const mockDoc = {
          name: "test_tool",
          description: "Test tool",
          parameters: [],
          examples: [],
        };
        toolRegistry.generateDocumentation.mockReturnValue(mockDoc);

        const infoTool = server.tools.find(t => t.name === "tool_info");
        const result = await infoTool.handler({ tool_name: "test_tool" });

        expect(toolRegistry.generateDocumentation).toHaveBeenCalledWith("test_tool");
        expect(result.success).toBe(true);
        expect(result.data).toEqual(mockDoc);
      });

      it("should handle unknown tool", async () => {
        toolRegistry.generateDocumentation.mockReturnValue(null);

        const infoTool = server.tools.find(t => t.name === "tool_info");
        const result = await infoTool.handler({ tool_name: "unknown" });

        expect(result.success).toBe(false);
        expect(result.message).toContain("not found");
      });
    });

    describe("tool_list_categories", () => {
      it("should list tool categories", async () => {
        const mockCategories = [
          { name: "utility", count: 10 },
          { name: "automation", count: 5 },
        ];
        toolRegistry.listCategories.mockReturnValue(mockCategories);

        const listTool = server.tools.find(t => t.name === "tool_list_categories");
        const result = await listTool.handler({});

        expect(toolRegistry.listCategories).toHaveBeenCalled();
        expect(result.success).toBe(true);
        expect(result.data).toEqual(mockCategories);
      });
    });
  });

  describe("inferCategory", () => {
    it("should infer category from tool name", () => {
      expect(server.inferCategory("github_flow_start")).toBe("github-flow");
      expect(server.inferCategory("auto_commit")).toBe("automation");
      expect(server.inferCategory("context_get")).toBe("context");
      expect(server.inferCategory("team_activity")).toBe("team");
      expect(server.inferCategory("safety_check")).toBe("safety");
      expect(server.inferCategory("random_tool")).toBe("utility");
    });
  });

  describe("inferTags", () => {
    it("should infer tags from tool name and description", () => {
      const tool = {
        name: "git_commit_test",
        description: "Analyze code and format it",
      };

      const tags = server.inferTags(tool);

      expect(tags).toContain("git");
      expect(tags).toContain("commit");
      expect(tags).toContain("test");
      expect(tags).toContain("analysis");
      expect(tags).toContain("code-quality");
    });
  });

  describe("start", () => {
    it("should register tools and start server", async () => {
      await server.start();

      expect(server.tools.length).toBeGreaterThan(0);
      expect(mockServerInstance.connect).toHaveBeenCalledWith(mockTransport);
      expect(consoleOutput.some(args => 
        args[0].includes("[glam-mcp] Server started successfully")
      )).toBe(true);
    });
  });

  describe("error handling", () => {
    it("should handle server errors", () => {
      const error = new Error("Server error");
      mockServerInstance.onerror(error);

      expect(consoleErrorOutput.some(args => 
        args[0] === "[MCP Error]" && args[1] === error
      )).toBe(true);
    });

    it("should handle SIGINT signal", async () => {
      const exitSpy = jest.spyOn(process, "exit").mockImplementation(() => {});
      const listeners = process.listeners("SIGINT");
      const sigintHandler = listeners[listeners.length - 1];

      await sigintHandler();

      expect(mockServerInstance.close).toHaveBeenCalled();
      expect(exitSpy).toHaveBeenCalledWith(0);

      exitSpy.mockRestore();
    });
  });
});
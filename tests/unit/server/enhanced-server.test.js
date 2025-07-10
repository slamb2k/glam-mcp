import { jest } from "@jest/globals";
import { EventEmitter } from "events";

// Mock MCP SDK
const mockServer = {
  connect: jest.fn(),
  close: jest.fn(),
  setRequestHandler: jest.fn(),
  onerror: null,
};

const mockStdioServerTransport = jest.fn();

jest.unstable_mockModule("@modelcontextprotocol/sdk/server/index.js", () => ({
  Server: jest.fn(() => mockServer),
}));

jest.unstable_mockModule("@modelcontextprotocol/sdk/server/stdio.js", () => ({
  StdioServerTransport: mockStdioServerTransport,
}));

jest.unstable_mockModule("@modelcontextprotocol/sdk/types.js", () => ({
  CallToolRequestSchema: {},
  ErrorCode: { InternalError: "InternalError", MethodNotFound: "MethodNotFound" },
  ListToolsRequestSchema: {},
  McpError: Error,
}));

// Mock tool registrations
const mockRegisterGitHubFlowTools = jest.fn();
const mockRegisterAutomationTools = jest.fn();
const mockRegisterUtilityTools = jest.fn();
const mockRegisterContextTools = jest.fn();
const mockRegisterTeamTools = jest.fn();
const mockRegisterSafetyTools = jest.fn();

jest.unstable_mockModule("../../../src/tools/github-flow.js", () => ({
  registerGitHubFlowTools: mockRegisterGitHubFlowTools,
}));

jest.unstable_mockModule("../../../src/tools/automation.js", () => ({
  registerAutomationTools: mockRegisterAutomationTools,
}));

jest.unstable_mockModule("../../../src/tools/utilities.js", () => ({
  registerUtilityTools: mockRegisterUtilityTools,
}));

jest.unstable_mockModule("../../../src/tools/context.js", () => ({
  registerContextTools: mockRegisterContextTools,
}));

jest.unstable_mockModule("../../../src/tools/team.js", () => ({
  registerTeamTools: mockRegisterTeamTools,
}));

jest.unstable_mockModule("../../../src/tools/safety.js", () => ({
  registerSafetyTools: mockRegisterSafetyTools,
}));

// Mock tool registry
const mockToolRegistry = {
  clear: jest.fn(),
  registerTool: jest.fn(),
  getTool: jest.fn(),
  getAllTools: jest.fn().mockReturnValue([]),
  getCategories: jest.fn().mockReturnValue([]),
  getToolsByCategory: jest.fn().mockReturnValue([]),
};

jest.unstable_mockModule("../../../src/core/tool-registry.js", () => ({
  toolRegistry: mockToolRegistry,
  ToolCategories: {
    GITHUB_FLOW: "github-flow",
    AUTOMATION: "automation",
    UTILITY: "utility",
  },
}));

// Mock session manager
const mockSessionManagerInstance = {
  setMaxSessions: jest.fn(),
  setSessionTimeout: jest.fn(),
  sessions: new Map(),
};

const mockSessionManager = {
  getInstance: jest.fn(() => mockSessionManagerInstance),
};

jest.unstable_mockModule("../../../src/core/session-manager.js", () => ({
  SessionManager: mockSessionManager,
}));

// Mock utilities
const mockShowBanner = jest.fn();
const mockGetWelcomeMessage = jest.fn().mockReturnValue("Welcome!");

jest.unstable_mockModule("../../../src/utils/banner.js", () => ({
  showBanner: mockShowBanner,
  getWelcomeMessage: mockGetWelcomeMessage,
}));

// Mock fs
jest.unstable_mockModule("fs", () => ({
  default: {
    existsSync: jest.fn().mockReturnValue(true),
    readFileSync: jest.fn().mockReturnValue("{}"),
    writeFileSync: jest.fn(),
    mkdirSync: jest.fn(),
  },
}));

// Import after mocking
const { EnhancedMCPServer } = await import("../../../src/server/enhanced-server.js");

describe("EnhancedMCPServer", () => {
  let server;

  beforeEach(() => {
    jest.clearAllMocks();
    server = new EnhancedMCPServer();
  });

  describe("constructor", () => {
    it("should initialize with default state", () => {
      expect(server).toBeInstanceOf(EventEmitter);
      expect(server.status).toBe("stopped");
      expect(server.startTime).toBeNull();
      expect(server.connections).toBe(0);
      expect(server.tools).toEqual([]);
      expect(server.transport).toBeNull();
    });

    it("should have default configuration", () => {
      expect(server.config).toBeDefined();
      expect(server.config.server).toBeDefined();
      expect(server.config.server.port).toBe(3000);
      expect(server.config.server.host).toBe("localhost");
    });

    it("should setup handlers on construction", () => {
      expect(mockServer.setRequestHandler).toHaveBeenCalled();
    });
  });

  describe("start", () => {
    it("should start the server", async () => {
      const result = await server.start();

      expect(server.status).toBe("running");
      expect(server.startTime).toBeInstanceOf(Date);
      expect(mockServer.connect).toHaveBeenCalled();
      expect(mockShowBanner).toHaveBeenCalled();
      expect(result).toEqual({
        status: "started",
        port: 3000,
        tools: expect.any(Number),
      });
    });

    it("should emit server:started event", async () => {
      const startListener = jest.fn();
      server.on("server:started", startListener);

      await server.start();

      expect(startListener).toHaveBeenCalled();
    });

    it("should handle start errors", async () => {
      mockServer.connect.mockRejectedValueOnce(new Error("Connection failed"));
      const newServer = new EnhancedMCPServer();

      await expect(newServer.start()).rejects.toThrow("Connection failed");
    });
  });

  describe("registerTools", () => {
    it("should register all tool categories", async () => {
      await server.registerTools();

      expect(mockRegisterGitHubFlowTools).toHaveBeenCalled();
      expect(mockRegisterAutomationTools).toHaveBeenCalled();
      expect(mockRegisterUtilityTools).toHaveBeenCalled();
      expect(mockRegisterContextTools).toHaveBeenCalled();
      expect(mockRegisterTeamTools).toHaveBeenCalled();
      expect(mockRegisterSafetyTools).toHaveBeenCalled();
    });

    it("should handle tool filtering", async () => {
      const addToolSpy = jest.fn();
      mockRegisterGitHubFlowTools.mockImplementationOnce((context) => {
        // Simulate adding a tool
        context.addTool({
          name: "github_flow_test",
          description: "Test tool",
          handler: jest.fn(),
        });
      });

      await server.registerTools();

      expect(server.tools.length).toBeGreaterThan(0);
    });
  });


  describe("stop", () => {
    beforeEach(async () => {
      await server.start();
    });

    it("should stop the server", async () => {
      const result = await server.stop();

      expect(server.status).toBe("stopped");
      expect(mockServer.close).toHaveBeenCalled();
      expect(result).toHaveProperty("graceful", true);
    });

    it("should emit server:stopped event", async () => {
      const stopListener = jest.fn();
      server.on("server:stopped", stopListener);

      await server.stop();

      expect(stopListener).toHaveBeenCalled();
    });

    it("should handle stop when not running", async () => {
      // Stop first to reset state
      await server.stop();
      
      // Try to stop again
      await expect(server.stop()).rejects.toThrow("Server is not running");
    });
  });

  describe("restart", () => {
    beforeEach(async () => {
      await server.start();
    });

    it("should restart the server", async () => {
      const result = await server.restart();

      expect(mockServer.close).toHaveBeenCalled();
      expect(mockServer.connect).toHaveBeenCalledTimes(2); // Initial start + restart
      expect(server.status).toBe("running");
      expect(result).toEqual({ status: "restarted" });
    });
  });

  describe("tool handling", () => {
    it("should handle list tools request", async () => {
      server.tools = [
        { name: "tool1", description: "Tool 1", inputSchema: {} },
        { name: "tool2", description: "Tool 2", inputSchema: {} },
      ];

      const handler = mockServer.setRequestHandler.mock.calls.find(
        call => call[0] === ListToolsRequestSchema
      )?.[1];

      const result = await handler({});

      expect(result.tools).toHaveLength(2);
      expect(result.tools[0].name).toBe("tool1");
    });

    it("should handle call tool request", async () => {
      const mockTool = {
        name: "test_tool",
        handler: jest.fn().mockResolvedValue({ success: true, data: "result" }),
      };

      server.tools = [mockTool];

      const handler = mockServer.setRequestHandler.mock.calls.find(
        call => call[0] === CallToolRequestSchema
      )?.[1];

      const result = await handler({
        params: { name: "test_tool", arguments: { param: "value" } },
      });

      expect(mockTool.handler).toHaveBeenCalledWith({ param: "value" });
      expect(result.content[0].text).toContain("result");
    });

    it("should handle tool not found", async () => {
      server.tools = [];

      const handler = mockServer.setRequestHandler.mock.calls.find(
        call => call[0] === CallToolRequestSchema
      )?.[1];

      await expect(
        handler({ params: { name: "unknown_tool", arguments: {} } })
      ).rejects.toThrow();
    });
  });

  describe("healthCheck", () => {
    it("should return health status when stopped", async () => {
      const health = await server.healthCheck();

      expect(health.status).toBe("unhealthy");
      expect(health.checks.server).toBe("unhealthy");
      expect(health.checks.transport).toBe("disconnected");
    });

    it("should return health status when running", async () => {
      await server.start();

      const health = await server.healthCheck();

      expect(health.status).toBe("healthy");
      expect(health.checks.server).toBe("healthy");
      expect(health.checks.transport).toBe("connected");
      expect(health.checks.uptime).toBeGreaterThan(0);
    });
  });

  describe("configuration", () => {
    it("should load configuration", async () => {
      const config = await server.loadConfiguration();

      expect(config).toBeDefined();
      expect(config.server.port).toBe(3000);
      expect(config.server.host).toBe("localhost");
    });

    it("should validate configuration", () => {
      server.config.server.port = 0;
      
      expect(() => server.validateConfiguration()).toThrow("Invalid server port");
    });

    it("should merge configurations", () => {
      server.mergeConfig({
        server: { port: 4000 },
        newOption: "value",
      });

      expect(server.config.server.port).toBe(4000);
      expect(server.config.newOption).toBe("value");
    });
  });

  describe("lifecycle events", () => {
    it("should track lifecycle events", async () => {
      const events = [];
      
      server.on("server:starting", () => events.push("starting"));
      server.on("server:started", () => events.push("started"));
      server.on("server:stopping", () => events.push("stopping"));
      server.on("server:stopped", () => events.push("stopped"));

      await server.start();
      await server.stop();

      expect(events).toEqual([
        "starting",
        "started",
        "stopping",
        "stopped",
      ]);
    });
  });

  describe("getMetrics", () => {
    it("should return server metrics", async () => {
      const metrics = await server.getMetrics();

      expect(metrics).toHaveProperty("uptime");
      expect(metrics).toHaveProperty("toolsRegistered");
      expect(metrics).toHaveProperty("memoryUsage");
      expect(metrics).toHaveProperty("cpuUsage");
    });
  });
});
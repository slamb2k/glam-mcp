import { jest } from "@jest/globals";
import { registerAutomationTools } from "../../../src/tools/automation.js";
import { registerDocumentationTools } from "../../../src/tools/documentation.js";
import { registerGitHubFlowTools } from "../../../src/tools/github-flow.js";
import { registerUtilityTools } from "../../../src/tools/utilities.js";

// Mock dependencies
jest.mock("child_process");
jest.mock("fs");
jest.mock("../../../src/core/config.js", () => ({
  getConfig: jest.fn(() => ({ defaultToolOptions: {} }))
}));
jest.mock("../../../src/context/session-manager.js", () => ({
  sessionManager: { updateGitContext: jest.fn() }
}));
jest.mock("../../../src/core/tool-registry.js", () => ({
  toolRegistry: {
    getStatistics: jest.fn(() => ({ totalTools: 25, totalCategories: 5 })),
    listCategories: jest.fn(() => []),
    getAllTools: jest.fn(() => []),
    getToolsByCategory: jest.fn(() => []),
    getTool: jest.fn(() => null)
  }
}));
jest.mock("../../../src/services/tool-documentation.js", () => ({
  toolDocumentation: {
    generateToolDocumentation: jest.fn(() => ({ markdown: "", sections: [] })),
    generateBatchDocumentation: jest.fn(() => ({}))
  }
}));
jest.mock("../../../src/clients/git-client.js", () => ({
  GitClient: jest.fn(() => ({
    getRepoInfo: jest.fn(() => ({ name: "test-repo" })),
    getRecentCommits: jest.fn(() => [])
  }))
}));

describe("Tool Registration", () => {
  let mockServer;
  let registeredTools;

  beforeEach(() => {
    jest.clearAllMocks();
    registeredTools = [];
    mockServer = {
      addTool: jest.fn((tool) => {
        registeredTools.push(tool);
      })
    };
  });

  describe("Automation Tools", () => {
    it("should register automation tools", () => {
      registerAutomationTools(mockServer);
      
      expect(mockServer.addTool).toHaveBeenCalled();
      expect(registeredTools.length).toBeGreaterThan(0);
      
      const toolNames = registeredTools.map(t => t.name);
      console.log("Registered automation tools:", toolNames);
      
      // Check for some expected tools
      expect(toolNames).toContain("auto_commit");
      expect(toolNames).toContain("quick_fix");
      expect(toolNames).toContain("format_and_lint");
    });
  });

  describe("Documentation Tools", () => {
    it("should register documentation tools", () => {
      registerDocumentationTools(mockServer);
      
      expect(mockServer.addTool).toHaveBeenCalled();
      expect(registeredTools.length).toBeGreaterThan(0);
      
      const toolNames = registeredTools.map(t => t.name);
      console.log("Registered documentation tools:", toolNames);
      
      // Check for some expected tools
      expect(toolNames).toContain("generate_project_docs");
      expect(toolNames).toContain("generate_tool_docs");
    });
  });

  describe("GitHub Flow Tools", () => {
    it("should register GitHub flow tools", () => {
      registerGitHubFlowTools(mockServer);
      
      expect(mockServer.addTool).toHaveBeenCalled();
      expect(registeredTools.length).toBeGreaterThan(0);
      
      const toolNames = registeredTools.map(t => t.name);
      console.log("Registered GitHub flow tools:", toolNames);
      
      // Check for some expected tools
      expect(toolNames).toContain("github_flow_start");
      expect(toolNames).toContain("github_flow_pr");
      expect(toolNames).toContain("github_flow_merge");
    });
  });

  describe("Utilities Tools", () => {
    it("should register utilities tools", () => {
      registerUtilityTools(mockServer);
      
      expect(mockServer.addTool).toHaveBeenCalled();
      expect(registeredTools.length).toBeGreaterThan(0);
      
      const toolNames = registeredTools.map(t => t.name);
      console.log("Registered utilities tools:", toolNames);
      
      // Check for some expected tools
      expect(toolNames).toContain("repo_map");
      expect(toolNames).toContain("search_todos");
      expect(toolNames).toContain("check_dependencies");
    });
  });
});
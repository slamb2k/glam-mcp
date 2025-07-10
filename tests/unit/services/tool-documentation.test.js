import { jest } from "@jest/globals";

// Mock tool registry
const mockGet = jest.fn();
const mockGetAllTools = jest.fn();
const mockListCategories = jest.fn();
const mockGenerateDocumentation = jest.fn();
const mockGenerateFullDocumentation = jest.fn();

const mockToolRegistry = {
  get: mockGet,
  search: jest.fn(() => []),
  listCategories: mockListCategories,
  generateDocumentation: mockGenerateDocumentation,
  generateFullDocumentation: mockGenerateFullDocumentation,
};

jest.unstable_mockModule("../../../src/core/tool-registry.js", () => ({
  toolRegistry: mockToolRegistry,
  ToolCategories: {
    GITHUB_FLOW: "github-flow",
    AUTOMATION: "automation",
    UTILITY: "utility",
  },
}));

// Mock fs
const mockWriteFileSync = jest.fn();
const mockMkdirSync = jest.fn();
const mockExistsSync = jest.fn();

jest.unstable_mockModule("fs", () => ({
  default: {
    writeFileSync: mockWriteFileSync,
    mkdirSync: mockMkdirSync,
    existsSync: mockExistsSync,
  },
}));

// Import after mocking
const { ToolDocumentationService } = await import("../../../src/services/tool-documentation.js");

describe("ToolDocumentationService", () => {
  let service;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new ToolDocumentationService(mockToolRegistry);
  });

  describe("constructor", () => {
    it("should initialize with registry", () => {
      expect(service.registry).toBe(mockToolRegistry);
    });
  });

  describe("generateToolDocs", () => {
    it("should generate documentation for a tool", () => {
      const toolDoc = {
        name: "test_tool",
        description: "Test tool",
        category: "utility",
        parameters: { input: { type: "string" } },
        examples: ["example1"],
      };

      mockGenerateDocumentation.mockReturnValue(toolDoc);

      const result = service.generateToolDocs("test_tool");

      expect(mockGenerateDocumentation).toHaveBeenCalledWith("test_tool");
      expect(result).toContain("# test_tool");
      expect(result).toContain("Test tool");
      expect(result).toContain("## Parameters");
      expect(result).toContain("## Examples");
    });

    it("should handle tool not found", () => {
      mockGenerateDocumentation.mockReturnValue(null);

      const result = service.generateToolDocs("non_existent");

      expect(result).toBe("Tool 'non_existent' not found.");
    });

    it("should format parameters correctly", () => {
      const toolDoc = {
        name: "test_tool",
        description: "Test tool",
        parameters: {
          name: { 
            type: "string", 
            description: "Name parameter",
            required: true,
            default: "test"
          },
          count: { 
            type: "number",
            description: "Count parameter"
          },
        },
      };

      mockGenerateDocumentation.mockReturnValue(toolDoc);

      const result = service.generateToolDocs("test_tool");

      expect(result).toContain("- **name** (string, required)");
      expect(result).toContain("Name parameter");
      expect(result).toContain("Default: `test`");
      expect(result).toContain("- **count** (number)");
    });
  });

  describe("generateCategoryDocs", () => {
    it("should generate documentation for a category", () => {
      const categories = [
        { name: "utility", count: 2, tools: ["tool1", "tool2"] },
      ];

      const tools = [
        { name: "tool1", description: "Tool 1", metadata: { category: "utility" } },
        { name: "tool2", description: "Tool 2", metadata: { category: "utility" } },
      ];

      mockListCategories.mockReturnValue(categories);
      mockGet.mockImplementation((name) => tools.find(t => t.name === name));

      const result = service.generateCategoryDocs("utility");

      expect(result).toContain("# Utility Tools");
      expect(result).toContain("## tool1");
      expect(result).toContain("Tool 1");
      expect(result).toContain("## tool2");
      expect(result).toContain("Tool 2");
    });

    it("should handle category not found", () => {
      mockListCategories.mockReturnValue([]);

      const result = service.generateCategoryDocs("non_existent");

      expect(result).toBe("Category 'non_existent' not found.");
    });
  });

  describe("generateQuickReference", () => {
    it("should generate quick reference guide", () => {
      const fullDocs = {
        overview: {
          totalTools: 10,
          categories: [
            { name: "github-flow", count: 3 },
            { name: "automation", count: 5 },
          ],
        },
        toolsByCategory: {
          "github-flow": [
            { name: "github_flow_start", description: "Start flow", usage: "github_flow_start()" },
          ],
          "automation": [
            { name: "auto_commit", description: "Auto commit", usage: "auto_commit()" },
          ],
        },
      };

      mockGenerateFullDocumentation.mockReturnValue(fullDocs);

      const result = service.generateQuickReference();

      expect(result).toContain("# glam-mcp Quick Reference");
      expect(result).toContain("Total tools: 10");
      expect(result).toContain("## GitHub Flow Tools (3)");
      expect(result).toContain("### github_flow_start");
      expect(result).toContain("Start flow");
    });
  });

  describe("generateExampleWorkflows", () => {
    it("should generate example workflows", () => {
      const result = service.generateExampleWorkflows();

      expect(result).toContain("# Example Workflows");
      expect(result).toContain("## Feature Development Workflow");
      expect(result).toContain("## Code Review Workflow");
      expect(result).toContain("## Release Workflow");
    });
  });

  describe("generateApiReference", () => {
    it("should generate API reference", () => {
      const fullDocs = {
        toolsByCategory: {
          "utility": [
            {
              name: "test_tool",
              description: "Test tool",
              parameters: { input: { type: "string" } },
              examples: ["test_tool('example')"],
            },
          ],
        },
      };

      mockGenerateFullDocumentation.mockReturnValue(fullDocs);

      const result = service.generateApiReference();

      expect(result).toContain("# glam-mcp API Reference");
      expect(result).toContain("## Utility");
      expect(result).toContain("### test_tool");
      expect(result).toContain("Test tool");
      expect(result).toContain("**Parameters:**");
      expect(result).toContain("**Examples:**");
    });
  });

  describe("exportDocumentation", () => {
    it("should export documentation to file", () => {
      mockExistsSync.mockReturnValue(true);

      service.exportDocumentation("/path/to/docs", "markdown");

      expect(mockMkdirSync).toHaveBeenCalledWith("/path/to/docs", { recursive: true });
      expect(mockWriteFileSync).toHaveBeenCalledTimes(4); // quick-ref, workflows, api-ref, full-docs
    });

    it("should handle JSON format", () => {
      const fullDocs = { test: "data" };
      mockGenerateFullDocumentation.mockReturnValue(fullDocs);

      service.exportDocumentation("/path/to/docs", "json");

      expect(mockWriteFileSync).toHaveBeenCalledWith(
        "/path/to/docs/tools.json",
        JSON.stringify(fullDocs, null, 2)
      );
    });

    it("should throw error for invalid format", () => {
      expect(() => service.exportDocumentation("/path", "invalid")).toThrow(
        "Invalid format. Supported formats: markdown, json"
      );
    });
  });

  describe("searchDocumentation", () => {
    it("should search documentation content", () => {
      const fullDocs = {
        toolsByCategory: {
          "utility": [
            {
              name: "test_tool",
              description: "Test tool for testing",
              parameters: { test: { description: "Test parameter" } },
            },
          ],
        },
      };

      mockGenerateFullDocumentation.mockReturnValue(fullDocs);

      const results = service.searchDocumentation("test");

      expect(results).toHaveLength(1);
      expect(results[0].tool).toBe("test_tool");
      expect(results[0].matches).toHaveLength(3); // name, description, parameter
    });

    it("should handle no matches", () => {
      mockGenerateFullDocumentation.mockReturnValue({ toolsByCategory: {} });

      const results = service.searchDocumentation("nonexistent");

      expect(results).toHaveLength(0);
    });
  });

  describe("generateToolCard", () => {
    it("should generate tool card", () => {
      const tool = {
        name: "test_tool",
        description: "Test tool description",
        category: "utility",
        tags: ["test", "example"],
        riskLevel: "low",
        examples: ["test_tool('example')"],
      };

      mockGenerateDocumentation.mockReturnValue(tool);

      const result = service.generateToolCard("test_tool");

      expect(result).toContain("┌─ test_tool ─");
      expect(result).toContain("│ Test tool description");
      expect(result).toContain("│ Category: utility");
      expect(result).toContain("│ Tags: test, example");
      expect(result).toContain("│ Risk: low");
      expect(result).toContain("│ Example:");
    });
  });

  describe("formatToolUsage", () => {
    it("should format tool usage", () => {
      const tool = {
        name: "test_tool",
        description: "Test tool",
        usage: "test_tool(input: string, count?: number)",
        parameters: {
          input: { type: "string", required: true },
          count: { type: "number", required: false },
        },
      };

      mockGenerateDocumentation.mockReturnValue(tool);

      const result = service.formatToolUsage("test_tool");

      expect(result).toContain("test_tool(");
      expect(result).toContain("input: string");
      expect(result).toContain("count?: number");
    });
  });
});
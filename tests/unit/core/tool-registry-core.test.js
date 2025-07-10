import { jest } from "@jest/globals";

describe("Tool Registry Core", () => {
  let ToolRegistry;
  let toolRegistry;
  let ToolCategories;

  beforeEach(async () => {
    // Reset modules
    jest.resetModules();
    
    // Import the module
    const module = await import("../../../src/core/tool-registry.js");
    ToolRegistry = module.ToolRegistry;
    toolRegistry = module.toolRegistry;
    ToolCategories = module.ToolCategories;
  });

  describe("ToolRegistry class", () => {
    let registry;

    beforeEach(() => {
      registry = new ToolRegistry();
    });

    describe("constructor", () => {
      it("should initialize with empty tools map", () => {
        expect(registry.tools).toBeInstanceOf(Map);
        expect(registry.tools.size).toBe(0);
      });

      it("should initialize with empty categories map", () => {
        expect(registry.categories).toBeInstanceOf(Map);
        expect(registry.categories.size).toBe(0);
      });

      it("should initialize with empty tags map", () => {
        expect(registry.tags).toBeInstanceOf(Map);
        expect(registry.tags.size).toBe(0);
      });

      it("should initialize with empty aliases map", () => {
        expect(registry.aliases).toBeInstanceOf(Map);
        expect(registry.aliases.size).toBe(0);
      });
    });

    describe("register", () => {
      it("should register a tool", () => {
        const tool = {
          name: "test_tool",
          description: "Test tool",
          handler: jest.fn(),
        };

        const result = registry.register(tool);

        expect(result).toBe(true);
        expect(registry.tools.has("test_tool")).toBe(true);
        
        const storedTool = registry.tools.get("test_tool");
        expect(storedTool.name).toBe(tool.name);
        expect(storedTool.description).toBe(tool.description);
      });

      it("should throw error for missing name", () => {
        const tool = {
          description: "Test tool",
          handler: jest.fn(),
        };

        expect(() => registry.register(tool)).toThrow("Tool name is required");
      });

      it("should throw error for missing description", () => {
        const tool = {
          name: "test_tool",
          handler: jest.fn(),
        };

        expect(() => registry.register(tool)).toThrow("Tool description is required");
      });

      it("should throw error for missing handler", () => {
        const tool = {
          name: "test_tool",
          description: "Test tool",
        };

        expect(() => registry.register(tool)).toThrow("Tool handler is required");
      });

      it("should throw error for duplicate registration", () => {
        const tool = {
          name: "test_tool",
          description: "Test tool",
          handler: jest.fn(),
        };

        registry.register(tool);
        expect(() => registry.register(tool)).toThrow("Tool test_tool already registered");
      });

      it("should categorize tools with metadata", () => {
        const tool = {
          name: "test_tool",
          description: "Test tool",
          handler: jest.fn(),
          metadata: {
            category: ToolCategories.GITHUB_FLOW,
            tags: ["git", "flow"],
          },
        };

        registry.register(tool);

        expect(registry.categories.has(ToolCategories.GITHUB_FLOW)).toBe(true);
        expect(registry.categories.get(ToolCategories.GITHUB_FLOW).has("test_tool")).toBe(true);
        expect(registry.tags.has("git")).toBe(true);
        expect(registry.tags.has("flow")).toBe(true);
      });
    });

    describe("get", () => {
      beforeEach(() => {
        const tool = {
          name: "test_tool",
          description: "Test tool",
          handler: jest.fn(),
        };
        registry.register(tool);
      });

      it("should return registered tool", () => {
        const tool = registry.get("test_tool");
        expect(tool).toBeDefined();
        expect(tool.name).toBe("test_tool");
      });

      it("should return undefined for non-existent tool", () => {
        const tool = registry.get("non_existent");
        expect(tool).toBeUndefined();
      });
    });

    describe("search", () => {
      beforeEach(() => {
        registry.register({
          name: "github_flow_start",
          description: "Start GitHub flow",
          handler: jest.fn(),
          metadata: {
            category: ToolCategories.GITHUB_FLOW,
            tags: ["git", "branch"],
          },
        });

        registry.register({
          name: "auto_commit",
          description: "Auto commit changes",
          handler: jest.fn(),
          metadata: {
            category: ToolCategories.AUTOMATION,
            tags: ["git", "commit"],
          },
        });

        registry.register({
          name: "repo_map",
          description: "Generate repository map",
          handler: jest.fn(),
          metadata: {
            category: ToolCategories.UTILITY,
            tags: ["analysis"],
          },
        });
      });

      it("should search by category", () => {
        const results = registry.search({ category: ToolCategories.GITHUB_FLOW });
        expect(results).toHaveLength(1);
        expect(results[0].name).toBe("github_flow_start");
      });

      it("should search by tag", () => {
        const results = registry.search({ tag: "git" });
        expect(results).toHaveLength(2);
        expect(results.map(r => r.name)).toContain("github_flow_start");
        expect(results.map(r => r.name)).toContain("auto_commit");
      });

      it("should search by keyword", () => {
        const results = registry.search({ keyword: "flow" });
        expect(results).toHaveLength(1);
        expect(results[0].name).toBe("github_flow_start");
      });
    });

    describe("getByCategory", () => {
      beforeEach(() => {
        registry.register({
          name: "tool1",
          description: "Tool 1",
          handler: jest.fn(),
          metadata: { category: ToolCategories.GITHUB_FLOW },
        });

        registry.register({
          name: "tool2",
          description: "Tool 2",
          handler: jest.fn(),
          metadata: { category: ToolCategories.GITHUB_FLOW },
        });

        registry.register({
          name: "tool3",
          description: "Tool 3",
          handler: jest.fn(),
          metadata: { category: ToolCategories.AUTOMATION },
        });
      });

      it("should return tools by category", () => {
        const tools = registry.getByCategory(ToolCategories.GITHUB_FLOW);
        expect(tools).toHaveLength(2);
        expect(tools.map(t => t.name)).toContain("tool1");
        expect(tools.map(t => t.name)).toContain("tool2");
      });

      it("should return empty array for non-existent category", () => {
        const tools = registry.getByCategory("non_existent");
        expect(tools).toEqual([]);
      });
    });

    describe("listCategories", () => {
      it("should return empty array when no categories", () => {
        const categories = registry.listCategories();
        expect(categories).toEqual([]);
      });

      it("should return all categories with counts", () => {
        registry.register({
          name: "tool1",
          description: "Tool 1",
          handler: jest.fn(),
          metadata: { category: ToolCategories.GITHUB_FLOW },
        });

        registry.register({
          name: "tool2",
          description: "Tool 2",
          handler: jest.fn(),
          metadata: { category: ToolCategories.AUTOMATION },
        });

        const categories = registry.listCategories();
        expect(categories).toHaveLength(2);
        expect(categories[0]).toMatchObject({
          name: expect.any(String),
          count: 1,
          tools: expect.arrayContaining([expect.any(String)]),
        });
      });
    });

    describe("unregister", () => {
      beforeEach(() => {
        registry.register({
          name: "test_tool",
          description: "Test tool",
          handler: jest.fn(),
          metadata: {
            category: ToolCategories.UTILITY,
            tags: ["test"],
          },
        });
      });

      it("should unregister a tool", () => {
        const result = registry.unregister("test_tool");
        
        expect(result).toBe(true);
        expect(registry.tools.has("test_tool")).toBe(false);
        expect(registry.get("test_tool")).toBeUndefined();
      });

      it("should throw error for non-existent tool", () => {
        expect(() => registry.unregister("non_existent")).toThrow("Tool non_existent not found");
      });
    });

    describe("addAlias", () => {
      beforeEach(() => {
        registry.register({
          name: "test_tool",
          description: "Test tool",
          handler: jest.fn(),
        });
      });

      it("should add alias for tool", () => {
        const result = registry.addAlias("tt", "test_tool");
        
        expect(result).toBe(true);
        expect(registry.get("tt")).toBeDefined();
        expect(registry.get("tt").name).toBe("test_tool");
      });

      it("should throw error for non-existent tool", () => {
        expect(() => registry.addAlias("alias", "non_existent")).toThrow("Tool non_existent not found");
      });

      it("should throw error for duplicate alias", () => {
        registry.addAlias("tt", "test_tool");
        expect(() => registry.addAlias("tt", "test_tool")).toThrow("Alias tt already exists");
      });
    });

    describe("getStatistics", () => {
      it("should return registry statistics", () => {
        registry.register({
          name: "tool1",
          description: "Tool 1",
          handler: jest.fn(),
          metadata: {
            category: ToolCategories.GITHUB_FLOW,
            riskLevel: "high",
            experimental: true,
            requiresAuth: true,
          },
        });

        const stats = registry.getStatistics();
        
        expect(stats.totalTools).toBe(1);
        expect(stats.toolsByCategory[ToolCategories.GITHUB_FLOW]).toBe(1);
        expect(stats.toolsByRiskLevel.high).toBe(1);
        expect(stats.experimentalTools).toBe(1);
        expect(stats.authRequiredTools).toBe(1);
      });
    });
  });

  describe("toolRegistry singleton", () => {
    it("should export a singleton instance", () => {
      expect(toolRegistry).toBeDefined();
      expect(toolRegistry).toBeInstanceOf(ToolRegistry);
    });
  });
});
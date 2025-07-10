import { jest } from "@jest/globals";

// Final tests to reach 30% coverage

// Mock all dependencies upfront
jest.unstable_mockModule("child_process", () => ({
  execSync: jest.fn(() => "mock output"),
}));

jest.unstable_mockModule("fs", () => ({
  default: {
    existsSync: jest.fn(() => true),
    readFileSync: jest.fn(() => '{"test": true}'),
    writeFileSync: jest.fn(),
    mkdirSync: jest.fn(),
    readdirSync: jest.fn(() => ["file1.js", "file2.js"]),
    statSync: jest.fn(() => ({ 
      isDirectory: () => false,
      isFile: () => true 
    })),
  },
  promises: {
    readFile: jest.fn(() => Promise.resolve('{"test": true}')),
    writeFile: jest.fn(() => Promise.resolve()),
    mkdir: jest.fn(() => Promise.resolve()),
    readdir: jest.fn(() => Promise.resolve(["file1.js", "file2.js"])),
    stat: jest.fn(() => Promise.resolve({ 
      isDirectory: () => false,
      isFile: () => true 
    })),
  },
}));

jest.unstable_mockModule("os", () => ({
  default: {
    homedir: jest.fn(() => "/home/user"),
  },
}));

jest.unstable_mockModule("path", () => ({
  default: {
    join: (...args) => args.join("/"),
    dirname: (p) => p.split("/").slice(0, -1).join("/"),
    basename: (p) => p.split("/").pop(),
    resolve: (p) => p.startsWith("/") ? p : `/absolute/${p}`,
  },
  join: (...args) => args.join("/"),
  dirname: (p) => p.split("/").slice(0, -1).join("/"),
  basename: (p) => p.split("/").pop(),
  resolve: (p) => p.startsWith("/") ? p : `/absolute/${p}`,
}));

describe("Final Coverage Boost", () => {
  describe("Tool Documentation Service", () => {
    it("should test documentation generation", async () => {
      const mockRegistry = {
        generateDocumentation: jest.fn((name) => ({
          name,
          description: "Test tool",
          category: "utility",
          parameters: {
            input: { type: "string", description: "Input param", required: true },
          },
          examples: ["example1"],
          usage: `${name}(input: string)`,
        })),
        generateFullDocumentation: jest.fn(() => ({
          overview: { totalTools: 10, categories: [] },
          toolsByCategory: {
            utility: [{
              name: "test_tool",
              description: "Test",
              parameters: {},
              examples: [],
            }],
          },
        })),
        listCategories: jest.fn(() => [
          { name: "utility", count: 5, tools: ["tool1", "tool2"] },
        ]),
        get: jest.fn((name) => ({ name, description: "Tool" })),
      };

      jest.unstable_mockModule("../../../src/core/tool-registry.js", () => ({
        toolRegistry: mockRegistry,
        ToolCategories: { UTILITY: "utility" },
      }));

      const { ToolDocumentationService } = await import("../../../src/services/tool-documentation.js");
      const service = new ToolDocumentationService(mockRegistry);

      // Test various methods
      const toolDocs = service.generateToolDocs("test_tool");
      expect(toolDocs).toContain("# test_tool");
      expect(toolDocs).toContain("## Parameters");

      const categoryDocs = service.generateCategoryDocs("utility");
      expect(categoryDocs).toContain("# Utility Tools");

      const quickRef = service.generateQuickReference();
      expect(quickRef).toContain("Quick Reference");

      const workflows = service.generateExampleWorkflows();
      expect(workflows).toContain("Example Workflows");

      const apiRef = service.generateApiReference();
      expect(apiRef).toContain("API Reference");

      // Test search
      const searchResults = service.searchDocumentation("test");
      expect(Array.isArray(searchResults)).toBe(true);

      // Test tool card
      const card = service.generateToolCard("test_tool");
      expect(card).toContain("test_tool");

      // Test export
      await service.exportDocumentation("/tmp/docs", "markdown");
      await service.exportDocumentation("/tmp/docs", "json");
    });
  });

  describe("Tool Discovery Service", () => {
    it("should test discovery methods", async () => {
      const mockRegistry = {
        search: jest.fn(() => [{ name: "tool1" }, { name: "tool2" }]),
        get: jest.fn((name) => ({ 
          name, 
          description: "Tool",
          metadata: { 
            category: "utility",
            tags: ["test"],
            relatedTools: ["other_tool"],
          },
        })),
        listCategories: jest.fn(() => [
          { name: "utility", count: 5 },
        ]),
        getByCategory: jest.fn(() => [
          { name: "tool1", metadata: { usageCount: 100 } },
        ]),
        getStatistics: jest.fn(() => ({
          toolsByRiskLevel: { low: 10, medium: 5, high: 2 },
        })),
      };

      jest.unstable_mockModule("../../../src/core/tool-registry.js", () => ({
        toolRegistry: mockRegistry,
      }));

      const { ToolDiscoveryService } = await import("../../../src/services/tool-discovery.js");
      const service = new ToolDiscoveryService(mockRegistry);

      // Test all methods
      const byCapability = service.findByCapability("git");
      expect(Array.isArray(byCapability)).toBe(true);

      const popular = service.getPopularTools(5);
      expect(Array.isArray(popular)).toBe(true);

      const searchResults = service.searchTools({ query: "test" });
      expect(Array.isArray(searchResults)).toBe(true);

      const toolChain = service.getToolChain("development");
      expect(Array.isArray(toolChain)).toBe(true);

      const similar = service.getSimilarTools("test_tool");
      expect(Array.isArray(similar)).toBe(true);

      const byRisk = service.getToolsByRiskLevel("low");
      expect(Array.isArray(byRisk)).toBe(true);

      // Test cache
      service.clearCache();
      expect(service.cache.size).toBe(0);
    });
  });

  describe("Context Operations", () => {
    it("should test all context operations", async () => {
      // Clear module cache
      jest.resetModules();
      
      const contextOps = await import("../../../src/context/context-operations.js");
      
      // Test all exports
      expect(contextOps.getContext).toBeDefined();
      expect(contextOps.setContext).toBeDefined();
      expect(contextOps.updateContext).toBeDefined();
      expect(contextOps.clearContext).toBeDefined();
      expect(contextOps.getContextValue).toBeDefined();
      expect(contextOps.hasContext).toBeDefined();
      expect(contextOps.mergeContext).toBeDefined();
      expect(contextOps.saveContext).toBeDefined();
      expect(contextOps.loadContext).toBeDefined();

      // Test operations
      const ctx = contextOps.getContext();
      expect(ctx).toBeDefined();

      contextOps.setContext("test.key", "value");
      expect(contextOps.getContextValue("test.key")).toBe("value");
      expect(contextOps.hasContext("test.key")).toBe(true);

      contextOps.updateContext({ new: "data" });
      contextOps.mergeContext({ merged: true });

      contextOps.clearContext();
    });
  });

  describe("Enhanced Response Utils", () => {
    it("should test response conversion", async () => {
      const utils = await import("../../../src/utils/enhanced-response-utils.js");
      
      // Test legacy conversion
      const legacy = { success: true, message: "Test", data: { id: 1 } };
      const enhanced = utils.fromLegacyResponse(legacy);
      expect(enhanced.status).toBe("success");

      const backToLegacy = utils.toLegacyResponse(enhanced);
      expect(backToLegacy.success).toBe(true);

      // Test extractors
      const suggestions = utils.extractSuggestions(enhanced);
      expect(Array.isArray(suggestions)).toBe(true);

      const risks = utils.extractRisks(enhanced);
      expect(Array.isArray(risks)).toBe(true);

      const tools = utils.extractRelatedTools(enhanced);
      expect(Array.isArray(tools)).toBe(true);

      // Test metadata
      const metadata = utils.extractMetadata(enhanced);
      expect(metadata).toBeDefined();

      // Test operations history
      const history = utils.extractOperationHistory(enhanced);
      expect(Array.isArray(history)).toBe(true);
    });
  });

  describe("Git Helpers", () => {
    it("should test git helper functions", async () => {
      jest.resetModules();
      
      const mockExecSync = jest.fn();
      mockExecSync.mockImplementation((cmd) => {
        if (cmd.includes("git rev-parse")) return "true";
        if (cmd.includes("git branch")) return "* main";
        if (cmd.includes("git status")) return "nothing to commit";
        if (cmd.includes("git diff")) return "";
        return "mock output";
      });

      jest.unstable_mockModule("child_process", () => ({
        execSync: mockExecSync,
      }));

      const gitHelpers = await import("../../../src/utils/git-helpers.js");

      // Test all helpers
      expect(gitHelpers.isGitRepository()).toBe(true);
      expect(gitHelpers.getCurrentBranch()).toBe("main");
      expect(gitHelpers.getMainBranch()).toBe("main");
      expect(gitHelpers.hasUncommittedChanges()).toBe(false);
      expect(gitHelpers.getChangedFiles()).toEqual([]);
      
      // Test branch operations
      const branchName = gitHelpers.generateBranchName("test feature");
      expect(branchName).toContain("test");
      expect(branchName).toContain("feature");

      const sanitized = gitHelpers.sanitizeBranchName("Test@Feature#123!");
      expect(sanitized).not.toContain("@");
      expect(sanitized).not.toContain("#");
      expect(sanitized).not.toContain("!");

      const formatted = gitHelpers.formatBranchName("feature", "my feature");
      expect(formatted).toContain("feature/");
    });
  });

  describe("Enhancer Pipeline", () => {
    it("should test pipeline operations", async () => {
      const { EnhancerPipeline } = await import("../../../src/enhancers/enhancer-pipeline.js");
      const { BaseEnhancer } = await import("../../../src/enhancers/base-enhancer.js");

      class TestEnhancer extends BaseEnhancer {
        constructor(name) {
          super({ name });
        }
        async enhance(response) {
          return { ...response, [this.name]: true };
        }
      }

      const pipeline = new EnhancerPipeline();
      
      // Register enhancers
      pipeline.register(new TestEnhancer("enhancer1"));
      pipeline.register(new TestEnhancer("enhancer2"));
      pipeline.register(new TestEnhancer("enhancer3"));

      // Test pipeline execution
      const response = { test: true };
      const enhanced = await pipeline.enhance(response);
      
      expect(enhanced.enhancer1).toBe(true);
      expect(enhanced.enhancer2).toBe(true);
      expect(enhanced.enhancer3).toBe(true);

      // Test other methods
      expect(pipeline.getEnhancers()).toHaveLength(3);
      expect(pipeline.hasEnhancer("enhancer1")).toBe(true);
      
      pipeline.unregister("enhancer1");
      expect(pipeline.hasEnhancer("enhancer1")).toBe(false);

      pipeline.clear();
      expect(pipeline.getEnhancers()).toHaveLength(0);
    });
  });
});
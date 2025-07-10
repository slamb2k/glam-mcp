import { jest } from "@jest/globals";

// Mock tool registry
const mockSearch = jest.fn();
const mockGet = jest.fn();
const mockListCategories = jest.fn();
const mockGetByCategory = jest.fn();
const mockGetStatistics = jest.fn();

const mockToolRegistry = {
  search: mockSearch,
  get: mockGet,
  listCategories: mockListCategories,
  getByCategory: mockGetByCategory,
  getStatistics: mockGetStatistics,
};

jest.unstable_mockModule("../../../src/core/tool-registry.js", () => ({
  toolRegistry: mockToolRegistry,
  ToolCategories: {
    GITHUB_FLOW: "github-flow",
    AUTOMATION: "automation",
    UTILITY: "utility",
  },
}));

// Import after mocking
const { ToolDiscoveryService } = await import("../../../src/services/tool-discovery.js");

describe("ToolDiscoveryService", () => {
  let service;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new ToolDiscoveryService(mockToolRegistry);
  });

  describe("constructor", () => {
    it("should initialize with registry and cache", () => {
      expect(service.registry).toBe(mockToolRegistry);
      expect(service.cache).toBeInstanceOf(Map);
      expect(service.cacheTimeout).toBe(5 * 60 * 1000);
    });
  });

  describe("findByCapability", () => {
    it("should find tools by git capability", () => {
      const gitTools = [
        { name: "git_commit", description: "Commit changes" },
        { name: "github_flow_start", description: "Start GitHub flow" },
      ];

      mockSearch.mockImplementation(({ tag, keyword }) => {
        if (tag === "git" || keyword === "git") return [gitTools[0]];
        if (tag === "github-flow" || keyword === "github-flow") return [gitTools[1]];
        return [];
      });

      const results = service.findByCapability("git");

      expect(results).toHaveLength(2);
      expect(results).toContainEqual(gitTools[0]);
      expect(results).toContainEqual(gitTools[1]);
    });

    it("should find tools by test capability", () => {
      const testTools = [
        { name: "run_tests", description: "Run tests" },
        { name: "test_coverage", description: "Check coverage" },
      ];

      mockSearch.mockImplementation(({ tag, keyword }) => {
        if (tag === "test" || keyword === "test") return [testTools[0]];
        if (tag === "testing" || keyword === "testing") return [testTools[1]];
        return [];
      });

      const results = service.findByCapability("test");

      expect(results).toHaveLength(2);
    });

    it("should use cache for repeated queries", () => {
      const tools = [{ name: "tool1" }];
      mockSearch.mockReturnValue(tools);

      // First call
      service.findByCapability("git");
      expect(mockSearch).toHaveBeenCalled();

      // Reset mock
      mockSearch.mockClear();

      // Second call should use cache
      const cached = service.findByCapability("git");
      expect(mockSearch).not.toHaveBeenCalled();
      expect(cached).toEqual(tools);
    });

    it("should handle unknown capabilities", () => {
      mockSearch.mockReturnValue([]);

      const results = service.findByCapability("unknown");

      expect(results).toEqual([]);
    });
  });

  describe("getWorkflowRecommendations", () => {
    it("should get development workflow recommendations", () => {
      mockGet.mockImplementation((name) => {
        if (name === "get_status") return { name, description: "Get status" };
        if (name === "github_flow_start") return { name, description: "Start flow" };
        return null;
      });

      const results = service.getWorkflowRecommendations("development");

      expect(results.length).toBeGreaterThan(0);
      expect(results[0]).toHaveProperty("recommendation");
      expect(results[0].recommendation.workflow).toBe("development");
    });

    it("should get review workflow recommendations", () => {
      mockGet.mockImplementation((name) => {
        if (name === "show_diff") return { name, description: "Show diff" };
        if (name === "analyze_changes") return { name, description: "Analyze changes" };
        return null;
      });

      const results = service.getWorkflowRecommendations("review");

      expect(results.length).toBeGreaterThan(0);
    });

    it("should handle unknown workflow", () => {
      const results = service.getWorkflowRecommendations("unknown");
      expect(results).toEqual([]);
    });
  });

  describe("getPopularTools", () => {
    it("should get popular tools", () => {
      const categories = [
        { name: "github-flow", count: 10 },
        { name: "automation", count: 8 },
      ];

      const githubTools = [
        { name: "github_flow_start", metadata: { usageCount: 100 } },
        { name: "github_flow_pr", metadata: { usageCount: 80 } },
      ];

      mockListCategories.mockReturnValue(categories);
      mockGetByCategory.mockImplementation((cat) => {
        if (cat === "github-flow") return githubTools;
        return [];
      });

      const results = service.getPopularTools(5);

      expect(results).toHaveLength(2);
      expect(results[0].name).toBe("github_flow_start");
    });
  });

  describe("searchTools", () => {
    it("should search tools with combined criteria", () => {
      const searchResults = [
        { name: "tool1", score: 0.9 },
        { name: "tool2", score: 0.7 },
      ];

      mockSearch.mockReturnValue(searchResults);

      const results = service.searchTools({
        query: "test",
        category: "automation",
        tags: ["git"],
      });

      expect(mockSearch).toHaveBeenCalledWith({
        keyword: "test",
        category: "automation",
        tag: "git",
      });
      expect(results).toEqual(searchResults);
    });

    it("should handle empty search", () => {
      mockSearch.mockReturnValue([]);

      const results = service.searchTools({});

      expect(results).toEqual([]);
    });
  });

  describe("getToolChain", () => {
    it("should build tool chain for task", () => {
      const tools = {
        github_flow_start: { 
          name: "github_flow_start", 
          metadata: { relatedTools: ["auto_commit"] } 
        },
        auto_commit: { 
          name: "auto_commit", 
          metadata: { relatedTools: ["github_flow_pr"] } 
        },
        github_flow_pr: { 
          name: "github_flow_pr", 
          metadata: {} 
        },
      };

      mockGet.mockImplementation((name) => tools[name]);

      const chain = service.getToolChain("feature-development");

      expect(chain.length).toBeGreaterThan(0);
      expect(chain[0].name).toBe("github_flow_start");
    });
  });

  describe("getSimilarTools", () => {
    it("should find similar tools", () => {
      const baseTool = {
        name: "git_commit",
        metadata: {
          category: "github-flow",
          tags: ["git", "commit"],
        },
      };

      const similarTools = [
        { name: "auto_commit", metadata: { tags: ["git", "commit"] } },
        { name: "smart_commit", metadata: { tags: ["git", "commit"] } },
      ];

      mockGet.mockReturnValue(baseTool);
      mockSearch.mockReturnValue(similarTools);

      const results = service.getSimilarTools("git_commit");

      expect(results.length).toBeGreaterThan(0);
      expect(mockSearch).toHaveBeenCalled();
    });
  });

  describe("getToolsByRiskLevel", () => {
    it("should filter tools by risk level", () => {
      const stats = {
        toolsByRiskLevel: { low: 10, medium: 5, high: 2 },
      };

      const lowRiskTools = [
        { name: "tool1", metadata: { riskLevel: "low" } },
        { name: "tool2", metadata: { riskLevel: "low" } },
      ];

      mockGetStatistics.mockReturnValue(stats);
      mockSearch.mockReturnValue(lowRiskTools);

      const results = service.getToolsByRiskLevel("low");

      expect(results).toEqual(lowRiskTools);
      expect(mockSearch).toHaveBeenCalledWith({ riskLevel: "low" });
    });
  });

  describe("cache management", () => {
    it("should expire cache after timeout", async () => {
      const tools = [{ name: "tool1" }];
      mockSearch.mockReturnValue(tools);

      // Set cache timeout to 100ms for testing
      service.cacheTimeout = 100;

      // First call
      service.findByCapability("git");
      
      // Wait for cache to expire
      await new Promise(resolve => setTimeout(resolve, 150));

      // Clear mock to verify it's called again
      mockSearch.mockClear();

      // Should fetch again after expiry
      service.findByCapability("git");
      expect(mockSearch).toHaveBeenCalled();
    });

    it("should clear cache", () => {
      mockSearch.mockReturnValue([{ name: "tool1" }]);

      // Populate cache
      service.findByCapability("git");
      expect(service.cache.size).toBeGreaterThan(0);

      // Clear cache
      service.clearCache();
      expect(service.cache.size).toBe(0);
    });
  });
});
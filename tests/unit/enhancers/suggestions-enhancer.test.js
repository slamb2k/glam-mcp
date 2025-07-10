import { jest } from "@jest/globals";
import { SuggestionsEnhancer } from "../../../src/enhancers/core/suggestions-enhancer.js";
import { EnhancedResponse, RiskLevel } from "../../../src/core/enhanced-response.js";

describe("SuggestionsEnhancer", () => {
  let enhancer;
  let mockContext;

  beforeEach(() => {
    enhancer = new SuggestionsEnhancer();
    mockContext = {
      sessionId: "test-session",
      gitContext: {
        branch: "feature/test",
        hasUncommittedChanges: false,
      },
      recentOperations: [],
    };
  });

  describe("initialization", () => {
    it("should have correct properties", () => {
      expect(enhancer.name).toBe("SuggestionsEnhancer");
      expect(enhancer.metadata.description).toBe("Provides contextual suggestions and recommendations");
      expect(enhancer.priority).toBe(80);
      expect(enhancer.dependencies).toEqual(["MetadataEnhancer", "RiskAssessmentEnhancer"]);
    });
  });

  describe("canEnhance", () => {
    it("should return true for valid responses", () => {
      const response = new EnhancedResponse({
        success: true,
        message: "Operation completed",
      });
      expect(enhancer.canEnhance(response)).toBe(true);
    });

    it("should return false when disabled", () => {
      enhancer.setEnabled(false);
      const response = new EnhancedResponse({ success: true });
      expect(enhancer.canEnhance(response)).toBe(false);
    });
  });

  describe("enhance", () => {
    describe("operation-based suggestions", () => {
      it("should suggest next steps after branch creation", async () => {
        const response = new EnhancedResponse({
          success: true,
          message: "Branch created",
          data: { branch: "feature/new-feature" },
        });
        response.addMetadata("operation", "github_flow_start");

        const enhanced = await enhancer.enhance(response, mockContext);

        const suggestions = enhanced.getSuggestions();
        expect(suggestions.length).toBeGreaterThan(0);
        expect(suggestions.some(s => s.type === "next-step")).toBe(true);
        expect(suggestions.some(s => s.description.includes("implement"))).toBe(true);
      });

      it("should suggest PR creation after commits", async () => {
        const response = new EnhancedResponse({
          success: true,
          message: "Changes committed",
        });
        response.addMetadata("operation", "auto_commit");

        const enhanced = await enhancer.enhance(response, mockContext);

        const suggestions = enhanced.getSuggestions();
        expect(suggestions.some(s => s.description.includes("pull request"))).toBe(true);
      });

      it("should suggest merge after PR creation", async () => {
        const response = new EnhancedResponse({
          success: true,
          message: "PR created",
          data: { pr_url: "https://github.com/user/repo/pull/123" },
        });
        response.addMetadata("operation", "github_flow_pr");

        const enhanced = await enhancer.enhance(response, mockContext);

        const suggestions = enhanced.getSuggestions();
        expect(suggestions.some(s => s.description.includes("review"))).toBe(true);
      });

      it("should suggest cleanup after merge", async () => {
        const response = new EnhancedResponse({
          success: true,
          message: "PR merged",
        });
        response.addMetadata("operation", "github_flow_merge");

        const enhanced = await enhancer.enhance(response, mockContext);

        const suggestions = enhanced.getSuggestions();
        expect(suggestions.some(s => s.description.includes("cleanup") || s.description.includes("delete"))).toBe(true);
      });
    });

    describe("risk-based suggestions", () => {
      it("should add safety suggestions for high-risk operations", async () => {
        const response = new EnhancedResponse({
          success: true,
          message: "Force push completed",
        });
        response.setRiskLevel(RiskLevel.HIGH);
        response.addRisk({
          level: RiskLevel.HIGH,
          type: "git",
          description: "Force push detected",
        });

        const enhanced = await enhancer.enhance(response, mockContext);

        const suggestions = enhanced.getSuggestions();
        expect(suggestions.some(s => s.type === "safety")).toBe(true);
      });

      it("should suggest backup for critical operations", async () => {
        const response = new EnhancedResponse({
          success: true,
          message: "System file modified",
        });
        response.setRiskLevel(RiskLevel.CRITICAL);

        const enhanced = await enhancer.enhance(response, mockContext);

        const suggestions = enhanced.getSuggestions();
        expect(suggestions.some(s => s.description.includes("backup"))).toBe(true);
      });

      it("should prioritize risk mitigation suggestions", async () => {
        const response = new EnhancedResponse({
          success: true,
          message: "Operation completed",
        });
        response.setRiskLevel(RiskLevel.HIGH);

        const enhanced = await enhancer.enhance(response, mockContext);

        const suggestions = enhanced.getSuggestions();
        const safetySuggestion = suggestions.find(s => s.type === "safety");
        expect(safetySuggestion?.priority).toBe("high");
      });
    });

    describe("context-based suggestions", () => {
      it("should suggest commit when uncommitted changes exist", async () => {
        const contextWithChanges = {
          ...mockContext,
          gitContext: {
            ...mockContext.gitContext,
            hasUncommittedChanges: true,
          },
        };

        const response = new EnhancedResponse({
          success: true,
          message: "Operation completed",
        });

        const enhanced = await enhancer.enhance(response, contextWithChanges);

        const suggestions = enhanced.getSuggestions();
        expect(suggestions.some(s => s.description.includes("commit"))).toBe(true);
      });

      it("should suggest based on recent operations", async () => {
        const contextWithHistory = {
          ...mockContext,
          recentOperations: [
            { operation: "github_flow_start", timestamp: Date.now() - 5000 },
            { operation: "auto_commit", timestamp: Date.now() - 3000 },
          ],
        };

        const response = new EnhancedResponse({
          success: true,
          message: "Changes saved",
        });

        const enhanced = await enhancer.enhance(response, contextWithHistory);

        const suggestions = enhanced.getSuggestions();
        expect(suggestions.length).toBeGreaterThan(0);
      });

      it("should suggest sync when on feature branch", async () => {
        const response = new EnhancedResponse({
          success: true,
          message: "Work completed",
        });
        response.addMetadata("branch", "feature/my-feature");

        const enhanced = await enhancer.enhance(response, mockContext);

        const suggestions = enhanced.getSuggestions();
        expect(suggestions.some(s => s.description.includes("sync") || s.description.includes("update"))).toBe(true);
      });
    });

    describe("tool suggestions", () => {
      it("should suggest related tools", async () => {
        const response = new EnhancedResponse({
          success: true,
          message: "Repository analyzed",
        });
        response.addMetadata("operation", "repo_map");

        const enhanced = await enhancer.enhance(response, mockContext);

        const suggestions = enhanced.getSuggestions();
        const toolSuggestions = suggestions.filter(s => s.type === "tool");
        expect(toolSuggestions.length).toBeGreaterThan(0);
      });

      it("should suggest appropriate tools for the context", async () => {
        const response = new EnhancedResponse({
          success: true,
          message: "TODOs found",
          data: { todos: ["Fix bug", "Add tests"] },
        });
        response.addMetadata("operation", "search_todos");

        const enhanced = await enhancer.enhance(response, mockContext);

        const suggestions = enhanced.getSuggestions();
        expect(suggestions.some(s => s.tool && (s.tool.includes("fix") || s.tool.includes("implement")))).toBe(true);
      });
    });

    describe("workflow suggestions", () => {
      it("should provide workflow guidance for complex operations", async () => {
        const response = new EnhancedResponse({
          success: true,
          message: "Feature branch created",
        });
        response.addMetadata("operation", "github_flow_start");
        response.addMetadata("branch", "feature/auth");

        const enhanced = await enhancer.enhance(response, mockContext);

        const suggestions = enhanced.getSuggestions();
        const workflowSuggestions = suggestions.filter(s => s.type === "workflow");
        expect(workflowSuggestions.length).toBeGreaterThan(0);
      });

      it("should adapt workflow based on branch type", async () => {
        const response = new EnhancedResponse({
          success: true,
          message: "Branch created",
        });
        response.addMetadata("operation", "github_flow_start");
        response.addMetadata("branch", "fix/bug-123");

        const enhanced = await enhancer.enhance(response, mockContext);

        const suggestions = enhanced.getSuggestions();
        expect(suggestions.some(s => s.description.includes("fix") || s.description.includes("bug"))).toBe(true);
      });
    });

    describe("error recovery suggestions", () => {
      it("should provide recovery suggestions on failure", async () => {
        const response = new EnhancedResponse({
          success: false,
          error: "Merge conflict detected",
        });
        response.addMetadata("operation", "github_flow_merge");

        const enhanced = await enhancer.enhance(response, mockContext);

        const suggestions = enhanced.getSuggestions();
        expect(suggestions.some(s => s.type === "recovery")).toBe(true);
        expect(suggestions.some(s => s.description.includes("conflict"))).toBe(true);
      });

      it("should prioritize error recovery suggestions", async () => {
        const response = new EnhancedResponse({
          success: false,
          error: "Operation failed",
        });

        const enhanced = await enhancer.enhance(response, mockContext);

        const suggestions = enhanced.getSuggestions();
        const recoverySuggestion = suggestions.find(s => s.type === "recovery");
        expect(recoverySuggestion?.priority).toBe("high");
      });
    });

    describe("best practices", () => {
      it("should suggest best practices for documentation", async () => {
        const response = new EnhancedResponse({
          success: true,
          message: "Documentation updated",
        });
        response.addMetadata("files", ["README.md", "docs/api.md"]);

        const enhanced = await enhancer.enhance(response, mockContext);

        const suggestions = enhanced.getSuggestions();
        expect(suggestions.some(s => s.type === "best-practice")).toBe(true);
      });

      it("should suggest testing after code changes", async () => {
        const response = new EnhancedResponse({
          success: true,
          message: "Code updated",
        });
        response.addMetadata("files", ["src/app.js", "src/utils.js"]);

        const enhanced = await enhancer.enhance(response, mockContext);

        const suggestions = enhanced.getSuggestions();
        expect(suggestions.some(s => s.description.includes("test"))).toBe(true);
      });
    });

    describe("configuration", () => {
      it("should respect suggestion limits", async () => {
        const configuredEnhancer = new SuggestionsEnhancer({
          maxSuggestions: 3,
        });

        const response = new EnhancedResponse({
          success: true,
          message: "Complex operation completed",
        });
        response.setRiskLevel(RiskLevel.HIGH);

        const enhanced = await configuredEnhancer.enhance(response, mockContext);

        const suggestions = enhanced.getSuggestions();
        expect(suggestions.length).toBeLessThanOrEqual(3);
      });

      it("should filter suggestions by type when configured", async () => {
        const configuredEnhancer = new SuggestionsEnhancer({
          suggestionTypes: ["next-step", "tool"],
        });

        const response = new EnhancedResponse({
          success: true,
          message: "Operation completed",
        });

        const enhanced = await configuredEnhancer.enhance(response, mockContext);

        const suggestions = enhanced.getSuggestions();
        suggestions.forEach(s => {
          expect(["next-step", "tool"]).toContain(s.type);
        });
      });
    });

    describe("error handling", () => {
      it("should handle missing context gracefully", async () => {
        const response = new EnhancedResponse({
          success: true,
          message: "Test operation",
        });

        const enhanced = await enhancer.enhance(response, null);

        expect(enhanced).toBeDefined();
        const suggestions = enhanced.getSuggestions();
        expect(suggestions.length).toBeGreaterThan(0);
      });

      it("should handle suggestion generation errors", async () => {
        const faultyEnhancer = new SuggestionsEnhancer({
          customSuggestionGenerators: [
            {
              generate: () => {
                throw new Error("Generator error");
              },
            },
          ],
        });

        const response = new EnhancedResponse({ success: true });

        // Should not throw
        const enhanced = await faultyEnhancer.enhance(response, mockContext);
        expect(enhanced).toBeDefined();
      });
    });
  });
});
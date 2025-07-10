import { jest } from "@jest/globals";
import { MetadataEnhancer } from "../../../src/enhancers/core/metadata-enhancer.js";
import { RiskAssessmentEnhancer } from "../../../src/enhancers/core/risk-assessment-enhancer.js";
import { SuggestionsEnhancer } from "../../../src/enhancers/core/suggestions-enhancer.js";
import { TeamActivityEnhancer } from "../../../src/enhancers/core/team-activity-enhancer.js";
import { EnhancedResponse, RiskLevel } from "../../../src/core/enhanced-response.js";
import { EnhancerPriority } from "../../../src/enhancers/base-enhancer.js";

// Mock git helpers and child_process for TeamActivityEnhancer
jest.mock("child_process", () => ({
  execSync: jest.fn(),
}));

jest.mock("../../../src/utils/git-helpers.js", () => ({
  getRecentCommits: jest.fn(),
  hasRemoteBranch: jest.fn(),
  execGitCommand: jest.fn(),
}));

describe("Core Enhancers", () => {
  describe("MetadataEnhancer", () => {
    let enhancer;
    let response;
    let context;

    beforeEach(() => {
      enhancer = new MetadataEnhancer();
      response = new EnhancedResponse({ success: true, message: "Test" });
      context = {
        operation: "test_operation",
        user: "test_user",
        session: { id: "session-123" },
        source: {
          tool: "test_tool",
          version: "1.0.0",
          component: "test_component",
        },
        operationStartTime: Date.now() - 100,
      };
    });

    it("should have correct initialization", () => {
      expect(enhancer.name).toBe("MetadataEnhancer");
      expect(enhancer.priority).toBe(EnhancerPriority.HIGH);
      expect(enhancer.metadata.description).toBe("Adds contextual metadata to responses");
    });

    it("should enhance response with all metadata", async () => {
      const enhanced = await enhancer.enhance(response, context);

      expect(enhanced.metadata.enhancedAt).toBeDefined();
      // The MetadataEnhancer doesn't add enhancedBy field - removed outdated assertion
      expect(enhanced.metadata.system).toBeDefined();
      expect(enhanced.metadata.process).toBeDefined();
      expect(enhanced.metadata.operation).toBe("test_operation");
      expect(enhanced.metadata.user).toBe("test_user");
      expect(enhanced.metadata.sessionId).toBe("session-123");
      expect(enhanced.metadata.source).toEqual(context.source);
      expect(enhanced.metadata.operationDuration).toBeGreaterThan(0);
    });

    it("should handle custom metadata functions", async () => {
      const customEnhancer = new MetadataEnhancer({
        customMetadata: {
          dynamic: (ctx) => `value-${ctx.user}`,
          static: "static-value",
        },
      });

      const enhanced = await customEnhancer.enhance(response, context);
      expect(enhanced.metadata.dynamic).toBe("value-test_user");
      expect(enhanced.metadata.static).toBe("static-value");
    });

    it("should respect configuration flags", async () => {
      const configuredEnhancer = new MetadataEnhancer({
        includeSystemInfo: false,
        includeProcessInfo: false,
        includeTimestamps: false,
      });

      const enhanced = await configuredEnhancer.enhance(response, context);
      expect(enhanced.metadata.system).toBeUndefined();
      expect(enhanced.metadata.process).toBeUndefined();
      expect(enhanced.metadata.enhancedAt).toBeUndefined();
    });
  });

  describe("RiskAssessmentEnhancer", () => {
    let enhancer;
    let response;
    let context;

    beforeEach(() => {
      enhancer = new RiskAssessmentEnhancer();
      response = new EnhancedResponse({ success: true, message: "Test" });
      context = {
        operation: "git.push",
        command: "git push --force",
        branch: "main",
        files: ["/etc/passwd", "config.json", ".env"],
        session: {
          data: {
            gitContext: {
              hasUncommittedChanges: true,
            },
          },
        },
      };
    });

    it("should have correct initialization", () => {
      expect(enhancer.name).toBe("RiskAssessmentEnhancer");
      expect(enhancer.priority).toBe(EnhancerPriority.HIGH);
      expect(enhancer.dependencies).toEqual(["MetadataEnhancer"]);
    });

    it("should identify force push as high risk", async () => {
      const enhanced = await enhancer.enhance(response, context);
      
      expect(enhanced.risks.length).toBeGreaterThan(0);
      expect(enhanced.risks.some(r => 
        r.level === RiskLevel.HIGH && 
        r.description.includes("Force push")
      )).toBe(true);
    });

    it("should identify main branch operations as high risk", async () => {
      context.operation = "git.delete";
      const enhanced = await enhancer.enhance(response, context);
      
      expect(enhanced.risks.some(r => 
        r.level === RiskLevel.CRITICAL && 
        r.description.includes("protected branch")
      )).toBe(true);
    });

    it("should identify system files as critical risk", async () => {
      const enhanced = await enhancer.enhance(response, context);
      
      expect(enhanced.risks.some(r => 
        r.level === RiskLevel.CRITICAL && 
        r.description.includes("System files")
      )).toBe(true);
    });

    it("should identify security risks", async () => {
      response = new EnhancedResponse({ 
        success: true, 
        message: "Updated password configuration",
        data: { content: "API_KEY=secret123" }
      });
      
      const enhanced = await enhancer.enhance(response, context);
      
      expect(enhanced.risks.some(r => 
        r.level === RiskLevel.CRITICAL && 
        r.description.includes("Sensitive")
      )).toBe(true);
    });

    it("should handle custom risk evaluators", async () => {
      const customEnhancer = new RiskAssessmentEnhancer({
        customRiskEvaluators: [
          async (resp, ctx) => {
            if (ctx.customRisk) {
              return [{
                level: RiskLevel.HIGH,
                description: "Custom risk detected",
                mitigation: "Custom mitigation",
              }];
            }
            return [];
          },
        ],
      });

      context.customRisk = true;
      const enhanced = await customEnhancer.enhance(response, context);
      
      expect(enhanced.risks.some(r => 
        r.description === "Custom risk detected"
      )).toBe(true);
    });

    it("should respect configuration", async () => {
      const configuredEnhancer = new RiskAssessmentEnhancer({
        evaluateGitRisks: false,
        evaluateFileRisks: false,
        evaluateSecurityRisks: false,
      });

      const enhanced = await configuredEnhancer.enhance(response, context);
      expect(enhanced.risks.length).toBe(0);
    });
  });

  describe("SuggestionsEnhancer", () => {
    let enhancer;
    let response;
    let context;

    beforeEach(() => {
      enhancer = new SuggestionsEnhancer();
      response = new EnhancedResponse({ success: true, message: "Test" });
      response.addMetadata("operation", "github_flow_start");
      response.addMetadata("branch", "feature/test");
      context = {
        gitContext: {
          hasUncommittedChanges: false,
          branch: "feature/test",
        },
        recentOperations: [],
      };
    });

    it("should have correct initialization", () => {
      expect(enhancer.name).toBe("SuggestionsEnhancer");
      expect(enhancer.priority).toBe(80);
      expect(enhancer.dependencies).toEqual(["MetadataEnhancer", "RiskAssessmentEnhancer"]);
    });

    it("should suggest next steps after branch creation", async () => {
      const enhanced = await enhancer.enhance(response, context);
      
      expect(enhanced.suggestions.length).toBeGreaterThan(0);
      expect(enhanced.suggestions.some(s => 
        s.action === "implement" && 
        s.priority === "high"
      )).toBe(true);
    });

    it("should suggest PR creation after commits", async () => {
      response.addMetadata("operation", "auto_commit");
      const enhanced = await enhancer.enhance(response, context);
      
      expect(enhanced.suggestions.some(s => 
        s.action === "create_pr"
      )).toBe(true);
    });

    it("should add safety suggestions for high-risk operations", async () => {
      response.addRisk(RiskLevel.HIGH, "Force push detected");
      const enhanced = await enhancer.enhance(response, context);
      
      expect(enhanced.suggestions.some(s => 
        s.action === "verify_safety" && 
        s.priority === "high"
      )).toBe(true);
    });

    it("should suggest commit when uncommitted changes exist", async () => {
      context.gitContext.hasUncommittedChanges = true;
      const enhanced = await enhancer.enhance(response, context);
      
      expect(enhanced.suggestions.some(s => 
        s.action === "commit_changes"
      )).toBe(true);
    });

    it("should provide workflow suggestions", async () => {
      response.addMetadata("workflow", "development");
      const enhanced = await enhancer.enhance(response, context);
      
      expect(enhanced.suggestions.some(s => 
        s.action.includes("workflow")
      )).toBe(true);
    });

    it("should handle custom suggestion generators", async () => {
      const customEnhancer = new SuggestionsEnhancer({
        customSuggestionGenerators: [
          async (resp, ctx) => ({
            action: "custom_action",
            description: "Custom suggestion",
            priority: "medium",
          }),
        ],
      });

      const enhanced = await customEnhancer.enhance(response, context);
      expect(enhanced.suggestions.some(s => 
        s.action === "custom_action"
      )).toBe(true);
    });

    it("should respect maxSuggestions config", async () => {
      const limitedEnhancer = new SuggestionsEnhancer({
        maxSuggestions: 2,
      });

      // Add multiple triggers for suggestions
      response.addRisk(RiskLevel.HIGH, "Risk 1");
      response.addRisk(RiskLevel.HIGH, "Risk 2");
      context.gitContext.hasUncommittedChanges = true;

      const enhanced = await limitedEnhancer.enhance(response, context);
      expect(enhanced.suggestions.length).toBeLessThanOrEqual(2);
    });
  });

  describe("TeamActivityEnhancer", () => {
    let enhancer;
    let response;
    let context;
    let gitHelpers;
    let childProcess;

    beforeEach(async () => {
      enhancer = new TeamActivityEnhancer();
      response = new EnhancedResponse({ success: true, message: "Test" });
      response.addMetadata("files", ["src/file1.js", "src/file2.js"]);
      context = {
        gitContext: {
          branch: "feature/test",
        },
      };

      // Get mocked modules
      gitHelpers = await import("../../../src/utils/git-helpers.js");
      childProcess = await import("child_process");
      jest.clearAllMocks();
    });

    it("should have correct initialization", () => {
      expect(enhancer.name).toBe("TeamActivityEnhancer");
      expect(enhancer.priority).toBe(70);
      expect(enhancer.dependencies).toEqual(["MetadataEnhancer"]);
    });

    it("should track recent commits", async () => {
      gitHelpers.getRecentCommits.mockResolvedValue([
        {
          hash: "abc123",
          author: "John Doe",
          email: "john@example.com",
          message: "Fix bug",
          date: new Date().toISOString(),
        },
        {
          hash: "def456",
          author: "Jane Smith",
          email: "jane@example.com",
          message: "Add feature",
          date: new Date().toISOString(),
        },
      ]);

      const enhanced = await enhancer.enhance(response, context);
      
      expect(enhanced.teamActivity).toBeDefined();
      expect(enhanced.teamActivity.recentCommits).toHaveLength(2);
      expect(enhanced.teamActivity.activeContributors).toContain("John Doe");
      expect(enhanced.teamActivity.activeContributors).toContain("Jane Smith");
    });

    it("should identify related branches", async () => {
      childProcess.execSync.mockImplementation((cmd) => {
        if (cmd.includes("branch -r")) {
          return "origin/feature/test\norigin/feature/test-ui\norigin/feature/test-api\n";
        }
        return "";
      });

      response.addMetadata("branch", "feature/test-backend");
      const enhanced = await enhancer.enhance(response, context);
      
      expect(enhanced.teamActivity.relatedBranches).toContain("feature/test-ui");
      expect(enhanced.teamActivity.relatedBranches).toContain("feature/test-api");
    });

    it("should find file contributors", async () => {
      childProcess.execSync.mockImplementation((cmd) => {
        if (cmd.includes("shortlog")) {
          return "    15\tJohn Doe\n    10\tJane Smith\n     5\tBob Johnson\n";
        }
        return "";
      });

      const enhanced = await enhancer.enhance(response, context);
      
      expect(enhanced.teamActivity.fileContributors).toBeDefined();
      expect(enhanced.teamActivity.fileContributors["src/file1.js"]).toBeDefined();
      expect(enhanced.teamActivity.potentialReviewers).toContain("John Doe");
    });

    it("should detect potential conflicts", async () => {
      childProcess.execSync.mockImplementation((cmd) => {
        if (cmd.includes("branch -r")) {
          return "origin/feature/conflict-branch\n";
        }
        if (cmd.includes("merge-base")) {
          return "base123\n";
        }
        if (cmd.includes("diff --name-only")) {
          return "src/file1.js\nsrc/shared.js\n";
        }
        return "";
      });

      const enhanced = await enhancer.enhance(response, context);
      
      expect(enhanced.teamActivity.potentialConflicts).toBeDefined();
      expect(enhanced.teamActivity.potentialConflicts.length).toBeGreaterThan(0);
    });

    it("should handle errors gracefully", async () => {
      gitHelpers.getRecentCommits.mockRejectedValue(new Error("Git error"));
      childProcess.execSync.mockImplementation(() => {
        throw new Error("Command failed");
      });

      const enhanced = await enhancer.enhance(response, context);
      
      expect(enhanced).toBeDefined();
      expect(enhanced.teamActivity).toBeDefined();
    });

    it("should respect configuration", async () => {
      const configuredEnhancer = new TeamActivityEnhancer({
        trackCommits: false,
        trackBranches: false,
        trackContributors: false,
      });

      const enhanced = await configuredEnhancer.enhance(response, context);
      
      expect(enhanced.teamActivity.recentCommits).toBeUndefined();
      expect(enhanced.teamActivity.relatedBranches).toBeUndefined();
      expect(enhanced.teamActivity.fileContributors).toBeUndefined();
    });
  });
});
import { jest } from "@jest/globals";
import { execSync } from "child_process";

// Mock git-helpers before importing
const mockGetRecentCommits = jest.fn();
const mockHasRemoteBranch = jest.fn();
const mockExecGitCommand = jest.fn();

jest.unstable_mockModule("../../../src/utils/git-helpers.js", () => ({
  getRecentCommits: mockGetRecentCommits,
  hasRemoteBranch: mockHasRemoteBranch,
  execGitCommand: mockExecGitCommand,
}));

// Mock child_process
jest.mock("child_process");

// Import after mocking
const { TeamActivityEnhancer } = await import("../../../src/enhancers/core/team-activity-enhancer.js");
const { EnhancedResponse } = await import("../../../src/core/enhanced-response.js");

describe("TeamActivityEnhancer", () => {
  let enhancer;
  let mockContext;

  beforeEach(() => {
    enhancer = new TeamActivityEnhancer();
    mockContext = {
      sessionId: "test-session",
      gitContext: {
        branch: "feature/test",
      },
    };

    jest.clearAllMocks();
  });

  describe("initialization", () => {
    it("should have correct properties", () => {
      expect(enhancer.name).toBe("TeamActivityEnhancer");
      expect(enhancer.metadata.description).toBe("Adds team collaboration context to responses");
      expect(enhancer.priority).toBe(20);
      expect(enhancer.dependencies).toEqual(["MetadataEnhancer"]);
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
    describe("recent activity detection", () => {
      it("should add recent commits from team members", async () => {
        execSync.mockImplementation((cmd) => {
          if (cmd.includes("git log")) {
            return "abc123|John Doe|john@example.com|Fix bug in auth|2 hours ago\ndef456|Jane Smith|jane@example.com|Add new feature|3 hours ago";
          }
          return "";
        });

        const response = new EnhancedResponse({
          success: true,
          message: "Checking team activity",
        });

        const enhanced = await enhancer.enhance(response, mockContext);

        const teamActivity = enhanced.teamActivity;
        expect(teamActivity).toBeDefined();
        expect(teamActivity.recentActivity.commits).toHaveLength(2);
        expect(teamActivity.recentActivity.commits[0].author).toBe("John Doe");
        expect(teamActivity.recentActivity.commits[1].author).toBe("Jane Smith");
      });

      it("should identify related branches", async () => {
        execSync.mockImplementation((cmd) => {
          if (cmd.includes("branch -r")) {
            return "origin/feature/auth\norigin/feature/auth-ui\norigin/feature/test\norigin/fix/auth-bug\n";
          }
          return "";
        });

        const response = new EnhancedResponse({
          success: true,
          message: "Branch created",
          data: { branch: "feature/auth-api" },
        });

        const enhanced = await enhancer.enhance(response, mockContext);

        const teamActivity = enhanced.teamActivity;
        expect(teamActivity.relatedBranches).toBeDefined();
        expect(teamActivity.relatedBranches).toContain("feature/auth");
        expect(teamActivity.relatedBranches).toContain("feature/auth-ui");
      });

      it("should find active pull requests", async () => {
        mockExecGitCommand.mockResolvedValue({
          success: true,
          output: JSON.stringify([
            {
              number: 123,
              title: "Add authentication",
              author: { login: "johndoe" },
              createdAt: new Date().toISOString(),
              state: "open",
            },
            {
              number: 124,
              title: "Fix auth bug",
              author: { login: "janesmith" },
              createdAt: new Date().toISOString(),
              state: "open",
            },
          ]),
        });

        const response = new EnhancedResponse({
          success: true,
          message: "Checking PRs",
        });

        const enhanced = await enhancer.enhance(response, mockContext);

        const teamActivity = enhanced.teamActivity;
        expect(teamActivity.activePRs).toHaveLength(2);
        expect(teamActivity.activePRs[0].number).toBe(123);
      });
    });

    describe("file contributor analysis", () => {
      it("should identify contributors for affected files", async () => {
        execSync.mockImplementation((cmd) => {
          if (cmd.includes("shortlog")) {
            return "    10\tJohn Doe\n     5\tJane Smith\n";
          }
          return "";
        });

        const response = new EnhancedResponse({
          success: true,
          message: "Files modified",
        });
        response.addMetadata("files", ["src/auth.js", "src/utils.js"]);

        const enhanced = await enhancer.enhance(response, mockContext);

        const teamActivity = enhanced.teamActivity;
        expect(teamActivity.fileContributors).toBeDefined();
        expect(teamActivity.fileContributors["src/auth.js"]).toBeDefined();
        expect(teamActivity.potentialReviewers).toContain("John Doe");
      });

      it("should suggest reviewers based on contribution count", async () => {
        execSync
          .mockImplementationOnce((cmd) => {
            if (cmd.includes("shortlog")) {
              return "    20\tExpert Dev\n     2\tJunior Dev\n";
            }
            return "";
          })
          .mockImplementationOnce((cmd) => {
            if (cmd.includes("shortlog")) {
              return "    15\tExpert Dev\n     8\tMid Dev\n";
            }
            return "";
          });

        const response = new EnhancedResponse({
          success: true,
          message: "PR created",
        });
        response.addMetadata("files", ["src/core.js", "src/api.js"]);

        const enhanced = await enhancer.enhance(response, mockContext);

        const teamActivity = enhanced.teamActivity;
        expect(teamActivity.potentialReviewers[0]).toBe("Expert Dev");
        expect(teamActivity.potentialReviewers).toContain("Mid Dev");
      });
    });

    describe("conflict detection", () => {
      it("should detect potential conflicts with other branches", async () => {
        execSync.mockImplementation((cmd) => {
          if (cmd.includes("branch -r")) {
            return "origin/feature/auth\norigin/feature/auth-refactor\n";
          }
          if (cmd.includes("merge-base")) {
            return "base123\n";
          }
          if (cmd.includes("diff --name-only")) {
            return "src/auth.js\nsrc/config.js\n";
          }
          return "";
        });

        const response = new EnhancedResponse({
          success: true,
          message: "Checking conflicts",
        });
        response.addMetadata("files", ["src/auth.js", "src/user.js"]);

        const enhanced = await enhancer.enhance(response, mockContext);

        const teamActivity = enhanced.teamActivity;
        expect(teamActivity.potentialConflicts).toBeDefined();
        expect(teamActivity.potentialConflicts.length).toBeGreaterThan(0);
        expect(teamActivity.potentialConflicts[0].branch).toBe("feature/auth");
        expect(teamActivity.potentialConflicts[0].conflictingFiles).toContain("src/auth.js");
      });
    });

    describe("collaboration insights", () => {
      it("should provide collaboration suggestions", async () => {
        mockGetRecentCommits.mockResolvedValue([
          {
            hash: "abc123",
            author: "John Doe",
            message: "WIP: Auth implementation",
            date: new Date().toISOString(),
          },
        ]);

        execSync.mockImplementation((cmd) => {
          if (cmd.includes("branch -r")) {
            return "origin/feature/auth-ui\norigin/feature/auth-api\n";
          }
          return "";
        });

        const response = new EnhancedResponse({
          success: true,
          message: "Branch created",
          data: { branch: "feature/auth-backend" },
        });

        const enhanced = await enhancer.enhance(response, mockContext);

        const teamActivity = enhanced.teamActivity;
        expect(teamActivity.insights).toBeDefined();
        expect(teamActivity.insights.length).toBeGreaterThan(0);
      });

      it("should detect team working on similar features", async () => {
        mockGetRecentCommits.mockResolvedValue([
          {
            hash: "abc123",
            author: "John Doe",
            message: "Add user authentication",
            date: new Date().toISOString(),
          },
          {
            hash: "def456",
            author: "Jane Smith",
            message: "Implement JWT tokens",
            date: new Date().toISOString(),
          },
        ]);

        const response = new EnhancedResponse({
          success: true,
          message: "Starting work",
          data: { branch: "feature/oauth" },
        });

        const enhanced = await enhancer.enhance(response, mockContext);

        const teamActivity = enhanced.teamActivity;
        expect(teamActivity.relatedWork).toBeDefined();
        expect(teamActivity.relatedWork.length).toBeGreaterThan(0);
      });
    });

    describe("activity summary", () => {
      it("should generate activity summary", async () => {
        mockGetRecentCommits.mockResolvedValue([
          {
            hash: "abc123",
            author: "John Doe",
            message: "Fix bug",
            date: new Date().toISOString(),
          },
          {
            hash: "def456",
            author: "Jane Smith",
            message: "Add feature",
            date: new Date(Date.now() - 86400000).toISOString(), // 1 day ago
          },
        ]);

        const response = new EnhancedResponse({
          success: true,
          message: "Analyzing activity",
        });

        const enhanced = await enhancer.enhance(response, mockContext);

        const teamActivity = enhanced.teamActivity;
        expect(teamActivity.summary).toBeDefined();
        expect(teamActivity.summary.totalCommits).toBe(2);
        expect(teamActivity.summary.uniqueContributors).toBe(2);
        expect(teamActivity.summary.mostActiveContributor).toBeDefined();
      });
    });

    describe("error handling", () => {
      it("should handle git command failures gracefully", async () => {
        mockGetRecentCommits.mockRejectedValue(new Error("Git error"));
        execSync.mockImplementation(() => {
          throw new Error("Command failed");
        });

        const response = new EnhancedResponse({
          success: true,
          message: "Operation completed",
        });

        const enhanced = await enhancer.enhance(response, mockContext);

        expect(enhanced).toBeDefined();
        const teamActivity = enhanced.teamActivity;
        expect(teamActivity).toBeDefined();
        expect(teamActivity.error).toBeUndefined(); // Errors should be handled silently
      });

      it("should handle missing context", async () => {
        const response = new EnhancedResponse({
          success: true,
          message: "Test operation",
        });

        const enhanced = await enhancer.enhance(response, null);

        expect(enhanced).toBeDefined();
        const teamActivity = enhanced.teamActivity;
        expect(teamActivity).toBeDefined();
        expect(teamActivity.limited).toBe(true);
      });
    });

    describe("configuration", () => {
      it("should respect activity window configuration", async () => {
        const configuredEnhancer = new TeamActivityEnhancer({
          activityWindow: 7, // 7 days
        });

        mockGetRecentCommits.mockResolvedValue([]);

        const response = new EnhancedResponse({ success: true });
        await configuredEnhancer.enhance(response, mockContext);

        expect(mockGetRecentCommits).toHaveBeenCalledWith(expect.any(Number));
      });

      it("should disable features based on configuration", async () => {
        const configuredEnhancer = new TeamActivityEnhancer({
          trackCommits: false,
          trackBranches: false,
        });

        const response = new EnhancedResponse({ success: true });
        const enhanced = await configuredEnhancer.enhance(response, mockContext);

        const teamActivity = enhanced.teamActivity;
        expect(teamActivity.recentCommits).toBeUndefined();
        expect(teamActivity.relatedBranches).toBeUndefined();
      });
    });

    describe("caching", () => {
      it("should cache team activity data", async () => {
        mockGetRecentCommits.mockResolvedValue([
          {
            hash: "abc123",
            author: "John Doe",
            message: "Test commit",
            date: new Date().toISOString(),
          },
        ]);

        const response = new EnhancedResponse({ success: true });

        // First call
        await enhancer.enhance(response, mockContext);
        expect(mockGetRecentCommits).toHaveBeenCalledTimes(1);

        // Second call within cache window should use cache
        await enhancer.enhance(response, mockContext);
        expect(mockGetRecentCommits).toHaveBeenCalledTimes(1);
      });

      it("should invalidate cache after timeout", async () => {
        const shortCacheEnhancer = new TeamActivityEnhancer({
          cacheTimeout: 100, // 100ms
        });

        mockGetRecentCommits.mockResolvedValue([]);

        const response = new EnhancedResponse({ success: true });

        await shortCacheEnhancer.enhance(response, mockContext);
        expect(mockGetRecentCommits).toHaveBeenCalledTimes(1);

        // Wait for cache to expire
        await new Promise(resolve => setTimeout(resolve, 150));

        await shortCacheEnhancer.enhance(response, mockContext);
        expect(mockGetRecentCommits).toHaveBeenCalledTimes(2);
      });
    });
  });
});
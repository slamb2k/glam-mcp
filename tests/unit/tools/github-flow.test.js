import { jest } from "@jest/globals";

// Mock dependencies before imports
jest.mock("child_process");
jest.mock("../../../src/utils/git-helpers.js");
jest.mock("../../../src/context/session-manager.js");

describe("GitHub Flow Tools", () => {
  let registerGitHubFlowTools;
  let execSync;
  let gitHelpers;
  let sessionManager;
  let server;
  let registeredTools;

  beforeEach(async () => {
    jest.clearAllMocks();
    
    // Import mocked modules
    const childProcess = await import("child_process");
    execSync = childProcess.execSync;
    
    gitHelpers = await import("../../../src/utils/git-helpers.js");
    
    const sessionModule = await import("../../../src/context/session-manager.js");
    sessionManager = sessionModule.sessionManager;
    
    // Import the function to test
    const githubFlowModule = await import("../../../src/tools/github-flow.js");
    registerGitHubFlowTools = githubFlowModule.registerGitHubFlowTools;
    
    // Mock server
    server = {
      addTool: jest.fn((tool) => {
        registeredTools.push(tool);
      }),
    };
    registeredTools = [];

    // Default mocks
    gitHelpers.isGitRepository.mockReturnValue(true);
    gitHelpers.getCurrentBranch.mockReturnValue("main");
    gitHelpers.hasUncommittedChanges.mockReturnValue(false);
    gitHelpers.getMainBranch.mockReturnValue("main");
    gitHelpers.branchExists.mockReturnValue(false);
    gitHelpers.hasRemoteBranch.mockReturnValue(false);
    gitHelpers.getBranchDivergence.mockReturnValue({ ahead: 0, behind: 0 });
    gitHelpers.isBranchBehind.mockReturnValue({ behind: false, count: 0 });
    gitHelpers.generateBranchName.mockReturnValue("feature/generated-name");
    execSync.mockReturnValue("");
    
    sessionManager.updateGitContext = jest.fn();

    // Register tools
    registerGitHubFlowTools(server);
  });

  describe("github_flow_start", () => {
    let githubFlowStartTool;

    beforeEach(() => {
      githubFlowStartTool = registeredTools.find(t => t.name === "github_flow_start");
    });

    it("should be registered with correct metadata", () => {
      expect(githubFlowStartTool).toBeDefined();
      expect(githubFlowStartTool.description).toContain("Start a new GitHub flow branch");
      expect(githubFlowStartTool.inputSchema.properties).toHaveProperty("branch_name");
      expect(githubFlowStartTool.inputSchema.properties).toHaveProperty("base_branch");
    });

    it("should create new branch from main", async () => {
      const result = await githubFlowStartTool.handler({
        branch_name: "feature/new-feature"
      });

      expect(result.success).toBe(true);
      expect(result.data.branch).toBe("feature/new-feature");
      expect(result.data.created).toBe(true);
      expect(execSync).toHaveBeenCalledWith("git checkout -b feature/new-feature");
      expect(sessionManager.updateGitContext).toHaveBeenCalledWith({
        currentBranch: "feature/new-feature"
      });
    });

    it("should switch to existing branch", async () => {
      gitHelpers.branchExists.mockReturnValue(true);

      const result = await githubFlowStartTool.handler({
        branch_name: "feature/existing"
      });

      expect(result.success).toBe(true);
      expect(result.data.created).toBe(false);
      expect(execSync).toHaveBeenCalledWith("git checkout feature/existing");
    });

    it("should handle uncommitted changes", async () => {
      gitHelpers.hasUncommittedChanges.mockReturnValue(true);

      const result = await githubFlowStartTool.handler({
        branch_name: "feature/new",
        stash_changes: true
      });

      expect(result.success).toBe(true);
      expect(execSync).toHaveBeenCalledWith("git stash");
      expect(result.data.stashed).toBe(true);
    });

    it("should generate branch name if not provided", async () => {
      const result = await githubFlowStartTool.handler({
        description: "Add user authentication"
      });

      expect(result.success).toBe(true);
      expect(result.data.branch).toBe("feature/generated-name");
      expect(gitHelpers.generateBranchName).toHaveBeenCalledWith(
        "Add user authentication",
        "feature"
      );
    });

    it("should update main branch before creating", async () => {
      gitHelpers.isBranchBehind.mockReturnValue({ behind: true, count: 5 });

      const result = await githubFlowStartTool.handler({
        branch_name: "feature/new",
        update_from_remote: true
      });

      expect(result.success).toBe(true);
      expect(execSync).toHaveBeenCalledWith("git pull origin main");
      expect(result.data.main_updated).toBe(true);
    });
  });

  describe("github_flow_pr", () => {
    let githubFlowPRTool;

    beforeEach(() => {
      githubFlowPRTool = registeredTools.find(t => t.name === "github_flow_pr");
    });

    it("should create pull request", async () => {
      gitHelpers.getCurrentBranch.mockReturnValue("feature/my-feature");
      gitHelpers.getBranchDivergence.mockReturnValue({ ahead: 3, behind: 0 });
      execSync.mockImplementation((cmd) => {
        if (cmd.includes("gh pr create")) {
          return "https://github.com/user/repo/pull/123";
        }
        if (cmd.includes("git log")) {
          return "abc123 feat: Add feature\ndef456 fix: Fix bug";
        }
        return "";
      });

      const result = await githubFlowPRTool.handler({
        title: "Add new feature",
        body: "This PR adds a new feature"
      });

      expect(result.success).toBe(true);
      expect(result.data.pr_url).toBe("https://github.com/user/repo/pull/123");
      expect(execSync).toHaveBeenCalledWith(expect.stringContaining("gh pr create"));
    });

    it("should handle draft PRs", async () => {
      gitHelpers.getCurrentBranch.mockReturnValue("feature/draft");
      execSync.mockReturnValue("https://github.com/user/repo/pull/124");

      const result = await githubFlowPRTool.handler({
        title: "WIP: Draft feature",
        draft: true
      });

      expect(result.success).toBe(true);
      expect(execSync).toHaveBeenCalledWith(expect.stringContaining("--draft"));
    });

    it("should check for existing PR", async () => {
      gitHelpers.getCurrentBranch.mockReturnValue("feature/existing");
      execSync.mockImplementation((cmd) => {
        if (cmd.includes("gh pr list")) {
          return JSON.stringify([{
            number: 125,
            url: "https://github.com/user/repo/pull/125",
            title: "Existing PR",
            state: "OPEN"
          }]);
        }
        return "";
      });

      const result = await githubFlowPRTool.handler({
        title: "New title"
      });

      expect(result.success).toBe(true);
      expect(result.data.existing_pr).toBe(true);
      expect(result.data.pr_url).toBe("https://github.com/user/repo/pull/125");
    });

    it("should push branch before creating PR", async () => {
      gitHelpers.hasRemoteBranch.mockReturnValue(false);
      execSync.mockReturnValue("https://github.com/user/repo/pull/126");

      const result = await githubFlowPRTool.handler({
        title: "New PR"
      });

      expect(result.success).toBe(true);
      expect(execSync).toHaveBeenCalledWith(expect.stringContaining("git push"));
    });
  });

  describe("github_flow_merge", () => {
    let githubFlowMergeTool;

    beforeEach(() => {
      githubFlowMergeTool = registeredTools.find(t => t.name === "github_flow_merge");
    });

    it("should merge pull request", async () => {
      execSync.mockImplementation((cmd) => {
        if (cmd.includes("gh pr view")) {
          return JSON.stringify({
            number: 123,
            state: "OPEN",
            mergeable: true,
            statusCheckRollup: [{ state: "SUCCESS" }]
          });
        }
        if (cmd.includes("gh pr merge")) {
          return "✓ Merged pull request #123";
        }
        return "";
      });

      const result = await githubFlowMergeTool.handler({
        pr_number: 123,
        merge_method: "squash"
      });

      expect(result.success).toBe(true);
      expect(result.data.merged).toBe(true);
      expect(execSync).toHaveBeenCalledWith(expect.stringContaining("--squash"));
    });

    it("should delete branch after merge", async () => {
      execSync.mockImplementation((cmd) => {
        if (cmd.includes("gh pr view")) {
          return JSON.stringify({
            number: 123,
            state: "OPEN",
            mergeable: true,
            headRefName: "feature/to-delete"
          });
        }
        return "";
      });

      const result = await githubFlowMergeTool.handler({
        pr_number: 123,
        delete_branch: true
      });

      expect(result.success).toBe(true);
      expect(execSync).toHaveBeenCalledWith(expect.stringContaining("--delete-branch"));
    });

    it("should handle merge conflicts", async () => {
      execSync.mockImplementation((cmd) => {
        if (cmd.includes("gh pr view")) {
          return JSON.stringify({
            number: 123,
            state: "OPEN",
            mergeable: false,
            mergeStateStatus: "CONFLICTING"
          });
        }
        return "";
      });

      const result = await githubFlowMergeTool.handler({
        pr_number: 123
      });

      expect(result.success).toBe(false);
      expect(result.message).toContain("conflicts");
    });
  });

  describe("github_flow_review", () => {
    let githubFlowReviewTool;

    beforeEach(() => {
      githubFlowReviewTool = registeredTools.find(t => t.name === "github_flow_review");
    });

    it("should add PR review", async () => {
      execSync.mockReturnValue("");

      const result = await githubFlowReviewTool.handler({
        pr_number: 123,
        review_type: "APPROVE",
        comment: "Looks good!"
      });

      expect(result.success).toBe(true);
      expect(execSync).toHaveBeenCalledWith(
        expect.stringContaining("gh pr review 123 --approve")
      );
    });

    it("should request changes", async () => {
      const result = await githubFlowReviewTool.handler({
        pr_number: 124,
        review_type: "REQUEST_CHANGES",
        comment: "Please fix the tests"
      });

      expect(result.success).toBe(true);
      expect(execSync).toHaveBeenCalledWith(
        expect.stringContaining("--request-changes")
      );
    });
  });

  describe("github_flow_status", () => {
    let githubFlowStatusTool;

    beforeEach(() => {
      githubFlowStatusTool = registeredTools.find(t => t.name === "github_flow_status");
    });

    it("should get current branch status", async () => {
      gitHelpers.getCurrentBranch.mockReturnValue("feature/current");
      gitHelpers.getBranchDivergence.mockReturnValue({ ahead: 2, behind: 1 });
      gitHelpers.hasUncommittedChanges.mockReturnValue(true);
      execSync.mockImplementation((cmd) => {
        if (cmd.includes("gh pr list")) {
          return JSON.stringify([{
            number: 125,
            state: "OPEN",
            title: "Current PR"
          }]);
        }
        if (cmd.includes("gh pr checks")) {
          return "All checks passed";
        }
        if (cmd.includes("git diff --stat")) {
          return "3 files changed, 50 insertions(+), 10 deletions(-)";
        }
        return "";
      });

      const result = await githubFlowStatusTool.handler({});

      expect(result.success).toBe(true);
      expect(result.data.current_branch).toBe("feature/current");
      expect(result.data.has_uncommitted_changes).toBe(true);
      expect(result.data.divergence.ahead).toBe(2);
      expect(result.data.pr).toBeDefined();
      expect(result.data.pr.number).toBe(125);
    });

    it("should handle no PR scenario", async () => {
      execSync.mockImplementation((cmd) => {
        if (cmd.includes("gh pr list")) {
          return "[]";
        }
        return "";
      });

      const result = await githubFlowStatusTool.handler({});

      expect(result.success).toBe(true);
      expect(result.data.pr).toBeNull();
    });
  });

  describe("github_flow_update", () => {
    let githubFlowUpdateTool;

    beforeEach(() => {
      githubFlowUpdateTool = registeredTools.find(t => t.name === "github_flow_update");
    });

    it("should update branch from main", async () => {
      gitHelpers.getCurrentBranch.mockReturnValue("feature/update");
      gitHelpers.isBranchBehind.mockReturnValue({ behind: true, count: 3 });

      const result = await githubFlowUpdateTool.handler({
        strategy: "rebase"
      });

      expect(result.success).toBe(true);
      expect(result.data.updated).toBe(true);
      expect(result.data.commits_behind).toBe(3);
      expect(execSync).toHaveBeenCalledWith("git pull --rebase origin main");
    });

    it("should handle merge strategy", async () => {
      gitHelpers.isBranchBehind.mockReturnValue({ behind: true, count: 2 });

      const result = await githubFlowUpdateTool.handler({
        strategy: "merge"
      });

      expect(result.success).toBe(true);
      expect(execSync).toHaveBeenCalledWith("git pull origin main");
    });

    it("should skip when up to date", async () => {
      gitHelpers.isBranchBehind.mockReturnValue({ behind: false, count: 0 });

      const result = await githubFlowUpdateTool.handler({});

      expect(result.success).toBe(true);
      expect(result.data.updated).toBe(false);
      expect(result.message).toContain("up to date");
    });
  });

  describe("github_issue_create", () => {
    let githubIssueCreateTool;

    beforeEach(() => {
      githubIssueCreateTool = registeredTools.find(t => t.name === "github_issue_create");
    });

    it("should create GitHub issue", async () => {
      execSync.mockReturnValue("https://github.com/user/repo/issues/10");

      const result = await githubIssueCreateTool.handler({
        title: "Bug: Application crashes",
        body: "The application crashes when...",
        labels: ["bug", "high-priority"]
      });

      expect(result.success).toBe(true);
      expect(result.data.issue_url).toBe("https://github.com/user/repo/issues/10");
      expect(execSync).toHaveBeenCalledWith(
        expect.stringContaining("--label bug --label high-priority")
      );
    });

    it("should assign issue", async () => {
      execSync.mockReturnValue("https://github.com/user/repo/issues/11");

      const result = await githubIssueCreateTool.handler({
        title: "Feature request",
        assignees: ["john", "jane"]
      });

      expect(result.success).toBe(true);
      expect(execSync).toHaveBeenCalledWith(
        expect.stringContaining("--assignee john --assignee jane")
      );
    });
  });

  describe("github_issue_link", () => {
    let githubIssueLinkTool;

    beforeEach(() => {
      githubIssueLinkTool = registeredTools.find(t => t.name === "github_issue_link");
    });

    it("should link issue to PR", async () => {
      execSync.mockImplementation((cmd) => {
        if (cmd.includes("gh pr view")) {
          return JSON.stringify({
            number: 123,
            body: "Original PR body"
          });
        }
        return "";
      });

      const result = await githubIssueLinkTool.handler({
        pr_number: 123,
        issue_number: 10
      });

      expect(result.success).toBe(true);
      expect(execSync).toHaveBeenCalledWith(
        expect.stringContaining("Closes #10")
      );
    });

    it("should link to current branch PR", async () => {
      execSync.mockImplementation((cmd) => {
        if (cmd.includes("gh pr list")) {
          return JSON.stringify([{
            number: 124,
            headRefName: "feature/current"
          }]);
        }
        if (cmd.includes("gh pr view")) {
          return JSON.stringify({
            number: 124,
            body: "PR body"
          });
        }
        return "";
      });

      const result = await githubIssueLinkTool.handler({
        issue_number: 11
      });

      expect(result.success).toBe(true);
      expect(result.data.pr_number).toBe(124);
    });
  });
});
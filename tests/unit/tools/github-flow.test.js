import { jest } from "@jest/globals";

// Mock child_process
const mockExecSync = jest.fn();
jest.unstable_mockModule("child_process", () => ({
  execSync: mockExecSync,
}));

// Mock git-helpers
const mockIsGitRepository = jest.fn();
const mockGetCurrentBranch = jest.fn();
const mockHasUncommittedChanges = jest.fn();
const mockGetMainBranch = jest.fn();
const mockBranchExists = jest.fn();
const mockHasRemoteBranch = jest.fn();
const mockGetBranchDivergence = jest.fn();
const mockIsBranchBehind = jest.fn();
const mockGenerateBranchName = jest.fn();
const mockExecGitCommand = jest.fn();

jest.unstable_mockModule("../../../src/utils/git-helpers.js", () => ({
  isGitRepository: mockIsGitRepository,
  getCurrentBranch: mockGetCurrentBranch,
  hasUncommittedChanges: mockHasUncommittedChanges,
  getMainBranch: mockGetMainBranch,
  branchExists: mockBranchExists,
  hasRemoteBranch: mockHasRemoteBranch,
  getBranchDivergence: mockGetBranchDivergence,
  isBranchBehind: mockIsBranchBehind,
  generateBranchName: mockGenerateBranchName,
  execGitCommand: mockExecGitCommand,
}));

// Mock session manager
const mockUpdateGitContext = jest.fn();
jest.unstable_mockModule("../../../src/context/session-manager.js", () => ({
  sessionManager: {
    updateGitContext: mockUpdateGitContext,
  },
}));

// Import after mocking
const { registerGitHubFlowTools } = await import("../../../src/tools/github-flow.js");

describe("GitHub Flow Tools", () => {
  let server;
  let registeredTools;

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock server
    server = {
      addTool: jest.fn((tool) => {
        registeredTools.push(tool);
      }),
    };
    registeredTools = [];

    // Default mocks
    mockIsGitRepository.mockReturnValue(true);
    mockGetCurrentBranch.mockReturnValue("main");
    mockHasUncommittedChanges.mockReturnValue(false);
    mockGetMainBranch.mockReturnValue("main");
    mockBranchExists.mockReturnValue(false);
    mockHasRemoteBranch.mockReturnValue(false);
    mockGetBranchDivergence.mockReturnValue({ ahead: 0, behind: 0 });
    mockIsBranchBehind.mockReturnValue({ behind: false, count: 0 });
    mockGenerateBranchName.mockReturnValue("feature/generated-name");
    mockExecSync.mockReturnValue("");
    mockExecGitCommand.mockReturnValue("");

    // Register tools
    registerGitHubFlowTools(server);
  });

  describe("github_flow_start", () => {
    let githubFlowStart;

    beforeEach(() => {
      githubFlowStart = registeredTools.find(t => t.name === "github_flow_start");
    });

    it("should be registered with correct metadata", () => {
      expect(githubFlowStart).toBeDefined();
      expect(githubFlowStart.description).toContain("Start a new feature branch");
      expect(githubFlowStart.inputSchema.properties).toHaveProperty("feature_name");
    });

    it("should create new branch from main", async () => {
      const result = await githubFlowStart.handler({
        feature_name: "new-feature",
      });

      expect(result.success).toBe(true);
      expect(mockExecSync).toHaveBeenCalledWith(expect.stringContaining("git checkout -b"));
      expect(result.data.branch).toContain("new-feature");
    });

    it("should switch to existing branch", async () => {
      mockBranchExists.mockReturnValue(true);

      const result = await githubFlowStart.handler({
        feature_name: "existing-feature",
      });

      expect(result.success).toBe(true);
      expect(mockExecSync).toHaveBeenCalledWith(expect.stringContaining("git checkout"));
      expect(mockExecSync).not.toHaveBeenCalledWith(expect.stringContaining("-b"));
    });

    it("should handle uncommitted changes", async () => {
      mockHasUncommittedChanges.mockReturnValue(true);

      const result = await githubFlowStart.handler({
        feature_name: "new-feature",
      });

      expect(result.success).toBe(false);
      expect(result.message).toContain("uncommitted changes");
    });

    it("should generate branch name if not provided", async () => {
      const result = await githubFlowStart.handler({});

      expect(mockGenerateBranchName).toHaveBeenCalled();
      expect(result.success).toBe(true);
      expect(result.data.branch).toBe("feature/generated-name");
    });

    it("should update main branch before creating", async () => {
      mockGetCurrentBranch.mockReturnValue("main");

      const result = await githubFlowStart.handler({
        feature_name: "new-feature",
        update_main: true,
      });

      expect(mockExecSync).toHaveBeenCalledWith(expect.stringContaining("git pull"));
      expect(result.success).toBe(true);
    });
  });

  describe("github_flow_pr", () => {
    let githubFlowPr;

    beforeEach(() => {
      githubFlowPr = registeredTools.find(t => t.name === "github_flow_create_pr");
    });

    it("should create pull request", async () => {
      mockGetCurrentBranch.mockReturnValue("feature/test");
      mockExecSync.mockReturnValue("https://github.com/user/repo/pull/123");

      const result = await githubFlowPr.handler({
        title: "Test PR",
        body: "Test description",
      });

      expect(result.success).toBe(true);
      expect(mockExecSync).toHaveBeenCalledWith(expect.stringContaining("gh pr create"));
      expect(result.data.pr_url).toContain("pull/123");
    });

    it("should handle draft PRs", async () => {
      mockGetCurrentBranch.mockReturnValue("feature/test");

      const result = await githubFlowPr.handler({
        title: "Draft PR",
        draft: true,
      });

      expect(mockExecSync).toHaveBeenCalledWith(expect.stringContaining("--draft"));
    });

    it("should check for existing PR", async () => {
      mockGetCurrentBranch.mockReturnValue("feature/test");
      mockExecSync
        .mockReturnValueOnce("123") // gh pr list returns PR number
        .mockReturnValueOnce("https://github.com/user/repo/pull/123");

      const result = await githubFlowPr.handler({
        title: "Test PR",
      });

      expect(result.success).toBe(true);
      expect(result.message).toContain("already exists");
    });

    it("should push branch before creating PR", async () => {
      mockGetCurrentBranch.mockReturnValue("feature/test");
      mockHasRemoteBranch.mockReturnValue(false);
      mockGetBranchDivergence.mockReturnValue({ ahead: 2, behind: 0 });

      await githubFlowPr.handler({
        title: "Test PR",
      });

      expect(mockExecSync).toHaveBeenCalledWith(expect.stringContaining("git push"));
    });
  });

  describe("github_flow_merge", () => {
    let githubFlowMerge;

    beforeEach(() => {
      githubFlowMerge = registeredTools.find(t => t.name === "github_flow_merge");
    });

    it("should merge pull request", async () => {
      mockGetCurrentBranch.mockReturnValue("feature/test");
      mockExecSync
        .mockReturnValueOnce("123") // PR number
        .mockReturnValueOnce(""); // merge command

      const result = await githubFlowMerge.handler({});

      expect(result.success).toBe(true);
      expect(mockExecSync).toHaveBeenCalledWith(expect.stringContaining("gh pr merge"));
    });

    it("should delete branch after merge", async () => {
      mockGetCurrentBranch.mockReturnValue("feature/test");
      mockExecSync.mockReturnValue("");

      const result = await githubFlowMerge.handler({
        delete_branch: true,
      });

      expect(mockExecSync).toHaveBeenCalledWith(expect.stringContaining("--delete-branch"));
    });

    it("should handle merge conflicts", async () => {
      mockGetCurrentBranch.mockReturnValue("feature/test");
      mockExecSync.mockImplementation(() => {
        throw new Error("merge conflict");
      });

      const result = await githubFlowMerge.handler({});

      expect(result.success).toBe(false);
      expect(result.message).toContain("merge conflict");
    });
  });

  describe("github_flow_review", () => {
    let githubFlowReview;

    beforeEach(() => {
      githubFlowReview = registeredTools.find(t => t.name === "github_flow_review");
    });

    it("should add PR review", async () => {
      const result = await githubFlowReview.handler({
        pr_number: "123",
        action: "approve",
        comment: "LGTM",
      });

      expect(result.success).toBe(true);
      expect(mockExecSync).toHaveBeenCalledWith(expect.stringContaining("gh pr review"));
      expect(mockExecSync).toHaveBeenCalledWith(expect.stringContaining("--approve"));
    });

    it("should request changes", async () => {
      const result = await githubFlowReview.handler({
        pr_number: "123",
        action: "request-changes",
        comment: "Please fix",
      });

      expect(mockExecSync).toHaveBeenCalledWith(expect.stringContaining("--request-changes"));
    });
  });

  describe("github_flow_status", () => {
    let githubFlowStatus;

    beforeEach(() => {
      githubFlowStatus = registeredTools.find(t => t.name === "github_flow_status");
    });

    it("should get current branch status", async () => {
      mockGetCurrentBranch.mockReturnValue("feature/test");
      mockGetBranchDivergence.mockReturnValue({ ahead: 2, behind: 1 });
      mockExecSync.mockReturnValue("123");

      const result = await githubFlowStatus.handler({});

      expect(result.success).toBe(true);
      expect(result.data.branch).toBe("feature/test");
      expect(result.data.ahead).toBe(2);
      expect(result.data.behind).toBe(1);
    });

    it("should handle no PR scenario", async () => {
      mockGetCurrentBranch.mockReturnValue("feature/test");
      mockExecSync.mockReturnValue("");

      const result = await githubFlowStatus.handler({});

      expect(result.success).toBe(true);
      expect(result.data.pr_number).toBeNull();
    });
  });

  describe("github_flow_update", () => {
    let githubFlowUpdate;

    beforeEach(() => {
      githubFlowUpdate = registeredTools.find(t => t.name === "github_flow_update");
    });

    it("should update branch from main", async () => {
      mockGetCurrentBranch.mockReturnValue("feature/test");
      mockIsBranchBehind.mockReturnValue({ behind: true, count: 3 });

      const result = await githubFlowUpdate.handler({});

      expect(result.success).toBe(true);
      expect(mockExecSync).toHaveBeenCalledWith(expect.stringContaining("git pull"));
    });

    it("should handle merge strategy", async () => {
      mockGetCurrentBranch.mockReturnValue("feature/test");
      mockIsBranchBehind.mockReturnValue({ behind: true, count: 1 });

      const result = await githubFlowUpdate.handler({
        strategy: "rebase",
      });

      expect(mockExecSync).toHaveBeenCalledWith(expect.stringContaining("git rebase"));
    });

    it("should skip when up to date", async () => {
      mockGetCurrentBranch.mockReturnValue("feature/test");
      mockIsBranchBehind.mockReturnValue({ behind: false, count: 0 });

      const result = await githubFlowUpdate.handler({});

      expect(result.success).toBe(true);
      expect(result.message).toContain("up to date");
    });
  });

  describe("github_issue_create", () => {
    let githubIssueCreate;

    beforeEach(() => {
      githubIssueCreate = registeredTools.find(t => t.name === "github_issue_create");
    });

    it("should create GitHub issue", async () => {
      mockExecSync.mockReturnValue("https://github.com/user/repo/issues/456");

      const result = await githubIssueCreate.handler({
        title: "Bug report",
        body: "Description",
        labels: ["bug", "urgent"],
      });

      expect(result.success).toBe(true);
      expect(mockExecSync).toHaveBeenCalledWith(expect.stringContaining("gh issue create"));
      expect(result.data.issue_url).toContain("issues/456");
    });

    it("should assign issue", async () => {
      const result = await githubIssueCreate.handler({
        title: "Task",
        assignees: ["user1", "user2"],
      });

      expect(mockExecSync).toHaveBeenCalledWith(expect.stringContaining("--assignee"));
    });
  });

  describe("github_issue_link", () => {
    let githubIssueLink;

    beforeEach(() => {
      githubIssueLink = registeredTools.find(t => t.name === "github_issue_link");
    });

    it("should link issue to PR", async () => {
      const result = await githubIssueLink.handler({
        pr_number: "123",
        issue_number: "456",
      });

      expect(result.success).toBe(true);
      expect(mockExecSync).toHaveBeenCalledWith(expect.stringContaining("gh pr edit"));
    });

    it("should link to current branch PR", async () => {
      mockGetCurrentBranch.mockReturnValue("feature/test");
      mockExecSync.mockReturnValue("123");

      const result = await githubIssueLink.handler({
        issue_number: "456",
      });

      expect(result.success).toBe(true);
      expect(mockExecSync).toHaveBeenCalledWith(expect.stringContaining("gh pr edit 123"));
    });
  });
});
import { jest } from "@jest/globals";

// Mock child_process
const mockExecSync = jest.fn();
jest.unstable_mockModule("child_process", () => ({
  execSync: mockExecSync,
}));

// Mock fs
const mockExistsSync = jest.fn();
const mockReadFileSync = jest.fn();
jest.unstable_mockModule("fs", () => ({
  default: {
    existsSync: mockExistsSync,
    readFileSync: mockReadFileSync,
  },
}));

// Mock git-helpers
const mockIsGitRepository = jest.fn();
const mockGetMainBranch = jest.fn();
const mockGetCurrentBranch = jest.fn();
const mockHasUncommittedChanges = jest.fn();
const mockGetChangedFiles = jest.fn();
const mockHasScript = jest.fn();
const mockGenerateBranchName = jest.fn();
const mockExecGitCommand = jest.fn();
const mockGetBranchDivergence = jest.fn();
const mockSafeRebase = jest.fn();
const mockIsBranchMerged = jest.fn();
const mockHasRemoteBranch = jest.fn();
const mockForceRebaseOnMain = jest.fn();
const mockEnsureMainUpdated = jest.fn();

jest.unstable_mockModule("../../../src/utils/git-helpers.js", () => ({
  isGitRepository: mockIsGitRepository,
  getMainBranch: mockGetMainBranch,
  getCurrentBranch: mockGetCurrentBranch,
  hasUncommittedChanges: mockHasUncommittedChanges,
  getChangedFiles: mockGetChangedFiles,
  hasScript: mockHasScript,
  generateBranchName: mockGenerateBranchName,
  execGitCommand: mockExecGitCommand,
  getBranchDivergence: mockGetBranchDivergence,
  safeRebase: mockSafeRebase,
  isBranchMerged: mockIsBranchMerged,
  hasRemoteBranch: mockHasRemoteBranch,
  forceRebaseOnMain: mockForceRebaseOnMain,
  ensureMainUpdated: mockEnsureMainUpdated,
}));

// Mock responses
jest.unstable_mockModule("../../../src/utils/responses.js", () => ({
  createSuccessResponse: jest.fn((msg, data) => ({ success: true, message: msg, data })),
  createErrorResponse: jest.fn((msg) => ({ success: false, message: msg })),
}));

// Mock utilities
const mockCreateNpmPackage = jest.fn();
jest.unstable_mockModule("../../../src/tools/utilities.js", () => ({
  createNpmPackage: mockCreateNpmPackage,
}));

// Mock config
const mockGetConfig = jest.fn();
jest.unstable_mockModule("../../../src/core/config.js", () => ({
  getConfig: mockGetConfig,
}));

// Import after mocking
const { registerAutomationTools } = await import("../../../src/tools/automation.js");

describe("Automation Tools", () => {
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
    mockGetMainBranch.mockReturnValue("main");
    mockGetCurrentBranch.mockReturnValue("main");
    mockHasUncommittedChanges.mockReturnValue(false);
    mockGetChangedFiles.mockReturnValue([]);
    mockHasScript.mockReturnValue(true);
    mockGenerateBranchName.mockReturnValue("feature/generated");
    mockExecSync.mockReturnValue("");
    mockExecGitCommand.mockReturnValue("");
    mockGetBranchDivergence.mockReturnValue({ ahead: 0, behind: 0 });
    mockSafeRebase.mockReturnValue({ success: true });
    mockIsBranchMerged.mockReturnValue(false);
    mockHasRemoteBranch.mockReturnValue(false);
    mockForceRebaseOnMain.mockReturnValue({ success: true });
    mockEnsureMainUpdated.mockReturnValue({ success: true });
    mockGetConfig.mockReturnValue({ defaultToolOptions: {} });
    mockExistsSync.mockReturnValue(true);
    mockReadFileSync.mockReturnValue(JSON.stringify({ scripts: { test: "jest", lint: "eslint" } }));

    // Register tools
    registerAutomationTools(server);
  });

  describe("auto_commit", () => {
    let autoCommit;

    beforeEach(() => {
      autoCommit = registeredTools.find(t => t.name === "auto_commit");
    });

    it("should be registered with correct metadata", () => {
      expect(autoCommit).toBeDefined();
      expect(autoCommit.description).toContain("Complete automation");
      expect(autoCommit.inputSchema.properties).toHaveProperty("message");
      expect(autoCommit.inputSchema.properties).toHaveProperty("branch_name");
    });

    it("should handle full automation workflow", async () => {
      mockGetChangedFiles.mockReturnValue(["file1.js", "file2.js"]);
      mockExecSync.mockReturnValue("https://github.com/user/repo/pull/123");

      const result = await autoCommit.handler({
        message: "Add awesome feature",
      });

      expect(result.success).toBe(true);
      expect(mockGenerateBranchName).toHaveBeenCalledWith("Add awesome feature", "feature/");
      expect(mockExecSync).toHaveBeenCalledWith(expect.stringContaining("git checkout -b"));
      expect(mockExecSync).toHaveBeenCalledWith(expect.stringContaining("git add"));
      expect(mockExecSync).toHaveBeenCalledWith(expect.stringContaining("git commit"));
      expect(result.data.pr_url).toContain("pull/123");
    });

    it("should handle uncommitted changes", async () => {
      mockHasUncommittedChanges.mockReturnValue(true);

      const result = await autoCommit.handler({
        message: "new feature",
      });

      expect(result.success).toBe(false);
      expect(result.message).toContain("uncommitted changes");
    });

    it("should skip optional steps", async () => {
      const result = await autoCommit.handler({
        message: "simple feature",
        run_format: false,
        run_lint: false,
      });

      expect(result.success).toBe(true);
      expect(mockExecSync).not.toHaveBeenCalledWith(expect.stringContaining("npm run format"));
      expect(mockExecSync).not.toHaveBeenCalledWith(expect.stringContaining("npm run lint"));
    });
  });

  describe("quick_commit", () => {
    let quickCommit;

    beforeEach(() => {
      quickCommit = registeredTools.find(t => t.name === "quick_commit");
    });

    it("should commit all changes quickly", async () => {
      mockGetChangedFiles.mockReturnValue(["file1.js", "file2.js"]);

      const result = await quickCommit.handler({
        message: "Quick fix",
      });

      expect(result.success).toBe(true);
      expect(mockExecSync).toHaveBeenCalledWith(expect.stringContaining("git add ."));
      expect(mockExecSync).toHaveBeenCalledWith(expect.stringContaining("git commit"));
      expect(result.data.files_committed).toBe(2);
    });

    it("should generate commit message if not provided", async () => {
      mockGetChangedFiles.mockReturnValue(["index.js"]);

      const result = await quickCommit.handler({});

      expect(result.success).toBe(true);
      expect(mockExecSync).toHaveBeenCalledWith(
        expect.stringContaining("Auto-commit:")
      );
    });
  });

  describe("smart_commit", () => {
    let smartCommit;

    beforeEach(() => {
      smartCommit = registeredTools.find(t => t.name === "smart_commit");
    });

    it("should analyze changes and create smart commit", async () => {
      mockGetChangedFiles.mockReturnValue(["src/feature.js", "tests/feature.test.js"]);
      mockExecSync.mockImplementation((cmd) => {
        if (cmd.includes("git diff")) {
          return "+function newFeature() {}\n+test('newFeature')";
        }
        return "";
      });

      const result = await smartCommit.handler({});

      expect(result.success).toBe(true);
      expect(result.data.message).toContain("feat:");
      expect(mockExecSync).toHaveBeenCalledWith(expect.stringContaining("git commit"));
    });

    it("should push if requested", async () => {
      mockGetChangedFiles.mockReturnValue(["file.js"]);

      const result = await smartCommit.handler({
        push: true,
      });

      expect(result.success).toBe(true);
      expect(mockExecSync).toHaveBeenCalledWith(expect.stringContaining("git push"));
    });
  });

  describe("auto_pr", () => {
    let autoPr;

    beforeEach(() => {
      autoPr = registeredTools.find(t => t.name === "auto_pr");
    });

    it("should create PR with generated content", async () => {
      mockGetCurrentBranch.mockReturnValue("feature/awesome");
      mockGetChangedFiles.mockReturnValue(["src/feature.js"]);
      mockExecSync.mockReturnValue("https://github.com/user/repo/pull/456");

      const result = await autoPr.handler({});

      expect(result.success).toBe(true);
      expect(mockExecSync).toHaveBeenCalledWith(expect.stringContaining("gh pr create"));
      expect(result.data.pr_url).toContain("pull/456");
    });

    it("should use custom title and body", async () => {
      mockGetCurrentBranch.mockReturnValue("feature/custom");

      const result = await autoPr.handler({
        title: "Custom PR",
        body: "Custom description",
      });

      expect(result.success).toBe(true);
      expect(mockExecSync).toHaveBeenCalledWith(
        expect.stringContaining("Custom PR")
      );
    });
  });

  describe("sync_main", () => {
    let syncMain;

    beforeEach(() => {
      syncMain = registeredTools.find(t => t.name === "sync_main");
    });

    it("should sync with main branch", async () => {
      mockGetCurrentBranch.mockReturnValue("feature/branch");
      mockGetBranchDivergence.mockReturnValue({ ahead: 2, behind: 3 });

      const result = await syncMain.handler({});

      expect(result.success).toBe(true);
      expect(mockEnsureMainUpdated).toHaveBeenCalled();
      expect(mockExecSync).toHaveBeenCalledWith(expect.stringContaining("git merge"));
    });

    it("should use rebase strategy if requested", async () => {
      mockGetCurrentBranch.mockReturnValue("feature/branch");

      const result = await syncMain.handler({
        strategy: "rebase",
      });

      expect(result.success).toBe(true);
      expect(mockSafeRebase).toHaveBeenCalled();
    });
  });

  describe("full_release", () => {
    let fullRelease;

    beforeEach(() => {
      fullRelease = registeredTools.find(t => t.name === "full_release");
    });

    it("should handle full release workflow", async () => {
      mockReadFileSync.mockImplementation((path) => {
        if (path.includes("package.json")) {
          return JSON.stringify({ version: "1.0.0", name: "test-package" });
        }
        return "";
      });

      const result = await fullRelease.handler({
        version: "1.1.0",
        tag: true,
      });

      expect(result.success).toBe(true);
      expect(mockExecSync).toHaveBeenCalledWith(expect.stringContaining("npm version"));
      expect(mockExecSync).toHaveBeenCalledWith(expect.stringContaining("git tag"));
      expect(result.data.version).toBe("1.1.0");
    });

    it("should handle npm publish", async () => {
      const result = await fullRelease.handler({
        version: "2.0.0",
        npm_publish: true,
      });

      expect(result.success).toBe(true);
      expect(mockExecSync).toHaveBeenCalledWith(expect.stringContaining("npm publish"));
    });
  });

  describe("create_package", () => {
    let createPackage;

    beforeEach(() => {
      createPackage = registeredTools.find(t => t.name === "create_package");
    });

    it("should create npm package", async () => {
      mockCreateNpmPackage.mockResolvedValue({
        success: true,
        data: { path: "./my-package" },
      });

      const result = await createPackage.handler({
        name: "my-package",
        description: "My awesome package",
      });

      expect(result.success).toBe(true);
      expect(mockCreateNpmPackage).toHaveBeenCalledWith(
        expect.objectContaining({
          name: "my-package",
          description: "My awesome package",
        })
      );
    });
  });

  describe("run_tests", () => {
    let runTests;

    beforeEach(() => {
      runTests = registeredTools.find(t => t.name === "run_tests");
    });

    it("should run tests with coverage", async () => {
      mockExecSync.mockReturnValue("All tests passed!\nCoverage: 95%");

      const result = await runTests.handler({
        coverage: true,
      });

      expect(result.success).toBe(true);
      expect(mockExecSync).toHaveBeenCalledWith(expect.stringContaining("--coverage"));
      expect(result.data.output).toContain("Coverage: 95%");
    });

    it("should run tests in watch mode", async () => {
      const result = await runTests.handler({
        watch: true,
      });

      expect(result.success).toBe(true);
      expect(mockExecSync).toHaveBeenCalledWith(expect.stringContaining("--watch"));
    });
  });

  describe("sync_branch", () => {
    let syncBranch;

    beforeEach(() => {
      syncBranch = registeredTools.find(t => t.name === "sync_branch");
    });

    it("should be registered with correct metadata", () => {
      expect(syncBranch).toBeDefined();
      expect(syncBranch.description).toContain("Sync branch");
      expect(syncBranch.inputSchema.properties).toHaveProperty("branch");
      expect(syncBranch.inputSchema.properties).toHaveProperty("strategy");
    });

    it("should sync with upstream branch", async () => {
      const result = await syncBranch.handler({
        branch: "upstream/main",
        strategy: "merge"
      });

      expect(result.success).toBe(true);
      expect(mockExecSync).toHaveBeenCalledWith(expect.stringContaining("git fetch"));
      expect(mockExecSync).toHaveBeenCalledWith(expect.stringContaining("git merge upstream/main"));
    });

    it("should use rebase strategy when specified", async () => {
      const result = await syncBranch.handler({
        branch: "origin/develop",
        strategy: "rebase"
      });

      expect(result.success).toBe(true);
      expect(mockExecSync).toHaveBeenCalledWith(expect.stringContaining("git rebase origin/develop"));
    });
  });

  describe("squash_commits", () => {
    let squashCommits;

    beforeEach(() => {
      squashCommits = registeredTools.find(t => t.name === "squash_commits");
      // Mock git log to return commit count
      mockExecSync.mockImplementation((cmd) => {
        if (cmd.includes("git log --oneline")) {
          return "commit1\ncommit2\ncommit3\ncommit4\ncommit5\ncommit6\ncommit7\ncommit8\ncommit9\ncommit10\n";
        }
        return "";
      });
    });

    it("should be registered with correct metadata", () => {
      expect(squashCommits).toBeDefined();
      expect(squashCommits.description).toContain("Squash commits");
      expect(squashCommits.inputSchema.properties).toHaveProperty("count");
      expect(squashCommits.inputSchema.properties).toHaveProperty("message");
    });

    it("should squash specified number of commits", async () => {
      const result = await squashCommits.handler({
        count: 3,
        message: "Squashed commits"
      });

      expect(result.success).toBe(true);
      expect(mockExecSync).toHaveBeenCalledWith(expect.stringContaining("git reset --soft HEAD~3"));
      expect(mockExecSync).toHaveBeenCalledWith(expect.stringContaining("git commit -m \"Squashed commits\""));
    });

    it("should prevent squashing too many commits", async () => {
      mockExecSync.mockImplementation((cmd) => {
        if (cmd.includes("git log --oneline")) {
          return "commit1\ncommit2\ncommit3\ncommit4\ncommit5\n";
        }
        return "";
      });

      const result = await squashCommits.handler({
        count: 10
      });

      expect(result.success).toBe(false);
      expect(result.message).toContain("only 5 commits");
    });
  });

  describe("undo_commit", () => {
    let undoCommit;

    beforeEach(() => {
      undoCommit = registeredTools.find(t => t.name === "undo_commit");
    });

    it("should be registered with correct metadata", () => {
      expect(undoCommit).toBeDefined();
      expect(undoCommit.description).toContain("Undo");
      expect(undoCommit.inputSchema.properties).toHaveProperty("mode");
      expect(undoCommit.inputSchema.properties).toHaveProperty("count");
    });

    it("should undo last commit with soft reset", async () => {
      const result = await undoCommit.handler({
        mode: "soft"
      });

      expect(result.success).toBe(true);
      expect(mockExecSync).toHaveBeenCalledWith(expect.stringContaining("git reset --soft HEAD~1"));
    });

    it("should undo multiple commits with hard reset", async () => {
      const result = await undoCommit.handler({
        mode: "hard",
        count: 3
      });

      expect(result.success).toBe(true);
      expect(mockExecSync).toHaveBeenCalledWith(expect.stringContaining("git reset --hard HEAD~3"));
    });
  });

  describe("batch_commit", () => {
    let batchCommit;

    beforeEach(() => {
      batchCommit = registeredTools.find(t => t.name === "batch_commit");
    });

    it("should be registered with correct metadata", () => {
      expect(batchCommit).toBeDefined();
      expect(batchCommit.description).toContain("Create multiple commits");
      expect(batchCommit.inputSchema.properties).toHaveProperty("commits");
    });

    it("should create multiple commits from batch", async () => {
      const commits = [
        { files: ["file1.js"], message: "Add file1" },
        { files: ["file2.js", "file3.js"], message: "Add file2 and file3" }
      ];

      const result = await batchCommit.handler({ commits });

      expect(result.success).toBe(true);
      expect(result.data.commits_created).toBe(2);
      expect(mockExecSync).toHaveBeenCalledWith(expect.stringContaining("git add file1.js"));
      expect(mockExecSync).toHaveBeenCalledWith(expect.stringContaining("git commit -m \"Add file1\""));
      expect(mockExecSync).toHaveBeenCalledWith(expect.stringContaining("git add file2.js file3.js"));
    });

    it("should validate commits array", async () => {
      const result = await batchCommit.handler({ commits: [] });

      expect(result.success).toBe(false);
      expect(result.message).toContain("No commits provided");
    });
  });

  describe("init_project", () => {
    let initProject;

    beforeEach(() => {
      initProject = registeredTools.find(t => t.name === "init_project");
    });

    it("should be registered with correct metadata", () => {
      expect(initProject).toBeDefined();
      expect(initProject.description).toContain("Initialize");
      expect(initProject.inputSchema.properties).toHaveProperty("name");
      expect(initProject.inputSchema.properties).toHaveProperty("type");
    });

    it("should initialize a new project", async () => {
      mockExistsSync.mockReturnValue(false);

      const result = await initProject.handler({
        name: "my-new-project",
        type: "node",
        git: true
      });

      expect(result.success).toBe(true);
      expect(mockExecSync).toHaveBeenCalledWith(expect.stringContaining("mkdir"));
      expect(mockExecSync).toHaveBeenCalledWith(expect.stringContaining("npm init -y"));
      expect(mockExecSync).toHaveBeenCalledWith(expect.stringContaining("git init"));
    });

    it("should handle existing directory", async () => {
      mockExistsSync.mockReturnValue(true);

      const result = await initProject.handler({
        name: "existing-project"
      });

      expect(result.success).toBe(false);
      expect(result.message).toContain("already exists");
    });
  });

  describe("npm_publish", () => {
    let npmPublish;

    beforeEach(() => {
      npmPublish = registeredTools.find(t => t.name === "npm_publish");
    });

    it("should be registered with correct metadata", () => {
      expect(npmPublish).toBeDefined();
      expect(npmPublish.description).toContain("Publish");
      expect(npmPublish.inputSchema.properties).toHaveProperty("version");
      expect(npmPublish.inputSchema.properties).toHaveProperty("tag");
    });

    it("should publish npm package", async () => {
      mockReadFileSync.mockReturnValue(JSON.stringify({ 
        name: "my-package", 
        version: "1.0.0" 
      }));

      const result = await npmPublish.handler({
        version: "1.1.0"
      });

      expect(result.success).toBe(true);
      expect(mockExecSync).toHaveBeenCalledWith(expect.stringContaining("npm version 1.1.0"));
      expect(mockExecSync).toHaveBeenCalledWith(expect.stringContaining("npm publish"));
    });

    it("should handle custom npm tag", async () => {
      const result = await npmPublish.handler({
        tag: "beta"
      });

      expect(result.success).toBe(true);
      expect(mockExecSync).toHaveBeenCalledWith(expect.stringContaining("npm publish --tag beta"));
    });
  });

  describe("create_pr_workflow", () => {
    let createPrWorkflow;

    beforeEach(() => {
      createPrWorkflow = registeredTools.find(t => t.name === "create_pr_workflow");
    });

    it("should be registered with correct metadata", () => {
      expect(createPrWorkflow).toBeDefined();
      expect(createPrWorkflow.description).toContain("GitHub Actions workflow");
      expect(createPrWorkflow.inputSchema.properties).toHaveProperty("name");
      expect(createPrWorkflow.inputSchema.properties).toHaveProperty("node_version");
    });

    it("should create PR workflow file", async () => {
      mockExistsSync.mockReturnValue(false);

      const result = await createPrWorkflow.handler({
        name: "CI",
        node_version: "18"
      });

      expect(result.success).toBe(true);
      expect(mockExecSync).toHaveBeenCalledWith(expect.stringContaining("mkdir -p .github/workflows"));
      expect(mockExecSync).toHaveBeenCalledWith(expect.stringContaining("cat > .github/workflows/pr.yml"));
    });
  });

  describe("create_release_workflow", () => {
    let createReleaseWorkflow;

    beforeEach(() => {
      createReleaseWorkflow = registeredTools.find(t => t.name === "create_release_workflow");
    });

    it("should be registered with correct metadata", () => {
      expect(createReleaseWorkflow).toBeDefined();
      expect(createReleaseWorkflow.description).toContain("release workflow");
      expect(createReleaseWorkflow.inputSchema.properties).toHaveProperty("name");
      expect(createReleaseWorkflow.inputSchema.properties).toHaveProperty("npm_publish");
    });

    it("should create release workflow file", async () => {
      mockExistsSync.mockReturnValue(false);

      const result = await createReleaseWorkflow.handler({
        name: "Release",
        npm_publish: true
      });

      expect(result.success).toBe(true);
      expect(mockExecSync).toHaveBeenCalledWith(expect.stringContaining("cat > .github/workflows/release.yml"));
    });
  });

  describe("analyze_code", () => {
    let analyzeCode;

    beforeEach(() => {
      analyzeCode = registeredTools.find(t => t.name === "analyze_code");
    });

    it("should be registered with correct metadata", () => {
      expect(analyzeCode).toBeDefined();
      expect(analyzeCode.description).toContain("Analyze code");
      expect(analyzeCode.inputSchema.properties).toHaveProperty("path");
      expect(analyzeCode.inputSchema.properties).toHaveProperty("checks");
    });

    it("should run code analysis", async () => {
      mockExecSync.mockImplementation((cmd) => {
        if (cmd.includes("eslint")) {
          return "No linting errors";
        }
        if (cmd.includes("npm audit")) {
          return "0 vulnerabilities";
        }
        return "";
      });

      const result = await analyzeCode.handler({
        checks: ["lint", "security"]
      });

      expect(result.success).toBe(true);
      expect(result.data.results).toHaveProperty("lint");
      expect(result.data.results).toHaveProperty("security");
      expect(mockExecSync).toHaveBeenCalledWith(expect.stringContaining("eslint"));
      expect(mockExecSync).toHaveBeenCalledWith(expect.stringContaining("npm audit"));
    });
  });
});
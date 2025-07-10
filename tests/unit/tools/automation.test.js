import { jest } from "@jest/globals";

// Mock dependencies before imports
jest.mock("child_process");
jest.mock("fs");
jest.mock("../../../src/utils/git-helpers.js");
jest.mock("../../../src/context/session-manager.js");
jest.mock("../../../src/core/config.js");
jest.mock("../../../src/tools/utilities.js");

describe("Automation Tools", () => {
  let registerAutomationTools;
  let execSync;
  let gitHelpers;
  let server;
  let registeredTools;

  beforeEach(async () => {
    jest.clearAllMocks();
    
    // Import mocked modules
    const childProcess = await import("child_process");
    execSync = childProcess.execSync;
    
    gitHelpers = await import("../../../src/utils/git-helpers.js");
    
    // Import the function to test
    const automationModule = await import("../../../src/tools/automation.js");
    registerAutomationTools = automationModule.registerAutomationTools;
    
    // Mock server
    server = {
      addTool: jest.fn((tool) => {
        registeredTools.push(tool);
      }),
    };
    registeredTools = [];

    // Default mocks
    gitHelpers.isGitRepository.mockReturnValue(true);
    gitHelpers.getCurrentBranch.mockReturnValue("feature/test");
    gitHelpers.hasUncommittedChanges.mockReturnValue(false);
    gitHelpers.getMainBranch.mockReturnValue("main");
    gitHelpers.isBranchBehind.mockReturnValue({ behind: false, count: 0 });
    execSync.mockReturnValue("");

    // Register tools
    registerAutomationTools(server);
  });

  describe("auto_commit", () => {
    let autoCommitTool;

    beforeEach(() => {
      autoCommitTool = registeredTools.find(t => t.name === "auto_commit");
    });

    it("should be registered with correct metadata", () => {
      expect(autoCommitTool).toBeDefined();
      expect(autoCommitTool.description).toContain("Complete automation");
      expect(autoCommitTool.inputSchema.properties).toHaveProperty("message");
      expect(autoCommitTool.inputSchema.properties).toHaveProperty("branch_name");
    });

    it("should handle complete workflow with new branch", async () => {
      gitHelpers.hasUncommittedChanges.mockReturnValue(true);
      gitHelpers.branchExists.mockReturnValue(false);
      gitHelpers.getChangedFiles.mockReturnValue([
        { status: "M", file: "src/file.js" },
      ]);
      gitHelpers.generateBranchName.mockReturnValue("feature/auto-123");
      gitHelpers.execGitCommand.mockResolvedValue({ success: true });
      gitHelpers.hasRemoteBranch.mockReturnValue(false);
      execSync.mockImplementation((cmd) => {
        if (cmd.includes("gh pr create")) {
          return "https://github.com/user/repo/pull/123";
        }
        return "";
      });

      const result = await autoCommitTool.handler({
        message: "Add new feature",
      });

      expect(result.success).toBe(true);
      expect(result.data.branch).toBe("feature/auto-123");
      expect(result.data.pr_url).toBe("https://github.com/user/repo/pull/123");
    });

    it("should handle existing branch with uncommitted changes", async () => {
      gitHelpers.hasUncommittedChanges.mockReturnValue(true);
      gitHelpers.branchExists.mockReturnValue(true);
      gitHelpers.getCurrentBranch.mockReturnValue("feature/existing");
      gitHelpers.getChangedFiles.mockReturnValue([
        { status: "M", file: "src/file.js" },
      ]);
      gitHelpers.execGitCommand.mockResolvedValue({ success: true });

      const result = await autoCommitTool.handler({
        message: "Update feature",
        branch_name: "feature/existing",
      });

      expect(result.success).toBe(true);
      expect(result.data.branch).toBe("feature/existing");
    });

    it("should handle push-only workflow", async () => {
      gitHelpers.hasUncommittedChanges.mockReturnValue(false);
      gitHelpers.getCurrentBranch.mockReturnValue("feature/test");
      gitHelpers.hasRemoteBranch.mockReturnValue(false);
      execSync.mockImplementation((cmd) => {
        if (cmd.includes("gh pr create")) {
          return "https://github.com/user/repo/pull/124";
        }
        return "";
      });

      const result = await autoCommitTool.handler({
        pr_title: "Custom PR Title",
      });

      expect(result.success).toBe(true);
      expect(result.data.pr_url).toBe("https://github.com/user/repo/pull/124");
    });
  });

  describe("quick_fix", () => {
    let quickFixTool;

    beforeEach(() => {
      quickFixTool = registeredTools.find(t => t.name === "quick_fix");
    });

    it("should be registered with correct metadata", () => {
      expect(quickFixTool).toBeDefined();
      expect(quickFixTool.description).toContain("Quick fix workflow");
    });

    it("should handle quick fix workflow", async () => {
      gitHelpers.hasUncommittedChanges.mockReturnValue(true);
      gitHelpers.getChangedFiles.mockReturnValue([
        { status: "M", file: "src/bug.js" },
      ]);
      gitHelpers.generateBranchName.mockReturnValue("fix/quick-fix-123");
      gitHelpers.execGitCommand.mockResolvedValue({ success: true });
      execSync.mockImplementation((cmd) => {
        if (cmd.includes("npm test")) {
          return "Tests passed";
        }
        if (cmd.includes("gh pr create")) {
          return "https://github.com/user/repo/pull/125";
        }
        return "";
      });

      const result = await quickFixTool.handler({
        message: "Fix critical bug",
      });

      expect(result.success).toBe(true);
      expect(result.data.branch).toContain("fix/");
      expect(result.data.tests_passed).toBe(true);
    });
  });

  describe("format_and_lint", () => {
    let formatLintTool;

    beforeEach(() => {
      formatLintTool = registeredTools.find(t => t.name === "format_and_lint");
    });

    it("should format and lint code", async () => {
      gitHelpers.hasScript.mockImplementation((script) => {
        return script === "format" || script === "lint";
      });
      
      const result = await formatLintTool.handler({});

      expect(result.success).toBe(true);
      expect(execSync).toHaveBeenCalledWith("npm run format");
      expect(execSync).toHaveBeenCalledWith("npm run lint");
    });

    it("should handle format/lint errors", async () => {
      gitHelpers.hasScript.mockReturnValue(true);
      execSync.mockImplementation((cmd) => {
        if (cmd.includes("lint")) {
          throw new Error("Lint errors found");
        }
        return "";
      });

      const result = await formatLintTool.handler({});

      expect(result.success).toBe(false);
      expect(result.error).toContain("Lint errors found");
    });
  });

  describe("test_changed", () => {
    let testChangedTool;

    beforeEach(() => {
      testChangedTool = registeredTools.find(t => t.name === "test_changed");
    });

    it("should run tests for changed files", async () => {
      gitHelpers.getChangedFiles.mockReturnValue([
        { status: "M", file: "src/feature.js" },
        { status: "M", file: "src/utils.js" },
      ]);
      const fsModule = await import("fs");
      fsModule.existsSync.mockImplementation((path) => {
        return path.includes("feature.test.js") || path.includes("utils.test.js");
      });

      const result = await testChangedTool.handler({});

      expect(result.success).toBe(true);
      expect(result.data.test_files).toHaveLength(2);
      expect(execSync).toHaveBeenCalledWith(
        expect.stringContaining("feature.test.js"),
        expect.any(Object)
      );
    });
  });

  describe("dependency_check", () => {
    let depCheckTool;

    beforeEach(() => {
      depCheckTool = registeredTools.find(t => t.name === "dependency_check");
    });

    it("should check dependencies", async () => {
      execSync.mockImplementation((cmd) => {
        if (cmd.includes("npm audit")) {
          return JSON.stringify({
            vulnerabilities: {
              low: 1,
              moderate: 2,
              high: 0,
              critical: 0,
            },
          });
        }
        if (cmd.includes("npm outdated")) {
          return JSON.stringify([
            { name: "lodash", current: "4.17.20", latest: "4.17.21" },
          ]);
        }
        return "";
      });

      const result = await depCheckTool.handler({});

      expect(result.success).toBe(true);
      expect(result.data.vulnerabilities.total).toBe(3);
      expect(result.data.outdated.count).toBe(1);
    });
  });

  describe("auto_release", () => {
    let autoReleaseTool;

    beforeEach(() => {
      autoReleaseTool = registeredTools.find(t => t.name === "auto_release");
    });

    it("should create release", async () => {
      gitHelpers.getCurrentBranch.mockReturnValue("main");
      execSync.mockImplementation((cmd) => {
        if (cmd.includes("git describe")) {
          return "v1.0.0";
        }
        if (cmd.includes("git log")) {
          return "feat: New feature\nfix: Bug fix";
        }
        if (cmd.includes("gh release create")) {
          return "https://github.com/user/repo/releases/tag/v1.1.0";
        }
        return "";
      });

      const result = await autoReleaseTool.handler({
        version: "1.1.0",
      });

      expect(result.success).toBe(true);
      expect(result.data.version).toBe("1.1.0");
      expect(result.data.release_url).toContain("v1.1.0");
    });
  });

  describe("branch_cleanup", () => {
    let cleanupTool;

    beforeEach(() => {
      cleanupTool = registeredTools.find(t => t.name === "branch_cleanup");
    });

    it("should cleanup merged branches", async () => {
      execSync.mockImplementation((cmd) => {
        if (cmd.includes("git branch -r --merged")) {
          return "origin/feature/old-1\norigin/feature/old-2";
        }
        return "";
      });

      const result = await cleanupTool.handler({});

      expect(result.success).toBe(true);
      expect(result.data.branches_deleted).toHaveLength(2);
    });
  });
});
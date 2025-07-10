import { jest } from "@jest/globals";

// Mock git-helpers
const mockIsGitRepository = jest.fn();
const mockGetCurrentBranch = jest.fn();
const mockHasScript = jest.fn();
const mockGetRecentCommits = jest.fn();
const mockGetChangedFiles = jest.fn();
const mockExecGitCommand = jest.fn();
const mockGetMainBranch = jest.fn();
const mockGetRemoteUrl = jest.fn();
const mockGetMergedBranches = jest.fn();

jest.unstable_mockModule("../../../src/utils/git-helpers.js", () => ({
  isGitRepository: mockIsGitRepository,
  getCurrentBranch: mockGetCurrentBranch,
  hasScript: mockHasScript,
  getRecentCommits: mockGetRecentCommits,
  getChangedFiles: mockGetChangedFiles,
  execGitCommand: mockExecGitCommand,
  getMainBranch: mockGetMainBranch,
  getRemoteUrl: mockGetRemoteUrl,
  getMergedBranches: mockGetMergedBranches,
}));

// Mock child_process
const mockExecSync = jest.fn();
jest.unstable_mockModule("child_process", () => ({
  execSync: mockExecSync,
}));

// Mock fs
const mockExistsSync = jest.fn();
const mockReadFileSync = jest.fn();
const mockWriteFileSync = jest.fn();
const mockMkdirSync = jest.fn();
const mockReaddirSync = jest.fn();
const mockStatSync = jest.fn();

jest.unstable_mockModule("fs", () => ({
  existsSync: mockExistsSync,
  readFileSync: mockReadFileSync,
  writeFileSync: mockWriteFileSync,
  mkdirSync: mockMkdirSync,
  readdirSync: mockReaddirSync,
  statSync: mockStatSync,
  default: {
    existsSync: mockExistsSync,
    readFileSync: mockReadFileSync,
    writeFileSync: mockWriteFileSync,
    mkdirSync: mockMkdirSync,
    readdirSync: mockReaddirSync,
    statSync: mockStatSync,
  }
}));

// Import after mocking
const { registerUtilitiesTools } = await import("../../../src/tools/utilities.js");

describe("Utilities Tools", () => {
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
    mockHasScript.mockReturnValue(true);
    mockGetRecentCommits.mockReturnValue([]);
    mockGetChangedFiles.mockReturnValue([]);
    mockExecGitCommand.mockReturnValue("");
    mockGetMainBranch.mockReturnValue("main");
    mockGetRemoteUrl.mockReturnValue("https://github.com/user/repo.git");
    mockGetMergedBranches.mockReturnValue([]);
    mockExecSync.mockReturnValue("");
    mockExistsSync.mockReturnValue(false);
    mockReadFileSync.mockReturnValue("");
    mockWriteFileSync.mockImplementation(() => {});
    mockMkdirSync.mockImplementation(() => {});
    mockReaddirSync.mockReturnValue([]);
    mockStatSync.mockReturnValue({ isDirectory: () => false });

    // Register tools
    registerUtilitiesTools(server);
  });

  describe("repo_map", () => {
    let repoMapTool;

    beforeEach(() => {
      repoMapTool = registeredTools.find(t => t.name === "repo_map");
    });

    it("should be registered with correct metadata", () => {
      expect(repoMapTool).toBeDefined();
      expect(repoMapTool.description).toContain("Generate a tree view");
      expect(repoMapTool.inputSchema.properties).toHaveProperty("max_depth");
      expect(repoMapTool.inputSchema.properties).toHaveProperty("include_files");
    });

    it("should generate repository map", async () => {
      mockReaddirSync.mockImplementation((dir) => {
        if (dir === ".") {
          return ["src", "tests", "README.md", ".git", "node_modules"];
        }
        if (dir === "src") {
          return ["index.js", "utils"];
        }
        if (dir === "src/utils") {
          return ["helpers.js"];
        }
        if (dir === "tests") {
          return ["test.js"];
        }
        return [];
      });
      
      mockStatSync.mockImplementation((path) => ({
        isDirectory: () => !path.includes(".")
      }));

      const result = await repoMapTool.handler({
        include_files: true,
        max_depth: 3
      });

      expect(result.success).toBe(true);
      expect(result.data.tree).toContain("src/");
      expect(result.data.tree).toContain("tests/");
      expect(result.data.tree).toContain("README.md");
      expect(result.data.tree).not.toContain("node_modules");
      expect(result.data.tree).not.toContain(".git");
    });

    it("should respect max depth", async () => {
      mockReaddirSync.mockImplementation((dir) => {
        if (dir === ".") return ["src"];
        if (dir === "src") return ["nested"];
        if (dir === "src/nested") return ["deep"];
        if (dir === "src/nested/deep") return ["file.js"];
        return [];
      });
      
      mockStatSync.mockImplementation((path) => ({
        isDirectory: () => !path.includes(".")
      }));

      const result = await repoMapTool.handler({
        max_depth: 2
      });

      expect(result.success).toBe(true);
      expect(result.data.tree).toContain("src/");
      expect(result.data.tree).toContain("nested/");
      expect(result.data.tree).not.toContain("deep/");
    });
  });

  describe("search_todos", () => {
    let searchTodosTool;

    beforeEach(() => {
      searchTodosTool = registeredTools.find(t => t.name === "search_todos");
    });

    it("should find TODO comments", async () => {
      mockExecSync.mockImplementation((cmd) => {
        if (cmd.includes("grep") || cmd.includes("rg")) {
          return `src/index.js:10:// TODO: Implement feature
src/utils.js:25:// TODO: Fix bug
tests/test.js:5:// FIXME: Update test`;
        }
        return "";
      });

      const result = await searchTodosTool.handler({});

      expect(result.success).toBe(true);
      expect(result.data.todos).toHaveLength(3);
      expect(result.data.todos[0]).toMatchObject({
        file: "src/index.js",
        line: 10,
        type: "TODO",
        text: "Implement feature"
      });
      expect(result.data.by_type.TODO).toBe(2);
      expect(result.data.by_type.FIXME).toBe(1);
    });

    it("should filter by type", async () => {
      mockExecSync.mockImplementation((cmd) => {
        if (cmd.includes("FIXME")) {
          return "tests/test.js:5:// FIXME: Update test";
        }
        return "";
      });

      const result = await searchTodosTool.handler({
        types: ["FIXME"]
      });

      expect(result.success).toBe(true);
      expect(result.data.todos).toHaveLength(1);
      expect(result.data.todos[0].type).toBe("FIXME");
    });
  });

  describe("check_dependencies", () => {
    let checkDependenciesTool;

    beforeEach(() => {
      checkDependenciesTool = registeredTools.find(t => t.name === "check_dependencies");
    });

    it("should check npm dependencies", async () => {
      mockExistsSync.mockReturnValue(true);
      mockReadFileSync.mockReturnValue(JSON.stringify({
        dependencies: {
          "express": "^4.18.0",
          "lodash": "^4.17.21"
        },
        devDependencies: {
          "jest": "^29.0.0"
        }
      }));
      
      mockExecSync.mockImplementation((cmd) => {
        if (cmd.includes("npm outdated")) {
          return JSON.stringify([
            {
              name: "express",
              current: "4.18.0",
              wanted: "4.18.2",
              latest: "4.19.0"
            }
          ]);
        }
        if (cmd.includes("npm audit")) {
          return JSON.stringify({
            metadata: {
              vulnerabilities: {
                total: 0,
                info: 0,
                low: 0,
                moderate: 0,
                high: 0,
                critical: 0
              }
            }
          });
        }
        return "";
      });

      const result = await checkDependenciesTool.handler({});

      expect(result.success).toBe(true);
      expect(result.data.type).toBe("npm");
      expect(result.data.outdated.count).toBe(1);
      expect(result.data.outdated.packages[0].name).toBe("express");
      expect(result.data.vulnerabilities.total).toBe(0);
    });

    it("should check for unused dependencies", async () => {
      mockExistsSync.mockReturnValue(true);
      mockReadFileSync.mockReturnValue(JSON.stringify({
        dependencies: {
          "unused-package": "^1.0.0"
        }
      }));
      
      mockExecSync.mockImplementation((cmd) => {
        if (cmd.includes("npx depcheck")) {
          return JSON.stringify({
            dependencies: ["unused-package"],
            devDependencies: []
          });
        }
        return "[]";
      });

      const result = await checkDependenciesTool.handler({
        check_unused: true
      });

      expect(result.success).toBe(true);
      expect(result.data.unused).toBeDefined();
      expect(result.data.unused.dependencies).toContain("unused-package");
    });
  });

  describe("create_npm_package", () => {
    let createNpmPackageTool;

    beforeEach(() => {
      createNpmPackageTool = registeredTools.find(t => t.name === "create_npm_package");
    });

    it("should create npm package structure", async () => {
      const writtenFiles = {};
      mockWriteFileSync.mockImplementation((path, content) => {
        writtenFiles[path] = content;
      });

      const result = await createNpmPackageTool.handler({
        name: "my-package",
        description: "My awesome package",
        author: "John Doe",
        license: "MIT"
      });

      expect(result.success).toBe(true);
      expect(mockMkdirSync).toHaveBeenCalledWith("my-package");
      expect(mockMkdirSync).toHaveBeenCalledWith("my-package/src");
      expect(mockMkdirSync).toHaveBeenCalledWith("my-package/tests");
      
      expect(writtenFiles).toHaveProperty("my-package/package.json");
      const packageJson = JSON.parse(writtenFiles["my-package/package.json"]);
      expect(packageJson.name).toBe("my-package");
      expect(packageJson.description).toBe("My awesome package");
      expect(packageJson.author).toBe("John Doe");
      expect(packageJson.license).toBe("MIT");
      
      expect(writtenFiles).toHaveProperty("my-package/README.md");
      expect(writtenFiles).toHaveProperty("my-package/.gitignore");
    });
  });

  describe("run_script", () => {
    let runScriptTool;

    beforeEach(() => {
      runScriptTool = registeredTools.find(t => t.name === "run_script");
    });

    it("should run npm script", async () => {
      mockExistsSync.mockReturnValue(true);
      mockReadFileSync.mockReturnValue(JSON.stringify({
        scripts: {
          test: "jest",
          build: "webpack"
        }
      }));
      
      mockExecSync.mockReturnValue("Tests passed!");

      const result = await runScriptTool.handler({
        script: "test"
      });

      expect(result.success).toBe(true);
      expect(result.data.script).toBe("test");
      expect(result.data.output).toBe("Tests passed!");
      expect(mockExecSync).toHaveBeenCalledWith("npm run test", expect.any(Object));
    });

    it("should handle script not found", async () => {
      mockExistsSync.mockReturnValue(true);
      mockReadFileSync.mockReturnValue(JSON.stringify({
        scripts: {
          test: "jest"
        }
      }));

      const result = await runScriptTool.handler({
        script: "nonexistent"
      });

      expect(result.success).toBe(false);
      expect(result.message).toContain("Script 'nonexistent' not found");
    });
  });

  describe("find_files", () => {
    let findFilesTool;

    beforeEach(() => {
      findFilesTool = registeredTools.find(t => t.name === "find_files");
    });

    it("should find files by pattern", async () => {
      mockExecSync.mockImplementation((cmd) => {
        if (cmd.includes("find")) {
          return `./src/index.js
./src/utils.js
./tests/index.test.js`;
        }
        return "";
      });

      const result = await findFilesTool.handler({
        pattern: "*.js"
      });

      expect(result.success).toBe(true);
      expect(result.data.files).toHaveLength(3);
      expect(result.data.files).toContain("./src/index.js");
    });

    it("should filter by modified time", async () => {
      mockExecSync.mockImplementation((cmd) => {
        if (cmd.includes("-mtime")) {
          return "./src/recent.js";
        }
        return "";
      });

      const result = await findFilesTool.handler({
        pattern: "*.js",
        modified_within_days: 7
      });

      expect(result.success).toBe(true);
      expect(result.data.files).toHaveLength(1);
      expect(result.data.files[0]).toContain("recent.js");
    });
  });

  describe("count_lines", () => {
    let countLinesTool;

    beforeEach(() => {
      countLinesTool = registeredTools.find(t => t.name === "count_lines");
    });

    it("should count lines of code", async () => {
      mockExecSync.mockImplementation((cmd) => {
        if (cmd.includes("cloc")) {
          return JSON.stringify({
            JavaScript: { nFiles: 10, blank: 100, comment: 50, code: 1000 },
            TypeScript: { nFiles: 5, blank: 50, comment: 25, code: 500 },
            SUM: { nFiles: 15, blank: 150, comment: 75, code: 1500 }
          });
        }
        // Fallback to wc
        if (cmd.includes("wc -l")) {
          return "1500 total";
        }
        return "";
      });

      const result = await countLinesTool.handler({});

      expect(result.success).toBe(true);
      expect(result.data.total_lines).toBe(1500);
      expect(result.data.by_language).toBeDefined();
      expect(result.data.by_language.JavaScript.code).toBe(1000);
    });
  });

  describe("analyze_bundle", () => {
    let analyzeBundleTool;

    beforeEach(() => {
      analyzeBundleTool = registeredTools.find(t => t.name === "analyze_bundle");
    });

    it("should analyze webpack bundle", async () => {
      mockExistsSync.mockImplementation((path) => {
        return path.includes("webpack.config.js") || path.includes("stats.json");
      });
      
      mockReadFileSync.mockImplementation((path) => {
        if (path.includes("stats.json")) {
          return JSON.stringify({
            assets: [
              { name: "main.js", size: 1000000 },
              { name: "vendor.js", size: 500000 }
            ],
            modules: [
              { name: "./src/index.js", size: 10000 },
              { name: "node_modules/lodash/index.js", size: 70000 }
            ]
          });
        }
        return "";
      });

      const result = await analyzeBundleTool.handler({});

      expect(result.success).toBe(true);
      expect(result.data.bundler).toBe("webpack");
      expect(result.data.total_size).toBeGreaterThan(0);
      expect(result.data.assets).toHaveLength(2);
      expect(result.data.largest_modules).toBeDefined();
    });
  });

  describe("create_github_action", () => {
    let createGithubActionTool;

    beforeEach(() => {
      createGithubActionTool = registeredTools.find(t => t.name === "create_github_action");
    });

    it("should create CI workflow", async () => {
      let capturedContent = "";
      mockWriteFileSync.mockImplementation((path, content) => {
        capturedContent = content;
      });

      const result = await createGithubActionTool.handler({
        name: "ci",
        triggers: ["push", "pull_request"]
      });

      expect(result.success).toBe(true);
      expect(mockMkdirSync).toHaveBeenCalledWith(".github/workflows", { recursive: true });
      expect(capturedContent).toContain("name: CI");
      expect(capturedContent).toContain("on:");
      expect(capturedContent).toContain("push:");
      expect(capturedContent).toContain("pull_request:");
      expect(capturedContent).toContain("npm test");
    });

    it("should create deploy workflow", async () => {
      let capturedContent = "";
      mockWriteFileSync.mockImplementation((path, content) => {
        capturedContent = content;
      });

      const result = await createGithubActionTool.handler({
        name: "deploy",
        template: "deploy"
      });

      expect(result.success).toBe(true);
      expect(capturedContent).toContain("name: Deploy");
      expect(capturedContent).toContain("npm run build");
    });
  });

  describe("env_info", () => {
    let envInfoTool;

    beforeEach(() => {
      envInfoTool = registeredTools.find(t => t.name === "env_info");
    });

    it("should gather environment information", async () => {
      mockExecSync.mockImplementation((cmd) => {
        if (cmd.includes("node --version")) return "v18.17.0";
        if (cmd.includes("npm --version")) return "9.6.7";
        if (cmd.includes("git --version")) return "git version 2.40.0";
        return "";
      });

      process.platform = "darwin";
      process.arch = "arm64";
      process.versions = { node: "18.17.0", v8: "10.2.0" };

      const result = await envInfoTool.handler({});

      expect(result.success).toBe(true);
      expect(result.data.platform).toBe("darwin");
      expect(result.data.node_version).toBe("v18.17.0");
      expect(result.data.npm_version).toBe("9.6.7");
      expect(result.data.git_version).toContain("2.40.0");
    });
  });

  describe("git_cleanup", () => {
    let gitCleanupTool;

    beforeEach(() => {
      gitCleanupTool = registeredTools.find(t => t.name === "git_cleanup");
    });

    it("should clean up merged branches", async () => {
      mockGetMergedBranches.mockReturnValue([
        "feature/old-feature-1",
        "feature/old-feature-2",
        "bugfix/fixed-bug"
      ]);

      const result = await gitCleanupTool.handler({});

      expect(result.success).toBe(true);
      expect(result.data.branches_deleted).toHaveLength(3);
      expect(mockExecSync).toHaveBeenCalledWith(expect.stringContaining("git branch -d"));
    });

    it("should handle dry run mode", async () => {
      mockGetMergedBranches.mockReturnValue(["feature/test"]);

      const result = await gitCleanupTool.handler({
        dry_run: true,
      });

      expect(result.success).toBe(true);
      expect(mockExecSync).not.toHaveBeenCalledWith(expect.stringContaining("git branch -d"));
      expect(result.data.would_delete).toContain("feature/test");
    });
  });

  describe("git_history", () => {
    let gitHistoryTool;

    beforeEach(() => {
      gitHistoryTool = registeredTools.find(t => t.name === "git_history");
    });

    it("should get commit history", async () => {
      mockExecSync.mockReturnValue(
        "abc123 - John Doe - Fix bug (2 hours ago)\n" +
        "def456 - Jane Smith - Add feature (1 day ago)"
      );

      const result = await gitHistoryTool.handler({
        limit: 2,
      });

      expect(result.success).toBe(true);
      expect(result.data.commits).toHaveLength(2);
      expect(result.data.commits[0]).toContain("Fix bug");
    });

    it("should filter by author", async () => {
      const result = await gitHistoryTool.handler({
        author: "john",
      });

      expect(mockExecSync).toHaveBeenCalledWith(expect.stringContaining("--author=john"));
    });
  });

  describe("git_stats", () => {
    let gitStatsTool;

    beforeEach(() => {
      gitStatsTool = registeredTools.find(t => t.name === "git_stats");
    });

    it("should get repository statistics", async () => {
      mockExecSync.mockImplementation((cmd) => {
        if (cmd.includes("git log --oneline")) return "commit1\ncommit2\ncommit3";
        if (cmd.includes("git shortlog")) return "John Doe (10):\nJane Smith (5):";
        if (cmd.includes("git ls-files")) return "file1\nfile2\nfile3\nfile4\nfile5";
        return "";
      });

      const result = await gitStatsTool.handler({});

      expect(result.success).toBe(true);
      expect(result.data.total_commits).toBe(3);
      expect(result.data.total_files).toBe(5);
      expect(result.data.contributors).toBe(2);
    });
  });

  describe("generate_docs", () => {
    let generateDocsTool;

    beforeEach(() => {
      generateDocsTool = registeredTools.find(t => t.name === "generate_docs");
    });

    it("should generate documentation", async () => {
      mockExistsSync.mockReturnValue(true);
      mockReaddirSync.mockReturnValue(["component1.js", "component2.js", "README.md"]);
      mockReadFileSync.mockImplementation((path) => {
        if (path.includes("component1.js")) {
          return "export function hello() { return 'world'; }";
        }
        return "";
      });

      const result = await generateDocsTool.handler({
        path: "./src",
        output: "./docs",
      });

      expect(result.success).toBe(true);
      expect(mockReaddirSync).toHaveBeenCalled();
      expect(result.data.files_processed).toBeGreaterThan(0);
    });
  });

  describe("code_metrics", () => {
    let codeMetricsTool;

    beforeEach(() => {
      codeMetricsTool = registeredTools.find(t => t.name === "code_metrics");
    });

    it("should calculate code metrics", async () => {
      mockExecSync.mockImplementation((cmd) => {
        if (cmd.includes("find") && cmd.includes("-name")) {
          return "./src/file1.js\n./src/file2.js\n./test/test.js";
        }
        if (cmd.includes("wc -l")) {
          return "100 ./src/file1.js\n200 ./src/file2.js\n50 ./test/test.js\n350 total";
        }
        return "";
      });

      const result = await codeMetricsTool.handler({});

      expect(result.success).toBe(true);
      expect(result.data.total_lines).toBe(350);
      expect(result.data.file_count).toBe(3);
    });
  });

  describe("security_check", () => {
    let securityCheckTool;

    beforeEach(() => {
      securityCheckTool = registeredTools.find(t => t.name === "security_check");
    });

    it("should run security checks", async () => {
      mockExecSync.mockImplementation((cmd) => {
        if (cmd.includes("npm audit")) {
          return JSON.stringify({
            metadata: {
              vulnerabilities: {
                total: 2,
                low: 1,
                moderate: 1,
                high: 0,
                critical: 0
              }
            }
          });
        }
        return "";
      });

      const result = await securityCheckTool.handler({});

      expect(result.success).toBe(true);
      expect(result.data.vulnerabilities.total).toBe(2);
      expect(result.data.vulnerabilities.high).toBe(0);
    });

    it("should check for secrets", async () => {
      mockExecSync.mockImplementation((cmd) => {
        if (cmd.includes("grep") && cmd.includes("api_key\\|secret\\|password")) {
          return "";
        }
        return "{}";
      });

      const result = await securityCheckTool.handler({
        check_secrets: true,
      });

      expect(result.success).toBe(true);
      expect(result.data.secrets_found).toBe(false);
    });
  });

  describe("optimize_imports", () => {
    let optimizeImportsTool;

    beforeEach(() => {
      optimizeImportsTool = registeredTools.find(t => t.name === "optimize_imports");
    });

    it("should optimize imports", async () => {
      mockReaddirSync.mockReturnValue(["index.js", "utils.js"]);
      mockReadFileSync.mockReturnValue(
        "import { a, b, c } from './module';\nimport * as utils from './utils';"
      );

      const result = await optimizeImportsTool.handler({
        path: "./src",
      });

      expect(result.success).toBe(true);
      expect(result.data.files_processed).toBeGreaterThan(0);
    });
  });
});

// Export the function for testing
export function createNpmPackage({ name, description, author, license }) {
  // Implementation would be imported from utilities.js
  return {
    success: true,
    message: `Created npm package '${name}'`,
    data: { name, description, author, license }
  };
}
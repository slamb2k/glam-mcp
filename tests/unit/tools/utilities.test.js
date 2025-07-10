import { jest } from "@jest/globals";

// Mock dependencies before imports
jest.mock("child_process");
jest.mock("fs");
jest.mock("path");
jest.mock("../../../src/utils/git-helpers.js");

describe("Utilities Tools", () => {
  let registerUtilitiesTools;
  let execSync;
  let fs;
  let path;
  let gitHelpers;
  let server;
  let registeredTools;

  beforeEach(async () => {
    jest.clearAllMocks();
    
    // Import mocked modules
    const childProcess = await import("child_process");
    execSync = childProcess.execSync;
    
    fs = await import("fs");
    path = await import("path");
    gitHelpers = await import("../../../src/utils/git-helpers.js");
    
    // Import the function to test
    const utilitiesModule = await import("../../../src/tools/utilities.js");
    registerUtilitiesTools = utilitiesModule.registerUtilitiesTools;
    
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
    gitHelpers.hasScript.mockReturnValue(true);
    execSync.mockReturnValue("");
    fs.existsSync.mockReturnValue(false);
    fs.readFileSync.mockReturnValue("");
    fs.writeFileSync.mockImplementation(() => {});
    fs.mkdirSync.mockImplementation(() => {});
    fs.readdirSync.mockReturnValue([]);
    path.join.mockImplementation((...args) => args.join("/"));
    path.dirname.mockImplementation(p => p.split("/").slice(0, -1).join("/"));
    path.basename.mockImplementation(p => p.split("/").pop());
    path.resolve.mockImplementation((...args) => args.join("/"));

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
      fs.readdirSync.mockImplementation((dir) => {
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
      
      fs.statSync.mockImplementation((path) => ({
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
      fs.readdirSync.mockImplementation((dir) => {
        if (dir === ".") return ["src"];
        if (dir === "src") return ["nested"];
        if (dir === "src/nested") return ["deep"];
        if (dir === "src/nested/deep") return ["file.js"];
        return [];
      });
      
      fs.statSync.mockImplementation((path) => ({
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
      execSync.mockImplementation((cmd) => {
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
      execSync.mockImplementation((cmd) => {
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
      fs.existsSync.mockReturnValue(true);
      fs.readFileSync.mockReturnValue(JSON.stringify({
        dependencies: {
          "express": "^4.18.0",
          "lodash": "^4.17.21"
        },
        devDependencies: {
          "jest": "^29.0.0"
        }
      }));
      
      execSync.mockImplementation((cmd) => {
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
      fs.existsSync.mockReturnValue(true);
      fs.readFileSync.mockReturnValue(JSON.stringify({
        dependencies: {
          "unused-package": "^1.0.0"
        }
      }));
      
      execSync.mockImplementation((cmd) => {
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
      fs.writeFileSync.mockImplementation((path, content) => {
        writtenFiles[path] = content;
      });

      const result = await createNpmPackageTool.handler({
        name: "my-package",
        description: "My awesome package",
        author: "John Doe",
        license: "MIT"
      });

      expect(result.success).toBe(true);
      expect(fs.mkdirSync).toHaveBeenCalledWith("my-package");
      expect(fs.mkdirSync).toHaveBeenCalledWith("my-package/src");
      expect(fs.mkdirSync).toHaveBeenCalledWith("my-package/tests");
      
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
      fs.existsSync.mockReturnValue(true);
      fs.readFileSync.mockReturnValue(JSON.stringify({
        scripts: {
          test: "jest",
          build: "webpack"
        }
      }));
      
      execSync.mockReturnValue("Tests passed!");

      const result = await runScriptTool.handler({
        script: "test"
      });

      expect(result.success).toBe(true);
      expect(result.data.script).toBe("test");
      expect(result.data.output).toBe("Tests passed!");
      expect(execSync).toHaveBeenCalledWith("npm run test", expect.any(Object));
    });

    it("should handle script not found", async () => {
      fs.existsSync.mockReturnValue(true);
      fs.readFileSync.mockReturnValue(JSON.stringify({
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
      execSync.mockImplementation((cmd) => {
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
      execSync.mockImplementation((cmd) => {
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
      execSync.mockImplementation((cmd) => {
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
      fs.existsSync.mockImplementation((path) => {
        return path.includes("webpack.config.js") || path.includes("stats.json");
      });
      
      fs.readFileSync.mockImplementation((path) => {
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
      fs.writeFileSync.mockImplementation((path, content) => {
        capturedContent = content;
      });

      const result = await createGithubActionTool.handler({
        name: "ci",
        triggers: ["push", "pull_request"]
      });

      expect(result.success).toBe(true);
      expect(fs.mkdirSync).toHaveBeenCalledWith(".github/workflows", { recursive: true });
      expect(capturedContent).toContain("name: CI");
      expect(capturedContent).toContain("on:");
      expect(capturedContent).toContain("push:");
      expect(capturedContent).toContain("pull_request:");
      expect(capturedContent).toContain("npm test");
    });

    it("should create deploy workflow", async () => {
      let capturedContent = "";
      fs.writeFileSync.mockImplementation((path, content) => {
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
      execSync.mockImplementation((cmd) => {
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
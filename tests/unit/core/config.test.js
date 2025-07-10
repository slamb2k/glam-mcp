import { jest } from "@jest/globals";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));

// Mock fs
const mockExistsSync = jest.fn();
const mockReadFileSync = jest.fn();
const mockWriteFileSync = jest.fn();
const mockMkdirSync = jest.fn();

jest.unstable_mockModule("fs", () => ({
  default: {
    existsSync: mockExistsSync,
    readFileSync: mockReadFileSync,
    writeFileSync: mockWriteFileSync,
    mkdirSync: mockMkdirSync,
  },
}));

// Mock os
const mockHomedir = jest.fn();
jest.unstable_mockModule("os", () => ({
  default: {
    homedir: mockHomedir,
  },
}));

// Import after mocking
const { Config, getConfig, setConfig, resetConfig } = await import("../../../src/core/config.js");

describe("Config", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Reset environment variables
    delete process.env.GLAM_MCP_CONFIG;
    delete process.env.GLAM_DEFAULT_BRANCH;
    delete process.env.GLAM_AUTO_MERGE;
    mockHomedir.mockReturnValue("/home/user");
    mockExistsSync.mockReturnValue(false);
  });

  describe("constructor", () => {
    it("should initialize with default config", () => {
      const config = new Config();
      
      expect(config.gitFlow.defaultBranch).toBe("main");
      expect(config.automation.runFormat).toBe(true);
      expect(config.cli.colors).toBe(true);
    });

    it("should load config from environment variable path", () => {
      process.env.GLAM_MCP_CONFIG = "/custom/config.json";
      mockExistsSync.mockReturnValue(true);
      mockReadFileSync.mockReturnValue(JSON.stringify({
        gitFlow: { defaultBranch: "develop" },
      }));

      const config = new Config();

      expect(mockReadFileSync).toHaveBeenCalledWith("/custom/config.json", "utf8");
      expect(config.gitFlow.defaultBranch).toBe("develop");
    });

    it("should load config from home directory", () => {
      mockExistsSync.mockImplementation((path) => {
        return path === "/home/user/.glam-mcp/config.json";
      });
      mockReadFileSync.mockReturnValue(JSON.stringify({
        automation: { runTests: true },
      }));

      const config = new Config();

      expect(config.automation.runTests).toBe(true);
    });

    it("should load config from project directory", () => {
      mockExistsSync.mockImplementation((path) => {
        return path.endsWith(".glam-mcp.json");
      });
      mockReadFileSync.mockReturnValue(JSON.stringify({
        cli: { colors: false },
      }));

      const config = new Config();

      expect(config.cli.colors).toBe(false);
    });
  });

  describe("loadFromEnv", () => {
    it("should load config from environment variables", () => {
      process.env.GLAM_DEFAULT_BRANCH = "develop";
      process.env.GLAM_AUTO_MERGE = "false";
      process.env.GLAM_RUN_TESTS = "true";

      const config = new Config();

      expect(config.gitFlow.defaultBranch).toBe("develop");
      expect(config.gitFlow.autoMerge).toBe(false);
      expect(config.automation.runTests).toBe(true);
    });

    it("should handle invalid boolean values", () => {
      process.env.GLAM_AUTO_MERGE = "invalid";

      const config = new Config();

      expect(config.gitFlow.autoMerge).toBe(true); // Default value
    });
  });

  describe("merge", () => {
    it("should merge configurations correctly", () => {
      const config = new Config();
      
      const override = {
        gitFlow: { defaultBranch: "develop" },
        automation: { runTests: true },
        newSection: { value: "test" },
      };

      config.merge(override);

      expect(config.gitFlow.defaultBranch).toBe("develop");
      expect(config.gitFlow.autoMerge).toBe(true); // Unchanged
      expect(config.automation.runTests).toBe(true);
      expect(config.newSection.value).toBe("test");
    });

    it("should deep merge nested objects", () => {
      const config = new Config();
      
      config.merge({
        gitFlow: {
          branchPrefixes: {
            feature: "feat/",
            custom: "custom/",
          },
        },
      });

      expect(config.gitFlow.branchPrefixes.feature).toBe("feat/");
      expect(config.gitFlow.branchPrefixes.release).toBe("release/"); // Unchanged
      expect(config.gitFlow.branchPrefixes.custom).toBe("custom/");
    });
  });

  describe("get", () => {
    it("should get nested config values", () => {
      const config = new Config();
      
      expect(config.get("gitFlow.defaultBranch")).toBe("main");
      expect(config.get("automation.runFormat")).toBe(true);
      expect(config.get("gitFlow.branchPrefixes.feature")).toBe("feature/");
    });

    it("should return undefined for non-existent paths", () => {
      const config = new Config();
      
      expect(config.get("non.existent.path")).toBeUndefined();
    });

    it("should return default value for non-existent paths", () => {
      const config = new Config();
      
      expect(config.get("non.existent", "default")).toBe("default");
    });
  });

  describe("set", () => {
    it("should set nested config values", () => {
      const config = new Config();
      
      config.set("gitFlow.defaultBranch", "develop");
      config.set("automation.newOption", true);
      
      expect(config.gitFlow.defaultBranch).toBe("develop");
      expect(config.automation.newOption).toBe(true);
    });

    it("should create nested paths if they don't exist", () => {
      const config = new Config();
      
      config.set("new.nested.path", "value");
      
      expect(config.new.nested.path).toBe("value");
    });
  });

  describe("save", () => {
    it("should save config to specified path", () => {
      const config = new Config();
      
      config.save("/path/to/config.json");
      
      expect(mockMkdirSync).toHaveBeenCalledWith("/path/to", { recursive: true });
      expect(mockWriteFileSync).toHaveBeenCalledWith(
        "/path/to/config.json",
        expect.any(String)
      );
    });

    it("should save config to default path", () => {
      const config = new Config();
      
      config.save();
      
      expect(mockWriteFileSync).toHaveBeenCalledWith(
        expect.stringContaining(".glam-mcp.json"),
        expect.any(String)
      );
    });
  });

  describe("validate", () => {
    it("should validate correct config", () => {
      const config = new Config();
      
      const errors = config.validate();
      
      expect(errors).toHaveLength(0);
    });

    it("should validate branch prefixes", () => {
      const config = new Config();
      config.gitFlow.branchPrefixes.feature = "";
      
      const errors = config.validate();
      
      expect(errors).toContain("Branch prefix for 'feature' cannot be empty");
    });

    it("should validate branch strategy", () => {
      const config = new Config();
      config.gitFlow.branchStrategy = "invalid";
      
      const errors = config.validate();
      
      expect(errors).toContain("Invalid branch strategy: invalid");
    });
  });

  describe("reset", () => {
    it("should reset to default config", () => {
      const config = new Config();
      config.set("gitFlow.defaultBranch", "develop");
      
      config.reset();
      
      expect(config.gitFlow.defaultBranch).toBe("main");
    });
  });

  describe("getDefaultToolOptions", () => {
    it("should get tool-specific options", () => {
      const config = new Config();
      
      const options = config.getDefaultToolOptions("github_flow_start");
      
      expect(options).toHaveProperty("branch_strategy", "auto");
    });

    it("should return empty object for unknown tools", () => {
      const config = new Config();
      
      const options = config.getDefaultToolOptions("unknown_tool");
      
      expect(options).toEqual({});
    });
  });

  describe("singleton functions", () => {
    it("should return singleton instance", () => {
      const config1 = getConfig();
      const config2 = getConfig();
      
      expect(config1).toBe(config2);
    });

    it("should set config value on singleton", () => {
      setConfig("test.value", 123);
      
      const config = getConfig();
      expect(config.get("test.value")).toBe(123);
    });

    it("should reset singleton", () => {
      setConfig("test.value", 123);
      resetConfig();
      
      const config = getConfig();
      expect(config.get("test.value")).toBeUndefined();
    });
  });

  describe("error handling", () => {
    it("should handle JSON parse errors", () => {
      mockExistsSync.mockReturnValue(true);
      mockReadFileSync.mockReturnValue("invalid json");
      
      // Should not throw
      const config = new Config();
      
      expect(config.gitFlow.defaultBranch).toBe("main"); // Default value
    });

    it("should handle file read errors", () => {
      mockExistsSync.mockReturnValue(true);
      mockReadFileSync.mockImplementation(() => {
        throw new Error("Read error");
      });
      
      // Should not throw
      const config = new Config();
      
      expect(config.gitFlow.defaultBranch).toBe("main"); // Default value
    });
  });
});
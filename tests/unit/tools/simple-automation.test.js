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
  existsSync: mockExistsSync,
  readFileSync: mockReadFileSync,
  default: {
    existsSync: mockExistsSync,
    readFileSync: mockReadFileSync,
  }
}));

// Mock config
const mockGetConfig = jest.fn();
jest.unstable_mockModule("../../../src/core/config.js", () => ({
  getConfig: mockGetConfig,
}));

// Mock session manager - not used in automation.js
// Removed unnecessary mock

// Import after mocking
const { registerAutomationTools } = await import("../../../src/tools/automation.js");

describe("Simple Automation Tools Test", () => {
  let tools = [];

  beforeEach(() => {
    jest.clearAllMocks();
    tools = [];
    
    // Set up default mocks
    mockExecSync.mockReturnValue("");
    mockExistsSync.mockReturnValue(true);
    mockReadFileSync.mockReturnValue(JSON.stringify({ scripts: { test: "jest" } }));
    mockGetConfig.mockReturnValue({ defaultToolOptions: {} });
    
    // Register tools
    registerAutomationTools({
      addTool: (tool) => tools.push(tool)
    });
  });

  it("should handle quick_commit tool", async () => {
    const quickCommitTool = tools.find(t => t.name === "quick_commit");
    expect(quickCommitTool).toBeDefined();
    
    // Mock git status - has changes
    mockExecSync.mockImplementation((cmd) => {
      if (cmd.includes("git status")) return "Changes to be committed";
      if (cmd.includes("git diff")) return "file1.js\nfile2.js";
      return "";
    });
    
    const result = await quickCommitTool.handler({
      message: "Test commit"
    });
    
    expect(result.success).toBe(true);
    expect(mockExecSync).toHaveBeenCalledWith(expect.stringContaining("git commit"));
  });

  it("should handle smart_commit tool", async () => {
    const smartCommitTool = tools.find(t => t.name === "smart_commit");
    expect(smartCommitTool).toBeDefined();
    
    // Mock git operations
    mockExecSync.mockImplementation((cmd) => {
      if (cmd.includes("git status")) return "modified: src/index.js";
      if (cmd.includes("git diff")) return "+function newFeature()";
      return "";
    });
    
    const result = await smartCommitTool.handler({});
    
    expect(result.success).toBe(true);
    expect(result.data.message).toBeDefined();
  });

  it("should handle run_tests tool", async () => {
    const runTestsTool = tools.find(t => t.name === "run_tests");
    expect(runTestsTool).toBeDefined();
    
    mockExecSync.mockReturnValue("All tests passed");
    
    const result = await runTestsTool.handler({});
    
    expect(result.success).toBe(true);
    expect(mockExecSync).toHaveBeenCalledWith(expect.stringContaining("npm test"));
  });
});
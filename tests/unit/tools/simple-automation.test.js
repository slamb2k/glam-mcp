import { jest } from "@jest/globals";

// First set up all mocks before importing
jest.mock("child_process");
jest.mock("fs");
jest.mock("../../../src/core/config.js");
jest.mock("../../../src/context/session-manager.js");

describe("Simple Automation Tools Test", () => {
  let execSync;
  let registerAutomationTools;
  let tools = [];

  beforeEach(async () => {
    jest.clearAllMocks();
    tools = [];
    
    // Set up mocks
    const cp = await import("child_process");
    execSync = cp.execSync;
    execSync.mockReturnValue("");
    
    const fs = await import("fs");
    fs.existsSync = jest.fn(() => true);
    fs.readFileSync = jest.fn(() => JSON.stringify({ scripts: { test: "jest" } }));
    
    const config = await import("../../../src/core/config.js");
    config.getConfig = jest.fn(() => ({ defaultToolOptions: {} }));
    
    const session = await import("../../../src/context/session-manager.js");
    session.sessionManager = { updateGitContext: jest.fn() };
    
    // Now import the module
    const automation = await import("../../../src/tools/automation.js");
    registerAutomationTools = automation.registerAutomationTools;
    
    // Register tools
    registerAutomationTools({
      addTool: (tool) => tools.push(tool)
    });
  });

  it("should handle quick_commit tool", async () => {
    const quickCommitTool = tools.find(t => t.name === "quick_commit");
    expect(quickCommitTool).toBeDefined();
    
    // Mock git status - has changes
    execSync.mockImplementation((cmd) => {
      if (cmd.includes("git status")) return "Changes to be committed";
      if (cmd.includes("git diff")) return "file1.js\nfile2.js";
      return "";
    });
    
    const result = await quickCommitTool.handler({
      message: "Test commit"
    });
    
    expect(result.success).toBe(true);
    expect(execSync).toHaveBeenCalledWith(expect.stringContaining("git commit"));
  });

  it("should handle smart_commit tool", async () => {
    const smartCommitTool = tools.find(t => t.name === "smart_commit");
    expect(smartCommitTool).toBeDefined();
    
    // Mock git operations
    execSync.mockImplementation((cmd) => {
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
    
    execSync.mockReturnValue("All tests passed");
    
    const result = await runTestsTool.handler({});
    
    expect(result.success).toBe(true);
    expect(execSync).toHaveBeenCalledWith(expect.stringContaining("npm test"));
  });
});
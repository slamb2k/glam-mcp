/**
 * Tests for MCP server functionality
 */

import { SlamBedMCPServer } from "../src/index.js";

export async function testMCPServer() {
  const tests = [];

  // Test server instantiation
  try {
    const server = new SlamBedMCPServer();
    tests.push({
      name: "SlamBedMCPServer - should instantiate successfully",
      passed: server instanceof SlamBedMCPServer,
      details: "MCP server created",
    });

    // Test server has required properties
    tests.push({
      name: "SlamBedMCPServer - should have required properties",
      passed:
        typeof server.server === "object" &&
        typeof server.setupToolHandlers === "function" &&
        typeof server.setupErrorHandling === "function" &&
        typeof server.registerTools === "function" &&
        typeof server.addTool === "function",
      details: "All required methods and properties present",
    });

    // Test tool registration (without actually starting server)
    server.tools = []; // Initialize tools array for testing
    server.registerTools();

    tests.push({
      name: "SlamBedMCPServer - should register tools",
      passed: Array.isArray(server.tools) && server.tools.length > 0,
      details: `Registered ${server.tools.length} tools`,
    });

    // Test tool categories are present
    const toolNames = server.tools.map((tool) => tool.name);

    const hasGitFlowTools = toolNames.some((name) =>
      name.startsWith("github_flow_"),
    );
    const hasAutomationTools = toolNames.some((name) =>
      ["auto_commit", "quick_commit", "smart_commit"].includes(name),
    );
    const hasUtilityTools = toolNames.some((name) =>
      ["repo_info", "analyze_changes", "list_branches"].includes(name),
    );

    tests.push({
      name: "SlamBedMCPServer - should have git flow tools",
      passed: hasGitFlowTools,
      details: `Git flow tools present: ${hasGitFlowTools}`,
    });

    tests.push({
      name: "SlamBedMCPServer - should have automation tools",
      passed: hasAutomationTools,
      details: `Automation tools present: ${hasAutomationTools}`,
    });

    tests.push({
      name: "SlamBedMCPServer - should have utility tools",
      passed: hasUtilityTools,
      details: `Utility tools present: ${hasUtilityTools}`,
    });

    // Test tool structure
    if (server.tools.length > 0) {
      const firstTool = server.tools[0];
      tests.push({
        name: "SlamBedMCPServer - tools should have required structure",
        passed:
          typeof firstTool === "object" &&
          typeof firstTool.name === "string" &&
          typeof firstTool.description === "string" &&
          typeof firstTool.inputSchema === "object" &&
          typeof firstTool.handler === "function",
        details: `First tool: ${firstTool.name} - ${firstTool.description.substring(0, 50)}...`,
      });
    }

    // Test specific tool schemas
    const autoCommitTool = server.tools.find(
      (tool) => tool.name === "auto_commit",
    );
    if (autoCommitTool) {
      tests.push({
        name: "SlamBedMCPServer - auto_commit tool should have proper schema",
        passed:
          autoCommitTool.inputSchema.type === "object" &&
          Array.isArray(autoCommitTool.inputSchema.required) &&
          typeof autoCommitTool.inputSchema.properties === "object" &&
          typeof autoCommitTool.inputSchema.properties.message === "object",
        details: `Required fields: ${autoCommitTool.inputSchema.required.join(", ")}`,
      });
    } else {
      tests.push({
        name: "SlamBedMCPServer - auto_commit tool should be present",
        passed: false,
        error: "auto_commit tool not found",
      });
    }

    const featureStartTool = server.tools.find(
      (tool) => tool.name === "github_flow_start",
    );
    if (featureStartTool) {
      tests.push({
        name: "SlamBedMCPServer - github_flow_start tool should have proper schema",
        passed:
          featureStartTool.inputSchema.type === "object" &&
          Array.isArray(featureStartTool.inputSchema.required) &&
          featureStartTool.inputSchema.required.includes("name"),
        details: "GitHub flow start tool properly configured",
      });
    } else {
      tests.push({
        name: "SlamBedMCPServer - github_flow_start tool should be present",
        passed: false,
        error: "github_flow_start tool not found",
      });
    }

    const repoInfoTool = server.tools.find((tool) => tool.name === "repo_info");
    if (repoInfoTool) {
      tests.push({
        name: "SlamBedMCPServer - repo_info tool should have proper schema",
        passed:
          repoInfoTool.inputSchema.type === "object" &&
          typeof repoInfoTool.inputSchema.properties === "object",
        details: "Repository info tool properly configured",
      });
    } else {
      tests.push({
        name: "SlamBedMCPServer - repo_info tool should be present",
        passed: false,
        error: "repo_info tool not found",
      });
    }

    // Test tool counts for each category
    const gitFlowTools = server.tools.filter((tool) =>
      tool.name.startsWith("github_flow_"),
    );
    const automationTools = server.tools.filter((tool) =>
      [
        "auto_commit",
        "quick_commit",
        "smart_commit",
        "sync_branch",
        "squash_commits",
        "undo_commit",
        "batch_commit",
      ].includes(tool.name),
    );
    const utilityTools = server.tools.filter((tool) =>
      [
        "repo_info",
        "analyze_changes",
        "list_branches",
        "commit_history",
        "git_file_status",
        "show_diff",
        "search_code",
        "tag_operations",
        "stash_operations",
        "repo_health_check",
      ].includes(tool.name),
    );

    tests.push({
      name: "SlamBedMCPServer - should have expected number of tools",
      passed:
        gitFlowTools.length >= 8 && // At least 8 github flow tools
        automationTools.length >= 7 && // At least 7 automation tools
        utilityTools.length >= 10, // At least 10 utility tools
      details: `Git Flow: ${gitFlowTools.length}, Automation: ${automationTools.length}, Utility: ${utilityTools.length}`,
    });
  } catch (error) {
    tests.push({
      name: "SlamBedMCPServer - should instantiate successfully",
      passed: false,
      error: error.message,
    });
  }

  // Test error handling setup
  try {
    const server = new SlamBedMCPServer();
    server.setupErrorHandling();

    tests.push({
      name: "SlamBedMCPServer - should setup error handling",
      passed: typeof server.server.onerror === "function",
      details: "Error handler attached to server",
    });
  } catch (error) {
    tests.push({
      name: "SlamBedMCPServer - should setup error handling",
      passed: false,
      error: error.message,
    });
  }

  // Test tool addition
  try {
    const server = new SlamBedMCPServer();
    server.tools = [];

    const testTool = {
      name: "test_tool",
      description: "Test tool for testing",
      inputSchema: {
        type: "object",
        properties: {
          test: { type: "string" },
        },
      },
      handler: async () => ({ success: true }),
    };

    server.addTool(testTool);

    tests.push({
      name: "SlamBedMCPServer - should add tools correctly",
      passed: server.tools.length === 1 && server.tools[0].name === "test_tool",
      details: "Test tool added successfully",
    });
  } catch (error) {
    tests.push({
      name: "SlamBedMCPServer - should add tools correctly",
      passed: false,
      error: error.message,
    });
  }

  return tests;
}

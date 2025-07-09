/**
 * Basic usage examples for glam-mcp
 */

import { GlamMCPServer } from "../src/index.js";
import { showBanner } from "../src/utils/banner.js";

async function basicMCPExample() {
  showBanner();
  console.log("\n🚀 Basic MCP Server Example");
  console.log("===========================");

  // Create and start MCP server
  const server = new GlamMCPServer();

  // This would normally be connected to Claude or another MCP client
  console.log("Server created with tools:");
  console.log("- GitHub Flow Operations (8 tools)");
  console.log("- Automation Features (10 tools)");
  console.log("- Utility Operations (11 tools)");
  console.log("Total: 29+ tools available");

  // Example of calling a tool programmatically
  // (In real usage, this would be done through MCP protocol)
  console.log("\nExample tool call simulation:");
  console.log("Tool: github_flow_status");
  console.log("Result: Repository status and branch information");
}

async function configurationExample() {
  console.log("\n🔧 Configuration Example");
  console.log("=========================");

  // Configuration is stored in .glam.json
  console.log("Configuration file: .glam.json");
  console.log("Example configuration:");
  console.log(`{
  "gitFlow": {
    "defaultBranch": "main",
    "branchPrefixes": {
      "feature": "feat/",
      "bugfix": "bug/"
    }
  },
  "automation": {
    "autoMerge": false,
    "runFormat": true
  }
}`);

  console.log("\nConfiguration is loaded automatically by the MCP server.");
}

async function workflowExamples() {
  console.log("\n🌊 Workflow Examples");
  console.log("====================");

  console.log("1. Auto-commit workflow (via MCP):");
  console.log('   Tool: auto_commit');
  console.log('   Parameters: { message: "Add user authentication" }');
  console.log(
    "   → Creates branch, formats, commits, pushes, creates PR, merges, cleans up",
  );

  console.log("\n2. GitHub Flow (via MCP):");
  console.log("   Tool: github_flow_start");
  console.log('   Parameters: { name: "user-auth" }');
  console.log("   Tool: github_flow_merge");
  console.log('   Parameters: { autoMerge: true }');

  console.log("\n3. Quick development (via MCP):");
  console.log("   Tool: quick_commit");
  console.log("   → Auto-generates message and commits with smart defaults");

  console.log("\n4. Smart analysis (via MCP):");
  console.log("   Tool: smart_commit");
  console.log('   Parameters: { execute: true }');
  console.log("   → Analyzes changes and suggests optimal commit strategy");

  console.log("\n5. GitHub Actions workflows (via MCP):");
  console.log("   Tool: create_pr_workflow");
  console.log("   Tool: create_release_workflow");
  console.log(
    "   → Creates CI/CD workflows for automated testing and releases",
  );
}

async function integrationExample() {
  console.log("\n🔗 Integration Example");
  console.log("======================");

  console.log("MCP Client Integration:");
  console.log("Add to Claude Desktop config:");
  console.log(`{
  "mcpServers": {
    "glam": {
      "command": "node",
      "args": ["${process.cwd()}/src/index.js"]
    }
  }
}`);

  console.log("\nConfiguration CLI Tool:");
  console.log("Available command:");
  console.log("- glam-config (configuration generator)");
  console.log("  Commands: generate, validate, test, list, setup");
}

async function customizationExample() {
  console.log("\n⚙️  Customization Example");
  console.log("=========================");

  console.log("Create .glam.json in your project:");
  console.log(`{
  "gitFlow": {
    "branchPrefixes": {
      "feature": "feat/",
      "bugfix": "bug/",
      "chore": "chore/"
    },
    "autoMerge": false
  },
  "automation": {
    "runFormat": true,
    "runLint": true,
    "runTests": true
  },
  "branchNaming": {
    "maxLength": 40,
    "includeDate": false
  }
}`);

  console.log("\nEnvironment variables:");
  console.log("export GLAM_AUTO_MERGE=false");
  console.log("export GLAM_DEFAULT_BRANCH=develop");
  console.log("export GLAM_VERBOSE=true");
}

// Run examples
async function runExamples() {
  try {
    await basicMCPExample();
    await configurationExample();
    await workflowExamples();
    await integrationExample();
    await customizationExample();

    console.log("\n🎉 Examples completed!");
    console.log("\nNext steps:");
    console.log("1. Install: npm install -g glam-mcp");
    console.log("2. Configure: Create .glam.json (or use glam-config generate)");
    console.log("3. Add to Claude Desktop config for MCP usage");
    console.log("4. Use tools through Claude or other MCP clients");
  } catch (error) {
    console.error("Example failed:", error.message);
  }
}

// Run examples
runExamples();

export {
  basicMCPExample,
  configurationExample,
  workflowExamples,
  integrationExample,
  customizationExample,
};

#!/usr/bin/env node

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

  // Get current configuration
  const currentConfig = config.getAll();
  console.log("Current default branch:", config.get("gitFlow.defaultBranch"));
  console.log("Auto-merge enabled:", config.get("automation.autoMerge"));
  console.log("Format script enabled:", config.get("automation.runFormat"));

  // Get tool-specific configuration
  const autoCommitConfig = config.getToolConfig("auto-commit");
  console.log("\nAuto-commit configuration:", autoCommitConfig);

  // Validate configuration
  const validation = config.validate();
  console.log("\nConfiguration valid:", validation.valid);
  if (!validation.valid) {
    console.log("Errors:", validation.errors);
  }
}

async function workflowExamples() {
  console.log("\n🌊 Workflow Examples");
  console.log("====================");

  console.log("1. Auto-commit workflow:");
  console.log('   glam auto commit -m "Add user authentication"');
  console.log(
    "   → Creates branch, formats, commits, pushes, creates PR, merges, cleans up",
  );

  console.log("\n2. GitHub Flow:");
  console.log("   glam-flow start user-auth");
  console.log("   glam-flow finish --auto-merge");

  console.log("\n3. Quick development:");
  console.log("   glam-commit quick");
  console.log("   → Auto-generates message and commits with smart defaults");

  console.log("\n4. Smart analysis:");
  console.log("   glam-commit smart --execute");
  console.log("   → Analyzes changes and suggests optimal commit strategy");

  console.log("\n5. GitHub Actions workflows:");
  console.log("   glam auto create-pr-workflow");
  console.log("   glam-commit create-release-workflow");
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

  console.log("\nCLI Integration:");
  console.log("Available commands:");
  console.log("- glam (main CLI)");
  console.log("- glam-commit (automation focus)");
  console.log("- glam-flow (GitHub Flow focus)");
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
    console.log("2. Configure: Create .glam.json");
    console.log('3. Use CLI: glam auto commit -m "Your message"');
    console.log("4. Or MCP: Add to Claude Desktop config");
  } catch (error) {
    console.error("Example failed:", error.message);
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runExamples();
}

export {
  basicMCPExample,
  configurationExample,
  workflowExamples,
  integrationExample,
  customizationExample,
};

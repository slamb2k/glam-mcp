import { jest } from "@jest/globals";

// Mock dependencies before imports
jest.mock("fs");
jest.mock("../../../src/core/tool-registry.js");
jest.mock("../../../src/services/tool-documentation.js");
jest.mock("../../../src/clients/git-client.js");

describe("Documentation Tools", () => {
  let registerDocumentationTools;
  let fs;
  let toolRegistry;
  let toolDocumentation;
  let GitClient;
  let server;
  let registeredTools;

  beforeEach(async () => {
    jest.clearAllMocks();
    
    // Import mocked modules
    fs = await import("fs");
    const toolRegistryModule = await import("../../../src/core/tool-registry.js");
    toolRegistry = toolRegistryModule.toolRegistry;
    
    const toolDocModule = await import("../../../src/services/tool-documentation.js");
    toolDocumentation = toolDocModule.toolDocumentation;
    
    const gitClientModule = await import("../../../src/clients/git-client.js");
    GitClient = gitClientModule.GitClient;
    
    // Import the function to test
    const docModule = await import("../../../src/tools/documentation.js");
    registerDocumentationTools = docModule.registerDocumentationTools;
    
    // Mock server
    server = {
      addTool: jest.fn((tool) => {
        registeredTools.push(tool);
      }),
    };
    registeredTools = [];

    // Default mocks
    fs.promises = {
      mkdir: jest.fn(),
      writeFile: jest.fn(),
      readFile: jest.fn(),
      readdir: jest.fn(() => []),
      stat: jest.fn(() => ({ isDirectory: () => true })),
    };
    
    toolRegistry.getStatistics = jest.fn(() => ({
      totalTools: 25,
      totalCategories: 5,
      toolsByCategory: {
        'github-flow': 5,
        'automation': 8,
        'utilities': 6,
        'context': 3,
        'safety': 3
      }
    }));
    
    toolRegistry.listCategories = jest.fn(() => [
      { name: 'github-flow', count: 5 },
      { name: 'automation', count: 8 },
      { name: 'utilities', count: 6 },
      { name: 'context', count: 3 },
      { name: 'safety', count: 3 }
    ]);
    
    toolRegistry.getAllTools = jest.fn(() => [
      {
        name: 'github_flow_start',
        description: 'Start a new GitHub flow branch',
        metadata: { category: 'github-flow', tags: ['git', 'branch'] }
      },
      {
        name: 'auto_commit',
        description: 'Automatically generate and create commits',
        metadata: { category: 'automation', tags: ['git', 'commit'] }
      }
    ]);
    
    toolRegistry.getToolsByCategory = jest.fn((category) => {
      const tools = toolRegistry.getAllTools();
      return tools.filter(t => t.metadata.category === category);
    });
    
    toolRegistry.getTool = jest.fn((name) => {
      const tools = toolRegistry.getAllTools();
      return tools.find(t => t.name === name);
    });
    
    toolDocumentation.generateToolDocumentation = jest.fn((tool) => ({
      markdown: `# ${tool.name}\n\n${tool.description}\n\n## Usage\n...`,
      sections: ['description', 'usage', 'examples']
    }));
    
    toolDocumentation.generateBatchDocumentation = jest.fn((tools) => {
      const docs = {};
      tools.forEach(tool => {
        docs[tool.name] = toolDocumentation.generateToolDocumentation(tool);
      });
      return docs;
    });
    
    GitClient.mockImplementation(() => ({
      getRepoInfo: jest.fn(() => ({
        name: 'glam-mcp',
        remoteUrl: 'https://github.com/user/glam-mcp.git'
      })),
      getRecentCommits: jest.fn(() => [
        {
          hash: 'abc123',
          message: 'feat: Add new feature',
          author: 'John Doe',
          date: '2024-01-15T10:00:00Z'
        }
      ])
    }));

    // Register tools
    registerDocumentationTools(server);
  });

  describe("generate_project_docs", () => {
    let generateProjectDocsTool;

    beforeEach(() => {
      generateProjectDocsTool = registeredTools.find(t => t.name === "generate_project_docs");
    });

    it("should be registered with correct metadata", () => {
      expect(generateProjectDocsTool).toBeDefined();
      expect(generateProjectDocsTool.description).toContain("Generate comprehensive project documentation");
      expect(generateProjectDocsTool.inputSchema.properties).toHaveProperty("output_path");
      expect(generateProjectDocsTool.inputSchema.properties).toHaveProperty("include_api_reference");
    });

    it("should generate all documentation sections", async () => {
      const writtenFiles = {};
      fs.promises.writeFile.mockImplementation((path, content) => {
        writtenFiles[path] = content;
      });

      const result = await generateProjectDocsTool.handler({
        output_path: "./docs",
        include_api_reference: true,
        include_examples: true,
        include_changelog: true,
        include_configuration: true,
        include_architecture: true
      });

      expect(result.success).toBe(true);
      expect(fs.promises.mkdir).toHaveBeenCalledWith("./docs", { recursive: true });
      
      // Check README was generated
      expect(writtenFiles).toHaveProperty("docs/README.md");
      expect(writtenFiles["docs/README.md"]).toContain("# glam-mcp");
      expect(writtenFiles["docs/README.md"]).toContain("25 development tools");
      expect(writtenFiles["docs/README.md"]).toContain("5 categories");
      
      // Check other sections
      expect(writtenFiles).toHaveProperty("docs/API.md");
      expect(writtenFiles).toHaveProperty("docs/EXAMPLES.md");
      expect(writtenFiles).toHaveProperty("docs/CHANGELOG.md");
      expect(writtenFiles).toHaveProperty("docs/CONFIGURATION.md");
      expect(writtenFiles).toHaveProperty("docs/ARCHITECTURE.md");
      
      expect(result.data.sections).toHaveLength(6);
    });

    it("should respect section inclusion options", async () => {
      const writtenFiles = {};
      fs.promises.writeFile.mockImplementation((path, content) => {
        writtenFiles[path] = content;
      });

      const result = await generateProjectDocsTool.handler({
        include_api_reference: false,
        include_examples: false,
        include_changelog: false,
        include_configuration: false,
        include_architecture: false
      });

      expect(result.success).toBe(true);
      expect(Object.keys(writtenFiles)).toHaveLength(1); // Only README
      expect(writtenFiles).toHaveProperty("docs/README.md");
    });
  });

  describe("generate_tool_docs", () => {
    let generateToolDocsTool;

    beforeEach(() => {
      generateToolDocsTool = registeredTools.find(t => t.name === "generate_tool_docs");
    });

    it("should generate documentation for all tools", async () => {
      const writtenFiles = {};
      fs.promises.writeFile.mockImplementation((path, content) => {
        writtenFiles[path] = content;
      });

      const result = await generateToolDocsTool.handler({
        output_path: "./docs/tools"
      });

      expect(result.success).toBe(true);
      expect(fs.promises.mkdir).toHaveBeenCalledWith("docs/tools", { recursive: true });
      expect(writtenFiles).toHaveProperty("docs/tools/github_flow_start.md");
      expect(writtenFiles).toHaveProperty("docs/tools/auto_commit.md");
      expect(result.data.totalTools).toBe(2);
    });

    it("should generate docs for specific category", async () => {
      const writtenFiles = {};
      fs.promises.writeFile.mockImplementation((path, content) => {
        writtenFiles[path] = content;
      });

      const result = await generateToolDocsTool.handler({
        category: "automation"
      });

      expect(result.success).toBe(true);
      expect(writtenFiles).toHaveProperty("docs/tools/auto_commit.md");
      expect(Object.keys(writtenFiles)).toHaveLength(1);
    });

    it("should generate docs for specific tools", async () => {
      const writtenFiles = {};
      fs.promises.writeFile.mockImplementation((path, content) => {
        writtenFiles[path] = content;
      });

      const result = await generateToolDocsTool.handler({
        tools: ["github_flow_start"]
      });

      expect(result.success).toBe(true);
      expect(writtenFiles).toHaveProperty("docs/tools/github_flow_start.md");
      expect(Object.keys(writtenFiles)).toHaveLength(1);
    });
  });

  describe("update_tool_catalog", () => {
    let updateToolCatalogTool;

    beforeEach(() => {
      updateToolCatalogTool = registeredTools.find(t => t.name === "update_tool_catalog");
    });

    it("should generate tool catalog", async () => {
      let capturedContent = "";
      fs.promises.writeFile.mockImplementation((path, content) => {
        if (path.includes("CATALOG.md")) capturedContent = content;
      });

      const result = await updateToolCatalogTool.handler({
        include_examples: true,
        group_by_category: true
      });

      expect(result.success).toBe(true);
      expect(capturedContent).toContain("# Tool Catalog");
      expect(capturedContent).toContain("## GitHub Flow");
      expect(capturedContent).toContain("## Automation");
      expect(capturedContent).toContain("github_flow_start");
      expect(capturedContent).toContain("auto_commit");
      expect(capturedContent).toContain("### Examples");
    });

    it("should generate catalog in different formats", async () => {
      let capturedContent = "";
      fs.promises.writeFile.mockImplementation((path, content) => {
        capturedContent = content;
      });

      const result = await updateToolCatalogTool.handler({
        format: "json"
      });

      expect(result.success).toBe(true);
      const parsed = JSON.parse(capturedContent);
      expect(parsed).toHaveProperty("tools");
      expect(parsed).toHaveProperty("categories");
      expect(parsed).toHaveProperty("metadata");
    });
  });

  describe("generate_api_reference", () => {
    let generateApiReferenceTool;

    beforeEach(() => {
      generateApiReferenceTool = registeredTools.find(t => t.name === "generate_api_reference");
    });

    it("should generate API reference", async () => {
      let capturedContent = "";
      fs.promises.writeFile.mockImplementation((path, content) => {
        if (path.includes("API.md")) capturedContent = content;
      });

      const result = await generateApiReferenceTool.handler({
        include_schemas: true,
        include_response_types: true
      });

      expect(result.success).toBe(true);
      expect(capturedContent).toContain("# API Reference");
      expect(capturedContent).toContain("## Input Schemas");
      expect(capturedContent).toContain("## Response Types");
      expect(capturedContent).toContain("github_flow_start");
    });
  });

  describe("check_docs_completeness", () => {
    let checkDocsCompletenessTool;

    beforeEach(() => {
      checkDocsCompletenessTool = registeredTools.find(t => t.name === "check_docs_completeness");
    });

    it("should check documentation completeness", async () => {
      fs.promises.readdir.mockImplementation((path) => {
        if (path.includes("tools")) {
          return ["github_flow_start.md"];
        }
        return ["README.md", "API.md"];
      });

      const result = await checkDocsCompletenessTool.handler({
        docs_path: "./docs"
      });

      expect(result.success).toBe(true);
      expect(result.data.coverage.toolDocs).toBe(50); // 1 of 2 tools documented
      expect(result.data.missingToolDocs).toContain("auto_commit");
      expect(result.data.existingFiles).toContain("README.md");
    });

    it("should identify missing standard files", async () => {
      fs.promises.readdir.mockResolvedValue([]);

      const result = await checkDocsCompletenessTool.handler({});

      expect(result.success).toBe(true);
      expect(result.data.missingFiles).toContain("README.md");
      expect(result.data.missingFiles).toContain("CHANGELOG.md");
      expect(result.data.coverage.overallScore).toBeLessThan(50);
    });
  });

  describe("create_quick_reference", () => {
    let createQuickReferenceTool;

    beforeEach(() => {
      createQuickReferenceTool = registeredTools.find(t => t.name === "create_quick_reference");
    });

    it("should create quick reference guide", async () => {
      let capturedContent = "";
      fs.promises.writeFile.mockImplementation((path, content) => {
        capturedContent = content;
      });

      const result = await createQuickReferenceTool.handler({
        include_common_workflows: true,
        include_tips: true
      });

      expect(result.success).toBe(true);
      expect(capturedContent).toContain("# Quick Reference");
      expect(capturedContent).toContain("## Common Commands");
      expect(capturedContent).toContain("## Common Workflows");
      expect(capturedContent).toContain("## Pro Tips");
      expect(capturedContent).toContain("github_flow_start");
    });
  });

  describe("generate_migration_guide", () => {
    let generateMigrationGuideTool;

    beforeEach(() => {
      generateMigrationGuideTool = registeredTools.find(t => t.name === "generate_migration_guide");
    });

    it("should generate migration guide", async () => {
      let capturedContent = "";
      fs.promises.writeFile.mockImplementation((path, content) => {
        capturedContent = content;
      });

      const result = await generateMigrationGuideTool.handler({
        from_version: "1.0",
        to_version: "2.0"
      });

      expect(result.success).toBe(true);
      expect(capturedContent).toContain("# Migration Guide");
      expect(capturedContent).toContain("1.0 → 2.0");
      expect(capturedContent).toContain("## Breaking Changes");
      expect(capturedContent).toContain("## New Features");
    });
  });
});
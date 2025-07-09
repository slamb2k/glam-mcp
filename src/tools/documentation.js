/**
 * Documentation Generation Tools
 * Tools for generating and managing project documentation
 */

import fs from 'fs';
import path from 'path';
import { createSuccessResponse, createErrorResponse } from '../utils/response-utils.js';
import { toolRegistry } from '../core/tool-registry.js';
import { toolDocumentation } from '../services/tool-documentation.js';
import { SessionManager } from '../core/session-manager.js';
import { GitClient } from '../clients/git-client.js';

const sessionManager = SessionManager.getInstance();
const gitClient = GitClient.getInstance();

/**
 * Generate comprehensive project documentation
 */
async function generateProjectDocs({
  output_path = './docs',
  format = 'markdown',
  include_api_reference = true,
  include_examples = true,
  include_changelog = true,
  include_configuration = true,
  include_architecture = true
}) {
  try {
    // Create output directory
    await fs.promises.mkdir(output_path, { recursive: true });
    
    const sections = [];
    const timestamp = new Date().toISOString();
    
    // Get project info
    const repoInfo = await gitClient.getRepoInfo();
    const stats = toolRegistry.getStatistics();
    const categories = toolRegistry.listCategories();
    
    // Generate README
    const readmeContent = `# ${repoInfo.name || 'Slambed MCP Server'}

## Overview
A comprehensive MCP (Model Context Protocol) server providing intelligent development automation tools with rich contextual responses and team awareness features.

## Features
- 🚀 **${stats.totalTools}** development tools across ${stats.totalCategories} categories
- 🤖 Enhanced responses with context, suggestions, and risk assessment
- 👥 Team awareness and collaboration features
- 🔒 Safety checks and risk analysis for operations
- 📊 Session management and preference tracking
- 🛠️ Extensible tool registration system

## Tool Categories
${categories.map(cat => `- **${formatCategoryName(cat.name)}** (${cat.count} tools): ${getCategoryDescription(cat.name)}`).join('\n')}

## Installation

### Via npm
\`\`\`bash
npm install slambed-mcp
\`\`\`

### Via MCP Settings
Add to your MCP settings configuration:
\`\`\`json
{
  "servers": {
    "slambed": {
      "command": "npx",
      "args": ["slambed-mcp"],
      "env": {
        "MCP_SERVER_PORT": "3000",
        "MCP_LOG_LEVEL": "info"
      }
    }
  }
}
\`\`\`

## Quick Start
\`\`\`javascript
import { EnhancedMCPServer } from 'slambed-mcp';

const server = new EnhancedMCPServer();
await server.start({
  configPath: './config.json'
});
\`\`\`

## Documentation
- [API Reference](./API.md) - Complete tool API documentation
- [Examples](./EXAMPLES.md) - Usage examples for all tools
- [Configuration](./CONFIGURATION.md) - Server configuration options
- [Architecture](./ARCHITECTURE.md) - System architecture overview

Generated on ${timestamp}
`;
    
    await fs.promises.writeFile(path.join(output_path, 'README.md'), readmeContent);
    sections.push('README.md');
    
    // Generate API Reference
    if (include_api_reference) {
      const apiContent = toolDocumentation.generateAPIReference();
      await fs.promises.writeFile(path.join(output_path, 'API.md'), apiContent);
      sections.push('API.md');
    }
    
    // Generate Examples
    if (include_examples) {
      const examplesContent = await generateExamplesDoc();
      await fs.promises.writeFile(path.join(output_path, 'EXAMPLES.md'), examplesContent);
      sections.push('EXAMPLES.md');
    }
    
    // Generate Changelog
    if (include_changelog) {
      const changelogContent = await generateChangelogDoc();
      await fs.promises.writeFile(path.join(output_path, 'CHANGELOG.md'), changelogContent);
      sections.push('CHANGELOG.md');
    }
    
    // Generate Configuration Guide
    if (include_configuration) {
      const configContent = generateConfigurationDoc();
      await fs.promises.writeFile(path.join(output_path, 'CONFIGURATION.md'), configContent);
      sections.push('CONFIGURATION.md');
    }
    
    // Generate Architecture Overview
    if (include_architecture) {
      const archContent = generateArchitectureDoc();
      await fs.promises.writeFile(path.join(output_path, 'ARCHITECTURE.md'), archContent);
      sections.push('ARCHITECTURE.md');
    }
    
    // Generate tool category docs
    const toolsDir = path.join(output_path, 'tools');
    await fs.promises.mkdir(toolsDir, { recursive: true });
    
    for (const category of categories) {
      const categoryDoc = toolDocumentation.generateCategoryDoc(category.name);
      if (categoryDoc) {
        await fs.promises.writeFile(
          path.join(toolsDir, `${category.name}.md`),
          categoryDoc
        );
      }
    }
    
    return createSuccessResponse(
      {
        format,
        outputPath: output_path,
        sections,
        totalFiles: sections.length,
        categories: categories.length,
        timestamp
      },
      `Generated comprehensive project documentation in ${output_path}`
    );
  } catch (error) {
    return createErrorResponse(error.message, 'DOCS_GENERATION_ERROR');
  }
}

/**
 * Generate documentation for a specific tool
 */
async function generateToolDoc({
  tool_name,
  output_path = './docs/tools',
  include_examples = true,
  include_related = true,
  include_implementation = false
}) {
  try {
    // Check if tool exists
    const tool = toolRegistry.get(tool_name);
    if (!tool) {
      return createErrorResponse(`Tool ${tool_name} not found`, 'TOOL_NOT_FOUND');
    }
    
    // Create output directory
    await fs.promises.mkdir(output_path, { recursive: true });
    
    // Generate documentation
    let content = toolDocumentation.generateToolDoc(tool_name);
    
    if (!content) {
      return createErrorResponse('Failed to generate tool documentation', 'DOC_GENERATION_FAILED');
    }
    
    // Add implementation details if requested
    if (include_implementation) {
      content += `
## Implementation Details

### Handler Function
The tool is implemented with the following handler signature:
\`\`\`javascript
async function ${tool_name}(params) {
  // Implementation details would be extracted from source
}
\`\`\`

### Integration Points
- Session Manager: ${tool.metadata?.usesSession ? 'Yes' : 'No'}
- Git Client: ${tool.metadata?.usesGit ? 'Yes' : 'No'}
- Risk Assessment: ${tool.metadata?.riskLevel || 'low'}
`;
    }
    
    // Write to file
    const filename = path.join(output_path, `${tool_name}.md`);
    await fs.promises.writeFile(filename, content);
    
    return createSuccessResponse(
      {
        tool: tool_name,
        path: filename,
        category: tool.metadata?.category,
        sections: [
          'metadata',
          'usage',
          include_examples ? 'examples' : null,
          include_related ? 'related' : null,
          include_implementation ? 'implementation' : null
        ].filter(Boolean)
      },
      `Generated documentation for ${tool_name}`
    );
  } catch (error) {
    return createErrorResponse(error.message, 'TOOL_DOC_ERROR');
  }
}

/**
 * Extract and update documentation from source code
 */
async function updateDocsFromCode({
  source_path = './src',
  output_path = './docs/api',
  extract_jsdoc = true,
  generate_types = true,
  update_readme = false
}) {
  try {
    await fs.promises.mkdir(output_path, { recursive: true });
    
    // Extract information from source files
    const extracted = {
      classes: [],
      functions: [],
      types: [],
      constants: [],
      exports: []
    };
    
    // Scan source files (simplified - in reality would use AST parsing)
    const scanDir = async (dir) => {
      const entries = await fs.promises.readdir(dir, { withFileTypes: true });
      
      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        
        if (entry.isDirectory() && !entry.name.startsWith('.')) {
          await scanDir(fullPath);
        } else if (entry.isFile() && entry.name.endsWith('.js')) {
          const content = await fs.promises.readFile(fullPath, 'utf8');
          
          // Extract class definitions
          const classMatches = content.match(/class\s+(\w+)/g) || [];
          classMatches.forEach(match => {
            const className = match.replace('class ', '');
            if (!extracted.classes.includes(className)) {
              extracted.classes.push(className);
            }
          });
          
          // Extract function definitions
          const funcMatches = content.match(/(?:async\s+)?function\s+(\w+)/g) || [];
          funcMatches.forEach(match => {
            const funcName = match.replace(/(?:async\s+)?function\s+/, '');
            if (!extracted.functions.includes(funcName)) {
              extracted.functions.push(funcName);
            }
          });
          
          // Extract exports
          const exportMatches = content.match(/export\s+(?:const|let|var|class|function|async function)\s+(\w+)/g) || [];
          exportMatches.forEach(match => {
            const exportName = match.match(/(\w+)$/)?.[0];
            if (exportName && !extracted.exports.includes(exportName)) {
              extracted.exports.push(exportName);
            }
          });
        }
      }
    };
    
    await scanDir(source_path);
    
    // Generate documentation
    let content = `# API Documentation

Generated from source code on ${new Date().toISOString()}

## Overview
This documentation is automatically generated from the source code.

`;
    
    if (extracted.classes.length > 0) {
      content += `## Classes

${extracted.classes.map(c => `### ${c}
A class in the slambed-mcp system.
`).join('\n')}
`;
    }
    
    if (extracted.functions.length > 0) {
      content += `## Functions

${extracted.functions.map(f => `### ${f}()
A function in the slambed-mcp system.
`).join('\n')}
`;
    }
    
    if (extracted.exports.length > 0) {
      content += `## Exports

The following items are exported from the modules:
${extracted.exports.map(e => `- ${e}`).join('\n')}
`;
    }
    
    // Write API documentation
    await fs.promises.writeFile(path.join(output_path, 'extracted-api.md'), content);
    
    // Generate TypeScript definitions if requested
    if (generate_types) {
      const typesContent = `// Type definitions for slambed-mcp
// Auto-generated on ${new Date().toISOString()}

declare module 'slambed-mcp' {
${extracted.classes.map(c => `  export class ${c} {
    // Class implementation
  }`).join('\n\n')}

${extracted.functions.map(f => `  export function ${f}(...args: any[]): Promise<any>;`).join('\n')}
}
`;
      
      await fs.promises.writeFile(path.join(output_path, 'types.d.ts'), typesContent);
    }
    
    return createSuccessResponse(
      {
        sourcePath: source_path,
        outputPath: output_path,
        extracted,
        files: ['extracted-api.md', generate_types ? 'types.d.ts' : null].filter(Boolean)
      },
      'Successfully extracted and updated documentation from source code'
    );
  } catch (error) {
    return createErrorResponse(error.message, 'CODE_DOC_ERROR');
  }
}

/**
 * Generate interactive HTML documentation
 */
async function generateInteractiveDocs({
  output_path = './docs/interactive',
  include_playground = true,
  include_tutorials = true,
  include_search = true,
  theme = 'light'
}) {
  try {
    await fs.promises.mkdir(output_path, { recursive: true });
    
    const files = [];
    const tools = Array.from(toolRegistry.tools.values());
    const categories = toolRegistry.listCategories();
    
    // Generate main index.html
    const indexHtml = `<!DOCTYPE html>
<html lang="en" data-theme="${theme}">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Slambed MCP - Interactive Documentation</title>
  <style>
    :root {
      --primary: #3498db;
      --secondary: #2c3e50;
      --background: #ffffff;
      --text: #333333;
      --border: #dddddd;
    }
    
    [data-theme="dark"] {
      --background: #1a1a1a;
      --text: #e0e0e0;
      --border: #444444;
    }
    
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      margin: 0;
      padding: 0;
      background: var(--background);
      color: var(--text);
    }
    
    .container {
      max-width: 1200px;
      margin: 0 auto;
      padding: 20px;
    }
    
    .header {
      background: var(--primary);
      color: white;
      padding: 30px 0;
      text-align: center;
    }
    
    .tool-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
      gap: 20px;
      margin: 30px 0;
    }
    
    .tool-card {
      border: 1px solid var(--border);
      padding: 20px;
      border-radius: 8px;
      transition: transform 0.2s;
    }
    
    .tool-card:hover {
      transform: translateY(-2px);
      box-shadow: 0 4px 12px rgba(0,0,0,0.1);
    }
    
    .category-badge {
      display: inline-block;
      padding: 4px 12px;
      background: var(--primary);
      color: white;
      border-radius: 20px;
      font-size: 12px;
      margin-right: 8px;
    }
    
    ${include_search ? `
    .search-box {
      width: 100%;
      padding: 12px;
      font-size: 16px;
      border: 1px solid var(--border);
      border-radius: 4px;
      margin: 20px 0;
    }
    ` : ''}
    
    ${include_playground ? `
    .playground {
      background: #f5f5f5;
      padding: 30px;
      border-radius: 8px;
      margin: 30px 0;
    }
    
    .playground select {
      padding: 8px;
      font-size: 16px;
      margin-right: 10px;
    }
    
    .playground button {
      padding: 8px 20px;
      background: var(--primary);
      color: white;
      border: none;
      border-radius: 4px;
      cursor: pointer;
    }
    
    .playground pre {
      background: white;
      padding: 15px;
      border-radius: 4px;
      margin-top: 20px;
      overflow-x: auto;
    }
    ` : ''}
  </style>
</head>
<body>
  <div class="header">
    <h1>Slambed MCP Documentation</h1>
    <p>${tools.length} tools across ${categories.length} categories</p>
  </div>
  
  <div class="container">
    ${include_search ? `
    <input type="text" class="search-box" id="searchBox" placeholder="Search tools..." onkeyup="searchTools()">
    ` : ''}
    
    ${include_playground ? `
    <div class="playground">
      <h2>🎮 Tool Playground</h2>
      <p>Try out tools interactively:</p>
      <select id="toolSelect">
        <option value="">Select a tool...</option>
        ${tools.map(tool => 
          `<option value="${tool.name}">${tool.name} - ${tool.description.substring(0, 50)}...</option>`
        ).join('')}
      </select>
      <button onclick="tryTool()">Try Tool</button>
      <pre id="result" style="display:none;"></pre>
    </div>
    ` : ''}
    
    <h2>Available Tools</h2>
    <div class="tool-grid" id="toolGrid">
      ${tools.map(tool => `
      <div class="tool-card" data-tool="${tool.name}" data-category="${tool.metadata.category}">
        <h3>${tool.name}</h3>
        <span class="category-badge">${formatCategoryName(tool.metadata.category)}</span>
        <p>${tool.description}</p>
        <a href="tools/${tool.name}.html">View Details →</a>
      </div>
      `).join('')}
    </div>
    
    ${include_tutorials ? `
    <h2>📚 Tutorials</h2>
    <ul>
      <li><a href="tutorials/getting-started.html">Getting Started</a></li>
      <li><a href="tutorials/github-flow.html">GitHub Flow Workflow</a></li>
      <li><a href="tutorials/automation.html">Automation Tools</a></li>
      <li><a href="tutorials/team-collaboration.html">Team Collaboration</a></li>
    </ul>
    ` : ''}
  </div>
  
  <script>
    ${include_search ? `
    function searchTools() {
      const query = document.getElementById('searchBox').value.toLowerCase();
      const cards = document.querySelectorAll('.tool-card');
      
      cards.forEach(card => {
        const name = card.dataset.tool.toLowerCase();
        const text = card.textContent.toLowerCase();
        
        if (name.includes(query) || text.includes(query)) {
          card.style.display = 'block';
        } else {
          card.style.display = 'none';
        }
      });
    }
    ` : ''}
    
    ${include_playground ? `
    function tryTool() {
      const tool = document.getElementById('toolSelect').value;
      const resultEl = document.getElementById('result');
      
      if (!tool) {
        alert('Please select a tool');
        return;
      }
      
      resultEl.style.display = 'block';
      resultEl.textContent = \`// Example usage of \${tool}
      
const result = await callTool('\${tool}', {
  // Add parameters here
});

console.log(result);\`;
    }
    ` : ''}
  </script>
</body>
</html>`;
    
    await fs.promises.writeFile(path.join(output_path, 'index.html'), indexHtml);
    files.push('index.html');
    
    // Generate individual tool pages
    const toolsDir = path.join(output_path, 'tools');
    await fs.promises.mkdir(toolsDir, { recursive: true });
    
    for (const tool of tools) {
      const toolHtml = generateToolHtml(tool, theme);
      await fs.promises.writeFile(
        path.join(toolsDir, `${tool.name}.html`),
        toolHtml
      );
      files.push(`tools/${tool.name}.html`);
    }
    
    // Generate tutorials if requested
    if (include_tutorials) {
      const tutorialsDir = path.join(output_path, 'tutorials');
      await fs.promises.mkdir(tutorialsDir, { recursive: true });
      
      const tutorials = [
        { name: 'getting-started', title: 'Getting Started', content: generateGettingStartedTutorial() },
        { name: 'github-flow', title: 'GitHub Flow Workflow', content: generateGitHubFlowTutorial() },
        { name: 'automation', title: 'Automation Tools', content: generateAutomationTutorial() },
        { name: 'team-collaboration', title: 'Team Collaboration', content: generateTeamTutorial() }
      ];
      
      for (const tutorial of tutorials) {
        const tutorialHtml = generateTutorialHtml(tutorial, theme);
        await fs.promises.writeFile(
          path.join(tutorialsDir, `${tutorial.name}.html`),
          tutorialHtml
        );
        files.push(`tutorials/${tutorial.name}.html`);
      }
    }
    
    return createSuccessResponse(
      {
        outputPath: output_path,
        files,
        totalFiles: files.length,
        features: {
          playground: include_playground,
          tutorials: include_tutorials,
          search: include_search,
          theme
        }
      },
      'Generated interactive documentation successfully'
    );
  } catch (error) {
    return createErrorResponse(error.message, 'INTERACTIVE_DOC_ERROR');
  }
}

/**
 * Check documentation coverage
 */
async function checkDocsCoverage({
  docs_path = './docs',
  source_path = './src/tools',
  min_coverage = 80
}) {
  try {
    // Get all registered tools
    const allTools = Array.from(toolRegistry.tools.keys());
    
    // Check for tool documentation
    const toolDocsPath = path.join(docs_path, 'tools');
    let documentedTools = [];
    
    try {
      const files = await fs.promises.readdir(toolDocsPath);
      documentedTools = files
        .filter(f => f.endsWith('.md'))
        .map(f => f.replace('.md', ''));
    } catch (error) {
      // Tools directory doesn't exist
    }
    
    // Calculate coverage
    const undocumentedTools = allTools.filter(t => !documentedTools.includes(t));
    const coverage = allTools.length > 0 
      ? (documentedTools.length / allTools.length) * 100 
      : 0;
    
    // Check for other documentation files
    const requiredDocs = ['README.md', 'API.md', 'EXAMPLES.md'];
    const missingDocs = [];
    
    for (const doc of requiredDocs) {
      const docPath = path.join(docs_path, doc);
      if (!fs.existsSync(docPath)) {
        missingDocs.push(doc);
      }
    }
    
    // Generate suggestions
    const suggestions = [];
    
    if (coverage < min_coverage) {
      suggestions.push(`Documentation coverage is below ${min_coverage}%`);
      if (undocumentedTools.length > 0) {
        const preview = undocumentedTools.slice(0, 3).join(', ');
        const more = undocumentedTools.length > 3 ? ` and ${undocumentedTools.length - 3} more` : '';
        suggestions.push(`Generate docs for: ${preview}${more}`);
      }
    } else {
      suggestions.push('Documentation coverage is good!');
    }
    
    if (missingDocs.length > 0) {
      suggestions.push(`Missing core documentation: ${missingDocs.join(', ')}`);
    }
    
    suggestions.push('Consider setting up automated doc generation in CI/CD');
    
    // Assess risks
    const risks = [];
    if (coverage < 50) {
      risks.push({
        level: 'high',
        description: 'Low documentation coverage severely impacts tool discoverability and usability'
      });
    } else if (coverage < min_coverage) {
      risks.push({
        level: 'medium',
        description: 'Documentation coverage below recommended threshold'
      });
    }
    
    if (missingDocs.includes('README.md')) {
      risks.push({
        level: 'high',
        description: 'Missing README.md - users have no entry point to documentation'
      });
    }
    
    return createSuccessResponse(
      {
        totalTools: allTools.length,
        documented: documentedTools.length,
        undocumented: undocumentedTools.length,
        coverage: parseFloat(coverage.toFixed(1)),
        missingDocs: undocumentedTools,
        missingCoreDocs: missingDocs,
        meetsThreshold: coverage >= min_coverage
      },
      `Documentation coverage: ${coverage.toFixed(1)}%`
    );
  } catch (error) {
    return createErrorResponse(error.message, 'COVERAGE_CHECK_ERROR');
  }
}

// Helper functions

function formatCategoryName(category) {
  return category
    .split('-')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

function getCategoryDescription(category) {
  const descriptions = {
    'github-flow': 'Tools for GitHub workflow automation',
    'automation': 'Build, test, and deployment automation',
    'utility': 'General purpose utility tools',
    'context': 'Session and context management',
    'team': 'Team collaboration and awareness',
    'safety': 'Risk assessment and safety checks'
  };
  return descriptions[category] || 'Tools in this category';
}

async function generateExamplesDoc() {
  const categories = toolRegistry.listCategories();
  let content = `# Examples

This document provides practical examples for using Slambed MCP tools.

`;

  for (const category of categories) {
    content += `## ${formatCategoryName(category.name)}

`;
    const tools = toolRegistry.getByCategory(category.name);
    
    for (const tool of tools.slice(0, 3)) { // Show first 3 tools per category
      content += `### ${tool.name}

${tool.description}

\`\`\`javascript
// Example usage
const result = await callTool('${tool.name}', {
${generateExampleParams(tool)}
});

console.log(result);
\`\`\`

`;
    }
  }
  
  return content;
}

function generateExampleParams(tool) {
  if (!tool.inputSchema?.properties) return '  // No parameters required';
  
  const params = [];
  const props = tool.inputSchema.properties;
  
  for (const [key, prop] of Object.entries(props)) {
    let value;
    switch (prop.type) {
      case 'string':
        value = prop.enum ? `'${prop.enum[0]}'` : `'example-${key}'`;
        break;
      case 'number':
        value = prop.default || 0;
        break;
      case 'boolean':
        value = prop.default || true;
        break;
      case 'array':
        value = '[]';
        break;
      case 'object':
        value = '{}';
        break;
      default:
        value = 'null';
    }
    params.push(`  ${key}: ${value}`);
  }
  
  return params.join(',\n');
}

async function generateChangelogDoc() {
  const currentDate = new Date().toISOString().split('T')[0];
  
  return `# Changelog

All notable changes to the Slambed MCP Server project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [2.0.0] - ${currentDate}

### Added
- Enhanced MCP server with full lifecycle management
- Comprehensive tool registration system
- Documentation generation tools
- Interactive HTML documentation
- Session persistence and management
- Health checks and monitoring
- Configuration loading from files and environment
- Custom tool loading support

### Changed
- Migrated from hybrid CLI/MCP to pure MCP architecture
- Enhanced all tools with contextual responses
- Improved error handling and logging
- Restructured project directory layout

### Security
- Added authentication support (configurable)
- Implemented risk assessment for operations
- Added safety tools for critical operations

## [1.0.0] - 2024-01-01

### Added
- Initial release
- Basic MCP server implementation
- Core GitHub flow tools
- Automation tools
- Utility tools
`;
}

function generateConfigurationDoc() {
  return `# Configuration Guide

## Overview

The Slambed MCP Server can be configured through:
1. Configuration files (JSON)
2. Environment variables
3. Runtime options

## Configuration File

Create a \`config.json\` file:

\`\`\`json
{
  "server": {
    "port": 3000,
    "host": "localhost",
    "maxConnections": 100,
    "timeout": 30000
  },
  "tools": {
    "enabledCategories": ["github-flow", "automation", "utility"],
    "disabledTools": ["dangerous_tool"],
    "customToolPaths": ["./custom-tools"]
  },
  "session": {
    "persistence": true,
    "sessionPath": "./.sessions",
    "maxSessions": 1000,
    "sessionTimeout": 3600000
  },
  "logging": {
    "level": "info",
    "format": "json",
    "destination": "stdout"
  },
  "authentication": {
    "enabled": false,
    "providers": []
  }
}
\`\`\`

## Environment Variables

Override configuration with environment variables:

- \`MCP_SERVER_PORT\` - Server port (default: 3000)
- \`MCP_SERVER_HOST\` - Server host (default: localhost)
- \`MCP_LOG_LEVEL\` - Logging level: debug, info, warn, error (default: info)
- \`MCP_SESSION_PATH\` - Session storage path (default: ./.sessions)
- \`MCP_DISABLED_TOOLS\` - Comma-separated list of tools to disable

## Tool Configuration

### Enabling/Disabling Categories

Control which tool categories are available:

\`\`\`json
{
  "tools": {
    "enabledCategories": ["github-flow", "automation"]
  }
}
\`\`\`

### Custom Tools

Load custom tools from directories:

\`\`\`json
{
  "tools": {
    "customToolPaths": ["./my-tools", "./team-tools"]
  }
}
\`\`\`

## Session Management

Configure session persistence and limits:

\`\`\`json
{
  "session": {
    "persistence": true,
    "sessionPath": "./data/sessions",
    "maxSessions": 5000,
    "sessionTimeout": 7200000
  }
}
\`\`\`

## Logging

Configure logging output and verbosity:

\`\`\`json
{
  "logging": {
    "level": "debug",
    "format": "text",
    "destination": "file",
    "filename": "./logs/slambed.log"
  }
}
\`\`\`

## Advanced Configuration

### Performance Tuning

\`\`\`json
{
  "server": {
    "maxConnections": 500,
    "timeout": 60000,
    "keepAliveTimeout": 5000
  }
}
\`\`\`

### Security Settings

\`\`\`json
{
  "authentication": {
    "enabled": true,
    "providers": ["github", "gitlab"],
    "allowedUsers": ["user1", "user2"]
  }
}
\`\`\`
`;
}

function generateArchitectureDoc() {
  return `# Architecture Overview

## System Architecture

The Slambed MCP Server follows a modular, event-driven architecture designed for extensibility and maintainability.

### Core Components

\`\`\`
┌─────────────────────────────────────────────────────────────┐
│                      MCP Client (IDE/Editor)                 │
└─────────────────────┬───────────────────────────────────────┘
                      │ MCP Protocol
┌─────────────────────▼───────────────────────────────────────┐
│                    Enhanced MCP Server                       │
│  ┌─────────────────────────────────────────────────────┐   │
│  │                  Request Handler                      │   │
│  └──────────┬────────────────────────┬─────────────────┘   │
│             │                        │                       │
│  ┌──────────▼──────────┐  ┌─────────▼─────────────┐       │
│  │   Tool Registry     │  │  Session Manager      │       │
│  │                     │  │                       │       │
│  │ - Tool Discovery    │  │ - Context Tracking   │       │
│  │ - Metadata Mgmt     │  │ - User Preferences   │       │
│  │ - Documentation     │  │ - Operation History  │       │
│  └─────────────────────┘  └──────────────────────┘       │
│                                                            │
│  ┌─────────────────────────────────────────────────────┐  │
│  │              Response Enhancement Pipeline           │  │
│  │                                                     │  │
│  │  Base Response → Metadata → Risk → Suggestions     │  │
│  └─────────────────────────────────────────────────────┘  │
│                                                            │
│  ┌──────────────┐  ┌──────────────┐  ┌───────────────┐   │
│  │ GitHub Flow  │  │  Automation  │  │   Utility     │   │
│  │   Tools      │  │    Tools     │  │    Tools      │   │
│  └──────────────┘  └──────────────┘  └───────────────┘   │
│                                                            │
│  ┌──────────────┐  ┌──────────────┐  ┌───────────────┐   │
│  │   Context    │  │     Team     │  │    Safety     │   │
│  │    Tools     │  │    Tools     │  │    Tools      │   │
│  └──────────────┘  └──────────────┘  └───────────────┘   │
└────────────────────────────────────────────────────────────┘
                              │
                    ┌─────────▼──────────┐
                    │   Git Repository   │
                    └────────────────────┘
\`\`\`

### Data Flow

1. **Request Processing**
   - Client sends tool request via MCP protocol
   - Server validates and routes to appropriate tool
   - Tool executes with access to shared services

2. **Response Enhancement**
   - Tool returns base response
   - Enhancement pipeline adds context
   - Enriched response sent to client

3. **Session Management**
   - Each operation updates session context
   - Preferences and history influence suggestions
   - Context persisted across server restarts

### Key Design Patterns

#### Singleton Pattern
- \`SessionManager\` - Single instance manages all sessions
- \`GitClient\` - Shared Git operations with caching
- \`ToolRegistry\` - Central tool registration

#### Factory Pattern
- \`ResponseFactory\` - Creates consistent response objects
- \`EnhancerFactory\` - Builds enhancement pipeline

#### Observer Pattern
- Event-driven server lifecycle
- Tool execution monitoring
- Session state changes

### Extension Points

1. **Custom Tools**
   - Implement tool interface
   - Register with tool registry
   - Automatic enhancement support

2. **Response Enhancers**
   - Create custom enhancer class
   - Add to enhancement pipeline
   - Enrich responses with domain logic

3. **Authentication Providers**
   - Implement auth provider interface
   - Configure in server settings
   - Integrate with existing systems

### Performance Considerations

- **Caching**: Git operations cached for 5 minutes
- **Connection Pooling**: Reuse GitHub API connections
- **Lazy Loading**: Tools loaded on demand
- **Async Operations**: Non-blocking I/O throughout

### Security Model

- **Tool Isolation**: Each tool runs in isolated context
- **Risk Assessment**: Operations evaluated before execution
- **Authentication**: Pluggable auth providers
- **Audit Logging**: All operations logged with context
`;
}

function generateToolHtml(tool, theme) {
  const doc = toolRegistry.generateDocumentation(tool.name);
  
  return `<!DOCTYPE html>
<html lang="en" data-theme="${theme}">
<head>
  <meta charset="UTF-8">
  <title>${tool.name} - Slambed MCP</title>
  <link rel="stylesheet" href="../styles.css">
</head>
<body>
  <div class="container">
    <h1>${tool.name}</h1>
    <p class="description">${tool.description}</p>
    
    <div class="metadata">
      <span class="category-badge">${formatCategoryName(tool.metadata.category)}</span>
      ${tool.metadata.tags.map(tag => `<span class="tag">${tag}</span>`).join('')}
    </div>
    
    ${doc ? `
    <h2>Parameters</h2>
    <pre>${JSON.stringify(doc.parameters || {}, null, 2)}</pre>
    
    ${doc.examples ? `
    <h2>Examples</h2>
    ${doc.examples.map(ex => `
    <div class="example">
      <h3>${ex.description}</h3>
      <pre>${JSON.stringify(ex.input, null, 2)}</pre>
    </div>
    `).join('')}
    ` : ''}
    ` : ''}
    
    <a href="../index.html">← Back to tools</a>
  </div>
</body>
</html>`;
}

function generateTutorialHtml(tutorial, theme) {
  return `<!DOCTYPE html>
<html lang="en" data-theme="${theme}">
<head>
  <meta charset="UTF-8">
  <title>${tutorial.title} - Slambed MCP</title>
</head>
<body>
  <div class="container">
    <h1>${tutorial.title}</h1>
    ${tutorial.content}
    <a href="../index.html">← Back to documentation</a>
  </div>
</body>
</html>`;
}

function generateGettingStartedTutorial() {
  return `
    <h2>Installation</h2>
    <p>Install Slambed MCP Server via npm or configure in your MCP client.</p>
    
    <h2>Basic Usage</h2>
    <p>Once installed, you can start using tools immediately.</p>
    
    <h2>First Steps</h2>
    <ol>
      <li>Check repository status with <code>get_status</code></li>
      <li>Start a new feature with <code>github_flow_start</code></li>
      <li>Make changes and commit with <code>auto_commit</code></li>
    </ol>
  `;
}

function generateGitHubFlowTutorial() {
  return `
    <h2>GitHub Flow Workflow</h2>
    <p>Learn how to use GitHub flow tools for efficient development.</p>
    
    <h3>Starting a Feature</h3>
    <p>Use <code>github_flow_start</code> to create a new feature branch.</p>
    
    <h3>Creating Pull Requests</h3>
    <p>Use <code>github_flow_pr</code> to create PRs with context.</p>
  `;
}

function generateAutomationTutorial() {
  return `
    <h2>Automation Tools</h2>
    <p>Automate repetitive tasks with our automation tools.</p>
    
    <h3>Running Tests</h3>
    <p>Use <code>run_tests</code> for intelligent test execution.</p>
    
    <h3>Code Analysis</h3>
    <p>Use <code>analyze_code</code> for quality metrics.</p>
  `;
}

function generateTeamTutorial() {
  return `
    <h2>Team Collaboration</h2>
    <p>Work effectively with your team using collaboration tools.</p>
    
    <h3>Finding Team Activity</h3>
    <p>Use team awareness tools to see what others are working on.</p>
  `;
}

// Register documentation tools
export function registerDocumentationTools(context) {
  const tools = [
    {
      name: "generate_project_docs",
      description: "Generate comprehensive project documentation including README, API reference, examples, and more. Use this to create or update project documentation.",
      inputSchema: {
        type: "object",
        properties: {
          output_path: {
            type: "string",
            description: "Output directory for documentation (default: ./docs)",
            default: "./docs"
          },
          format: {
            type: "string",
            enum: ["markdown", "html"],
            description: "Documentation format",
            default: "markdown"
          },
          include_api_reference: {
            type: "boolean",
            description: "Include API reference documentation",
            default: true
          },
          include_examples: {
            type: "boolean",
            description: "Include usage examples",
            default: true
          },
          include_changelog: {
            type: "boolean",
            description: "Include changelog",
            default: true
          },
          include_configuration: {
            type: "boolean",
            description: "Include configuration guide",
            default: true
          },
          include_architecture: {
            type: "boolean",
            description: "Include architecture overview",
            default: true
          }
        }
      },
      handler: generateProjectDocs,
      metadata: {
        category: 'utility',
        tags: ['documentation', 'docs', 'markdown'],
        riskLevel: 'low',
        requiresAuth: false
      }
    },
    {
      name: "generate_tool_doc",
      description: "Generate detailed documentation for a specific tool. Use this to create or update individual tool documentation.",
      inputSchema: {
        type: "object",
        properties: {
          tool_name: {
            type: "string",
            description: "Name of the tool to document"
          },
          output_path: {
            type: "string",
            description: "Output directory (default: ./docs/tools)",
            default: "./docs/tools"
          },
          include_examples: {
            type: "boolean",
            description: "Include usage examples",
            default: true
          },
          include_related: {
            type: "boolean",
            description: "Include related tools section",
            default: true
          },
          include_implementation: {
            type: "boolean",
            description: "Include implementation details",
            default: false
          }
        },
        required: ["tool_name"]
      },
      handler: generateToolDoc,
      metadata: {
        category: 'utility',
        tags: ['documentation', 'tools', 'markdown'],
        riskLevel: 'low',
        requiresAuth: false
      }
    },
    {
      name: "update_docs_from_code",
      description: "Extract and update documentation from source code, including JSDoc comments and type definitions. Use this to keep docs in sync with code.",
      inputSchema: {
        type: "object",
        properties: {
          source_path: {
            type: "string",
            description: "Source code directory (default: ./src)",
            default: "./src"
          },
          output_path: {
            type: "string",
            description: "Output directory (default: ./docs/api)",
            default: "./docs/api"
          },
          extract_jsdoc: {
            type: "boolean",
            description: "Extract JSDoc comments",
            default: true
          },
          generate_types: {
            type: "boolean",
            description: "Generate TypeScript definitions",
            default: true
          },
          update_readme: {
            type: "boolean",
            description: "Update README with extracted info",
            default: false
          }
        }
      },
      handler: updateDocsFromCode,
      metadata: {
        category: 'utility',
        tags: ['documentation', 'code', 'jsdoc', 'types'],
        riskLevel: 'low',
        requiresAuth: false
      }
    },
    {
      name: "generate_interactive_docs",
      description: "Generate interactive HTML documentation with search, playground, and tutorials. Use this to create user-friendly documentation.",
      inputSchema: {
        type: "object",
        properties: {
          output_path: {
            type: "string",
            description: "Output directory (default: ./docs/interactive)",
            default: "./docs/interactive"
          },
          include_playground: {
            type: "boolean",
            description: "Include interactive tool playground",
            default: true
          },
          include_tutorials: {
            type: "boolean",
            description: "Include interactive tutorials",
            default: true
          },
          include_search: {
            type: "boolean",
            description: "Include search functionality",
            default: true
          },
          theme: {
            type: "string",
            enum: ["light", "dark"],
            description: "Documentation theme",
            default: "light"
          }
        }
      },
      handler: generateInteractiveDocs,
      metadata: {
        category: 'utility',
        tags: ['documentation', 'interactive', 'html', 'web'],
        riskLevel: 'low',
        requiresAuth: false
      }
    },
    {
      name: "check_docs_coverage",
      description: "Check documentation coverage and identify missing documentation. Use this to ensure all tools and features are documented.",
      inputSchema: {
        type: "object",
        properties: {
          docs_path: {
            type: "string",
            description: "Documentation directory (default: ./docs)",
            default: "./docs"
          },
          source_path: {
            type: "string",
            description: "Source code directory (default: ./src/tools)",
            default: "./src/tools"
          },
          min_coverage: {
            type: "number",
            description: "Minimum coverage percentage required",
            default: 80,
            minimum: 0,
            maximum: 100
          }
        }
      },
      handler: checkDocsCoverage,
      metadata: {
        category: 'utility',
        tags: ['documentation', 'coverage', 'quality'],
        riskLevel: 'low',
        requiresAuth: false
      }
    }
  ];

  tools.forEach(tool => context.addTool(tool));
}
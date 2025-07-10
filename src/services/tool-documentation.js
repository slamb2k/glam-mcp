/**
 * Tool Documentation Generator
 * Generates documentation from tool metadata
 */

import fs from 'fs';
import path from 'path';
import { toolRegistry } from '../core/tool-registry.js';

export class ToolDocumentationGenerator {
  constructor(registry = toolRegistry) {
    this.registry = registry;
    this.templates = {
      tool: this.getToolTemplate(),
      category: this.getCategoryTemplate(),
      overview: this.getOverviewTemplate()
    };
  }

  /**
   * Generate markdown documentation for a single tool
   */
  generateToolDoc(toolName) {
    const doc = this.registry.generateDocumentation(toolName);
    if (!doc) return null;
    
    let markdown = `# ${doc.name}\n\n`;
    markdown += `${doc.description}\n\n`;
    
    // Metadata section
    markdown += `## Metadata\n\n`;
    markdown += `- **Category**: ${doc.category}\n`;
    markdown += `- **Tags**: ${doc.tags.join(', ') || 'None'}\n`;
    markdown += `- **Risk Level**: ${doc.riskLevel}\n`;
    markdown += `- **Version**: ${doc.version}\n`;
    if (doc.author) markdown += `- **Author**: ${doc.author}\n`;
    if (doc.experimental) markdown += `- **⚠️ Experimental**: This tool is experimental\n`;
    if (doc.requiresAuth) markdown += `- **🔐 Authentication Required**\n`;
    markdown += '\n';
    
    // Usage section
    markdown += `## Usage\n\n`;
    markdown += '```javascript\n';
    markdown += doc.usage;
    markdown += '\n```\n\n';
    
    // Parameters section
    if (doc.parameters && Object.keys(doc.parameters).length > 0) {
      markdown += `## Parameters\n\n`;
      markdown += this.generateParameterTable(doc.parameters);
      markdown += '\n';
    }
    
    // Examples section
    if (doc.examples && doc.examples.length > 0) {
      markdown += `## Examples\n\n`;
      doc.examples.forEach((example, index) => {
        markdown += `### Example ${index + 1}: ${example.description}\n\n`;
        markdown += '**Input:**\n```json\n';
        markdown += JSON.stringify(example.input, null, 2);
        markdown += '\n```\n\n';
        
        if (example.output) {
          markdown += '**Output:**\n```json\n';
          markdown += JSON.stringify(example.output, null, 2);
          markdown += '\n```\n\n';
        }
      });
    }
    
    // Related tools section
    if (doc.relatedTools && doc.relatedTools.length > 0) {
      markdown += `## Related Tools\n\n`;
      doc.relatedTools.forEach(toolName => {
        const relatedTool = this.registry.get(toolName);
        if (relatedTool) {
          markdown += `- **${toolName}**: ${relatedTool.description}\n`;
        }
      });
      markdown += '\n';
    }
    
    return markdown;
  }

  /**
   * Generate documentation for all tools in a category
   */
  generateCategoryDoc(category) {
    const tools = this.registry.getByCategory(category);
    if (tools.length === 0) return null;
    
    let markdown = `# ${this.formatCategoryName(category)} Tools\n\n`;
    markdown += `This category contains ${tools.length} tools.\n\n`;
    
    // Table of contents
    markdown += `## Table of Contents\n\n`;
    tools.forEach(tool => {
      markdown += `- [${tool.name}](#${tool.name.replace(/_/g, '-')})\n`;
    });
    markdown += '\n';
    
    // Tool details
    tools.forEach(tool => {
      markdown += `## ${tool.name}\n\n`;
      markdown += `${tool.description}\n\n`;
      
      // Quick info
      markdown += `**Tags**: ${tool.metadata.tags.join(', ') || 'None'} | `;
      markdown += `**Risk**: ${tool.metadata.riskLevel}`;
      if (tool.metadata.experimental) markdown += ' | **⚠️ Experimental**';
      markdown += '\n\n';
      
      // Usage
      markdown += '```javascript\n';
      markdown += this.registry.generateDocumentation(tool.name).usage;
      markdown += '\n```\n\n';
      
      markdown += '---\n\n';
    });
    
    return markdown;
  }

  /**
   * Generate overview documentation
   */
  generateOverviewDoc() {
    const stats = this.registry.getStatistics();
    const categories = this.registry.listCategories();
    
    let markdown = `# Tool Registry Overview\n\n`;
    markdown += `Total tools registered: **${stats.totalTools}**\n\n`;
    
    // Statistics
    markdown += `## Statistics\n\n`;
    markdown += `- Categories: ${stats.totalCategories}\n`;
    markdown += `- Tags: ${stats.totalTags}\n`;
    markdown += `- Aliases: ${stats.totalAliases}\n`;
    markdown += `- Experimental tools: ${stats.experimentalTools}\n`;
    markdown += `- Tools requiring auth: ${stats.authRequiredTools}\n\n`;
    
    // Risk distribution
    markdown += `### Risk Distribution\n\n`;
    markdown += `- Low risk: ${stats.toolsByRiskLevel.low} tools\n`;
    markdown += `- Medium risk: ${stats.toolsByRiskLevel.medium} tools\n`;
    markdown += `- High risk: ${stats.toolsByRiskLevel.high} tools\n\n`;
    
    // Categories
    markdown += `## Categories\n\n`;
    categories.forEach(cat => {
      markdown += `### ${this.formatCategoryName(cat.name)} (${cat.count} tools)\n\n`;
      cat.tools.slice(0, 5).forEach(toolName => {
        const tool = this.registry.get(toolName);
        if (tool) {
          markdown += `- **${toolName}**: ${tool.description}\n`;
        }
      });
      if (cat.count > 5) {
        markdown += `- ... and ${cat.count - 5} more\n`;
      }
      markdown += '\n';
    });
    
    // Popular tags
    const tags = this.registry.listTags().slice(0, 10);
    if (tags.length > 0) {
      markdown += `## Popular Tags\n\n`;
      tags.forEach(tag => {
        markdown += `- **${tag.name}** (${tag.count} tools)\n`;
      });
      markdown += '\n';
    }
    
    return markdown;
  }

  /**
   * Generate API reference
   */
  generateAPIReference() {
    const tools = Array.from(this.registry.tools.values());
    
    let markdown = `# API Reference\n\n`;
    markdown += `This document provides a complete API reference for all registered tools.\n\n`;
    
    // Group by category
    const byCategory = {};
    tools.forEach(tool => {
      const cat = tool.metadata.category;
      if (!byCategory[cat]) byCategory[cat] = [];
      byCategory[cat].push(tool);
    });
    
    // Generate reference for each category
    Object.entries(byCategory).forEach(([category, tools]) => {
      markdown += `## ${this.formatCategoryName(category)}\n\n`;
      
      tools.forEach(tool => {
        markdown += `### ${tool.name}\n\n`;
        markdown += '```typescript\n';
        markdown += this.generateTypeSignature(tool);
        markdown += '\n```\n\n';
        
        markdown += `${tool.description}\n\n`;
        
        if (tool.inputSchema?.properties) {
          markdown += '**Parameters:**\n\n';
          markdown += this.generateParameterDocs(tool.inputSchema);
          markdown += '\n';
        }
        
        markdown += '---\n\n';
      });
    });
    
    return markdown;
  }

  /**
   * Generate HTML documentation
   */
  generateHTMLDoc(toolName = null) {
    const css = this.getCSS();
    let content;
    
    if (toolName) {
      content = this.generateToolDoc(toolName);
      if (!content) return null;
    } else {
      content = this.generateOverviewDoc();
    }
    
    // Convert markdown to HTML (simplified)
    const html = content
      .replace(/^# (.+)$/gm, '<h1>$1</h1>')
      .replace(/^## (.+)$/gm, '<h2>$1</h2>')
      .replace(/^### (.+)$/gm, '<h3>$1</h3>')
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.+?)\*/g, '<em>$1</em>')
      .replace(/```(\w+)?\n([\s\S]*?)```/g, '<pre><code class="language-$1">$2</code></pre>')
      .replace(/`(.+?)`/g, '<code>$1</code>')
      .replace(/^- (.+)$/gm, '<li>$1</li>')
      .replace(/(<li>.*<\/li>\n?)+/g, '<ul>$&</ul>')
      .replace(/\n\n/g, '</p><p>')
      .replace(/^/, '<p>')
      .replace(/$/, '</p>');
    
    return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>${toolName ? `${toolName} - Tool Documentation` : 'Tool Registry Documentation'}</title>
  <style>${css}</style>
</head>
<body>
  <div class="container">
    ${html}
  </div>
</body>
</html>`;
  }

  /**
   * Export documentation to file
   */
  async exportToFile(outputPath, format = 'markdown') {
    const ext = format === 'html' ? '.html' : '.md';
    
    // Generate overview
    const overviewContent = format === 'html' 
      ? this.generateHTMLDoc()
      : this.generateOverviewDoc();
    
    await fs.promises.writeFile(
      path.join(outputPath, `index${ext}`),
      overviewContent
    );
    
    // Generate category docs
    const categories = this.registry.listCategories();
    for (const cat of categories) {
      const content = format === 'html'
        ? this.convertMarkdownToHTML(this.generateCategoryDoc(cat.name))
        : this.generateCategoryDoc(cat.name);
      
      await fs.promises.writeFile(
        path.join(outputPath, `${cat.name}${ext}`),
        content
      );
    }
    
    // Generate individual tool docs
    const toolsDir = path.join(outputPath, 'tools');
    await fs.promises.mkdir(toolsDir, { recursive: true });
    
    for (const [name,] of this.registry.tools) {
      const content = format === 'html'
        ? this.generateHTMLDoc(name)
        : this.generateToolDoc(name);
      
      await fs.promises.writeFile(
        path.join(toolsDir, `${name}${ext}`),
        content
      );
    }
    
    // Generate API reference
    const apiContent = format === 'html'
      ? this.convertMarkdownToHTML(this.generateAPIReference())
      : this.generateAPIReference();
    
    await fs.promises.writeFile(
      path.join(outputPath, `api-reference${ext}`),
      apiContent
    );
  }

  // Private helper methods
  
  formatCategoryName(category) {
    return category
      .split('-')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  }
  
  generateParameterTable(parameters) {
    let table = '| Parameter | Type | Required | Default | Description |\n';
    table += '|-----------|------|----------|---------|-------------|\n';
    
    Object.entries(parameters).forEach(([name, param]) => {
      const required = param.required ? '✓' : '';
      const defaultVal = param.default !== undefined ? `\`${param.default}\`` : '-';
      const type = param.enum ? `enum(${param.enum.join(', ')})` : param.type;
      
      table += `| ${name} | ${type} | ${required} | ${defaultVal} | ${param.description} |\n`;
    });
    
    return table;
  }
  
  generateParameterDocs(schema) {
    let docs = '';
    const props = schema.properties || {};
    const required = schema.required || [];
    
    Object.entries(props).forEach(([name, prop]) => {
      const isRequired = required.includes(name);
      docs += `- \`${name}\` (${prop.type}${isRequired ? ', required' : ''}): ${prop.description || 'No description'}\n`;
      
      if (prop.default !== undefined) {
        docs += `  - Default: \`${prop.default}\`\n`;
      }
      
      if (prop.enum) {
        docs += `  - Allowed values: ${prop.enum.map(v => `\`${v}\``).join(', ')}\n`;
      }
      
      if (prop.type === 'object' && prop.properties) {
        docs += '  - Properties:\n';
        Object.entries(prop.properties).forEach(([subName, subProp]) => {
          docs += `    - \`${subName}\` (${subProp.type}): ${subProp.description || 'No description'}\n`;
        });
      }
    });
    
    return docs;
  }
  
  generateTypeSignature(tool) {
    const params = [];
    
    if (tool.inputSchema?.properties) {
      const required = tool.inputSchema.required || [];
      
      Object.entries(tool.inputSchema.properties).forEach(([name, prop]) => {
        const isRequired = required.includes(name);
        const type = this.tsType(prop);
        params.push(`  ${name}${isRequired ? '' : '?'}: ${type};`);
      });
    }
    
    return `interface ${tool.name}Params {
${params.join('\n')}
}

function ${tool.name}(params: ${tool.name}Params): Promise<Response>;`;
  }
  
  tsType(prop) {
    switch (prop.type) {
      case 'string': return prop.enum ? prop.enum.map(v => `'${v}'`).join(' | ') : 'string';
      case 'number': return 'number';
      case 'boolean': return 'boolean';
      case 'array': return 'any[]';
      case 'object': return 'Record<string, any>';
      default: return 'any';
    }
  }
  
  convertMarkdownToHTML(markdown) {
    const css = this.getCSS();
    const html = markdown
      .replace(/^# (.+)$/gm, '<h1>$1</h1>')
      .replace(/^## (.+)$/gm, '<h2>$1</h2>')
      .replace(/^### (.+)$/gm, '<h3>$1</h3>')
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.+?)\*/g, '<em>$1</em>')
      .replace(/```(\w+)?\n([\s\S]*?)```/g, '<pre><code class="language-$1">$2</code></pre>')
      .replace(/`(.+?)`/g, '<code>$1</code>')
      .replace(/^- (.+)$/gm, '<li>$1</li>')
      .replace(/(<li>.*<\/li>\n?)+/g, '<ul>$&</ul>')
      .replace(/\n\n/g, '</p><p>')
      .replace(/^/, '<p>')
      .replace(/$/, '</p>');
    
    return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Tool Documentation</title>
  <style>${css}</style>
</head>
<body>
  <div class="container">
    ${html}
  </div>
</body>
</html>`;
  }
  
  getCSS() {
    return `
      body {
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        line-height: 1.6;
        color: #333;
        max-width: 900px;
        margin: 0 auto;
        padding: 20px;
        background: #f5f5f5;
      }
      .container {
        background: white;
        padding: 30px;
        border-radius: 8px;
        box-shadow: 0 2px 10px rgba(0,0,0,0.1);
      }
      h1, h2, h3 { 
        color: #2c3e50;
        margin-top: 30px;
      }
      h1 { border-bottom: 2px solid #3498db; padding-bottom: 10px; }
      h2 { border-bottom: 1px solid #ecf0f1; padding-bottom: 8px; }
      code {
        background: #f4f4f4;
        padding: 2px 6px;
        border-radius: 3px;
        font-family: 'Courier New', monospace;
      }
      pre {
        background: #f8f8f8;
        border: 1px solid #ddd;
        border-radius: 4px;
        padding: 15px;
        overflow-x: auto;
      }
      pre code {
        background: none;
        padding: 0;
      }
      table {
        border-collapse: collapse;
        width: 100%;
        margin: 20px 0;
      }
      th, td {
        border: 1px solid #ddd;
        padding: 8px;
        text-align: left;
      }
      th {
        background: #f4f4f4;
        font-weight: bold;
      }
      ul {
        padding-left: 25px;
      }
      li {
        margin: 5px 0;
      }
    `;
  }
  
  getToolTemplate() {
    return `# {{name}}

{{description}}

## Metadata

- **Category**: {{category}}
- **Tags**: {{tags}}
- **Risk Level**: {{riskLevel}}
- **Version**: {{version}}
{{#if author}}- **Author**: {{author}}{{/if}}
{{#if experimental}}- **⚠️ Experimental**: This tool is experimental{{/if}}
{{#if requiresAuth}}- **🔐 Authentication Required**{{/if}}

## Usage

\`\`\`javascript
{{usage}}
\`\`\`

{{#if parameters}}
## Parameters

{{parameterTable}}
{{/if}}

{{#if examples}}
## Examples

{{examples}}
{{/if}}

{{#if relatedTools}}
## Related Tools

{{relatedTools}}
{{/if}}`;
  }
  
  getCategoryTemplate() {
    return `# {{categoryName}} Tools

This category contains {{toolCount}} tools.

## Table of Contents

{{tableOfContents}}

{{toolDetails}}`;
  }
  
  getOverviewTemplate() {
    return `# Tool Registry Overview

Total tools registered: **{{totalTools}}**

## Statistics

{{statistics}}

## Categories

{{categories}}

## Popular Tags

{{tags}}`;
  }
}

// Create singleton instance
export const toolDocumentation = new ToolDocumentationGenerator();
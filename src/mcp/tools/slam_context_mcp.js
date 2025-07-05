/**
 * MCP Tool Binding for slam_context
 * Rich context visualization and analysis
 */

import { slam_context } from './slam_context.js';

export const slam_context_tool = {
  name: 'slam_context',
  description: 'Get comprehensive context about the current project state',
  inputSchema: {
    type: 'object',
    properties: {
      // Display options
      format: {
        type: 'string',
        enum: ['tree', 'json', 'yaml', 'markdown'],
        description: 'Output format (default: tree)',
        default: 'tree'
      },
      
      // Filter options
      filter: {
        oneOf: [
          { type: 'string' },
          { 
            type: 'array',
            items: { type: 'string' }
          }
        ],
        description: 'Filter context by specific fields (e.g., "git.branch,workflow.current")'
      },
      
      // Diff options
      diff: {
        type: 'boolean',
        description: 'Show changes since last context check'
      },
      
      // Export options
      export: {
        type: 'string',
        description: 'Export context to file path'
      },
      
      // Context options
      depth: {
        type: 'number',
        minimum: 1,
        maximum: 10,
        description: 'Directory scan depth for project structure'
      },
      
      // Specific context requests
      project: {
        type: 'boolean',
        description: 'Include project context only'
      },
      git: {
        type: 'boolean',
        description: 'Include git context only'
      },
      workflow: {
        type: 'boolean',
        description: 'Include workflow context only'
      },
      activity: {
        type: 'boolean',
        description: 'Include activity context only'
      },
      team: {
        type: 'boolean',
        description: 'Include team context only'
      },
      system: {
        type: 'boolean',
        description: 'Include system context only'
      }
    }
  },
  handler: async (args) => {
    // Build filter from specific context flags
    if (args.project || args.git || args.workflow || args.activity || args.team || args.system) {
      const filters = [];
      if (args.project) filters.push('project');
      if (args.git) filters.push('git');
      if (args.workflow) filters.push('workflow');
      if (args.activity) filters.push('activity');
      if (args.team) filters.push('team');
      if (args.system) filters.push('system');
      
      args.filter = filters;
    }
    
    const result = await slam_context(args);
    
    // Return formatted output
    return {
      content: [{
        type: 'text',
        text: result.output || JSON.stringify(result, null, 2)
      }]
    };
  }
};

// Export for MCP registration
export default slam_context_tool;
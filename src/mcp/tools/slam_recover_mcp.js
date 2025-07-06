/**
 * MCP Tool Binding for slam_recover
 * Advanced undo and recovery operations with time machine functionality
 */

import { slam_recover } from './slam_recover.js';

export const slam_recover_tool = {
  name: 'slam_recover',
  description: 'Access time machine functionality for advanced undo and recovery operations',
  inputSchema: {
    type: 'object',
    properties: {
      action: {
        type: 'string',
        enum: ['start', 'stop', 'status', 'history', 'save', 'recover', 'undo', 'preview'],
        description: 'Recovery action to perform',
        default: 'status'
      },
      
      // Recovery point management
      name: {
        type: 'string',
        description: 'Name for recovery point (required for save action)'
      },
      description: {
        type: 'string',
        description: 'Description for recovery point'
      },
      pointId: {
        type: 'string',
        description: 'Recovery point ID for recover/preview actions'
      },
      
      // Undo operations
      count: {
        type: 'number',
        minimum: 1,
        maximum: 100,
        description: 'Number of actions to undo (default: 1)'
      },
      
      // Recovery options
      forceRecover: {
        type: 'boolean',
        description: 'Force recovery even if conflicts are detected'
      },
      recoverGit: {
        type: 'boolean',
        description: 'Include git state in recovery (default: true)'
      },
      recoverContext: {
        type: 'boolean',
        description: 'Include context state in recovery (default: true)'
      },
      
      // History options
      limit: {
        type: 'number',
        minimum: 1,
        maximum: 100,
        description: 'Limit for history retrieval (default: 20)'
      },
      
      // Preview options
      detailed: {
        type: 'boolean',
        description: 'Show detailed preview information'
      }
    },
    required: ['action']
  },
  handler: async (args) => {
    const result = await slam_recover(args.action, args);
    
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
export default slam_recover_tool;
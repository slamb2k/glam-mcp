/**
 * MCP Tool Binding for slam_suggest
 * Predictive suggestions based on context and learning
 */

import { slam_suggest } from './slam_suggest.js';

export const slam_suggest_tool = {
  name: 'slam_suggest',
  description: 'Get intelligent suggestions based on context and machine learning',
  inputSchema: {
    type: 'object',
    properties: {
      input: {
        type: 'string',
        description: 'Input text to get suggestions for (optional)'
      },
      
      // Filter options
      type: {
        type: 'string',
        enum: ['command', 'workflow', 'file', 'completion'],
        description: 'Filter suggestions by type'
      },
      minConfidence: {
        type: 'number',
        minimum: 0,
        maximum: 1,
        description: 'Minimum confidence threshold (0-1)'
      },
      limit: {
        type: 'number',
        minimum: 1,
        maximum: 50,
        description: 'Maximum number of suggestions to return'
      },
      
      // Special commands
      stats: {
        type: 'boolean',
        description: 'Show predictive system statistics'
      },
      reset: {
        type: 'boolean',
        description: 'Reset all learning data'
      },
      
      // Learning
      learn: {
        type: 'object',
        description: 'Learn from a selected suggestion',
        properties: {
          type: { type: 'string' },
          value: { type: 'string' },
          description: { type: 'string' }
        }
      },
      result: {
        type: 'object',
        description: 'Result of executing the learned suggestion',
        properties: {
          accepted: { type: 'boolean' },
          output: { type: 'string' }
        }
      }
    }
  },
  handler: async (args) => {
    const result = await slam_suggest(args.input || '', args);
    
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
export default slam_suggest_tool;
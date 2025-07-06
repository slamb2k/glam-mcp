/**
 * MCP Tool Binding for slam_learn
 * User personalization and learning capabilities
 */

import { slam_learn } from './slam_learn.js';

export const slam_learn_tool = {
  name: 'slam_learn',
  description: 'Access user personalization features and learning capabilities',
  inputSchema: {
    type: 'object',
    properties: {
      action: {
        type: 'string',
        enum: ['profile', 'update', 'suggest', 'learn', 'feedback', 'insights', 'sync', 'reset'],
        description: 'Action to perform',
        default: 'profile'
      },
      
      // Profile management
      userId: {
        type: 'string',
        description: 'User ID (defaults to "default")'
      },
      updates: {
        type: 'object',
        description: 'Profile updates to apply (for update action)',
        properties: {
          preferences: {
            type: 'object',
            properties: {
              theme: { type: 'string', enum: ['auto', 'light', 'dark'] },
              editor: { type: 'string' },
              language: { type: 'string' },
              workingHours: {
                type: 'object',
                properties: {
                  start: { type: 'number', minimum: 0, maximum: 23 },
                  end: { type: 'number', minimum: 0, maximum: 23 }
                }
              },
              shortcuts: { type: 'object' },
              gitDefaults: {
                type: 'object',
                properties: {
                  commitStyle: { type: 'string', enum: ['conventional', 'simple', 'descriptive'] },
                  branchPrefix: { type: 'string' },
                  autoRebase: { type: 'boolean' }
                }
              }
            }
          },
          learning: {
            type: 'object',
            properties: {
              enabled: { type: 'boolean' },
              privacyMode: { type: 'string', enum: ['strict', 'balanced', 'permissive'] },
              syncEnabled: { type: 'boolean' }
            }
          }
        }
      },
      
      // Suggestions
      input: {
        type: 'string',
        description: 'Input text for personalized suggestions'
      },
      limit: {
        type: 'number',
        minimum: 1,
        maximum: 20,
        description: 'Maximum number of suggestions to return'
      },
      
      // Learning from actions
      action_data: {
        type: 'object',
        description: 'Action data to learn from',
        properties: {
          type: { type: 'string', enum: ['command', 'workflow', 'file'] },
          value: { type: 'string' },
          duration: { type: 'number' },
          context: { type: 'object' }
        }
      },
      
      // Feedback collection
      feedback: {
        type: 'object',
        description: 'User feedback data',
        properties: {
          type: { type: 'string', enum: ['suggestion', 'general', 'bug', 'feature'] },
          rating: { type: 'number', minimum: 1, maximum: 5 },
          comment: { type: 'string' },
          context: { type: 'object' }
        }
      },
      
      // Reset options
      resetLearning: {
        type: 'boolean',
        description: 'Reset learning data when resetting profile'
      }
    },
    required: ['action']
  },
  handler: async (args) => {
    // Map action_data to action for backwards compatibility
    if (args.action_data) {
      args.action = args.action_data;
    }
    
    const result = await slam_learn(args.action, args);
    
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
export default slam_learn_tool;
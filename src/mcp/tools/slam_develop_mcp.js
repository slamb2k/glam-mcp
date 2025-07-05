/**
 * MCP Tool Binding for slam_develop
 * Development workflow automation
 */

import { slam_develop } from './slam_develop.js';

export const slam_develop_tool = {
  name: 'slam_develop',
  description: 'Manage feature development workflows with git integration',
  inputSchema: {
    type: 'object',
    properties: {
      // Workflow options
      type: {
        type: 'string',
        enum: ['feature', 'bugfix', 'hotfix', 'docs', 'chore', 'refactor'],
        description: 'Type of development workflow'
      },
      description: {
        type: 'string',
        description: 'Description for branch name generation'
      },
      branch: {
        type: 'string',
        description: 'Specific branch name to use'
      },
      includeDate: {
        type: 'boolean',
        description: 'Include date in auto-generated branch name'
      },
      useExisting: {
        type: 'boolean',
        description: 'Use existing branch if it exists'
      },
      
      // Commit options
      autoCommit: {
        type: 'boolean',
        description: 'Automatically commit changes'
      },
      commit: {
        type: 'boolean',
        description: 'Commit changes (alias for autoCommit)'
      },
      message: {
        type: 'string',
        description: 'Commit message'
      },
      files: {
        type: 'array',
        items: { type: 'string' },
        description: 'Specific files to commit'
      },
      
      // Test options
      runTests: {
        type: 'boolean',
        description: 'Run tests if available (default: true)'
      },
      
      // Push options
      push: {
        type: 'boolean',
        description: 'Push changes to remote'
      },
      remote: {
        type: 'string',
        description: 'Remote name to push to'
      },
      
      // PR options
      createPR: {
        type: 'boolean',
        description: 'Create pull request after push'
      },
      prTitle: {
        type: 'string',
        description: 'Pull request title'
      },
      prBody: {
        type: 'string',
        description: 'Pull request body'
      }
    }
  },
  handler: async (args) => {
    const result = await slam_develop(args);
    
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
export default slam_develop_tool;
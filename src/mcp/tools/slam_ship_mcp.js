/**
 * MCP Tool Binding for slam_ship
 * Deployment automation tool
 */

import { slam_ship } from './slam_ship.js';

export const slam_ship_tool = {
  name: 'slam_ship',
  description: 'Manage deployment pipelines and releases with multiple strategies',
  inputSchema: {
    type: 'object',
    properties: {
      // Environment options
      environment: {
        type: 'string',
        enum: ['development', 'staging', 'production'],
        description: 'Target deployment environment',
        default: 'production'
      },
      
      // Strategy options
      strategy: {
        type: 'string',
        enum: ['blue-green', 'canary', 'rolling', 'direct'],
        description: 'Deployment strategy to use'
      },
      safe: {
        type: 'boolean',
        description: 'Use safer deployment strategy (canary for production)'
      },
      
      // Deployment options
      version: {
        type: 'string',
        description: 'Version number for deployment'
      },
      configFile: {
        type: 'string',
        description: 'Path to deployment configuration file'
      },
      force: {
        type: 'boolean',
        description: 'Force deployment even with validation warnings'
      },
      skipTests: {
        type: 'boolean',
        description: 'Skip test execution before deployment'
      },
      autoRollback: {
        type: 'boolean',
        description: 'Automatically rollback on failure (default: true)'
      },
      
      // Canary options
      instances: {
        type: 'number',
        description: 'Number of instances for rolling update'
      },
      batchSize: {
        type: 'number',
        description: 'Batch size for rolling update'
      },
      
      // Action options
      rollback: {
        type: 'boolean',
        description: 'Rollback previous deployment'
      },
      status: {
        type: 'boolean',
        description: 'Check deployment status'
      },
      history: {
        type: 'boolean',
        description: 'Show deployment history'
      },
      limit: {
        type: 'number',
        description: 'Number of history entries to show'
      }
    }
  },
  handler: async (args) => {
    // Handle special actions
    if (args.history) {
      const { default: slamShip } = await import('./slam_ship.js');
      const history = await slamShip.getDeploymentHistory(args.limit || 10);
      
      const output = [
        '📜 Deployment History',
        '',
        ...history.map((d, i) => {
          const data = d.data;
          return [
            `${i + 1}. ${d.id}`,
            `   Status: ${d.status}`,
            `   Environment: ${data.environment}`,
            `   Strategy: ${data.strategy}`,
            `   Started: ${data.startedAt}`,
            ''
          ].join('\n');
        })
      ];
      
      return {
        content: [{
          type: 'text',
          text: output.join('\n')
        }]
      };
    }
    
    // Regular deployment
    const result = await slam_ship(args);
    
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
export default slam_ship_tool;
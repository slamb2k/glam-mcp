/**
 * Context Tools for MCP Server
 * Provides tools for managing session context, user preferences, and operation history
 */

import { createSuccessResponse, createErrorResponse } from '../utils/responses.js';
import { SessionManager } from '../context/session-manager.js';

// Create a singleton session manager instance
const sessionManager = new SessionManager({
  autoSave: false // Disable auto-save for MCP server
});

// Initialize a default session when the module loads
sessionManager.createSession('default');
sessionManager.setActiveSession('default');

/**
 * Register context tools with the server
 * @param {Object} server - The MCP server instance
 */
export function registerContextTools(server) {
  const tools = contextTools(sessionManager);
  tools.forEach(tool => server.addTool(tool));
}

/**
 * Get the session manager instance (for testing and integration)
 */
export function getSessionManager() {
  return sessionManager;
}

/**
 * Create context-related tools
 * @param {SessionManager} sessionManager - The session manager instance
 * @returns {Array} Array of context tool definitions
 */
export function contextTools(sessionManager) {
  return [
    {
      name: 'get_session_context',
      description: 'Retrieve current session context including git state, preferences, and recent operations. Use this when you need to understand the current working context or check user preferences.',
      inputSchema: {
        type: 'object',
        properties: {
          sections: {
            type: 'array',
            description: 'Specific sections to retrieve (gitContext, userPreferences, recentOperations, metadata). Returns all if not specified.',
            items: {
              type: 'string',
              enum: ['gitContext', 'userPreferences', 'recentOperations', 'metadata']
            }
          },
          format: {
            type: 'string',
            description: 'Output format for the context data',
            enum: ['json', 'summary'],
            default: 'json'
          }
        }
      },
      handler: async (params) => {
        const { sections, format = 'json' } = params;

        // Get active session
        const sessionResult = sessionManager.getActiveSession();
        if (!sessionResult.success) {
          return createErrorResponse(sessionResult.message);
        }

        const { sessionId, session } = sessionResult.data;
        let context = session;

        // Filter sections if specified
        if (sections && sections.length > 0) {
          context = {};
          for (const section of sections) {
            if (session[section] !== undefined) {
              context[section] = session[section];
            }
          }
        }

        // Format output
        let formattedData = { sessionId, context };
        if (format === 'summary') {
          formattedData = {
            sessionId,
            summary: {
              gitContext: context.gitContext ? {
                currentBranch: context.gitContext.currentBranch || 'N/A',
                hasUncommittedChanges: context.gitContext.hasUncommittedChanges || false
              } : null,
              preferences: context.userPreferences ? 
                Object.keys(context.userPreferences).length : 0,
              recentOperations: context.recentOperations ? 
                context.recentOperations.length : 0,
              metadata: context.metadata ? 
                Object.keys(context.metadata).length : 0
            }
          };
        }

        return createSuccessResponse('Session context retrieved', formattedData);
      }
    },

    {
      name: 'set_user_preference',
      description: 'Set a user preference in the current session. Use this to store user-specific settings like preferred commit message format, auto-commit behavior, or UI preferences.',
      inputSchema: {
        type: 'object',
        properties: {
          key: {
            type: 'string',
            description: 'The preference key (e.g., "theme", "autoCommit", "commitFormat")'
          },
          value: {
            description: 'The preference value (can be string, number, boolean, or object)'
          }
        },
        required: ['key', 'value']
      },
      handler: async (params) => {
        const { key, value } = params;

        // Validate key
        if (!key || typeof key !== 'string' || key.trim() === '') {
          return createErrorResponse('Invalid preference key');
        }

        // Get active session
        const sessionResult = sessionManager.getActiveSession();
        if (!sessionResult.success) {
          return createErrorResponse(sessionResult.message);
        }

        const { sessionId, session } = sessionResult.data;
        const updatedPreferences = {
          ...session.userPreferences,
          [key]: value
        };

        // Update session data
        const updateResult = sessionManager.updateSessionData(sessionId, {
          userPreferences: updatedPreferences
        });

        if (!updateResult.success) {
          return createErrorResponse('Failed to update preference', updateResult);
        }

        return createSuccessResponse('User preference set', {
          key,
          value,
          allPreferences: updatedPreferences
        });
      }
    },

    {
      name: 'get_recent_operations',
      description: 'Retrieve recent git operations from the session history. Use this to understand what actions have been performed recently or to check operation history.',
      inputSchema: {
        type: 'object',
        properties: {
          type: {
            type: 'string',
            description: 'Filter by operation type (e.g., "commit", "branch", "merge", "pr")'
          },
          limit: {
            type: 'integer',
            description: 'Maximum number of operations to return',
            default: 10,
            minimum: 1,
            maximum: 100
          }
        }
      },
      handler: async (params) => {
        const { type, limit = 10 } = params;

        // Get active session
        const sessionResult = sessionManager.getActiveSession();
        if (!sessionResult.success) {
          return createErrorResponse(sessionResult.message);
        }

        const { session } = sessionResult.data;
        let operations = session.recentOperations || [];

        // Filter by type if specified
        if (type) {
          operations = operations.filter(op => op.type === type);
        }

        // Apply limit
        const totalCount = operations.length;
        operations = operations.slice(0, limit);

        return createSuccessResponse('Recent operations retrieved', {
          operations,
          count: operations.length,
          totalCount,
          filtered: !!type
        });
      }
    },

    {
      name: 'clear_user_preferences',
      description: 'Clear all user preferences from the current session. Use this to reset preferences to defaults.',
      inputSchema: {
        type: 'object',
        properties: {}
      },
      handler: async () => {
        // Get active session
        const sessionResult = sessionManager.getActiveSession();
        if (!sessionResult.success) {
          return createErrorResponse(sessionResult.message);
        }

        const { sessionId } = sessionResult.data;

        // Clear preferences
        const updateResult = sessionManager.updateSessionData(sessionId, {
          userPreferences: {}
        });

        if (!updateResult.success) {
          return createErrorResponse('Failed to clear preferences', updateResult);
        }

        return createSuccessResponse('User preferences cleared');
      }
    },

    {
      name: 'add_operation',
      description: 'Add a new operation to the session history. This is typically called automatically by other tools but can be used manually for custom operations.',
      inputSchema: {
        type: 'object',
        properties: {
          type: {
            type: 'string',
            description: 'Operation type (e.g., "commit", "branch", "merge", "pr", "custom")'
          },
          message: {
            type: 'string',
            description: 'Operation description'
          },
          details: {
            type: 'object',
            description: 'Additional operation details',
            additionalProperties: true
          }
        },
        required: ['type', 'message']
      },
      handler: async (params) => {
        const { type, message, details = {} } = params;

        // Get active session
        const sessionResult = sessionManager.getActiveSession();
        if (!sessionResult.success) {
          return createErrorResponse(sessionResult.message);
        }

        const { sessionId, session } = sessionResult.data;
        
        // Create new operation
        const newOperation = {
          type,
          message,
          details,
          timestamp: new Date().toISOString()
        };

        // Add to recent operations (maintain max 100 operations)
        const recentOperations = [newOperation, ...(session.recentOperations || [])];
        if (recentOperations.length > 100) {
          recentOperations.length = 100;
        }

        // Update session data
        const updateResult = sessionManager.updateSessionData(sessionId, {
          recentOperations
        });

        if (!updateResult.success) {
          return createErrorResponse('Failed to add operation', updateResult);
        }

        return createSuccessResponse('Operation added to history', {
          operation: newOperation,
          totalOperations: recentOperations.length
        });
      }
    }
  ];
}
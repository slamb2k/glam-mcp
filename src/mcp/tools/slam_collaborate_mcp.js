/**
 * MCP Tool Binding for slam_collaborate
 * Team collaboration and synchronization features
 */

import { slam_collaborate } from './slam_collaborate.js';

export const slam_collaborate_tool = {
  name: 'slam_collaborate',
  description: 'Access team collaboration features including real-time sync, shared tasks, and conflict prevention',
  inputSchema: {
    type: 'object',
    properties: {
      action: {
        type: 'string',
        enum: ['join', 'leave', 'status', 'share', 'help', 'offer', 'chat', 'lock', 'unlock', 'task'],
        description: 'Collaboration action to perform',
        default: 'status'
      },
      
      // Team management
      teamId: {
        type: 'string',
        description: 'Team identifier to join or work with'
      },
      userId: {
        type: 'string',
        description: 'User identifier (defaults to "default")'
      },
      
      // Work sharing
      type: {
        type: 'string',
        enum: ['work-session', 'code-review', 'pair-programming', 'debugging'],
        description: 'Type of work being shared'
      },
      description: {
        type: 'string',
        description: 'Description of the work being shared'
      },
      
      // Help system
      message: {
        type: 'string',
        description: 'Message content for help requests, offers, or chat'
      },
      targetUserId: {
        type: 'string',
        description: 'Target user for help offers'
      },
      urgency: {
        type: 'string',
        enum: ['low', 'medium', 'high', 'critical'],
        description: 'Urgency level for help requests'
      },
      error: {
        type: 'object',
        description: 'Error details for help requests'
      },
      
      // Chat system
      mentions: {
        type: 'array',
        items: { type: 'string' },
        description: 'Users to mention in chat messages'
      },
      limit: {
        type: 'number',
        minimum: 1,
        maximum: 100,
        description: 'Limit for chat history retrieval'
      },
      
      // File locking
      filePath: {
        type: 'string',
        description: 'File path for lock/unlock operations'
      },
      reason: {
        type: 'string',
        description: 'Reason for file locking'
      },
      
      // Shared tasks
      task: {
        type: 'object',
        description: 'Task data for creating shared tasks',
        properties: {
          title: { type: 'string' },
          description: { type: 'string' },
          assignee: { type: 'string' },
          priority: { type: 'string', enum: ['low', 'medium', 'high', 'critical'] },
          dueDate: { type: 'string', format: 'date-time' }
        },
        required: ['title']
      },
      taskId: {
        type: 'string',
        description: 'Task ID for updates'
      },
      updates: {
        type: 'object',
        description: 'Updates to apply to a shared task',
        properties: {
          title: { type: 'string' },
          description: { type: 'string' },
          assignee: { type: 'string' },
          priority: { type: 'string', enum: ['low', 'medium', 'high', 'critical'] },
          status: { type: 'string', enum: ['pending', 'in-progress', 'review', 'completed', 'cancelled'] },
          dueDate: { type: 'string', format: 'date-time' }
        }
      },
      status: {
        type: 'string',
        enum: ['pending', 'in-progress', 'review', 'completed', 'cancelled'],
        description: 'Filter tasks by status'
      }
    },
    required: ['action']
  },
  handler: async (args) => {
    const result = await slam_collaborate(args.action, args);
    
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
export default slam_collaborate_tool;
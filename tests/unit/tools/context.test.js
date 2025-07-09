import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { contextTools } from '../../../src/tools/context.js';
import { createSuccessResponse, createErrorResponse } from '../../../src/utils/responses.js';

describe('Context Tools', () => {
  let mockSessionManager;
  let tools;

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Create mock session manager with all required methods
    mockSessionManager = {
      getActiveSession: jest.fn(),
      updateSessionData: jest.fn(),
      createSession: jest.fn(),
      setActiveSession: jest.fn()
    };
    
    tools = contextTools(mockSessionManager);
  });

  describe('get_session_context', () => {
    const getTool = (name) => tools.find(t => t.name === name);

    it('should retrieve complete session context', async () => {
      const mockSession = {
        id: 'test-session-123',
        createdAt: '2024-01-10T10:00:00.000Z',
        lastAccessedAt: '2024-01-10T12:00:00.000Z',
        data: {
          gitContext: {
            currentBranch: 'feature/test',
            lastCommit: 'abc123'
          },
          userPreferences: {
            theme: 'dark',
            autoCommit: true
          },
          recentOperations: [
            { type: 'commit', timestamp: '2024-01-10T11:00:00.000Z', message: 'Test commit' }
          ],
          metadata: {
            projectName: 'test-project'
          }
        }
      };

      mockSessionManager.getActiveSession.mockReturnValue(
        createSuccessResponse('Active session retrieved', {
          sessionId: mockSession.id,
          session: mockSession.data
        })
      );

      const tool = getTool('get_session_context');
      const result = await tool.handler({});

      expect(result.success).toBe(true);
      expect(result.message).toBe('Session context retrieved');
      expect(result.data.sessionId).toBe('test-session-123');
      expect(result.data.context).toEqual(mockSession.data);
    });

    it('should filter context by specific sections', async () => {
      const mockSession = {
        id: 'test-session-123',
        data: {
          gitContext: { currentBranch: 'main' },
          userPreferences: { theme: 'dark' },
          recentOperations: [],
          metadata: {}
        }
      };

      mockSessionManager.getActiveSession.mockReturnValue(
        createSuccessResponse('Active session retrieved', {
          sessionId: mockSession.id,
          session: mockSession.data
        })
      );

      const tool = getTool('get_session_context');
      const result = await tool.handler({ sections: ['gitContext', 'userPreferences'] });

      expect(result.success).toBe(true);
      expect(result.data.context).toHaveProperty('gitContext');
      expect(result.data.context).toHaveProperty('userPreferences');
      expect(result.data.context).not.toHaveProperty('recentOperations');
      expect(result.data.context).not.toHaveProperty('metadata');
    });

    it('should handle no active session gracefully', async () => {
      mockSessionManager.getActiveSession.mockReturnValue(
        createErrorResponse('No active session')
      );

      const tool = getTool('get_session_context');
      const result = await tool.handler({});

      expect(result.success).toBe(false);
      expect(result.message).toContain('No active session');
    });
  });

  describe('set_user_preference', () => {
    const getTool = (name) => tools.find(t => t.name === name);

    it('should set a user preference successfully', async () => {
      const mockSession = {
        data: {
          userPreferences: {}
        }
      };

      mockSessionManager.getActiveSession.mockReturnValue(
        createSuccessResponse('Active session retrieved', {
          sessionId: 'test-session',
          session: mockSession.data
        })
      );

      mockSessionManager.updateSessionData.mockReturnValue(
        createSuccessResponse('Session data updated')
      );

      const tool = getTool('set_user_preference');
      const result = await tool.handler({ key: 'theme', value: 'dark' });

      expect(result.success).toBe(true);
      expect(result.message).toBe('User preference set');
      expect(result.data.key).toBe('theme');
      expect(result.data.value).toBe('dark');
      expect(mockSessionManager.updateSessionData).toHaveBeenCalledWith(
        'test-session',
        { userPreferences: { theme: 'dark' } }
      );
    });

    it('should validate preference keys', async () => {
      const tool = getTool('set_user_preference');
      const result = await tool.handler({ key: '', value: 'test' });

      expect(result.success).toBe(false);
      expect(result.message).toContain('Invalid preference key');
    });

    it('should handle complex preference values', async () => {
      const mockSession = {
        data: {
          userPreferences: {
            existingPref: 'value'
          }
        }
      };

      mockSessionManager.getActiveSession.mockReturnValue(
        createSuccessResponse('Active session retrieved', {
          sessionId: 'test-session',
          session: mockSession.data
        })
      );

      mockSessionManager.updateSessionData.mockReturnValue(
        createSuccessResponse('Session data updated')
      );

      const tool = getTool('set_user_preference');
      const complexValue = { enabled: true, options: ['a', 'b'] };
      const result = await tool.handler({ key: 'feature', value: complexValue });

      expect(result.success).toBe(true);
      expect(result.data.value).toEqual(complexValue);
      expect(mockSessionManager.updateSessionData).toHaveBeenCalledWith(
        'test-session',
        { userPreferences: { existingPref: 'value', feature: complexValue } }
      );
    });
  });

  describe('get_recent_operations', () => {
    const getTool = (name) => tools.find(t => t.name === name);

    it('should retrieve all recent operations', async () => {
      const mockOperations = [
        { type: 'commit', timestamp: '2024-01-10T12:00:00.000Z', message: 'Latest commit' },
        { type: 'branch', timestamp: '2024-01-10T11:00:00.000Z', message: 'Created branch' },
        { type: 'merge', timestamp: '2024-01-10T10:00:00.000Z', message: 'Merged PR' }
      ];

      mockSessionManager.getActiveSession.mockReturnValue(
        createSuccessResponse('Active session retrieved', {
          sessionId: 'test-session',
          session: { recentOperations: mockOperations }
        })
      );

      const tool = getTool('get_recent_operations');
      const result = await tool.handler({});

      expect(result.success).toBe(true);
      expect(result.message).toBe('Recent operations retrieved');
      expect(result.data.operations).toEqual(mockOperations);
      expect(result.data.count).toBe(3);
    });

    it('should filter operations by type', async () => {
      const mockOperations = [
        { type: 'commit', timestamp: '2024-01-10T12:00:00.000Z', message: 'Commit 1' },
        { type: 'branch', timestamp: '2024-01-10T11:00:00.000Z', message: 'Branch 1' },
        { type: 'commit', timestamp: '2024-01-10T10:00:00.000Z', message: 'Commit 2' }
      ];

      mockSessionManager.getActiveSession.mockReturnValue(
        createSuccessResponse('Active session retrieved', {
          sessionId: 'test-session',
          session: { recentOperations: mockOperations }
        })
      );

      const tool = getTool('get_recent_operations');
      const result = await tool.handler({ type: 'commit' });

      expect(result.success).toBe(true);
      expect(result.data.operations).toHaveLength(2);
      expect(result.data.operations.every(op => op.type === 'commit')).toBe(true);
    });

    it('should limit number of operations returned', async () => {
      const mockOperations = Array.from({ length: 20 }, (_, i) => ({
        type: 'commit',
        timestamp: new Date(Date.now() - i * 60000).toISOString(),
        message: `Commit ${i}`
      }));

      mockSessionManager.getActiveSession.mockReturnValue(
        createSuccessResponse('Active session retrieved', {
          sessionId: 'test-session',
          session: { recentOperations: mockOperations }
        })
      );

      const tool = getTool('get_recent_operations');
      const result = await tool.handler({ limit: 5 });

      expect(result.success).toBe(true);
      expect(result.data.operations).toHaveLength(5);
      expect(result.data.totalCount).toBe(20);
    });

    it('should handle empty operations list', async () => {
      mockSessionManager.getActiveSession.mockReturnValue(
        createSuccessResponse('Active session retrieved', {
          sessionId: 'test-session',
          session: { recentOperations: [] }
        })
      );

      const tool = getTool('get_recent_operations');
      const result = await tool.handler({});

      expect(result.success).toBe(true);
      expect(result.data.operations).toEqual([]);
      expect(result.data.count).toBe(0);
    });
  });

  describe('clear_user_preferences', () => {
    const getTool = (name) => tools.find(t => t.name === name);

    it('should clear all user preferences', async () => {
      mockSessionManager.getActiveSession.mockReturnValue(
        createSuccessResponse('Active session retrieved', {
          sessionId: 'test-session',
          session: { userPreferences: { theme: 'dark', autoCommit: true } }
        })
      );

      mockSessionManager.updateSessionData.mockReturnValue(
        createSuccessResponse('Session data updated')
      );

      const tool = getTool('clear_user_preferences');
      const result = await tool.handler({});

      expect(result.success).toBe(true);
      expect(result.message).toBe('User preferences cleared');
      expect(mockSessionManager.updateSessionData).toHaveBeenCalledWith(
        'test-session',
        { userPreferences: {} }
      );
    });

    it('should handle no active session', async () => {
      mockSessionManager.getActiveSession.mockReturnValue(
        createErrorResponse('No active session')
      );

      const tool = getTool('clear_user_preferences');
      const result = await tool.handler({});

      expect(result.success).toBe(false);
      expect(result.message).toContain('No active session');
    });
  });

  describe('add_operation', () => {
    const getTool = (name) => tools.find(t => t.name === name);

    it('should add a new operation to recent operations', async () => {
      const existingOperations = [
        { type: 'commit', timestamp: '2024-01-10T10:00:00.000Z', message: 'Old commit' }
      ];

      mockSessionManager.getActiveSession.mockReturnValue(
        createSuccessResponse('Active session retrieved', {
          sessionId: 'test-session',
          session: { recentOperations: existingOperations }
        })
      );

      mockSessionManager.updateSessionData.mockReturnValue(
        createSuccessResponse('Session data updated')
      );

      const tool = getTool('add_operation');
      const result = await tool.handler({
        type: 'branch',
        message: 'Created new feature branch',
        details: { branchName: 'feature/test' }
      });

      expect(result.success).toBe(true);
      expect(result.message).toBe('Operation added to history');
      
      const updateCall = mockSessionManager.updateSessionData.mock.calls[0];
      expect(updateCall[0]).toBe('test-session');
      expect(updateCall[1].recentOperations).toHaveLength(2);
      expect(updateCall[1].recentOperations[0].type).toBe('branch');
      expect(updateCall[1].recentOperations[0].message).toBe('Created new feature branch');
      expect(updateCall[1].recentOperations[0].details).toEqual({ branchName: 'feature/test' });
    });

    it('should limit operations to maxOperations setting', async () => {
      const existingOperations = Array.from({ length: 100 }, (_, i) => ({
        type: 'commit',
        timestamp: new Date(Date.now() - i * 60000).toISOString(),
        message: `Commit ${i}`
      }));

      mockSessionManager.getActiveSession.mockReturnValue(
        createSuccessResponse('Active session retrieved', {
          sessionId: 'test-session',
          session: { recentOperations: existingOperations }
        })
      );

      mockSessionManager.updateSessionData.mockReturnValue(
        createSuccessResponse('Session data updated')
      );

      const tool = getTool('add_operation');
      const result = await tool.handler({
        type: 'merge',
        message: 'New merge operation'
      });

      expect(result.success).toBe(true);
      
      const updateCall = mockSessionManager.updateSessionData.mock.calls[0];
      expect(updateCall[1].recentOperations).toHaveLength(100); // Should maintain max of 100
      expect(updateCall[1].recentOperations[0].type).toBe('merge');
      expect(updateCall[1].recentOperations[0].message).toBe('New merge operation');
    });
  });
});
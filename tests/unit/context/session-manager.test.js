/**
 * Tests for Session Manager
 */

import { jest } from '@jest/globals';
import path from 'path';
import { SessionManager, SessionState } from '../../../src/context/session-manager.js';
import { ContextOperations } from '../../../src/context/context-operations.js';

// Helper functions to handle both legacy and enhanced response formats
const isSuccess = (result) => {
  if (typeof result.isSuccess === 'function') {
    return result.isSuccess();
  }
  return result.success === true;
};

const hasErrors = (result) => {
  if (typeof result.hasErrors === 'function') {
    return result.hasErrors();
  }
  return result.success === false;
};

describe('Session Manager', () => {
  let sessionManager;
  const testStoragePath = './tests/temp/test-sessions';

  beforeEach(() => {
    sessionManager = new SessionManager({
      storagePath: testStoragePath,
      autoSave: false // Disable auto-save for tests
    });
  });

  afterEach(async () => {
    if (sessionManager) {
      await sessionManager.shutdown();
    }
  });

  describe('SessionState', () => {
    it('should create session state with defaults', () => {
      const state = new SessionState('test-id');
      
      expect(state.id).toBe('test-id');
      expect(state.createdAt).toBeDefined();
      expect(state.lastAccessedAt).toBeDefined();
      expect(state.data).toHaveProperty('gitContext', {});
      expect(state.data).toHaveProperty('userPreferences', {});
      expect(state.data).toHaveProperty('recentOperations', []);
      expect(state.data).toHaveProperty('metadata', {});
    });

    it('should merge initial data', () => {
      const initialData = {
        gitContext: { branch: 'main' },
        customField: 'value'
      };
      
      const state = new SessionState('test-id', initialData);
      
      expect(state.data.gitContext).toEqual({ branch: 'main' });
      expect(state.data.customField).toBe('value');
    });
  });

  describe('Session Creation', () => {
    it('should create a new session', () => {
      const result = sessionManager.createSession();
      
      expect(isSuccess(result)).toBe(true);
      expect(result.data.sessionId).toBeDefined();
      expect(sessionManager.sessions.size).toBe(1);
    });

    it('should create session with custom ID', () => {
      const result = sessionManager.createSession('custom-id');
      
      expect(isSuccess(result)).toBe(true);
      expect(result.data.sessionId).toBe('custom-id');
      expect(sessionManager.sessions.has('custom-id')).toBe(true);
    });

    it('should reject duplicate session IDs', () => {
      sessionManager.createSession('test-id');
      
      expect(() => {
        sessionManager.createSession('test-id');
      }).toThrow('Session test-id already exists');
    });

    it('should emit sessionCreated event', () => {
      const listener = jest.fn();
      sessionManager.on('sessionCreated', listener);
      
      sessionManager.createSession('test-id');
      
      expect(listener).toHaveBeenCalledWith({
        sessionId: 'test-id',
        session: expect.any(SessionState)
      });
    });
  });

  describe('Session Loading', () => {
    it('should return session from memory if loaded', async () => {
      sessionManager.createSession('test-id');
      
      const result = await sessionManager.loadSession('test-id');
      
      expect(isSuccess(result)).toBe(true);
      expect(result.message).toContain('from memory');
    });

    it('should handle missing session file', async () => {
      const result = await sessionManager.loadSession('missing-id');
      
      expect(hasErrors(result)).toBe(true);
      expect(result.message).toContain('not found');
    });
  });

  describe('Session Saving', () => {
    it('should save session to storage', async () => {
      sessionManager.createSession('test-id');
      const result = await sessionManager.saveSession('test-id');
      
      expect(isSuccess(result)).toBe(true);
    });

    it('should save all sessions', async () => {
      sessionManager.createSession('session1');
      sessionManager.createSession('session2');
      
      const result = await sessionManager.saveAllSessions();
      
      expect(isSuccess(result)).toBe(true);
      expect(result.data.count).toBe(2);
    });
  });

  describe('Session Management', () => {
    it('should set and get active session', () => {
      sessionManager.createSession('test-id');
      
      const setResult = sessionManager.setActiveSession('test-id');
      expect(isSuccess(setResult)).toBe(true);
      
      const getResult = sessionManager.getActiveSession();
      expect(isSuccess(getResult)).toBe(true);
      expect(getResult.data.sessionId).toBe('test-id');
    });

    it('should list all sessions', () => {
      sessionManager.createSession('session1');
      sessionManager.createSession('session2');
      sessionManager.setActiveSession('session1');
      
      const result = sessionManager.listSessions();
      
      expect(isSuccess(result)).toBe(true);
      expect(result.data.count).toBe(2);
      expect(result.data.activeSessionId).toBe('session1');
      expect(result.data.sessions).toHaveLength(2);
    });

    it('should destroy session', async () => {
      sessionManager.createSession('test-id');
      const result = await sessionManager.destroySession('test-id');
      
      expect(isSuccess(result)).toBe(true);
      expect(sessionManager.sessions.has('test-id')).toBe(false);
    });
  });
});

describe('Context Operations', () => {
  let sessionManager;
  let contextOps;
  let sessionId;

  beforeEach(() => {
    sessionManager = new SessionManager({ 
      storagePath: './tests/temp/test-sessions',
      autoSave: false 
    });
    contextOps = new ContextOperations(sessionManager);
    
    const result = sessionManager.createSession();
    sessionId = result.data.sessionId;
  });

  describe('Context Updates', () => {
    it('should update context value', () => {
      const result = contextOps.updateContext(sessionId, 'gitContext.branch', 'feature-1');
      
      expect(isSuccess(result)).toBe(true);
      expect(result.data.value).toBe('feature-1');
      
      const session = sessionManager.sessions.get(sessionId);
      expect(session.data.gitContext.branch).toBe('feature-1');
    });

    it('should create nested context paths', () => {
      const result = contextOps.updateContext(sessionId, 'deeply.nested.value', 42);
      
      expect(isSuccess(result)).toBe(true);
      
      const session = sessionManager.sessions.get(sessionId);
      expect(session.data.deeply.nested.value).toBe(42);
    });

    it('should merge objects when specified', () => {
      contextOps.updateContext(sessionId, 'config', { a: 1, b: 2 });
      const result = contextOps.updateContext(sessionId, 'config', { b: 3, c: 4 }, { merge: true });
      
      expect(isSuccess(result)).toBe(true);
      
      const session = sessionManager.sessions.get(sessionId);
      expect(session.data.config).toEqual({ a: 1, b: 3, c: 4 });
    });

    it('should handle batch updates', () => {
      const updates = [
        { path: 'gitContext.branch', value: 'main' },
        { path: 'gitContext.remote', value: 'origin' },
        { path: 'userPreferences.theme', value: 'dark' }
      ];
      
      const result = contextOps.batchUpdateContext(sessionId, updates);
      
      expect(isSuccess(result)).toBe(true);
      expect(result.data.updated).toBe(3);
      
      const session = sessionManager.sessions.get(sessionId);
      expect(session.data.gitContext.branch).toBe('main');
      expect(session.data.gitContext.remote).toBe('origin');
      expect(session.data.userPreferences.theme).toBe('dark');
    });
  });

  describe('Context Queries', () => {
    beforeEach(() => {
      contextOps.updateContext(sessionId, 'gitContext.branch', 'main');
      contextOps.updateContext(sessionId, 'gitContext.remote', 'origin');
      contextOps.updateContext(sessionId, 'userPreferences.theme', 'dark');
    });

    it('should query by path', () => {
      const result = contextOps.queryContext(sessionId, { path: 'gitContext.branch' });
      
      expect(isSuccess(result)).toBe(true);
      expect(result.data.result).toBe('main');
    });

    it('should search context', () => {
      const result = contextOps.queryContext(sessionId, { search: 'theme' });
      
      expect(isSuccess(result)).toBe(true);
      expect(result.data.result).toHaveLength(1);
      expect(result.data.result[0]).toMatchObject({
        path: 'userPreferences.theme',
        value: 'dark',
        matchType: 'key'
      });
    });

    it('should return all context when no query specified', () => {
      const result = contextOps.queryContext(sessionId);
      
      expect(isSuccess(result)).toBe(true);
      expect(result.data.result).toHaveProperty('gitContext');
      expect(result.data.result).toHaveProperty('userPreferences');
    });
  });

  describe('Git Integration', () => {
    it('should update git context', () => {
      const gitData = {
        branch: 'feature-branch',
        remote: 'upstream',
        lastCommit: 'abc123'
      };
      
      const result = contextOps.updateGitContext(sessionId, gitData);
      
      expect(isSuccess(result)).toBe(true);
      
      const session = sessionManager.sessions.get(sessionId);
      expect(session.data.gitContext).toMatchObject(gitData);
    });
  });

  describe('User Preferences', () => {
    it('should update user preferences', () => {
      const preferences = {
        theme: 'dark',
        autoSave: true
      };
      
      const result = contextOps.updateUserPreferences(sessionId, preferences);
      
      expect(isSuccess(result)).toBe(true);
      expect(result.data.preferences).toMatchObject(preferences);
      expect(result.data.preferences.lastUpdated).toBeDefined();
    });

    it('should validate preferences', () => {
      const invalidPreferences = {
        theme: 'invalid-theme'
      };
      
      const result = contextOps.updateUserPreferences(sessionId, invalidPreferences);
      
      expect(hasErrors(result)).toBe(true);
      expect(result.data?.errors || result.message).toBeDefined();
    });

    it('should get preferences with defaults', () => {
      const result = contextOps.getUserPreferences(sessionId);
      
      expect(isSuccess(result)).toBe(true);
      expect(result.data.defaults).toHaveProperty('theme', 'auto');
      expect(result.data.defaults).toHaveProperty('autoSave', true);
    });
  });

  describe('Recent Operations', () => {
    it('should track recent operations', () => {
      contextOps.updateContext(sessionId, 'test.value', 1);
      contextOps.updateContext(sessionId, 'test.value', 2);
      
      const result = contextOps.getRecentOperations(sessionId);
      
      expect(isSuccess(result)).toBe(true);
      expect(result.data.operations).toHaveLength(2);
      expect(result.data.operations[0].type).toBe('contextUpdate');
      expect(result.data.operations[0].newValue).toBe(2);
    });
  });
});
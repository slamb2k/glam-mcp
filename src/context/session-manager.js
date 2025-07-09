/**
 * Session Context Management for MCP Server
 * Provides stateful context tracking and management across MCP operations
 */

import fs from 'fs';
import path from 'path';
import { EventEmitter } from 'events';
import { createSuccessResponse, createErrorResponse, createStatusResponse } from '../utils/responses.js';

/**
 * Session state structure
 */
export class SessionState {
  constructor(id, data = {}) {
    this.id = id;
    this.createdAt = new Date().toISOString();
    this.lastAccessedAt = new Date().toISOString();
    this.data = {
      gitContext: {},
      userPreferences: {},
      recentOperations: [],
      metadata: {},
      ...data
    };
  }

  updateLastAccessed() {
    this.lastAccessedAt = new Date().toISOString();
  }
}

/**
 * SessionManager class for managing stateful context
 */
export class SessionManager extends EventEmitter {
  static instance = null;

  constructor(options = {}) {
    super();
    
    this.options = {
      storagePath: options.storagePath || './.mcp-sessions',
      maxSessions: options.maxSessions || 100,
      sessionTimeout: options.sessionTimeout || 86400000, // 24 hours
      autoSave: options.autoSave !== false,
      autoSaveInterval: options.autoSaveInterval || 30000, // 30 seconds
      encryptSessions: options.encryptSessions || false,
      ...options
    };

    this.sessions = new Map();
    this.activeSessionId = null;
    this.saveTimer = null;

    // Ensure storage directory exists
    this._ensureStorageDirectory();

    // Start auto-save if enabled
    if (this.options.autoSave) {
      this._startAutoSave();
    }
  }

  /**
   * Get singleton instance
   */
  static getInstance(options = {}) {
    if (!SessionManager.instance) {
      SessionManager.instance = new SessionManager(options);
    }
    return SessionManager.instance;
  }

  /**
   * Create a new session
   */
  createSession(id = null, initialData = {}) {
    const sessionId = id || this._generateSessionId();
    
    if (this.sessions.has(sessionId)) {
      throw new Error(`Session ${sessionId} already exists`);
    }

    const session = new SessionState(sessionId, initialData);
    this.sessions.set(sessionId, session);
    
    this.emit('sessionCreated', { sessionId, session });
    
    if (this.options.autoSave) {
      this._scheduleSave();
    }

    return createSuccessResponse('Session created', {
      sessionId,
      createdAt: session.createdAt
    });
  }

  /**
   * Load an existing session
   */
  async loadSession(sessionId) {
    // Check if already loaded
    if (this.sessions.has(sessionId)) {
      const session = this.sessions.get(sessionId);
      session.updateLastAccessed();
      return createSuccessResponse('Session loaded from memory', { sessionId });
    }

    // Try to load from storage
    try {
      const sessionPath = this._getSessionPath(sessionId);
      
      if (!fs.existsSync(sessionPath)) {
        return createErrorResponse(`Session ${sessionId} not found`);
      }

      const data = await fs.promises.readFile(sessionPath, 'utf8');
      const sessionData = JSON.parse(data);
      
      const session = new SessionState(sessionId, sessionData.data);
      session.createdAt = sessionData.createdAt;
      session.lastAccessedAt = new Date().toISOString();
      
      this.sessions.set(sessionId, session);
      
      this.emit('sessionLoaded', { sessionId, session });
      
      return createSuccessResponse('Session loaded from storage', { sessionId });
    } catch (error) {
      return createErrorResponse('Failed to load session', error);
    }
  }

  /**
   * Save a session to storage
   */
  async saveSession(sessionId) {
    const session = this.sessions.get(sessionId);
    
    if (!session) {
      return createErrorResponse(`Session ${sessionId} not found`);
    }

    try {
      const sessionPath = this._getSessionPath(sessionId);
      const data = JSON.stringify(session, null, 2);
      
      await fs.promises.writeFile(sessionPath, data, 'utf8');
      
      this.emit('sessionSaved', { sessionId });
      
      return createSuccessResponse('Session saved', { sessionId });
    } catch (error) {
      return createErrorResponse('Failed to save session', error);
    }
  }

  /**
   * Save all sessions
   */
  async saveAllSessions() {
    const results = [];
    
    for (const sessionId of this.sessions.keys()) {
      const result = await this.saveSession(sessionId);
      results.push({ sessionId, result });
    }
    
    const failures = results.filter(r => !r.result.success);
    
    if (failures.length > 0) {
      return createStatusResponse('warning', 'Some sessions failed to save', {
        total: results.length,
        saved: results.length - failures.length,
        failed: failures.length,
        failures: failures.map(f => f.sessionId)
      });
    }
    
    return createSuccessResponse('All sessions saved', {
      count: results.length
    });
  }

  /**
   * Destroy a session
   */
  async destroySession(sessionId) {
    const session = this.sessions.get(sessionId);
    
    if (!session) {
      return createErrorResponse(`Session ${sessionId} not found`);
    }

    // Remove from memory
    this.sessions.delete(sessionId);
    
    // Remove from storage
    try {
      const sessionPath = this._getSessionPath(sessionId);
      if (fs.existsSync(sessionPath)) {
        await fs.promises.unlink(sessionPath);
      }
    } catch (error) {
      // Log but don't fail
      console.error(`Failed to delete session file: ${error.message}`);
    }

    this.emit('sessionDestroyed', { sessionId });
    
    return createSuccessResponse('Session destroyed', { sessionId });
  }

  /**
   * Get active session
   */
  getActiveSession() {
    if (!this.activeSessionId) {
      return createErrorResponse('No active session');
    }

    const session = this.sessions.get(this.activeSessionId);
    if (!session) {
      return createErrorResponse('Active session not found');
    }

    return createSuccessResponse('Active session retrieved', {
      sessionId: this.activeSessionId,
      session: session.data
    });
  }

  /**
   * Set active session
   */
  setActiveSession(sessionId) {
    if (!this.sessions.has(sessionId)) {
      return createErrorResponse(`Session ${sessionId} not found`);
    }

    const previousId = this.activeSessionId;
    this.activeSessionId = sessionId;
    
    const session = this.sessions.get(sessionId);
    session.updateLastAccessed();
    
    this.emit('activeSessionChanged', {
      previousId,
      currentId: sessionId
    });
    
    return createSuccessResponse('Active session set', {
      previousId,
      currentId: sessionId
    });
  }

  /**
   * List all sessions
   */
  listSessions() {
    const sessionList = Array.from(this.sessions.entries()).map(([id, session]) => ({
      id,
      createdAt: session.createdAt,
      lastAccessedAt: session.lastAccessedAt,
      isActive: id === this.activeSessionId
    }));

    return createSuccessResponse('Sessions listed', {
      count: sessionList.length,
      activeSessionId: this.activeSessionId,
      sessions: sessionList
    });
  }

  /**
   * Clean up expired sessions
   */
  async cleanupExpiredSessions() {
    const now = Date.now();
    const expiredSessions = [];

    for (const [sessionId, session] of this.sessions.entries()) {
      const lastAccessed = new Date(session.lastAccessedAt).getTime();
      if (now - lastAccessed > this.options.sessionTimeout) {
        expiredSessions.push(sessionId);
      }
    }

    const results = [];
    for (const sessionId of expiredSessions) {
      const result = await this.destroySession(sessionId);
      results.push({ sessionId, result });
    }

    return createSuccessResponse('Expired sessions cleaned up', {
      count: expiredSessions.length,
      sessions: expiredSessions
    });
  }

  /**
   * Update session data
   */
  updateSessionData(sessionId, updates) {
    const session = this.sessions.get(sessionId);
    
    if (!session) {
      return createErrorResponse(`Session ${sessionId} not found`);
    }

    try {
      // Merge updates with existing data
      Object.keys(updates).forEach(key => {
        if (typeof updates[key] === 'object' && !Array.isArray(updates[key])) {
          // Merge objects
          session.data[key] = {
            ...session.data[key],
            ...updates[key]
          };
        } else {
          // Replace arrays and primitives
          session.data[key] = updates[key];
        }
      });

      session.updateLastAccessed();
      
      this.emit('sessionDataUpdated', { sessionId, updates });
      
      if (this.options.autoSave) {
        this._scheduleSave();
      }

      return createSuccessResponse('Session data updated', {
        sessionId,
        updatedFields: Object.keys(updates)
      });
    } catch (error) {
      return createErrorResponse('Failed to update session data', error);
    }
  }

  /**
   * Shutdown the session manager
   */
  async shutdown() {
    // Stop auto-save
    if (this.saveTimer) {
      clearInterval(this.saveTimer);
      this.saveTimer = null;
    }

    // Save all sessions
    const saveResult = await this.saveAllSessions();
    
    // Clear sessions from memory
    this.sessions.clear();
    this.activeSessionId = null;
    
    this.emit('shutdown');
    
    return saveResult;
  }

  // Private methods

  _ensureStorageDirectory() {
    if (!fs.existsSync(this.options.storagePath)) {
      fs.mkdirSync(this.options.storagePath, { recursive: true });
    }
  }

  _generateSessionId() {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  _getSessionPath(sessionId) {
    return path.join(this.options.storagePath, `${sessionId}.json`);
  }

  _startAutoSave() {
    this.saveTimer = setInterval(async () => {
      await this.saveAllSessions();
    }, this.options.autoSaveInterval);
  }

  _scheduleSave() {
    // Debounced save implementation could go here
    // For now, rely on interval-based auto-save
  }
}
/**
 * Context Operations for Session Management
 * Provides methods for updating, querying, and managing session context
 */

import { ResponseFactory } from '../core/enhanced-response.js';

/**
 * Context update operations
 */
export class ContextOperations {
  constructor(sessionManager) {
    this.sessionManager = sessionManager;
  }

  /**
   * Update context for a session
   */
  updateContext(sessionId, contextPath, value, options = {}) {
    const session = this.sessionManager.sessions.get(sessionId);
    
    if (!session) {
      return ResponseFactory.error(`Session ${sessionId} not found`);
    }

    try {
      // Parse the context path (e.g., "gitContext.branch" -> ["gitContext", "branch"])
      const pathParts = contextPath.split('.');
      let current = session.data;
      
      // Navigate to the parent object
      for (let i = 0; i < pathParts.length - 1; i++) {
        const part = pathParts[i];
        if (!current[part]) {
          current[part] = {};
        }
        current = current[part];
      }
      
      // Get the old value for history
      const lastPart = pathParts[pathParts.length - 1];
      const oldValue = current[lastPart];
      
      // Update the value
      if (options.merge && typeof value === 'object' && typeof oldValue === 'object') {
        current[lastPart] = { ...oldValue, ...value };
      } else {
        current[lastPart] = value;
      }
      
      // Update timestamp
      session.updateLastAccessed();
      
      // Add to recent operations if tracking is enabled
      if (options.trackOperation !== false) {
        this._addRecentOperation(session, {
          type: 'contextUpdate',
          path: contextPath,
          oldValue,
          newValue: current[lastPart],
          timestamp: new Date().toISOString()
        });
      }
      
      // Emit event
      this.sessionManager.emit('contextUpdated', {
        sessionId,
        path: contextPath,
        oldValue,
        newValue: current[lastPart]
      });
      
      return ResponseFactory.success('Context updated', {
        path: contextPath,
        value: current[lastPart]
      });
    } catch (error) {
      return ResponseFactory.error('Failed to update context', error);
    }
  }

  /**
   * Batch update multiple context values
   */
  batchUpdateContext(sessionId, updates, options = {}) {
    const session = this.sessionManager.sessions.get(sessionId);
    
    if (!session) {
      return ResponseFactory.error(`Session ${sessionId} not found`);
    }

    const results = [];
    const errors = [];
    
    // Use transaction-like approach if requested
    const backupData = options.transactional ? JSON.parse(JSON.stringify(session.data)) : null;
    
    for (const update of updates) {
      const result = this.updateContext(sessionId, update.path, update.value, {
        ...options,
        trackOperation: false // We'll track the batch operation instead
      });
      
      results.push({
        path: update.path,
        success: result.isSuccess()
      });
      
      if (result.hasErrors()) {
        errors.push({
          path: update.path,
          error: result.message
        });
        
        // Rollback if transactional
        if (options.transactional) {
          session.data = backupData;
          return ResponseFactory.error('Batch update failed - rolled back', { errors });
        }
      }
    }
    
    // Track the batch operation
    this._addRecentOperation(session, {
      type: 'batchContextUpdate',
      updates: updates.length,
      successful: results.filter(r => r.success).length,
      timestamp: new Date().toISOString()
    });
    
    if (errors.length > 0) {
      return ResponseFactory.warning('Batch update completed with errors', {
        total: updates.length,
        successful: updates.length - errors.length,
        errors
      });
    }
    
    return ResponseFactory.success('Batch update completed', {
      updated: updates.length
    });
  }

  /**
   * Remove context data
   */
  removeContext(sessionId, contextPath) {
    const session = this.sessionManager.sessions.get(sessionId);
    
    if (!session) {
      return ResponseFactory.error(`Session ${sessionId} not found`);
    }

    try {
      const pathParts = contextPath.split('.');
      let current = session.data;
      
      // Navigate to the parent object
      for (let i = 0; i < pathParts.length - 1; i++) {
        const part = pathParts[i];
        if (!current[part]) {
          return ResponseFactory.error(`Context path ${contextPath} not found`);
        }
        current = current[part];
      }
      
      const lastPart = pathParts[pathParts.length - 1];
      const oldValue = current[lastPart];
      
      if (!(lastPart in current)) {
        return ResponseFactory.error(`Context path ${contextPath} not found`);
      }
      
      delete current[lastPart];
      
      session.updateLastAccessed();
      
      this._addRecentOperation(session, {
        type: 'contextRemove',
        path: contextPath,
        oldValue,
        timestamp: new Date().toISOString()
      });
      
      return ResponseFactory.success('Context removed', {
        path: contextPath
      });
    } catch (error) {
      return ResponseFactory.error('Failed to remove context', error);
    }
  }

  /**
   * Query context data
   */
  queryContext(sessionId, query = {}) {
    const session = this.sessionManager.sessions.get(sessionId);
    
    if (!session) {
      return ResponseFactory.error(`Session ${sessionId} not found`);
    }

    try {
      let result;
      
      if (query.path) {
        // Get specific path
        result = this._getContextByPath(session.data, query.path);
        
        if (result === undefined) {
          return ResponseFactory.error(`Context path ${query.path} not found`);
        }
      } else if (query.filter) {
        // Filter context data
        result = this._filterContext(session.data, query.filter);
      } else if (query.search) {
        // Search within context
        result = this._searchContext(session.data, query.search);
      } else {
        // Return all context
        result = session.data;
      }
      
      session.updateLastAccessed();
      
      return ResponseFactory.success('Context retrieved', {
        query,
        result
      });
    } catch (error) {
      return ResponseFactory.error('Failed to query context', error);
    }
  }

  /**
   * Get recent operations
   */
  getRecentOperations(sessionId, limit = 10) {
    const session = this.sessionManager.sessions.get(sessionId);
    
    if (!session) {
      return ResponseFactory.error(`Session ${sessionId} not found`);
    }

    const operations = session.data.recentOperations || [];
    const recent = operations.slice(-limit).reverse();
    
    return ResponseFactory.success('Recent operations retrieved', {
      count: recent.length,
      total: operations.length,
      operations: recent
    });
  }

  /**
   * Update git context
   */
  updateGitContext(sessionId, gitData) {
    const updates = Object.entries(gitData).map(([key, value]) => ({
      path: `gitContext.${key}`,
      value
    }));
    
    const result = this.batchUpdateContext(sessionId, updates);
    
    if (result.isSuccess()) {
      this.sessionManager.emit('gitContextUpdated', {
        sessionId,
        gitData
      });
    }
    
    return result;
  }

  /**
   * Update user preferences
   */
  updateUserPreferences(sessionId, preferences) {
    const session = this.sessionManager.sessions.get(sessionId);
    
    if (!session) {
      return ResponseFactory.error(`Session ${sessionId} not found`);
    }

    // Validate preferences
    const validation = this._validatePreferences(preferences);
    if (validation.hasErrors()) {
      return validation;
    }

    const oldPreferences = { ...session.data.userPreferences };
    session.data.userPreferences = {
      ...oldPreferences,
      ...preferences,
      lastUpdated: new Date().toISOString()
    };
    
    session.updateLastAccessed();
    
    this._addRecentOperation(session, {
      type: 'preferencesUpdate',
      changes: Object.keys(preferences),
      timestamp: new Date().toISOString()
    });
    
    this.sessionManager.emit('preferencesUpdated', {
      sessionId,
      oldPreferences,
      newPreferences: session.data.userPreferences
    });
    
    return ResponseFactory.success('Preferences updated', {
      preferences: session.data.userPreferences
    });
  }

  /**
   * Get user preferences
   */
  getUserPreferences(sessionId) {
    const session = this.sessionManager.sessions.get(sessionId);
    
    if (!session) {
      return ResponseFactory.error(`Session ${sessionId} not found`);
    }

    return ResponseFactory.success('Preferences retrieved', {
      preferences: session.data.userPreferences || {},
      defaults: this._getDefaultPreferences()
    });
  }

  // Private helper methods

  _addRecentOperation(session, operation) {
    if (!session.data.recentOperations) {
      session.data.recentOperations = [];
    }
    
    session.data.recentOperations.push(operation);
    
    // Keep only the last 100 operations
    if (session.data.recentOperations.length > 100) {
      session.data.recentOperations = session.data.recentOperations.slice(-100);
    }
  }

  _getContextByPath(data, path) {
    const pathParts = path.split('.');
    let current = data;
    
    for (const part of pathParts) {
      if (current && typeof current === 'object' && part in current) {
        current = current[part];
      } else {
        return undefined;
      }
    }
    
    return current;
  }

  _filterContext(data, filter) {
    const results = {};
    
    const traverse = (obj, currentPath = '') => {
      for (const [key, value] of Object.entries(obj)) {
        const path = currentPath ? `${currentPath}.${key}` : key;
        
        if (filter.paths && filter.paths.includes(path)) {
          results[path] = value;
        }
        
        if (filter.type && typeof value === filter.type) {
          results[path] = value;
        }
        
        if (value && typeof value === 'object' && !Array.isArray(value)) {
          traverse(value, path);
        }
      }
    };
    
    traverse(data);
    return results;
  }

  _searchContext(data, searchTerm) {
    const results = [];
    const term = searchTerm.toLowerCase();
    
    const traverse = (obj, currentPath = '') => {
      for (const [key, value] of Object.entries(obj)) {
        const path = currentPath ? `${currentPath}.${key}` : key;
        
        // Search in keys
        if (key.toLowerCase().includes(term)) {
          results.push({ path, value, matchType: 'key' });
        }
        
        // Search in string values
        if (typeof value === 'string' && value.toLowerCase().includes(term)) {
          results.push({ path, value, matchType: 'value' });
        }
        
        // Recurse into objects
        if (value && typeof value === 'object' && !Array.isArray(value)) {
          traverse(value, path);
        }
      }
    };
    
    traverse(data);
    return results;
  }

  _validatePreferences(preferences) {
    const errors = [];
    
    // Add preference validation rules here
    if (preferences.theme && !['light', 'dark', 'auto'].includes(preferences.theme)) {
      errors.push('Invalid theme value');
    }
    
    if (preferences.autoSave !== undefined && typeof preferences.autoSave !== 'boolean') {
      errors.push('autoSave must be a boolean');
    }
    
    if (errors.length > 0) {
      return ResponseFactory.error('Invalid preferences', errors);
    }
    
    return ResponseFactory.success('Preferences valid');
  }

  _getDefaultPreferences() {
    return {
      theme: 'auto',
      autoSave: true,
      notifications: {
        enabled: true,
        types: ['error', 'warning']
      },
      git: {
        autoPush: false,
        confirmBeforePush: true,
        defaultBranch: 'main'
      }
    };
  }
}
import sqlite3 from 'sqlite3';
import { open } from 'sqlite';
import path from 'path';
import fs from 'fs-extra';
import logger from '../utils/logger.js';

/**
 * Context Persistence Layer
 * Handles storing and retrieving context data using SQLite
 */
export class ContextPersistence {
  constructor(dbPath = null) {
    this.dbPath = dbPath || path.join(process.cwd(), '.slambed', 'context.db');
    this.db = null;
    this.initialized = false;
  }

  /**
   * Initialize the database
   */
  async initialize() {
    try {
      // Ensure directory exists
      await fs.ensureDir(path.dirname(this.dbPath));

      // Open database
      this.db = await open({
        filename: this.dbPath,
        driver: sqlite3.Database
      });

      // Create tables
      await this.createTables();
      
      this.initialized = true;
      logger.info('Context persistence initialized');
    } catch (error) {
      logger.error('Failed to initialize context persistence:', error);
      throw error;
    }
  }

  /**
   * Create database tables
   */
  async createTables() {
    // Context snapshots table
    await this.db.exec(`
      CREATE TABLE IF NOT EXISTS context_snapshots (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        timestamp TEXT NOT NULL,
        type TEXT NOT NULL,
        data TEXT NOT NULL,
        metadata TEXT,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // User activities table
    await this.db.exec(`
      CREATE TABLE IF NOT EXISTS user_activities (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        activity_type TEXT NOT NULL,
        description TEXT,
        context TEXT,
        timestamp TEXT NOT NULL,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Git state history table
    await this.db.exec(`
      CREATE TABLE IF NOT EXISTS git_state_history (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        branch TEXT NOT NULL,
        commit_hash TEXT,
        status TEXT,
        timestamp TEXT NOT NULL,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Inferences table
    await this.db.exec(`
      CREATE TABLE IF NOT EXISTS inferences (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        inference_type TEXT NOT NULL,
        data TEXT NOT NULL,
        confidence REAL,
        timestamp TEXT NOT NULL,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create indexes
    await this.db.exec(`
      CREATE INDEX IF NOT EXISTS idx_snapshots_timestamp ON context_snapshots(timestamp);
      CREATE INDEX IF NOT EXISTS idx_snapshots_type ON context_snapshots(type);
      CREATE INDEX IF NOT EXISTS idx_activities_timestamp ON user_activities(timestamp);
      CREATE INDEX IF NOT EXISTS idx_activities_type ON user_activities(activity_type);
      CREATE INDEX IF NOT EXISTS idx_git_timestamp ON git_state_history(timestamp);
      CREATE INDEX IF NOT EXISTS idx_inferences_timestamp ON inferences(timestamp);
    `);
  }

  /**
   * Save context snapshot
   */
  async saveSnapshot(type, data, metadata = null) {
    if (!this.initialized) await this.initialize();

    try {
      const timestamp = new Date().toISOString();
      const result = await this.db.run(
        `INSERT INTO context_snapshots (timestamp, type, data, metadata) VALUES (?, ?, ?, ?)`,
        [timestamp, type, JSON.stringify(data), metadata ? JSON.stringify(metadata) : null]
      );
      
      return result.lastID;
    } catch (error) {
      logger.error('Failed to save context snapshot:', error);
      throw error;
    }
  }

  /**
   * Save user activity
   */
  async saveUserActivity(activity) {
    if (!this.initialized) await this.initialize();

    try {
      const result = await this.db.run(
        `INSERT INTO user_activities (activity_type, description, context, timestamp) VALUES (?, ?, ?, ?)`,
        [
          activity.type,
          activity.description || null,
          activity.context ? JSON.stringify(activity.context) : null,
          activity.timestamp || new Date().toISOString()
        ]
      );
      
      return result.lastID;
    } catch (error) {
      logger.error('Failed to save user activity:', error);
      throw error;
    }
  }

  /**
   * Save git state
   */
  async saveGitState(gitState) {
    if (!this.initialized) await this.initialize();

    try {
      const result = await this.db.run(
        `INSERT INTO git_state_history (branch, commit_hash, status, timestamp) VALUES (?, ?, ?, ?)`,
        [
          gitState.currentBranch,
          gitState.lastCommit || null,
          JSON.stringify(gitState.status),
          new Date().toISOString()
        ]
      );
      
      return result.lastID;
    } catch (error) {
      logger.error('Failed to save git state:', error);
      throw error;
    }
  }

  /**
   * Save inference
   */
  async saveInference(type, data, confidence = null) {
    if (!this.initialized) await this.initialize();

    try {
      const result = await this.db.run(
        `INSERT INTO inferences (inference_type, data, confidence, timestamp) VALUES (?, ?, ?, ?)`,
        [
          type,
          JSON.stringify(data),
          confidence,
          new Date().toISOString()
        ]
      );
      
      return result.lastID;
    } catch (error) {
      logger.error('Failed to save inference:', error);
      throw error;
    }
  }

  /**
   * Get recent snapshots
   */
  async getRecentSnapshots(type = null, limit = 10) {
    if (!this.initialized) await this.initialize();

    try {
      let query = 'SELECT * FROM context_snapshots';
      const params = [];
      
      if (type) {
        query += ' WHERE type = ?';
        params.push(type);
      }
      
      query += ' ORDER BY timestamp DESC LIMIT ?';
      params.push(limit);
      
      const rows = await this.db.all(query, params);
      
      return rows.map(row => ({
        ...row,
        data: JSON.parse(row.data),
        metadata: row.metadata ? JSON.parse(row.metadata) : null
      }));
    } catch (error) {
      logger.error('Failed to get recent snapshots:', error);
      throw error;
    }
  }

  /**
   * Get user activity history
   */
  async getUserActivityHistory(limit = 50, startDate = null) {
    if (!this.initialized) await this.initialize();

    try {
      let query = 'SELECT * FROM user_activities';
      const params = [];
      
      if (startDate) {
        query += ' WHERE timestamp >= ?';
        params.push(startDate);
      }
      
      query += ' ORDER BY timestamp DESC LIMIT ?';
      params.push(limit);
      
      const rows = await this.db.all(query, params);
      
      return rows.map(row => ({
        ...row,
        context: row.context ? JSON.parse(row.context) : null
      }));
    } catch (error) {
      logger.error('Failed to get user activity history:', error);
      throw error;
    }
  }

  /**
   * Get git state history
   */
  async getGitStateHistory(branch = null, limit = 20) {
    if (!this.initialized) await this.initialize();

    try {
      let query = 'SELECT * FROM git_state_history';
      const params = [];
      
      if (branch) {
        query += ' WHERE branch = ?';
        params.push(branch);
      }
      
      query += ' ORDER BY timestamp DESC LIMIT ?';
      params.push(limit);
      
      const rows = await this.db.all(query, params);
      
      return rows.map(row => ({
        ...row,
        status: JSON.parse(row.status)
      }));
    } catch (error) {
      logger.error('Failed to get git state history:', error);
      throw error;
    }
  }

  /**
   * Get inference history
   */
  async getInferenceHistory(type = null, limit = 20) {
    if (!this.initialized) await this.initialize();

    try {
      let query = 'SELECT * FROM inferences';
      const params = [];
      
      if (type) {
        query += ' WHERE inference_type = ?';
        params.push(type);
      }
      
      query += ' ORDER BY timestamp DESC LIMIT ?';
      params.push(limit);
      
      const rows = await this.db.all(query, params);
      
      return rows.map(row => ({
        ...row,
        data: JSON.parse(row.data)
      }));
    } catch (error) {
      logger.error('Failed to get inference history:', error);
      throw error;
    }
  }

  /**
   * Clean old data
   */
  async cleanOldData(daysToKeep = 30) {
    if (!this.initialized) await this.initialize();

    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);
      const cutoffTimestamp = cutoffDate.toISOString();

      const tables = [
        'context_snapshots',
        'user_activities',
        'git_state_history',
        'inferences'
      ];

      for (const table of tables) {
        const result = await this.db.run(
          `DELETE FROM ${table} WHERE timestamp < ?`,
          [cutoffTimestamp]
        );
        logger.info(`Cleaned ${result.changes} old records from ${table}`);
      }

      // Vacuum database to reclaim space
      await this.db.run('VACUUM');
      
    } catch (error) {
      logger.error('Failed to clean old data:', error);
      throw error;
    }
  }

  /**
   * Get database statistics
   */
  async getStatistics() {
    if (!this.initialized) await this.initialize();

    try {
      const stats = {};
      
      const tables = [
        'context_snapshots',
        'user_activities',
        'git_state_history',
        'inferences'
      ];

      for (const table of tables) {
        const result = await this.db.get(`SELECT COUNT(*) as count FROM ${table}`);
        stats[table] = result.count;
      }

      // Get database file size
      const dbStats = await fs.stat(this.dbPath);
      stats.sizeBytes = dbStats.size;
      stats.sizeMB = (dbStats.size / (1024 * 1024)).toFixed(2);

      return stats;
    } catch (error) {
      logger.error('Failed to get statistics:', error);
      throw error;
    }
  }

  /**
   * Export data to JSON
   */
  async exportToJSON(outputPath) {
    if (!this.initialized) await this.initialize();

    try {
      const data = {
        snapshots: await this.db.all('SELECT * FROM context_snapshots'),
        activities: await this.db.all('SELECT * FROM user_activities'),
        gitHistory: await this.db.all('SELECT * FROM git_state_history'),
        inferences: await this.db.all('SELECT * FROM inferences'),
        exported: new Date().toISOString()
      };

      await fs.writeJson(outputPath, data, { spaces: 2 });
      logger.info(`Data exported to ${outputPath}`);
      
      return outputPath;
    } catch (error) {
      logger.error('Failed to export data:', error);
      throw error;
    }
  }

  /**
   * Close database connection
   */
  async close() {
    if (this.db) {
      await this.db.close();
      this.initialized = false;
      logger.info('Context persistence closed');
    }
  }
}

export default ContextPersistence;
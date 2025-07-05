import sqlite3 from 'sqlite3';
import { open } from 'sqlite';
import path from 'path';
import fs from 'fs-extra';
import { Umzug, SequelizeStorage } from 'umzug';
import logger from '../utils/logger.js';

/**
 * State Manager
 * Manages persistent state using SQLite with migrations
 */
export class StateManager {
  constructor(dbPath = null) {
    this.dbPath = dbPath || path.join(process.cwd(), '.slambed', 'state.db');
    this.db = null;
    this.initialized = false;
    this.connectionPool = [];
    this.maxConnections = 5;
  }

  /**
   * Initialize the state manager
   */
  async initialize() {
    try {
      // Ensure directory exists
      await fs.ensureDir(path.dirname(this.dbPath));

      // Open primary database connection
      this.db = await this.createConnection();
      
      // Run migrations
      await this.runMigrations();
      
      // Initialize connection pool
      await this.initializeConnectionPool();
      
      this.initialized = true;
      logger.info('State Manager initialized');
    } catch (error) {
      logger.error('Failed to initialize State Manager:', error);
      throw error;
    }
  }

  /**
   * Create a database connection
   */
  async createConnection() {
    return await open({
      filename: this.dbPath,
      driver: sqlite3.Database,
      mode: sqlite3.OPEN_READWRITE | sqlite3.OPEN_CREATE
    });
  }

  /**
   * Initialize connection pool
   */
  async initializeConnectionPool() {
    for (let i = 0; i < this.maxConnections - 1; i++) {
      const conn = await this.createConnection();
      this.connectionPool.push({
        connection: conn,
        inUse: false
      });
    }
  }

  /**
   * Get a connection from the pool
   */
  async getConnection() {
    // Find available connection
    const poolEntry = this.connectionPool.find(entry => !entry.inUse);
    
    if (poolEntry) {
      poolEntry.inUse = true;
      return {
        db: poolEntry.connection,
        release: () => { poolEntry.inUse = false; }
      };
    }
    
    // If no available connection, use primary
    return {
      db: this.db,
      release: () => {}
    };
  }

  /**
   * Run database migrations
   */
  async runMigrations() {
    const migrationsPath = path.join(path.dirname(this.dbPath), 'migrations');
    await fs.ensureDir(migrationsPath);
    
    // Create initial migration if doesn't exist
    const initialMigrationPath = path.join(migrationsPath, '001-initial.js');
    if (!await fs.pathExists(initialMigrationPath)) {
      await fs.writeFile(initialMigrationPath, this.getInitialMigration());
    }
    
    const umzug = new Umzug({
      migrations: {
        glob: path.join(migrationsPath, '*.js'),
        resolve: ({ name, path: migrationPath }) => {
          const migration = require(migrationPath);
          return {
            name,
            up: async () => migration.up(this.db),
            down: async () => migration.down(this.db)
          };
        }
      },
      context: this.db,
      storage: new SequelizeStorage({
        sequelize: this.db,
        tableName: 'migrations'
      }),
      logger: console
    });
    
    // Run pending migrations
    await umzug.up();
  }

  /**
   * Get initial migration content
   */
  getInitialMigration() {
    return `
export async function up(db) {
  // Sessions table
  await db.exec(\`
    CREATE TABLE IF NOT EXISTS sessions (
      id TEXT PRIMARY KEY,
      user_id TEXT,
      data TEXT NOT NULL,
      expires_at TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
  \`);

  // User preferences table
  await db.exec(\`
    CREATE TABLE IF NOT EXISTS user_preferences (
      user_id TEXT PRIMARY KEY,
      preferences TEXT NOT NULL,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
  \`);

  // Audit logs table
  await db.exec(\`
    CREATE TABLE IF NOT EXISTS audit_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id TEXT,
      action TEXT NOT NULL,
      resource TEXT,
      details TEXT,
      ip_address TEXT,
      user_agent TEXT,
      timestamp TEXT DEFAULT CURRENT_TIMESTAMP
    )
  \`);

  // Application state table
  await db.exec(\`
    CREATE TABLE IF NOT EXISTS app_state (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL,
      expires_at TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
  \`);

  // Task state table
  await db.exec(\`
    CREATE TABLE IF NOT EXISTS task_state (
      id TEXT PRIMARY KEY,
      type TEXT NOT NULL,
      status TEXT NOT NULL,
      data TEXT,
      error TEXT,
      started_at TEXT,
      completed_at TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
  \`);

  // Create indexes
  await db.exec(\`
    CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id);
    CREATE INDEX IF NOT EXISTS idx_sessions_expires ON sessions(expires_at);
    CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id);
    CREATE INDEX IF NOT EXISTS idx_audit_logs_timestamp ON audit_logs(timestamp);
    CREATE INDEX IF NOT EXISTS idx_task_state_type ON task_state(type);
    CREATE INDEX IF NOT EXISTS idx_task_state_status ON task_state(status);
    CREATE INDEX IF NOT EXISTS idx_app_state_expires ON app_state(expires_at);
  \`);
}

export async function down(db) {
  await db.exec(\`
    DROP TABLE IF EXISTS sessions;
    DROP TABLE IF EXISTS user_preferences;
    DROP TABLE IF EXISTS audit_logs;
    DROP TABLE IF EXISTS app_state;
    DROP TABLE IF EXISTS task_state;
  \`);
}
`;
  }

  /**
   * Session CRUD operations
   */
  async createSession(sessionData) {
    const { db, release } = await this.getConnection();
    try {
      const id = sessionData.id || this.generateId();
      const result = await db.run(
        `INSERT INTO sessions (id, user_id, data, expires_at) VALUES (?, ?, ?, ?)`,
        [id, sessionData.userId, JSON.stringify(sessionData.data), sessionData.expiresAt]
      );
      return { id, ...sessionData };
    } finally {
      release();
    }
  }

  async getSession(id) {
    const { db, release } = await this.getConnection();
    try {
      const row = await db.get('SELECT * FROM sessions WHERE id = ?', [id]);
      if (!row) return null;
      
      return {
        id: row.id,
        userId: row.user_id,
        data: JSON.parse(row.data),
        expiresAt: row.expires_at,
        createdAt: row.created_at,
        updatedAt: row.updated_at
      };
    } finally {
      release();
    }
  }

  async updateSession(id, updates) {
    const { db, release } = await this.getConnection();
    try {
      const data = updates.data ? JSON.stringify(updates.data) : undefined;
      const fields = [];
      const values = [];
      
      if (data !== undefined) {
        fields.push('data = ?');
        values.push(data);
      }
      if (updates.expiresAt !== undefined) {
        fields.push('expires_at = ?');
        values.push(updates.expiresAt);
      }
      
      fields.push('updated_at = CURRENT_TIMESTAMP');
      values.push(id);
      
      await db.run(
        `UPDATE sessions SET ${fields.join(', ')} WHERE id = ?`,
        values
      );
      
      return await this.getSession(id);
    } finally {
      release();
    }
  }

  async deleteSession(id) {
    const { db, release } = await this.getConnection();
    try {
      await db.run('DELETE FROM sessions WHERE id = ?', [id]);
    } finally {
      release();
    }
  }

  async cleanExpiredSessions() {
    const { db, release } = await this.getConnection();
    try {
      const result = await db.run(
        'DELETE FROM sessions WHERE expires_at < datetime("now")'
      );
      return result.changes;
    } finally {
      release();
    }
  }

  /**
   * User preferences CRUD operations
   */
  async setUserPreferences(userId, preferences) {
    const { db, release } = await this.getConnection();
    try {
      await db.run(
        `INSERT OR REPLACE INTO user_preferences (user_id, preferences) VALUES (?, ?)`,
        [userId, JSON.stringify(preferences)]
      );
      return { userId, preferences };
    } finally {
      release();
    }
  }

  async getUserPreferences(userId) {
    const { db, release } = await this.getConnection();
    try {
      const row = await db.get(
        'SELECT * FROM user_preferences WHERE user_id = ?',
        [userId]
      );
      
      if (!row) return null;
      
      return {
        userId: row.user_id,
        preferences: JSON.parse(row.preferences),
        createdAt: row.created_at,
        updatedAt: row.updated_at
      };
    } finally {
      release();
    }
  }

  /**
   * Audit log operations
   */
  async logAudit(auditData) {
    const { db, release } = await this.getConnection();
    try {
      const result = await db.run(
        `INSERT INTO audit_logs (user_id, action, resource, details, ip_address, user_agent) 
         VALUES (?, ?, ?, ?, ?, ?)`,
        [
          auditData.userId,
          auditData.action,
          auditData.resource,
          auditData.details ? JSON.stringify(auditData.details) : null,
          auditData.ipAddress,
          auditData.userAgent
        ]
      );
      return result.lastID;
    } finally {
      release();
    }
  }

  async getAuditLogs(filters = {}) {
    const { db, release } = await this.getConnection();
    try {
      let query = 'SELECT * FROM audit_logs WHERE 1=1';
      const params = [];
      
      if (filters.userId) {
        query += ' AND user_id = ?';
        params.push(filters.userId);
      }
      
      if (filters.action) {
        query += ' AND action = ?';
        params.push(filters.action);
      }
      
      if (filters.startDate) {
        query += ' AND timestamp >= ?';
        params.push(filters.startDate);
      }
      
      if (filters.endDate) {
        query += ' AND timestamp <= ?';
        params.push(filters.endDate);
      }
      
      query += ' ORDER BY timestamp DESC';
      
      if (filters.limit) {
        query += ' LIMIT ?';
        params.push(filters.limit);
      }
      
      const rows = await db.all(query, params);
      
      return rows.map(row => ({
        id: row.id,
        userId: row.user_id,
        action: row.action,
        resource: row.resource,
        details: row.details ? JSON.parse(row.details) : null,
        ipAddress: row.ip_address,
        userAgent: row.user_agent,
        timestamp: row.timestamp
      }));
    } finally {
      release();
    }
  }

  /**
   * Application state operations
   */
  async setState(key, value, expiresAt = null) {
    const { db, release } = await this.getConnection();
    try {
      await db.run(
        `INSERT OR REPLACE INTO app_state (key, value, expires_at) VALUES (?, ?, ?)`,
        [key, JSON.stringify(value), expiresAt]
      );
      return { key, value, expiresAt };
    } finally {
      release();
    }
  }

  async getState(key) {
    const { db, release } = await this.getConnection();
    try {
      const row = await db.get(
        'SELECT * FROM app_state WHERE key = ? AND (expires_at IS NULL OR expires_at > datetime("now"))',
        [key]
      );
      
      if (!row) return null;
      
      return {
        key: row.key,
        value: JSON.parse(row.value),
        expiresAt: row.expires_at,
        createdAt: row.created_at,
        updatedAt: row.updated_at
      };
    } finally {
      release();
    }
  }

  async deleteState(key) {
    const { db, release } = await this.getConnection();
    try {
      await db.run('DELETE FROM app_state WHERE key = ?', [key]);
    } finally {
      release();
    }
  }

  async cleanExpiredState() {
    const { db, release } = await this.getConnection();
    try {
      const result = await db.run(
        'DELETE FROM app_state WHERE expires_at < datetime("now")'
      );
      return result.changes;
    } finally {
      release();
    }
  }

  /**
   * Task state operations
   */
  async createTask(taskData) {
    const { db, release } = await this.getConnection();
    try {
      const id = taskData.id || this.generateId();
      await db.run(
        `INSERT INTO task_state (id, type, status, data, started_at) 
         VALUES (?, ?, ?, ?, ?)`,
        [
          id,
          taskData.type,
          taskData.status || 'pending',
          taskData.data ? JSON.stringify(taskData.data) : null,
          taskData.startedAt || new Date().toISOString()
        ]
      );
      return { id, ...taskData };
    } finally {
      release();
    }
  }

  async updateTask(id, updates) {
    const { db, release } = await this.getConnection();
    try {
      const fields = [];
      const values = [];
      
      if (updates.status !== undefined) {
        fields.push('status = ?');
        values.push(updates.status);
      }
      
      if (updates.data !== undefined) {
        fields.push('data = ?');
        values.push(JSON.stringify(updates.data));
      }
      
      if (updates.error !== undefined) {
        fields.push('error = ?');
        values.push(updates.error);
      }
      
      if (updates.completedAt !== undefined) {
        fields.push('completed_at = ?');
        values.push(updates.completedAt);
      }
      
      fields.push('updated_at = CURRENT_TIMESTAMP');
      values.push(id);
      
      await db.run(
        `UPDATE task_state SET ${fields.join(', ')} WHERE id = ?`,
        values
      );
      
      return await this.getTask(id);
    } finally {
      release();
    }
  }

  async getTask(id) {
    const { db, release } = await this.getConnection();
    try {
      const row = await db.get('SELECT * FROM task_state WHERE id = ?', [id]);
      
      if (!row) return null;
      
      return {
        id: row.id,
        type: row.type,
        status: row.status,
        data: row.data ? JSON.parse(row.data) : null,
        error: row.error,
        startedAt: row.started_at,
        completedAt: row.completed_at,
        createdAt: row.created_at,
        updatedAt: row.updated_at
      };
    } finally {
      release();
    }
  }

  async getTasksByStatus(status, type = null) {
    const { db, release } = await this.getConnection();
    try {
      let query = 'SELECT * FROM task_state WHERE status = ?';
      const params = [status];
      
      if (type) {
        query += ' AND type = ?';
        params.push(type);
      }
      
      query += ' ORDER BY created_at DESC';
      
      const rows = await db.all(query, params);
      
      return rows.map(row => ({
        id: row.id,
        type: row.type,
        status: row.status,
        data: row.data ? JSON.parse(row.data) : null,
        error: row.error,
        startedAt: row.started_at,
        completedAt: row.completed_at,
        createdAt: row.created_at,
        updatedAt: row.updated_at
      }));
    } finally {
      release();
    }
  }

  /**
   * Query builder for complex queries
   */
  createQueryBuilder(table) {
    return new QueryBuilder(table, this);
  }

  /**
   * Execute raw query
   */
  async query(sql, params = []) {
    const { db, release } = await this.getConnection();
    try {
      return await db.all(sql, params);
    } finally {
      release();
    }
  }

  /**
   * Transaction support
   */
  async transaction(callback) {
    const { db, release } = await this.getConnection();
    try {
      await db.run('BEGIN TRANSACTION');
      try {
        const result = await callback(db);
        await db.run('COMMIT');
        return result;
      } catch (error) {
        await db.run('ROLLBACK');
        throw error;
      }
    } finally {
      release();
    }
  }

  /**
   * Generate unique ID
   */
  generateId() {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Get database statistics
   */
  async getStatistics() {
    const { db, release } = await this.getConnection();
    try {
      const stats = {};
      
      const tables = ['sessions', 'user_preferences', 'audit_logs', 'app_state', 'task_state'];
      
      for (const table of tables) {
        const result = await db.get(`SELECT COUNT(*) as count FROM ${table}`);
        stats[table] = result.count;
      }
      
      // Get database file size
      const dbStats = await fs.stat(this.dbPath);
      stats.sizeBytes = dbStats.size;
      stats.sizeMB = (dbStats.size / (1024 * 1024)).toFixed(2);
      
      // Get connection pool status
      stats.connectionPool = {
        total: this.connectionPool.length + 1,
        available: this.connectionPool.filter(e => !e.inUse).length + 1
      };
      
      return stats;
    } finally {
      release();
    }
  }

  /**
   * Close all connections
   */
  async close() {
    // Close pool connections
    for (const entry of this.connectionPool) {
      await entry.connection.close();
    }
    
    // Close primary connection
    if (this.db) {
      await this.db.close();
    }
    
    this.initialized = false;
    logger.info('State Manager closed');
  }
}

/**
 * Simple Query Builder
 */
class QueryBuilder {
  constructor(table, stateManager) {
    this.table = table;
    this.stateManager = stateManager;
    this.conditions = [];
    this.params = [];
    this.orderBy = null;
    this.limitValue = null;
    this.selectFields = '*';
  }

  select(fields) {
    this.selectFields = Array.isArray(fields) ? fields.join(', ') : fields;
    return this;
  }

  where(field, operator, value) {
    this.conditions.push(`${field} ${operator} ?`);
    this.params.push(value);
    return this;
  }

  orderBy(field, direction = 'ASC') {
    this.orderBy = `${field} ${direction}`;
    return this;
  }

  limit(value) {
    this.limitValue = value;
    return this;
  }

  build() {
    let query = `SELECT ${this.selectFields} FROM ${this.table}`;
    
    if (this.conditions.length > 0) {
      query += ` WHERE ${this.conditions.join(' AND ')}`;
    }
    
    if (this.orderBy) {
      query += ` ORDER BY ${this.orderBy}`;
    }
    
    if (this.limitValue) {
      query += ` LIMIT ${this.limitValue}`;
    }
    
    return { query, params: this.params };
  }

  async execute() {
    const { query, params } = this.build();
    return await this.stateManager.query(query, params);
  }
}

// Export singleton instance
export default new StateManager();
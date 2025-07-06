import crypto from 'crypto';
import fs from 'fs-extra';
import path from 'path';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import rateLimit from 'express-rate-limit';
import helmet from 'helmet';
import validator from 'validator';
import stateManager from '../mcp/state-manager.js';
import logger from '../utils/logger.js';

/**
 * Security Manager
 * Comprehensive security measures and audit logging for Slambed MCP
 */
export class SecurityManager {
  constructor() {
    // Security configuration
    this.config = {
      encryption: {
        algorithm: 'aes-256-gcm',
        keyLength: 32,
        ivLength: 16,
        tagLength: 16
      },
      jwt: {
        secret: null,
        expiresIn: '24h',
        algorithm: 'HS256'
      },
      session: {
        maxAge: 24 * 60 * 60 * 1000, // 24 hours
        cookieName: 'slambed_session',
        sameSite: 'strict',
        httpOnly: true,
        secure: true
      },
      rateLimit: {
        windowMs: 15 * 60 * 1000, // 15 minutes
        max: 100, // 100 requests per window
        skipSuccessfulRequests: false
      },
      bruteForce: {
        freeRetries: 3,
        minWait: 5 * 60 * 1000, // 5 minutes
        maxWait: 60 * 60 * 1000, // 1 hour
        failuresBeforeSlowdown: 5
      }
    };
    
    // Security state
    this.encryptionKey = null;
    this.jwtSecret = null;
    this.sessions = new Map();
    this.loginAttempts = new Map();
    
    // Audit logging
    this.auditLogger = null;
    this.sensitiveOperations = new Set([
      'login', 'logout', 'key_access', 'permission_change',
      'file_access', 'command_execution', 'data_export'
    ]);
    
    // RBAC
    this.roles = new Map();
    this.permissions = new Map();
    this.userRoles = new Map();
    
    this.initialize();
  }

  /**
   * Initialize security manager
   */
  async initialize() {
    try {
      // Initialize encryption
      await this.initializeEncryption();
      
      // Initialize JWT
      await this.initializeJWT();
      
      // Initialize audit logging
      await this.initializeAuditLogging();
      
      // Initialize RBAC
      await this.initializeRBAC();
      
      // Load existing security data
      await this.loadSecurityData();
      
      logger.info('Security Manager initialized');
    } catch (error) {
      logger.error('Failed to initialize Security Manager:', error);
      throw error;
    }
  }

  /**
   * Initialize encryption system
   */
  async initializeEncryption() {
    const keyPath = path.join(process.cwd(), '.slambed', 'security', 'encryption.key');
    
    try {
      // Try to load existing key
      if (await fs.pathExists(keyPath)) {
        this.encryptionKey = await fs.readFile(keyPath);
      } else {
        // Generate new key
        this.encryptionKey = crypto.randomBytes(this.config.encryption.keyLength);
        
        // Save key securely
        await fs.ensureDir(path.dirname(keyPath));
        await fs.writeFile(keyPath, this.encryptionKey, { mode: 0o600 });
      }
    } catch (error) {
      logger.error('Failed to initialize encryption:', error);
      throw error;
    }
  }

  /**
   * Initialize JWT system
   */
  async initializeJWT() {
    const secretPath = path.join(process.cwd(), '.slambed', 'security', 'jwt.secret');
    
    try {
      // Try to load existing secret
      if (await fs.pathExists(secretPath)) {
        this.jwtSecret = await fs.readFile(secretPath, 'utf8');
      } else {
        // Generate new secret
        this.jwtSecret = crypto.randomBytes(64).toString('hex');
        
        // Save secret securely
        await fs.ensureDir(path.dirname(secretPath));
        await fs.writeFile(secretPath, this.jwtSecret, { mode: 0o600 });
      }
      
      this.config.jwt.secret = this.jwtSecret;
    } catch (error) {
      logger.error('Failed to initialize JWT:', error);
      throw error;
    }
  }

  /**
   * Initialize audit logging
   */
  async initializeAuditLogging() {
    const winston = await import('winston');
    
    const auditLogPath = path.join(process.cwd(), '.slambed', 'logs', 'audit.log');
    await fs.ensureDir(path.dirname(auditLogPath));
    
    this.auditLogger = winston.createLogger({
      level: 'info',
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.json()
      ),
      transports: [
        new winston.transports.File({
          filename: auditLogPath,
          maxsize: 10 * 1024 * 1024, // 10MB
          maxFiles: 10,
          tailable: true
        })
      ]
    });
  }

  /**
   * Initialize RBAC system
   */
  async initializeRBAC() {
    // Define default roles
    this.roles.set('admin', {
      name: 'Administrator',
      permissions: ['*']
    });
    
    this.roles.set('user', {
      name: 'Regular User',
      permissions: [
        'slam:use', 'context:read', 'suggest:read',
        'collaborate:read', 'recover:read'
      ]
    });
    
    this.roles.set('readonly', {
      name: 'Read Only',
      permissions: ['context:read', 'suggest:read']
    });
    
    // Define permissions
    this.permissions.set('*', { description: 'All permissions' });
    this.permissions.set('slam:use', { description: 'Use basic SLAM commands' });
    this.permissions.set('context:read', { description: 'Read context information' });
    this.permissions.set('context:write', { description: 'Modify context settings' });
    this.permissions.set('suggest:read', { description: 'Get suggestions' });
    this.permissions.set('collaborate:read', { description: 'View team collaboration' });
    this.permissions.set('collaborate:write', { description: 'Participate in collaboration' });
    this.permissions.set('recover:read', { description: 'View recovery history' });
    this.permissions.set('recover:write', { description: 'Create recovery points' });
    this.permissions.set('learn:read', { description: 'View learning data' });
    this.permissions.set('learn:write', { description: 'Modify learning settings' });
  }

  /**
   * Encrypt sensitive data
   */
  encrypt(plaintext) {
    try {
      const iv = crypto.randomBytes(this.config.encryption.ivLength);
      const cipher = crypto.createCipher(this.config.encryption.algorithm, this.encryptionKey, iv);
      
      let encrypted = cipher.update(plaintext, 'utf8', 'hex');
      encrypted += cipher.final('hex');
      
      const tag = cipher.getAuthTag();
      
      return {
        encrypted,
        iv: iv.toString('hex'),
        tag: tag.toString('hex')
      };
    } catch (error) {
      logger.error('Encryption failed:', error);
      throw new Error('Encryption failed');
    }
  }

  /**
   * Decrypt sensitive data
   */
  decrypt(encryptedData) {
    try {
      const { encrypted, iv, tag } = encryptedData;
      const decipher = crypto.createDecipher(
        this.config.encryption.algorithm,
        this.encryptionKey,
        Buffer.from(iv, 'hex')
      );
      
      decipher.setAuthTag(Buffer.from(tag, 'hex'));
      
      let decrypted = decipher.update(encrypted, 'hex', 'utf8');
      decrypted += decipher.final('utf8');
      
      return decrypted;
    } catch (error) {
      logger.error('Decryption failed:', error);
      throw new Error('Decryption failed');
    }
  }

  /**
   * Hash password
   */
  async hashPassword(password) {
    const saltRounds = 12;
    return await bcrypt.hash(password, saltRounds);
  }

  /**
   * Verify password
   */
  async verifyPassword(password, hash) {
    return await bcrypt.compare(password, hash);
  }

  /**
   * Generate JWT token
   */
  generateToken(payload) {
    return jwt.sign(payload, this.jwtSecret, {
      expiresIn: this.config.jwt.expiresIn,
      algorithm: this.config.jwt.algorithm
    });
  }

  /**
   * Verify JWT token
   */
  verifyToken(token) {
    try {
      return jwt.verify(token, this.jwtSecret, {
        algorithms: [this.config.jwt.algorithm]
      });
    } catch (error) {
      logger.warn('Token verification failed:', error.message);
      return null;
    }
  }

  /**
   * Create secure session
   */
  async createSession(userId, userData = {}) {
    const sessionId = crypto.randomUUID();
    const session = {
      id: sessionId,
      userId,
      createdAt: Date.now(),
      lastActivity: Date.now(),
      userData,
      active: true
    };
    
    this.sessions.set(sessionId, session);
    
    // Set expiration
    setTimeout(() => {
      this.destroySession(sessionId);
    }, this.config.session.maxAge);
    
    await this.auditLog('session_created', { userId, sessionId });
    
    return sessionId;
  }

  /**
   * Get session
   */
  getSession(sessionId) {
    const session = this.sessions.get(sessionId);
    if (!session || !session.active) {
      return null;
    }
    
    // Check expiration
    if (Date.now() - session.createdAt > this.config.session.maxAge) {
      this.destroySession(sessionId);
      return null;
    }
    
    // Update last activity
    session.lastActivity = Date.now();
    return session;
  }

  /**
   * Destroy session
   */
  async destroySession(sessionId) {
    const session = this.sessions.get(sessionId);
    if (session) {
      session.active = false;
      this.sessions.delete(sessionId);
      await this.auditLog('session_destroyed', { sessionId, userId: session.userId });
    }
  }

  /**
   * Validate input data
   */
  validateInput(input, type) {
    switch (type) {
      case 'email':
        return validator.isEmail(input);
      case 'username':
        return /^[a-zA-Z0-9_-]{3,20}$/.test(input);
      case 'password':
        return input.length >= 8 && 
               /[A-Z]/.test(input) && 
               /[a-z]/.test(input) && 
               /[0-9]/.test(input);
      case 'filepath':
        return !input.includes('..') && validator.isLength(input, { max: 255 });
      case 'command':
        return /^[a-zA-Z0-9_-]+$/.test(input);
      default:
        return validator.escape(input);
    }
  }

  /**
   * Sanitize input
   */
  sanitizeInput(input) {
    if (typeof input === 'string') {
      return validator.escape(input.trim());
    }
    if (typeof input === 'object' && input !== null) {
      const sanitized = {};
      for (const [key, value] of Object.entries(input)) {
        sanitized[this.sanitizeInput(key)] = this.sanitizeInput(value);
      }
      return sanitized;
    }
    return input;
  }

  /**
   * Rate limiting middleware
   */
  createRateLimit(options = {}) {
    return rateLimit({
      ...this.config.rateLimit,
      ...options,
      handler: (req, res) => {
        this.auditLog('rate_limit_exceeded', {
          ip: req.ip,
          url: req.url,
          userAgent: req.get('User-Agent')
        });
        res.status(429).json({ error: 'Too many requests' });
      }
    });
  }

  /**
   * Brute force protection
   */
  async checkBruteForce(identifier) {
    const attempts = this.loginAttempts.get(identifier) || {
      count: 0,
      lastAttempt: 0,
      blockedUntil: 0
    };
    
    const now = Date.now();
    
    // Check if currently blocked
    if (attempts.blockedUntil > now) {
      const remainingTime = Math.ceil((attempts.blockedUntil - now) / 1000);
      throw new Error(`Too many failed attempts. Try again in ${remainingTime} seconds.`);
    }
    
    return attempts;
  }

  /**
   * Record failed login attempt
   */
  async recordFailedAttempt(identifier) {
    const attempts = await this.checkBruteForce(identifier);
    const now = Date.now();
    
    attempts.count++;
    attempts.lastAttempt = now;
    
    // Calculate block time
    if (attempts.count >= this.config.bruteForce.freeRetries) {
      const waitTime = Math.min(
        this.config.bruteForce.minWait * Math.pow(2, attempts.count - this.config.bruteForce.freeRetries),
        this.config.bruteForce.maxWait
      );
      attempts.blockedUntil = now + waitTime;
    }
    
    this.loginAttempts.set(identifier, attempts);
    
    await this.auditLog('failed_login_attempt', {
      identifier,
      attemptCount: attempts.count,
      blockedUntil: attempts.blockedUntil
    });
  }

  /**
   * Clear login attempts on successful login
   */
  clearLoginAttempts(identifier) {
    this.loginAttempts.delete(identifier);
  }

  /**
   * Security headers middleware
   */
  getSecurityHeaders() {
    return helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: ["'self'", "'strict-dynamic'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          imgSrc: ["'self'", "data:", "https:"],
          connectSrc: ["'self'"],
          fontSrc: ["'self'"],
          objectSrc: ["'none'"],
          mediaSrc: ["'self'"],
          frameSrc: ["'none'"]
        }
      },
      hsts: {
        maxAge: 31536000,
        includeSubDomains: true,
        preload: true
      },
      noSniff: true,
      xssFilter: true,
      referrerPolicy: { policy: 'same-origin' }
    });
  }

  /**
   * Check user permission
   */
  hasPermission(userId, permission) {
    const userRole = this.userRoles.get(userId);
    if (!userRole) return false;
    
    const role = this.roles.get(userRole);
    if (!role) return false;
    
    return role.permissions.includes('*') || role.permissions.includes(permission);
  }

  /**
   * Assign role to user
   */
  async assignRole(userId, roleName) {
    if (!this.roles.has(roleName)) {
      throw new Error(`Role '${roleName}' does not exist`);
    }
    
    this.userRoles.set(userId, roleName);
    await this.auditLog('role_assigned', { userId, roleName });
    await this.saveSecurityData();
  }

  /**
   * Audit log entry
   */
  async auditLog(operation, details = {}) {
    const logEntry = {
      timestamp: new Date().toISOString(),
      operation,
      details,
      sensitive: this.sensitiveOperations.has(operation)
    };
    
    if (this.auditLogger) {
      this.auditLogger.info(logEntry);
    }
    
    // Also store in state manager for queries
    const auditKey = `audit_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
    await stateManager.setState(auditKey, logEntry);
  }

  /**
   * Get audit logs
   */
  async getAuditLogs(filters = {}) {
    const { startDate, endDate, operation, userId, limit = 100 } = filters;
    
    // This is a simplified implementation
    // In production, you'd want a proper database query
    const allKeys = await stateManager.getState('audit_keys') || [];
    const logs = [];
    
    for (const key of allKeys.slice(-limit)) {
      const log = await stateManager.getState(key);
      if (log) {
        let include = true;
        
        if (startDate && new Date(log.timestamp) < new Date(startDate)) include = false;
        if (endDate && new Date(log.timestamp) > new Date(endDate)) include = false;
        if (operation && log.operation !== operation) include = false;
        if (userId && log.details.userId !== userId) include = false;
        
        if (include) logs.push(log);
      }
    }
    
    return logs.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
  }

  /**
   * Save security data
   */
  async saveSecurityData() {
    const securityData = {
      userRoles: Object.fromEntries(this.userRoles),
      roles: Object.fromEntries(this.roles),
      permissions: Object.fromEntries(this.permissions),
      lastUpdated: Date.now()
    };
    
    await stateManager.setState('security_data', securityData);
  }

  /**
   * Load security data
   */
  async loadSecurityData() {
    try {
      const securityData = await stateManager.getState('security_data');
      if (securityData) {
        this.userRoles = new Map(Object.entries(securityData.userRoles || {}));
        this.roles = new Map(Object.entries(securityData.roles || {}));
        this.permissions = new Map(Object.entries(securityData.permissions || {}));
      }
    } catch (error) {
      logger.error('Failed to load security data:', error);
    }
  }

  /**
   * Perform security scan
   */
  async performSecurityScan() {
    const results = {
      timestamp: Date.now(),
      issues: [],
      recommendations: []
    };
    
    // Check for default credentials
    if (this.userRoles.has('admin') && !this.userRoles.has('admin_password_changed')) {
      results.issues.push({
        severity: 'high',
        type: 'default_credentials',
        description: 'Default admin credentials detected'
      });
    }
    
    // Check session configuration
    if (!this.config.session.secure) {
      results.issues.push({
        severity: 'medium',
        type: 'insecure_session',
        description: 'Session cookies should be marked as secure'
      });
    }
    
    // Check for old sessions
    const oldSessions = Array.from(this.sessions.values())
      .filter(session => Date.now() - session.lastActivity > 24 * 60 * 60 * 1000);
    
    if (oldSessions.length > 0) {
      results.recommendations.push({
        type: 'cleanup_sessions',
        description: `${oldSessions.length} old sessions should be cleaned up`
      });
    }
    
    await this.auditLog('security_scan', results);
    return results;
  }
}

// Export singleton instance
export default new SecurityManager();
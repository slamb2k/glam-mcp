import fs from 'fs-extra';
import path from 'path';
import crypto from 'crypto';
import securityManager from './security-manager.js';
import logger from '../utils/logger.js';

/**
 * Secure Configuration Manager
 * Handles secure storage and retrieval of configuration data
 */
export class ConfigManager {
  constructor() {
    this.configPath = path.join(process.cwd(), '.slambed', 'config');
    this.secretsPath = path.join(this.configPath, 'secrets');
    this.publicPath = path.join(this.configPath, 'public');
    
    this.cache = new Map();
    this.encryptedKeys = new Set([
      'api_keys',
      'tokens',
      'passwords',
      'secrets',
      'private_keys',
      'database_credentials'
    ]);
    
    this.initialize();
  }

  /**
   * Initialize configuration manager
   */
  async initialize() {
    try {
      await fs.ensureDir(this.configPath);
      await fs.ensureDir(this.secretsPath);
      await fs.ensureDir(this.publicPath);
      
      // Set restrictive permissions on secrets directory
      await fs.chmod(this.secretsPath, 0o700);
      
      logger.info('Config Manager initialized');
    } catch (error) {
      logger.error('Failed to initialize Config Manager:', error);
      throw error;
    }
  }

  /**
   * Set configuration value
   */
  async setConfig(key, value, options = {}) {
    try {
      const { 
        encrypt = this.shouldEncrypt(key), 
        cache = true,
        audit = true 
      } = options;
      
      let processedValue = value;
      let filePath;
      
      if (encrypt) {
        // Encrypt sensitive data
        processedValue = securityManager.encrypt(JSON.stringify(value));
        filePath = path.join(this.secretsPath, `${key}.enc`);
        
        // Set restrictive permissions
        await fs.writeJson(filePath, processedValue, { spaces: 2 });
        await fs.chmod(filePath, 0o600);
      } else {
        // Store as plain JSON
        filePath = path.join(this.publicPath, `${key}.json`);
        await fs.writeJson(filePath, value, { spaces: 2 });
      }
      
      // Update cache
      if (cache) {
        this.cache.set(key, {
          value,
          encrypted: encrypt,
          lastModified: Date.now()
        });
      }
      
      // Audit log
      if (audit) {
        await securityManager.auditLog('config_updated', {
          key,
          encrypted: encrypt,
          timestamp: Date.now()
        });
      }
      
      return true;
    } catch (error) {
      logger.error(`Failed to set config '${key}':`, error);
      throw error;
    }
  }

  /**
   * Get configuration value
   */
  async getConfig(key, options = {}) {
    try {
      const { useCache = true, audit = false } = options;
      
      // Check cache first
      if (useCache && this.cache.has(key)) {
        const cached = this.cache.get(key);
        if (Date.now() - cached.lastModified < 300000) { // 5 minutes
          return cached.value;
        }
      }
      
      let value;
      let encrypted = false;
      
      // Try encrypted file first
      const encryptedPath = path.join(this.secretsPath, `${key}.enc`);
      if (await fs.pathExists(encryptedPath)) {
        const encryptedData = await fs.readJson(encryptedPath);
        const decrypted = securityManager.decrypt(encryptedData);
        value = JSON.parse(decrypted);
        encrypted = true;
      } else {
        // Try plain file
        const plainPath = path.join(this.publicPath, `${key}.json`);
        if (await fs.pathExists(plainPath)) {
          value = await fs.readJson(plainPath);
        } else {
          return null;
        }
      }
      
      // Update cache
      if (useCache) {
        this.cache.set(key, {
          value,
          encrypted,
          lastModified: Date.now()
        });
      }
      
      // Audit log for sensitive data access
      if (audit || encrypted) {
        await securityManager.auditLog('config_accessed', {
          key,
          encrypted,
          timestamp: Date.now()
        });
      }
      
      return value;
    } catch (error) {
      logger.error(`Failed to get config '${key}':`, error);
      throw error;
    }
  }

  /**
   * Delete configuration value
   */
  async deleteConfig(key, options = {}) {
    try {
      const { audit = true } = options;
      
      let deleted = false;
      
      // Remove encrypted file
      const encryptedPath = path.join(this.secretsPath, `${key}.enc`);
      if (await fs.pathExists(encryptedPath)) {
        await fs.remove(encryptedPath);
        deleted = true;
      }
      
      // Remove plain file
      const plainPath = path.join(this.publicPath, `${key}.json`);
      if (await fs.pathExists(plainPath)) {
        await fs.remove(plainPath);
        deleted = true;
      }
      
      // Remove from cache
      this.cache.delete(key);
      
      // Audit log
      if (audit && deleted) {
        await securityManager.auditLog('config_deleted', {
          key,
          timestamp: Date.now()
        });
      }
      
      return deleted;
    } catch (error) {
      logger.error(`Failed to delete config '${key}':`, error);
      throw error;
    }
  }

  /**
   * List all configuration keys
   */
  async listConfigs(options = {}) {
    try {
      const { includeEncrypted = false } = options;
      const configs = [];
      
      // List public configs
      if (await fs.pathExists(this.publicPath)) {
        const publicFiles = await fs.readdir(this.publicPath);
        for (const file of publicFiles) {
          if (file.endsWith('.json')) {
            const key = file.replace('.json', '');
            const stats = await fs.stat(path.join(this.publicPath, file));
            configs.push({
              key,
              encrypted: false,
              lastModified: stats.mtime.getTime()
            });
          }
        }
      }
      
      // List encrypted configs
      if (includeEncrypted && await fs.pathExists(this.secretsPath)) {
        const secretFiles = await fs.readdir(this.secretsPath);
        for (const file of secretFiles) {
          if (file.endsWith('.enc')) {
            const key = file.replace('.enc', '');
            const stats = await fs.stat(path.join(this.secretsPath, file));
            configs.push({
              key,
              encrypted: true,
              lastModified: stats.mtime.getTime()
            });
          }
        }
      }
      
      return configs.sort((a, b) => a.key.localeCompare(b.key));
    } catch (error) {
      logger.error('Failed to list configs:', error);
      throw error;
    }
  }

  /**
   * Securely store API key
   */
  async storeApiKey(service, apiKey, options = {}) {
    try {
      const apiKeys = await this.getConfig('api_keys') || {};
      
      apiKeys[service] = {
        key: apiKey,
        created: Date.now(),
        lastUsed: null,
        ...options
      };
      
      await this.setConfig('api_keys', apiKeys, { encrypt: true });
      
      await securityManager.auditLog('api_key_stored', {
        service,
        timestamp: Date.now()
      });
      
      return true;
    } catch (error) {
      logger.error(`Failed to store API key for '${service}':`, error);
      throw error;
    }
  }

  /**
   * Retrieve API key
   */
  async getApiKey(service) {
    try {
      const apiKeys = await this.getConfig('api_keys');
      if (!apiKeys || !apiKeys[service]) {
        return null;
      }
      
      // Update last used timestamp
      apiKeys[service].lastUsed = Date.now();
      await this.setConfig('api_keys', apiKeys, { encrypt: true });
      
      await securityManager.auditLog('api_key_accessed', {
        service,
        timestamp: Date.now()
      });
      
      return apiKeys[service].key;
    } catch (error) {
      logger.error(`Failed to get API key for '${service}':`, error);
      throw error;
    }
  }

  /**
   * Rotate API key
   */
  async rotateApiKey(service, newApiKey) {
    try {
      const apiKeys = await this.getConfig('api_keys') || {};
      
      if (apiKeys[service]) {
        // Store old key for rollback
        apiKeys[service].previousKey = apiKeys[service].key;
        apiKeys[service].rotated = Date.now();
      }
      
      apiKeys[service] = {
        ...apiKeys[service],
        key: newApiKey,
        created: Date.now(),
        lastUsed: null
      };
      
      await this.setConfig('api_keys', apiKeys, { encrypt: true });
      
      await securityManager.auditLog('api_key_rotated', {
        service,
        timestamp: Date.now()
      });
      
      return true;
    } catch (error) {
      logger.error(`Failed to rotate API key for '${service}':`, error);
      throw error;
    }
  }

  /**
   * Delete API key
   */
  async deleteApiKey(service) {
    try {
      const apiKeys = await this.getConfig('api_keys');
      if (!apiKeys || !apiKeys[service]) {
        return false;
      }
      
      delete apiKeys[service];
      await this.setConfig('api_keys', apiKeys, { encrypt: true });
      
      await securityManager.auditLog('api_key_deleted', {
        service,
        timestamp: Date.now()
      });
      
      return true;
    } catch (error) {
      logger.error(`Failed to delete API key for '${service}':`, error);
      throw error;
    }
  }

  /**
   * Store encrypted secrets
   */
  async storeSecret(key, secret, metadata = {}) {
    try {
      const secrets = await this.getConfig('secrets') || {};
      
      secrets[key] = {
        value: secret,
        created: Date.now(),
        metadata,
        id: crypto.randomUUID()
      };
      
      await this.setConfig('secrets', secrets, { encrypt: true });
      
      await securityManager.auditLog('secret_stored', {
        key,
        timestamp: Date.now()
      });
      
      return secrets[key].id;
    } catch (error) {
      logger.error(`Failed to store secret '${key}':`, error);
      throw error;
    }
  }

  /**
   * Retrieve secret
   */
  async getSecret(key) {
    try {
      const secrets = await this.getConfig('secrets');
      if (!secrets || !secrets[key]) {
        return null;
      }
      
      await securityManager.auditLog('secret_accessed', {
        key,
        timestamp: Date.now()
      });
      
      return secrets[key].value;
    } catch (error) {
      logger.error(`Failed to get secret '${key}':`, error);
      throw error;
    }
  }

  /**
   * Generate secure configuration
   */
  async generateSecureConfig() {
    const config = {
      security: {
        encryption: {
          enabled: true,
          algorithm: 'aes-256-gcm'
        },
        session: {
          secure: true,
          httpOnly: true,
          sameSite: 'strict',
          maxAge: 24 * 60 * 60 * 1000
        },
        headers: {
          hsts: true,
          csp: true,
          xss: true,
          noSniff: true
        },
        rateLimit: {
          enabled: true,
          windowMs: 15 * 60 * 1000,
          max: 100
        }
      },
      audit: {
        enabled: true,
        logLevel: 'info',
        retention: 90 // days
      },
      ssl: {
        enabled: process.env.NODE_ENV === 'production',
        cert: null,
        key: null
      }
    };
    
    await this.setConfig('security_config', config);
    return config;
  }

  /**
   * Validate configuration
   */
  async validateConfig(key) {
    try {
      const config = await this.getConfig(key);
      if (!config) return { valid: false, errors: ['Config not found'] };
      
      const errors = [];
      
      // Security config validation
      if (key === 'security_config') {
        if (!config.security?.encryption?.enabled) {
          errors.push('Encryption should be enabled');
        }
        
        if (!config.security?.session?.secure && process.env.NODE_ENV === 'production') {
          errors.push('Secure sessions required in production');
        }
        
        if (!config.audit?.enabled) {
          errors.push('Audit logging should be enabled');
        }
      }
      
      // API keys validation
      if (key === 'api_keys') {
        for (const [service, keyData] of Object.entries(config)) {
          if (!keyData.key || keyData.key.length < 10) {
            errors.push(`API key for ${service} appears too short`);
          }
          
          if (keyData.created && Date.now() - keyData.created > 365 * 24 * 60 * 60 * 1000) {
            errors.push(`API key for ${service} is over 1 year old`);
          }
        }
      }
      
      return {
        valid: errors.length === 0,
        errors
      };
    } catch (error) {
      logger.error(`Failed to validate config '${key}':`, error);
      return { valid: false, errors: [error.message] };
    }
  }

  /**
   * Backup configuration
   */
  async backupConfig(backupPath) {
    try {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const backupDir = path.join(backupPath || this.configPath, 'backups', timestamp);
      
      await fs.ensureDir(backupDir);
      
      // Copy public configs
      if (await fs.pathExists(this.publicPath)) {
        await fs.copy(this.publicPath, path.join(backupDir, 'public'));
      }
      
      // Copy encrypted configs (they remain encrypted)
      if (await fs.pathExists(this.secretsPath)) {
        await fs.copy(this.secretsPath, path.join(backupDir, 'secrets'));
      }
      
      // Create backup manifest
      const manifest = {
        timestamp: Date.now(),
        version: '1.0',
        configs: await this.listConfigs({ includeEncrypted: true })
      };
      
      await fs.writeJson(path.join(backupDir, 'manifest.json'), manifest, { spaces: 2 });
      
      await securityManager.auditLog('config_backup', {
        backupPath: backupDir,
        configCount: manifest.configs.length,
        timestamp: Date.now()
      });
      
      return backupDir;
    } catch (error) {
      logger.error('Failed to backup config:', error);
      throw error;
    }
  }

  /**
   * Check if key should be encrypted
   */
  shouldEncrypt(key) {
    return this.encryptedKeys.has(key) || 
           key.toLowerCase().includes('password') ||
           key.toLowerCase().includes('secret') ||
           key.toLowerCase().includes('token') ||
           key.toLowerCase().includes('key');
  }

  /**
   * Clear cache
   */
  clearCache() {
    this.cache.clear();
  }

  /**
   * Get cache statistics
   */
  getCacheStats() {
    return {
      size: this.cache.size,
      keys: Array.from(this.cache.keys()),
      lastAccess: Math.max(...Array.from(this.cache.values()).map(v => v.lastModified))
    };
  }
}

// Export singleton instance
export default new ConfigManager();
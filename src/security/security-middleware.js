import securityManager from './security-manager.js';
import logger from '../utils/logger.js';

/**
 * Security Middleware
 * Express middleware for implementing security measures
 */

/**
 * Authentication middleware
 */
export function authenticate(req, res, next) {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '') ||
                  req.cookies?.token ||
                  req.session?.token;
    
    if (!token) {
      return res.status(401).json({
        error: 'Authentication required',
        code: 'NO_TOKEN'
      });
    }
    
    const decoded = securityManager.verifyToken(token);
    if (!decoded) {
      return res.status(401).json({
        error: 'Invalid or expired token',
        code: 'INVALID_TOKEN'
      });
    }
    
    // Check if session is still valid
    const session = securityManager.getSession(decoded.sessionId);
    if (!session) {
      return res.status(401).json({
        error: 'Session expired',
        code: 'SESSION_EXPIRED'
      });
    }
    
    req.user = {
      id: decoded.userId,
      sessionId: decoded.sessionId,
      ...session.userData
    };
    
    next();
  } catch (error) {
    logger.error('Authentication error:', error);
    return res.status(500).json({
      error: 'Authentication failed',
      code: 'AUTH_ERROR'
    });
  }
}

/**
 * Authorization middleware
 */
export function authorize(permission) {
  return (req, res, next) => {
    try {
      if (!req.user) {
        return res.status(401).json({
          error: 'Authentication required',
          code: 'NOT_AUTHENTICATED'
        });
      }
      
      const hasPermission = securityManager.hasPermission(req.user.id, permission);
      if (!hasPermission) {
        securityManager.auditLog('permission_denied', {
          userId: req.user.id,
          permission,
          endpoint: req.path,
          method: req.method
        });
        
        return res.status(403).json({
          error: 'Insufficient permissions',
          code: 'PERMISSION_DENIED',
          required: permission
        });
      }
      
      next();
    } catch (error) {
      logger.error('Authorization error:', error);
      return res.status(500).json({
        error: 'Authorization failed',
        code: 'AUTH_ERROR'
      });
    }
  };
}

/**
 * Input validation middleware
 */
export function validateInput(schema) {
  return (req, res, next) => {
    try {
      const errors = [];
      
      // Validate request body
      if (schema.body) {
        for (const [field, rules] of Object.entries(schema.body)) {
          const value = req.body?.[field];
          
          if (rules.required && (value === undefined || value === null || value === '')) {
            errors.push(`Field '${field}' is required`);
            continue;
          }
          
          if (value !== undefined && value !== null && value !== '') {
            if (rules.type && !securityManager.validateInput(value, rules.type)) {
              errors.push(`Field '${field}' has invalid format`);
            }
            
            if (rules.minLength && value.length < rules.minLength) {
              errors.push(`Field '${field}' must be at least ${rules.minLength} characters`);
            }
            
            if (rules.maxLength && value.length > rules.maxLength) {
              errors.push(`Field '${field}' must not exceed ${rules.maxLength} characters`);
            }
            
            if (rules.pattern && !rules.pattern.test(value)) {
              errors.push(`Field '${field}' does not match required pattern`);
            }
          }
        }
      }
      
      // Validate query parameters
      if (schema.query) {
        for (const [field, rules] of Object.entries(schema.query)) {
          const value = req.query?.[field];
          
          if (rules.required && !value) {
            errors.push(`Query parameter '${field}' is required`);
            continue;
          }
          
          if (value && rules.type && !securityManager.validateInput(value, rules.type)) {
            errors.push(`Query parameter '${field}' has invalid format`);
          }
        }
      }
      
      if (errors.length > 0) {
        return res.status(400).json({
          error: 'Validation failed',
          code: 'VALIDATION_ERROR',
          details: errors
        });
      }
      
      // Sanitize inputs
      if (req.body) {
        req.body = securityManager.sanitizeInput(req.body);
      }
      if (req.query) {
        req.query = securityManager.sanitizeInput(req.query);
      }
      
      next();
    } catch (error) {
      logger.error('Input validation error:', error);
      return res.status(500).json({
        error: 'Validation failed',
        code: 'VALIDATION_ERROR'
      });
    }
  };
}

/**
 * Audit logging middleware
 */
export function auditLog(operation) {
  return (req, res, next) => {
    // Store original end method
    const originalEnd = res.end;
    
    // Override end method to log after response
    res.end = function(chunk, encoding) {
      // Call original end method
      originalEnd.call(this, chunk, encoding);
      
      // Log the operation
      securityManager.auditLog(operation, {
        userId: req.user?.id,
        sessionId: req.user?.sessionId,
        method: req.method,
        path: req.path,
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        statusCode: res.statusCode,
        timestamp: Date.now()
      });
    };
    
    next();
  };
}

/**
 * Brute force protection middleware
 */
export function bruteForceProtection(identifier = 'ip') {
  return async (req, res, next) => {
    try {
      let id;
      switch (identifier) {
        case 'ip':
          id = req.ip;
          break;
        case 'user':
          id = req.body?.username || req.body?.email;
          break;
        case 'session':
          id = req.user?.sessionId;
          break;
        default:
          id = req.ip;
      }
      
      if (!id) {
        return res.status(400).json({
          error: 'Cannot identify request for rate limiting',
          code: 'IDENTIFICATION_ERROR'
        });
      }
      
      await securityManager.checkBruteForce(id);
      
      // Store identifier for potential failed attempt logging
      req.bruteForceId = id;
      
      next();
    } catch (error) {
      if (error.message.includes('Too many failed attempts')) {
        return res.status(429).json({
          error: error.message,
          code: 'TOO_MANY_ATTEMPTS'
        });
      }
      
      logger.error('Brute force protection error:', error);
      next();
    }
  };
}

/**
 * Failed attempt logging middleware
 */
export function logFailedAttempt(req, res, next) {
  // Store original end method
  const originalEnd = res.end;
  
  // Override end method to check for failed attempts
  res.end = function(chunk, encoding) {
    // Call original end method
    originalEnd.call(this, chunk, encoding);
    
    // Log failed attempts (4xx and 5xx status codes)
    if (res.statusCode >= 400 && req.bruteForceId) {
      securityManager.recordFailedAttempt(req.bruteForceId);
    } else if (res.statusCode < 400 && req.bruteForceId) {
      // Clear attempts on successful request
      securityManager.clearLoginAttempts(req.bruteForceId);
    }
  };
  
  next();
}

/**
 * CORS middleware with security considerations
 */
export function secureCORS(options = {}) {
  return (req, res, next) => {
    const allowedOrigins = options.origins || ['http://localhost:3000'];
    const origin = req.headers.origin;
    
    if (allowedOrigins.includes(origin)) {
      res.header('Access-Control-Allow-Origin', origin);
    }
    
    res.header('Access-Control-Allow-Methods', options.methods || 'GET,POST,PUT,DELETE,OPTIONS');
    res.header('Access-Control-Allow-Headers', options.headers || 'Content-Type,Authorization');
    res.header('Access-Control-Allow-Credentials', 'true');
    res.header('Access-Control-Max-Age', '86400'); // 24 hours
    
    if (req.method === 'OPTIONS') {
      return res.status(200).end();
    }
    
    next();
  };
}

/**
 * Request sanitization middleware
 */
export function sanitizeRequest(req, res, next) {
  try {
    // Remove potentially dangerous headers
    delete req.headers['x-forwarded-for'];
    delete req.headers['x-real-ip'];
    
    // Limit request size
    const contentLength = parseInt(req.headers['content-length']) || 0;
    const maxSize = 10 * 1024 * 1024; // 10MB
    
    if (contentLength > maxSize) {
      return res.status(413).json({
        error: 'Request too large',
        code: 'REQUEST_TOO_LARGE'
      });
    }
    
    // Log suspicious patterns
    const suspiciousPatterns = [
      /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
      /javascript:/gi,
      /on\w+\s*=/gi,
      /eval\s*\(/gi,
      /expression\s*\(/gi
    ];
    
    const checkSuspicious = (obj, path = '') => {
      if (typeof obj === 'string') {
        for (const pattern of suspiciousPatterns) {
          if (pattern.test(obj)) {
            securityManager.auditLog('suspicious_input', {
              path,
              content: obj.substring(0, 100),
              pattern: pattern.toString(),
              ip: req.ip,
              userAgent: req.get('User-Agent')
            });
          }
        }
      } else if (typeof obj === 'object' && obj !== null) {
        for (const [key, value] of Object.entries(obj)) {
          checkSuspicious(value, path ? `${path}.${key}` : key);
        }
      }
    };
    
    if (req.body) checkSuspicious(req.body, 'body');
    if (req.query) checkSuspicious(req.query, 'query');
    
    next();
  } catch (error) {
    logger.error('Request sanitization error:', error);
    next();
  }
}

/**
 * Session timeout middleware
 */
export function sessionTimeout(maxInactivity = 30 * 60 * 1000) { // 30 minutes
  return (req, res, next) => {
    if (req.user && req.user.sessionId) {
      const session = securityManager.getSession(req.user.sessionId);
      
      if (!session) {
        return res.status(401).json({
          error: 'Session expired',
          code: 'SESSION_EXPIRED'
        });
      }
      
      const inactiveTime = Date.now() - session.lastActivity;
      if (inactiveTime > maxInactivity) {
        securityManager.destroySession(req.user.sessionId);
        return res.status(401).json({
          error: 'Session expired due to inactivity',
          code: 'SESSION_TIMEOUT'
        });
      }
    }
    
    next();
  };
}

/**
 * Content type validation middleware
 */
export function validateContentType(allowedTypes = ['application/json']) {
  return (req, res, next) => {
    if (req.method === 'POST' || req.method === 'PUT' || req.method === 'PATCH') {
      const contentType = req.headers['content-type'];
      
      if (!contentType) {
        return res.status(400).json({
          error: 'Content-Type header is required',
          code: 'MISSING_CONTENT_TYPE'
        });
      }
      
      const isAllowed = allowedTypes.some(type => 
        contentType.toLowerCase().includes(type.toLowerCase())
      );
      
      if (!isAllowed) {
        return res.status(415).json({
          error: 'Unsupported Media Type',
          code: 'UNSUPPORTED_MEDIA_TYPE',
          allowed: allowedTypes
        });
      }
    }
    
    next();
  };
}

export default {
  authenticate,
  authorize,
  validateInput,
  auditLog,
  bruteForceProtection,
  logFailedAttempt,
  secureCORS,
  sanitizeRequest,
  sessionTimeout,
  validateContentType
};
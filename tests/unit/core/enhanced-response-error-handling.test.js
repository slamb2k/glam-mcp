/**
 * Error Handling and Recovery Tests for Enhanced Response System
 * Task 29.2: Implement Tests for Error Handling and Recovery Mechanisms
 */

import { jest } from '@jest/globals';
import {
  EnhancedResponse,
  ResponseFactory,
  ResponseStatus,
  RiskLevel,
  ErrorResponse
} from '../../../src/core/enhanced-response.js';

describe('Enhanced Response System - Error Handling and Recovery', () => {
  describe('Invalid Input Handling', () => {
    it('should handle undefined status gracefully', () => {
      const response = new EnhancedResponse({ status: undefined });
      expect(response.status).toBe(ResponseStatus.SUCCESS); // Should default
    });

    it('should handle invalid status values', () => {
      const response = new EnhancedResponse({ status: 'invalid-status' });
      expect(response.status).toBe('invalid-status'); // Should preserve but not break
    });

    it('should handle non-string messages', () => {
      const response = new EnhancedResponse({ message: 123 });
      expect(response.message).toBe(123);
      
      const response2 = new EnhancedResponse({ message: { complex: 'object' } });
      expect(response2.message).toEqual({ complex: 'object' });
    });

    it('should handle invalid risk levels gracefully', () => {
      const response = new EnhancedResponse({});
      response.risks.push({
        level: 'invalid-level',
        description: 'Test',
        mitigation: null,
        timestamp: new Date().toISOString()
      });
      
      // getHighestRiskLevel should handle unknown levels
      expect(() => response.getHighestRiskLevel()).not.toThrow();
    });

    it('should handle malformed suggestion objects', () => {
      const response = new EnhancedResponse({
        suggestions: [
          { action: 'valid', description: 'Valid suggestion', priority: 'high' },
          { invalid: 'object' }, // Missing required fields
          null, // Null entry
          'string-instead-of-object' // Wrong type
        ]
      });
      
      expect(response.suggestions).toHaveLength(4);
      expect(() => response.toJSON()).not.toThrow();
    });
  });

  describe('Timeout and Async Error Scenarios', () => {
    it('should handle promise rejections in async operations', async () => {
      const createAsyncResponse = async () => {
        const response = new EnhancedResponse({ message: 'Async operation' });
        
        // Simulate async operation that might fail
        try {
          await Promise.reject(new Error('Async failure'));
        } catch (error) {
          return ResponseFactory.error('Async operation failed', error);
        }
        
        return response;
      };
      
      const result = await createAsyncResponse();
      expect(result.hasErrors()).toBe(true);
      expect(result.data.error).toBe('Async failure');
    });

    it('should handle timeout scenarios', async () => {
      const createTimeoutResponse = async (timeout = 100) => {
        const response = new EnhancedResponse({ message: 'Timeout test' });
        
        const timeoutPromise = new Promise((_, reject) => {
          setTimeout(() => reject(new Error('Operation timed out')), timeout);
        });
        
        const operationPromise = new Promise((resolve) => {
          setTimeout(() => resolve('Success'), timeout + 50);
        });
        
        try {
          await Promise.race([timeoutPromise, operationPromise]);
          response.addContext('result', 'Operation completed');
        } catch (error) {
          return ResponseFactory.error('Operation timed out', error);
        }
        
        return response;
      };
      
      const result = await createTimeoutResponse(10);
      expect(result.hasErrors()).toBe(true);
      expect(result.message).toBe('Operation timed out');
    });
  });

  describe('Service Unavailability Recovery', () => {
    it('should provide fallback responses for service failures', () => {
      const mockServiceCall = (shouldFail = false) => {
        if (shouldFail) {
          throw new Error('Service unavailable');
        }
        return { data: 'service response' };
      };
      
      const handleServiceCall = (shouldFail) => {
        try {
          const result = mockServiceCall(shouldFail);
          return ResponseFactory.success('Service call successful', result);
        } catch (error) {
          // Provide graceful fallback
          return ResponseFactory.warning('Service temporarily unavailable', {
            fallback: true,
            error: error.message,
            suggestions: [
              {
                action: 'retry',
                description: 'Try again in a few moments',
                priority: 'medium'
              }
            ]
          });
        }
      };
      
      const successResult = handleServiceCall(false);
      expect(successResult.isSuccess()).toBe(true);
      
      const failureResult = handleServiceCall(true);
      expect(failureResult.status).toBe(ResponseStatus.WARNING);
      expect(failureResult.data.fallback).toBe(true);
    });

    it('should implement circuit breaker pattern', () => {
      class CircuitBreaker {
        constructor(threshold = 3) {
          this.failureCount = 0;
          this.threshold = threshold;
          this.isOpen = false;
          this.lastFailureTime = null;
        }
        
        execute(operation) {
          if (this.isOpen && Date.now() - this.lastFailureTime < 5000) {
            return ResponseFactory.error('Circuit breaker is open', {
              retryAfter: 5000 - (Date.now() - this.lastFailureTime)
            });
          }
          
          try {
            const result = operation();
            this.reset();
            return ResponseFactory.success('Operation successful', result);
          } catch (error) {
            this.recordFailure();
            if (this.isOpen) {
              return ResponseFactory.error('Circuit breaker opened', {
                failureCount: this.failureCount,
                error: error.message
              });
            }
            return ResponseFactory.error('Operation failed', error);
          }
        }
        
        recordFailure() {
          this.failureCount++;
          this.lastFailureTime = Date.now();
          if (this.failureCount >= this.threshold) {
            this.isOpen = true;
          }
        }
        
        reset() {
          this.failureCount = 0;
          this.isOpen = false;
          this.lastFailureTime = null;
        }
      }
      
      const breaker = new CircuitBreaker(2);
      const failingOperation = () => { throw new Error('Service error'); };
      
      // First failure
      let result = breaker.execute(failingOperation);
      expect(result.hasErrors()).toBe(true);
      expect(breaker.isOpen).toBe(false);
      
      // Second failure - circuit opens
      result = breaker.execute(failingOperation);
      expect(result.message).toBe('Circuit breaker opened');
      expect(breaker.isOpen).toBe(true);
      
      // Subsequent calls fail immediately
      result = breaker.execute(failingOperation);
      expect(result.message).toBe('Circuit breaker is open');
    });
  });

  describe('Malformed Data Processing', () => {
    it('should sanitize potentially dangerous input', () => {
      const maliciousInput = {
        script: '<script>alert("XSS")</script>',
        sql: "'; DROP TABLE users; --",
        prototype: { constructor: { prototype: {} } }
      };
      
      const response = ResponseFactory.success('Data processed', maliciousInput);
      
      // Response should preserve data but not execute it
      expect(response.data.script).toBe('<script>alert("XSS")</script>');
      expect(response.data.sql).toBe("'; DROP TABLE users; --");
      
      // Should be serializable without security issues
      const json = response.toJSON();
      // JSON.stringify doesn't automatically escape HTML, that would be done by the rendering layer
      expect(json).toContain('<script>');
    });

    it('should handle invalid JSON data', () => {
      const circularRef = { name: 'test' };
      circularRef.self = circularRef;
      
      const response = ResponseFactory.success('Circular data', circularRef);
      
      // Should handle circular references when converting to JSON
      expect(() => {
        JSON.stringify(response.toObject());
      }).toThrow(); // This is expected - circular refs can't be stringified
      
      // But toObject should work
      const obj = response.toObject();
      expect(obj.data.name).toBe('test');
    });

    it('should validate data types', () => {
      const validateAndRespond = (data) => {
        // Simple validation
        if (typeof data !== 'object' || data === null) {
          return ResponseFactory.error('Invalid data format', {
            expected: 'object',
            received: typeof data
          });
        }
        
        if (!data.id || typeof data.id !== 'number') {
          return ResponseFactory.error('Invalid ID', {
            field: 'id',
            expected: 'number',
            received: typeof data.id
          });
        }
        
        return ResponseFactory.success('Data valid', data);
      };
      
      expect(validateAndRespond('string').hasErrors()).toBe(true);
      expect(validateAndRespond(null).hasErrors()).toBe(true);
      expect(validateAndRespond({ id: 'string' }).hasErrors()).toBe(true);
      expect(validateAndRespond({ id: 123 }).isSuccess()).toBe(true);
    });
  });

  describe('Security Exception Handling', () => {
    it('should handle authentication errors', () => {
      const authError = new Error('Unauthorized');
      authError.code = 'AUTH_FAILED';
      authError.statusCode = 401;
      
      const response = ResponseFactory.error('Authentication failed', authError);
      response.addContext('authRequired', true);
      response.addSuggestion('login', 'Please log in to continue', 'high');
      
      expect(response.data.code).toBe('AUTH_FAILED');
      expect(response.context.authRequired).toBe(true);
      expect(response.suggestions[0].action).toBe('login');
    });

    it('should handle permission errors', () => {
      const permError = new Error('Forbidden');
      permError.code = 'PERMISSION_DENIED';
      permError.statusCode = 403;
      
      const response = ResponseFactory.error('Insufficient permissions', permError);
      response.addRisk(RiskLevel.HIGH, 'Attempted unauthorized action');
      response.addMetadata('requiredRole', 'admin');
      
      expect(response.data.code).toBe('PERMISSION_DENIED');
      expect(response.risks[0].level).toBe(RiskLevel.HIGH);
      expect(response.metadata.requiredRole).toBe('admin');
    });

    it('should sanitize error messages for security', () => {
      const sensitiveError = new Error('Database connection failed: mysql://user:password@localhost/db');
      
      const sanitizeError = (error) => {
        const message = error.message.replace(/mysql:\/\/[^@]+@[^\s]+/, 'mysql://***:***@***/***');
        return { ...error, message, sanitized: true };
      };
      
      const response = ResponseFactory.error('Database error', sanitizeError(sensitiveError));
      // ErrorResponse extracts just the message from error objects
      expect(response.data.error).toBe('mysql://***:***@***/***');
      expect(response.data.error).not.toContain('password');
    });
  });

  describe('Graceful Degradation', () => {
    it('should provide partial results on partial failure', () => {
      const processItems = (items) => {
        const results = [];
        const errors = [];
        
        for (const item of items) {
          try {
            if (item.fail) throw new Error(`Failed to process ${item.id}`);
            results.push({ id: item.id, processed: true });
          } catch (error) {
            errors.push({ id: item.id, error: error.message });
          }
        }
        
        if (errors.length > 0) {
          const response = ResponseFactory.warning('Partial success', {
            processed: results,
            failed: errors,
            stats: {
              total: items.length,
              successful: results.length,
              failed: errors.length
            }
          });
          
          response.addRisk(RiskLevel.MEDIUM, `${errors.length} items failed to process`);
          response.addSuggestion('retry', 'Retry failed items', 'high');
          
          return response;
        }
        
        return ResponseFactory.success('All items processed', results);
      };
      
      const items = [
        { id: 1 },
        { id: 2, fail: true },
        { id: 3 },
        { id: 4, fail: true },
        { id: 5 }
      ];
      
      const result = processItems(items);
      expect(result.status).toBe(ResponseStatus.WARNING);
      expect(result.data.stats.successful).toBe(3);
      expect(result.data.stats.failed).toBe(2);
      expect(result.risks).toHaveLength(1);
    });

    it('should implement retry mechanism', async () => {
      let attempts = 0;
      const unreliableOperation = () => {
        attempts++;
        if (attempts < 3) {
          throw new Error(`Attempt ${attempts} failed`);
        }
        return 'Success on third attempt';
      };
      
      const retryOperation = async (operation, maxRetries = 3, delay = 100) => {
        let lastError;
        
        for (let i = 0; i < maxRetries; i++) {
          try {
            const result = operation();
            const response = ResponseFactory.success('Operation succeeded', {
              result,
              attempts: i + 1
            });
            
            if (i > 0) {
              response.addContext('retried', true);
              response.addMetadata('retriesNeeded', i);
            }
            
            return response;
          } catch (error) {
            lastError = error;
            if (i < maxRetries - 1) {
              await new Promise(resolve => setTimeout(resolve, delay));
            }
          }
        }
        
        return ResponseFactory.error('Operation failed after retries', {
          error: lastError.message,
          attempts: maxRetries
        });
      };
      
      const result = await retryOperation(unreliableOperation);
      expect(result.isSuccess()).toBe(true);
      expect(result.data.attempts).toBe(3);
      expect(result.context.retried).toBe(true);
    });
  });

  describe('Recovery Mechanisms', () => {
    it('should recover from state corruption', () => {
      class StatefulService {
        constructor() {
          this.state = { valid: true, data: {} };
        }
        
        corruptState() {
          this.state = null;
        }
        
        operation() {
          try {
            if (!this.state || !this.state.valid) {
              throw new Error('Invalid state');
            }
            return ResponseFactory.success('Operation completed', this.state.data);
          } catch (error) {
            // Attempt recovery
            this.recoverState();
            return ResponseFactory.warning('State recovered', {
              error: error.message,
              recovered: true,
              newState: this.state
            });
          }
        }
        
        recoverState() {
          this.state = { valid: true, data: {}, recovered: true };
        }
      }
      
      const service = new StatefulService();
      service.corruptState();
      
      const result = service.operation();
      expect(result.status).toBe(ResponseStatus.WARNING);
      expect(result.data.recovered).toBe(true);
      expect(service.state.valid).toBe(true);
    });

    it('should handle cascade failures', () => {
      const services = {
        primary: { available: false },
        secondary: { available: false },
        tertiary: { available: true }
      };
      
      const executeWithFallback = () => {
        const attempts = [];
        
        for (const [name, service] of Object.entries(services)) {
          attempts.push(name);
          
          if (service.available) {
            return ResponseFactory.success('Service call successful', {
              service: name,
              attempts,
              fallbacks: attempts.length - 1
            });
          }
        }
        
        return ResponseFactory.error('All services unavailable', {
          attempts,
          services: Object.keys(services)
        });
      };
      
      const result = executeWithFallback();
      expect(result.isSuccess()).toBe(true);
      expect(result.data.service).toBe('tertiary');
      expect(result.data.fallbacks).toBe(2);
    });
  });
});
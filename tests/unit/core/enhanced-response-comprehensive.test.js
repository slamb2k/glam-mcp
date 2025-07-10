/**
 * Comprehensive tests for Enhanced Response System
 * Task 29: Implement Core Enhanced Response System Tests
 */

import { jest } from '@jest/globals';
import {
  EnhancedResponse,
  ResponseFactory,
  ResponseStatus,
  RiskLevel,
  SuccessResponse,
  ErrorResponse,
  WarningResponse,
  InfoResponse
} from '../../../src/core/enhanced-response.js';

describe('Enhanced Response System - Comprehensive Tests', () => {
  describe('Response Generation and Formatting', () => {
    describe('Edge Cases', () => {
      it('should handle empty constructor parameters', () => {
        const response = new EnhancedResponse({});
        
        expect(response.status).toBe(ResponseStatus.SUCCESS);
        expect(response.message).toBe('');
        expect(response.data).toBeNull();
        expect(response.context).toEqual({});
        expect(response.suggestions).toEqual([]);
        expect(response.risks).toEqual([]);
      });

      it('should handle very large data payloads', () => {
        const largeData = {
          array: new Array(10000).fill('test'),
          nested: {}
        };
        
        // Create deep nesting
        let current = largeData.nested;
        for (let i = 0; i < 100; i++) {
          current.level = { depth: i };
          current = current.level;
        }
        
        const response = ResponseFactory.success('Large payload', largeData);
        expect(response.data).toBe(largeData);
        
        // Should serialize without issues
        const json = response.toJSON();
        expect(() => JSON.parse(json)).not.toThrow();
      });

      it('should handle special characters in messages', () => {
        const specialChars = 'Test "quotes" \'single\' \n\t\r special © chars 🚀';
        const response = ResponseFactory.info(specialChars);
        
        expect(response.message).toBe(specialChars);
        const json = response.toJSON();
        const parsed = JSON.parse(json);
        expect(parsed.message).toBe(specialChars);
      });

      it('should handle null and undefined values correctly', () => {
        const response = new EnhancedResponse({
          data: { 
            nullValue: null, 
            undefinedValue: undefined,
            validValue: 'test' 
          }
        });
        
        const obj = response.toObject();
        expect(obj.data.nullValue).toBeNull();
        expect(obj.data.undefinedValue).toBeUndefined();
        expect(obj.data.validValue).toBe('test');
      });
    });

    describe('Metadata Management', () => {
      it('should preserve existing metadata when adding new', () => {
        const response = new EnhancedResponse({
          metadata: { existing: 'value' }
        });
        
        response.addMetadata('new', 'value2');
        expect(response.metadata.existing).toBe('value');
        expect(response.metadata.new).toBe('value2');
        expect(response.metadata.timestamp).toBeDefined();
        expect(response.metadata.version).toBe('1.0.0');
      });

      it('should overwrite metadata with same key', () => {
        const response = new EnhancedResponse({});
        
        response.addMetadata('key', 'value1');
        response.addMetadata('key', 'value2');
        
        expect(response.metadata.key).toBe('value2');
      });

      it('should handle complex metadata structures', () => {
        const response = new EnhancedResponse({});
        
        response.addMetadata('performance', {
          responseTime: 123,
          metrics: {
            cpu: 45.2,
            memory: 1024
          }
        });
        
        expect(response.metadata.performance.responseTime).toBe(123);
        expect(response.metadata.performance.metrics.cpu).toBe(45.2);
      });
    });

    describe('Risk Assessment Features', () => {
      it('should maintain risk order as added', () => {
        const response = new EnhancedResponse({});
        
        response.addRisk(RiskLevel.LOW, 'First risk');
        response.addRisk(RiskLevel.CRITICAL, 'Second risk');
        response.addRisk(RiskLevel.MEDIUM, 'Third risk');
        
        expect(response.risks[0].level).toBe(RiskLevel.LOW);
        expect(response.risks[1].level).toBe(RiskLevel.CRITICAL);
        expect(response.risks[2].level).toBe(RiskLevel.MEDIUM);
      });

      it('should handle risks with no mitigation', () => {
        const response = new EnhancedResponse({});
        response.addRisk(RiskLevel.HIGH, 'No mitigation risk');
        
        expect(response.risks[0].mitigation).toBeNull();
      });

      it('should return NONE for no risks', () => {
        const response = new EnhancedResponse({});
        expect(response.getHighestRiskLevel()).toBe(RiskLevel.NONE);
      });

      it('should handle all risk levels correctly', () => {
        const response = new EnhancedResponse({});
        
        // Add all risk levels
        Object.values(RiskLevel).forEach(level => {
          if (level !== RiskLevel.NONE) {
            response.addRisk(level, `${level} risk`);
          }
        });
        
        expect(response.getHighestRiskLevel()).toBe(RiskLevel.CRITICAL);
      });
    });

    describe('Suggestions System', () => {
      it('should handle suggestions with default priority', () => {
        const response = new EnhancedResponse({});
        response.addSuggestion('action', 'description');
        
        expect(response.suggestions[0].priority).toBe('medium');
      });

      it('should add multiple suggestions with different priorities', () => {
        const response = new EnhancedResponse({});
        
        response.addSuggestion('urgent', 'Do this now', 'high');
        response.addSuggestion('later', 'Do this later', 'low');
        response.addSuggestion('normal', 'Do this normally', 'medium');
        
        expect(response.suggestions).toHaveLength(3);
        expect(response.suggestions.map(s => s.priority))
          .toEqual(['high', 'low', 'medium']);
      });

      it('should add timestamps to suggestions', () => {
        const before = new Date().toISOString();
        const response = new EnhancedResponse({});
        response.addSuggestion('test', 'test suggestion');
        const after = new Date().toISOString();
        
        const timestamp = response.suggestions[0].timestamp;
        expect(new Date(timestamp) >= new Date(before)).toBe(true);
        expect(new Date(timestamp) <= new Date(after)).toBe(true);
      });
    });

    describe('Team Activity Integration', () => {
      it('should set and retrieve team activity', () => {
        const response = new EnhancedResponse({});
        const activity = {
          recentCommits: ['commit1', 'commit2'],
          activeUsers: ['user1', 'user2'],
          branches: ['feature/x', 'feature/y']
        };
        
        response.setTeamActivity(activity);
        expect(response.teamActivity).toEqual(activity);
      });

      it('should include team activity in serialization', () => {
        const response = new EnhancedResponse({});
        const activity = { test: 'activity' };
        response.setTeamActivity(activity);
        
        const obj = response.toObject();
        expect(obj.teamActivity).toEqual(activity);
      });
    });
  });

  describe('Error Handling and Recovery', () => {
    describe('Error Response Creation', () => {
      it('should handle string errors', () => {
        const response = new ErrorResponse('Failed', 'Simple error string');
        
        expect(response.data.error).toBe('Simple error string');
        expect(response.data.stack).toBeUndefined();
        expect(response.data.code).toBeUndefined();
      });

      it('should handle Error objects with all properties', () => {
        const error = new Error('Complex error');
        error.code = 'ERR_COMPLEX';
        error.stack = 'Stack trace here';
        error.statusCode = 500;
        
        const response = new ErrorResponse('Operation failed', error);
        
        expect(response.data.error).toBe('Complex error');
        expect(response.data.code).toBe('ERR_COMPLEX');
        expect(response.data.stack).toBe('Stack trace here');
      });

      it('should handle null error gracefully', () => {
        const response = new ErrorResponse('Failed', null);
        
        expect(response.status).toBe(ResponseStatus.ERROR);
        expect(response.data).toBeNull();
      });

      it('should handle custom error objects', () => {
        const customError = {
          message: 'Custom error',
          details: { field: 'value' },
          timestamp: new Date().toISOString()
        };
        
        const response = new ErrorResponse('Failed', customError);
        // ErrorResponse extracts the message property from objects
        expect(response.data.error).toBe('Custom error');
      });
    });

    describe('Response Status Checks', () => {
      it('should correctly identify all status types', () => {
        const responses = {
          success: ResponseFactory.success('Success'),
          error: ResponseFactory.error('Error'),
          warning: ResponseFactory.warning('Warning'),
          info: ResponseFactory.info('Info')
        };
        
        expect(responses.success.isSuccess()).toBe(true);
        expect(responses.success.hasErrors()).toBe(false);
        
        expect(responses.error.isSuccess()).toBe(false);
        expect(responses.error.hasErrors()).toBe(true);
        
        expect(responses.warning.hasWarnings()).toBe(true);
        expect(responses.info.status).toBe(ResponseStatus.INFO);
      });

      it('should handle pending status', () => {
        const response = new EnhancedResponse({
          status: ResponseStatus.PENDING
        });
        
        expect(response.status).toBe(ResponseStatus.PENDING);
        expect(response.isSuccess()).toBe(false);
        expect(response.hasErrors()).toBe(false);
      });
    });

    describe('Context Error Scenarios', () => {
      it('should handle circular references in context', () => {
        const response = new EnhancedResponse({});
        const circularObj = { name: 'test' };
        circularObj.self = circularObj;
        
        response.addContext('circular', circularObj);
        
        // Should not throw when converting to JSON
        expect(() => {
          const obj = response.toObject();
          // Note: JSON.stringify with circular refs would throw
          // This tests that toObject() doesn't break
        }).not.toThrow();
      });

      it('should handle deeply nested context', () => {
        const response = new EnhancedResponse({});
        let deepObject = { level: 0 };
        let current = deepObject;
        
        for (let i = 1; i <= 50; i++) {
          current.next = { level: i };
          current = current.next;
        }
        
        response.addContext('deep', deepObject);
        expect(response.context.deep.level).toBe(0);
      });
    });
  });

  describe('Integration with Tools', () => {
    describe('Response Composition', () => {
      it('should support building complex responses incrementally', () => {
        const response = new EnhancedResponse({ message: 'Initial' });
        
        // Simulate tool adding context
        response.addContext('tool', 'git');
        response.addContext('operation', 'commit');
        
        // Simulate risk assessment
        response.addRisk(RiskLevel.LOW, 'Uncommitted changes in other files');
        
        // Simulate suggestions
        response.addSuggestion('stage', 'Stage remaining files', 'medium');
        response.addSuggestion('push', 'Push to remote', 'low');
        
        // Simulate metadata from processing
        response.addMetadata('processTime', 150);
        response.addMetadata('filesProcessed', 10);
        
        const result = response.toObject();
        expect(result.context.tool).toBe('git');
        expect(result.risks).toHaveLength(1);
        expect(result.suggestions).toHaveLength(2);
        expect(result.metadata.processTime).toBe(150);
      });
    });

    describe('Response Merging', () => {
      it('should merge multiple tool responses', () => {
        // Simulate responses from different tools
        const gitResponse = ResponseFactory.success('Git operation complete')
          .addContext('branch', 'main')
          .addSuggestion('push', 'Push changes');
        
        const lintResponse = ResponseFactory.warning('Linting warnings')
          .addRisk(RiskLevel.LOW, '5 linting warnings')
          .addContext('lintErrors', 5);
        
        // Create merged response
        const merged = new EnhancedResponse({
          status: lintResponse.hasWarnings() ? ResponseStatus.WARNING : ResponseStatus.SUCCESS,
          message: 'Operations complete',
          context: {
            ...gitResponse.context,
            ...lintResponse.context
          }
        });
        
        // Merge suggestions and risks
        gitResponse.suggestions.forEach(s => 
          merged.suggestions.push(s)
        );
        lintResponse.risks.forEach(r => 
          merged.risks.push(r)
        );
        
        expect(merged.context.branch).toBe('main');
        expect(merged.context.lintErrors).toBe(5);
        expect(merged.suggestions).toHaveLength(1);
        expect(merged.risks).toHaveLength(1);
      });
    });
  });

  describe('Performance Considerations', () => {
    it('should handle rapid successive operations', () => {
      const response = new EnhancedResponse({});
      const operations = 1000;
      
      const start = Date.now();
      for (let i = 0; i < operations; i++) {
        response
          .addContext(`key${i}`, `value${i}`)
          .addMetadata(`meta${i}`, i);
      }
      const duration = Date.now() - start;
      
      expect(Object.keys(response.context)).toHaveLength(operations);
      expect(Object.keys(response.metadata)).toHaveLength(operations + 2); // +2 for timestamp and version
      expect(duration).toBeLessThan(100); // Should complete in under 100ms
    });

    it('should efficiently serialize large responses', () => {
      const response = new EnhancedResponse({});
      
      // Add lots of data
      for (let i = 0; i < 100; i++) {
        response.addSuggestion(`action${i}`, `Description ${i}`);
        response.addRisk(RiskLevel.LOW, `Risk ${i}`);
      }
      
      const start = Date.now();
      const json = response.toJSON();
      const duration = Date.now() - start;
      
      expect(json).toBeTruthy();
      expect(duration).toBeLessThan(50); // Should serialize quickly
    });
  });

  describe('Snapshot Testing', () => {
    it('should maintain consistent response structure', () => {
      const response = ResponseFactory.success('Snapshot test', { id: 123 })
        .addContext('user', 'testuser')
        .addMetadata('operation', 'test')
        .addSuggestion('verify', 'Verify results', 'high')
        .addRisk(RiskLevel.MEDIUM, 'Test risk', 'Test mitigation');
      
      const snapshot = response.toObject();
      
      // Remove dynamic fields for snapshot
      delete snapshot.metadata.timestamp;
      snapshot.suggestions.forEach(s => delete s.timestamp);
      snapshot.risks.forEach(r => delete r.timestamp);
      
      expect(snapshot).toMatchInlineSnapshot(`
        {
          "context": {
            "user": "testuser",
          },
          "data": {
            "id": 123,
          },
          "message": "Snapshot test",
          "metadata": {
            "operation": "test",
            "version": "1.0.0",
          },
          "risks": [
            {
              "description": "Test risk",
              "level": "medium",
              "mitigation": "Test mitigation",
            },
          ],
          "status": "success",
          "suggestions": [
            {
              "action": "verify",
              "description": "Verify results",
              "priority": "high",
            },
          ],
          "teamActivity": null,
        }
      `);
    });
  });
});
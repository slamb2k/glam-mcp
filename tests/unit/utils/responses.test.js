import { describe, test, expect } from '@jest/globals';
import { 
  createSuccessResponse,
  createErrorResponse,
  createStatusResponse,
  formatMCPResponse
} from '../../../src/utils/responses.js';

describe('Response Utilities', () => {
  describe('createSuccessResponse', () => {
    test('should create a success response with message', () => {
      // Arrange
      const message = 'Operation completed successfully';
      
      // Act
      const result = createSuccessResponse(message);
      
      // Assert
      expect(result.success).toBe(true);
      expect(result.message).toBe(message);
      expect(result.data).toEqual({});
      expect(result.timestamp).toBeDefined();
    });
    
    test('should include data when provided', () => {
      // Arrange
      const message = 'Data retrieved';
      const data = { id: 1, name: 'Test' };
      
      // Act
      const result = createSuccessResponse(message, data);
      
      // Assert
      expect(result.success).toBe(true);
      expect(result.message).toBe(message);
      expect(result.data).toEqual(data);
    });
    
    test('should generate valid ISO timestamp', () => {
      // Act
      const result = createSuccessResponse('Test');
      
      // Assert
      expect(new Date(result.timestamp).toISOString()).toBe(result.timestamp);
    });
  });
  
  describe('createErrorResponse', () => {
    test('should create error response with message', () => {
      // Arrange
      const message = 'Operation failed';
      
      // Act
      const result = createErrorResponse(message);
      
      // Assert
      expect(result.success).toBe(false);
      expect(result.message).toBe(message);
      expect(result.error).toBeNull();
      expect(result.timestamp).toBeDefined();
    });
    
    test('should handle Error objects', () => {
      // Arrange
      const message = 'Operation failed';
      const error = new Error('Detailed error');
      
      // Act
      const result = createErrorResponse(message, error);
      
      // Assert
      expect(result.success).toBe(false);
      expect(result.message).toBe(message);
      expect(result.error).toBe('Detailed error');
    });
    
    test('should handle string errors', () => {
      // Arrange
      const message = 'Operation failed';
      const error = 'String error';
      
      // Act
      const result = createErrorResponse(message, error);
      
      // Assert
      expect(result.error).toBe('String error');
    });
  });
  
  describe('createStatusResponse', () => {
    test('should create status response', () => {
      // Arrange
      const status = 'in-progress';
      const message = 'Processing request';
      
      // Act
      const result = createStatusResponse(status, message);
      
      // Assert
      expect(result.status).toBe(status);
      expect(result.message).toBe(message);
      expect(result.data).toEqual({});
      expect(result.timestamp).toBeDefined();
    });
    
    test('should include data when provided', () => {
      // Arrange
      const status = 'completed';
      const message = 'Task finished';
      const data = { duration: 1000, items: 5 };
      
      // Act
      const result = createStatusResponse(status, message, data);
      
      // Assert
      expect(result.data).toEqual(data);
    });
  });
  
  describe('formatMCPResponse', () => {
    test('should format string response', () => {
      // Arrange
      const input = 'Simple text response';
      
      // Act
      const result = formatMCPResponse(input);
      
      // Assert
      expect(result).toEqual({ text: input });
    });
    
    test('should format success response with icon', () => {
      // Arrange
      const input = createSuccessResponse('Operation completed');
      
      // Act
      const result = formatMCPResponse(input);
      
      // Assert
      expect(result.text).toContain('✅');
      expect(result.text).toContain('Operation completed');
    });
    
    test('should format error response with icon', () => {
      // Arrange
      const input = createErrorResponse('Operation failed');
      
      // Act
      const result = formatMCPResponse(input);
      
      // Assert
      expect(result.text).toContain('❌');
      expect(result.text).toContain('Operation failed');
    });
    
    test('should include formatted data in response', () => {
      // Arrange
      const input = createSuccessResponse('With data', { key: 'value' });
      
      // Act
      const result = formatMCPResponse(input);
      
      // Assert
      expect(result.text).toContain('✅');
      expect(result.text).toContain('With data');
      expect(result.text).toContain('"key": "value"');
    });
    
    test('should format arbitrary objects as JSON', () => {
      // Arrange
      const input = { custom: 'object', nested: { value: 42 } };
      
      // Act
      const result = formatMCPResponse(input);
      
      // Assert
      expect(result.text).toContain('"custom": "object"');
      expect(result.text).toContain('"value": 42');
    });
  });
});
/**
 * Tests for Enhanced Response Structure
 */

import { jest } from '@jest/globals';
import {
  EnhancedResponse,
  ResponseFactory,
  ResponseStatus,
  RiskLevel,
  SuccessResponse,
  ErrorResponse
} from '../../../src/core/enhanced-response.js';

describe('Enhanced Response Structure', () => {
  describe('EnhancedResponse', () => {
    it('should create a basic response with defaults', () => {
      const response = new EnhancedResponse({
        message: 'Test message'
      });

      expect(response.status).toBe(ResponseStatus.SUCCESS);
      expect(response.message).toBe('Test message');
      expect(response.data).toBeNull();
      expect(response.context).toEqual({});
      expect(response.metadata).toHaveProperty('timestamp');
      expect(response.metadata).toHaveProperty('version', '1.0.0');
      expect(response.suggestions).toEqual([]);
      expect(response.risks).toEqual([]);
      expect(response.teamActivity).toBeNull();
    });

    it('should add suggestions dynamically', () => {
      const response = new EnhancedResponse({ message: 'Test' });
      response.addSuggestion('commit', 'Commit your changes', 'high');

      expect(response.suggestions).toHaveLength(1);
      expect(response.suggestions[0]).toMatchObject({
        action: 'commit',
        description: 'Commit your changes',
        priority: 'high'
      });
      expect(response.suggestions[0]).toHaveProperty('timestamp');
    });

    it('should add risks dynamically', () => {
      const response = new EnhancedResponse({ message: 'Test' });
      response.addRisk(RiskLevel.MEDIUM, 'Uncommitted changes', 'Commit or stash changes');

      expect(response.risks).toHaveLength(1);
      expect(response.risks[0]).toMatchObject({
        level: RiskLevel.MEDIUM,
        description: 'Uncommitted changes',
        mitigation: 'Commit or stash changes'
      });
    });

    it('should chain method calls', () => {
      const response = new EnhancedResponse({ message: 'Test' })
        .addContext('branch', 'main')
        .addMetadata('operation', 'merge')
        .addSuggestion('review', 'Review changes')
        .addRisk(RiskLevel.LOW, 'Minor conflicts possible');

      expect(response.context.branch).toBe('main');
      expect(response.metadata.operation).toBe('merge');
      expect(response.suggestions).toHaveLength(1);
      expect(response.risks).toHaveLength(1);
    });

    it('should determine highest risk level correctly', () => {
      const response = new EnhancedResponse({ message: 'Test' })
        .addRisk(RiskLevel.LOW, 'Low risk')
        .addRisk(RiskLevel.HIGH, 'High risk')
        .addRisk(RiskLevel.MEDIUM, 'Medium risk');

      expect(response.getHighestRiskLevel()).toBe(RiskLevel.HIGH);
    });

    it('should convert to object correctly', () => {
      const response = new EnhancedResponse({
        status: ResponseStatus.WARNING,
        message: 'Test warning',
        data: { count: 42 }
      });

      const obj = response.toObject();
      expect(obj).toHaveProperty('status', ResponseStatus.WARNING);
      expect(obj).toHaveProperty('message', 'Test warning');
      expect(obj).toHaveProperty('data', { count: 42 });
      expect(obj).toHaveProperty('metadata');
      expect(obj).toHaveProperty('suggestions');
      expect(obj).toHaveProperty('risks');
    });
  });

  describe('Response Factories', () => {
    it('should create success response', () => {
      const response = new SuccessResponse('Operation completed', { id: 123 });
      
      expect(response.status).toBe(ResponseStatus.SUCCESS);
      expect(response.message).toBe('Operation completed');
      expect(response.data).toEqual({ id: 123 });
      expect(response.isSuccess()).toBe(true);
      expect(response.hasErrors()).toBe(false);
    });

    it('should create error response with Error object', () => {
      const error = new Error('Something went wrong');
      error.code = 'ERR_001';
      const response = new ErrorResponse('Operation failed', error);
      
      expect(response.status).toBe(ResponseStatus.ERROR);
      expect(response.message).toBe('Operation failed');
      expect(response.data.error).toBe('Something went wrong');
      expect(response.data.code).toBe('ERR_001');
      expect(response.data.stack).toBeDefined();
      expect(response.hasErrors()).toBe(true);
    });
  });

  describe('ResponseFactory', () => {
    it('should create responses using static methods', () => {
      const success = ResponseFactory.success('Success!');
      const error = ResponseFactory.error('Error!');
      const warning = ResponseFactory.warning('Warning!');
      const info = ResponseFactory.info('Info!');

      expect(success.status).toBe(ResponseStatus.SUCCESS);
      expect(error.status).toBe(ResponseStatus.ERROR);
      expect(warning.status).toBe(ResponseStatus.WARNING);
      expect(info.status).toBe(ResponseStatus.INFO);
    });

    it('should create response from object', () => {
      const obj = {
        status: ResponseStatus.SUCCESS,
        message: 'From object',
        data: { test: true },
        context: { user: 'test' }
      };

      const response = ResponseFactory.fromObject(obj);
      expect(response.status).toBe(ResponseStatus.SUCCESS);
      expect(response.message).toBe('From object');
      expect(response.data).toEqual({ test: true });
      expect(response.context).toEqual({ user: 'test' });
    });

    it('should create response from JSON', () => {
      const json = JSON.stringify({
        status: ResponseStatus.INFO,
        message: 'From JSON',
        data: { value: 42 }
      });

      const response = ResponseFactory.fromJSON(json);
      expect(response.status).toBe(ResponseStatus.INFO);
      expect(response.message).toBe('From JSON');
      expect(response.data).toEqual({ value: 42 });
    });
  });

  describe('Response Methods', () => {
    it('should detect warnings correctly', () => {
      const response1 = ResponseFactory.warning('Has warning');
      const response2 = ResponseFactory.success('Success with risk')
        .addRisk(RiskLevel.MEDIUM, 'Some risk');
      const response3 = ResponseFactory.success('Pure success');

      expect(response1.hasWarnings()).toBe(true);
      expect(response2.hasWarnings()).toBe(true);
      expect(response3.hasWarnings()).toBe(false);
    });

    it('should serialize to JSON correctly', () => {
      const response = ResponseFactory.success('Test JSON', { data: 'value' })
        .addContext('key', 'value');

      const json = response.toJSON();
      const parsed = JSON.parse(json);

      expect(parsed.status).toBe(ResponseStatus.SUCCESS);
      expect(parsed.message).toBe('Test JSON');
      expect(parsed.data).toEqual({ data: 'value' });
      expect(parsed.context).toEqual({ key: 'value' });
    });
  });
});
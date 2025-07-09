/**
 * Utility functions for enhanced response manipulation and transformation
 */

import { EnhancedResponse, ResponseFactory, ResponseStatus, RiskLevel } from '../core/enhanced-response.js';

/**
 * Transform data within a response
 */
export function transformResponseData(response, transformer) {
  const obj = response.toObject();
  return ResponseFactory.fromObject({
    ...obj,
    data: transformer(obj.data)
  });
}

/**
 * Merge multiple responses into one
 */
export function mergeResponses(responses, options = {}) {
  const {
    combineStrategy = 'all', // 'all', 'first-error', 'highest-risk'
    message = 'Combined response'
  } = options;

  if (responses.length === 0) {
    return ResponseFactory.info('No responses to merge');
  }

  if (responses.length === 1) {
    return responses[0];
  }

  // Determine status based on strategy
  let status = ResponseStatus.SUCCESS;
  const errors = responses.filter(r => r.status === ResponseStatus.ERROR);
  const warnings = responses.filter(r => r.status === ResponseStatus.WARNING);

  if (combineStrategy === 'first-error' && errors.length > 0) {
    return errors[0];
  }

  if (errors.length > 0) {
    status = ResponseStatus.ERROR;
  } else if (warnings.length > 0) {
    status = ResponseStatus.WARNING;
  }

  // Combine data
  const combinedData = responses.reduce((acc, response) => {
    const obj = response.toObject();
    return {
      ...acc,
      [obj.message]: obj.data
    };
  }, {});

  // Combine contexts
  const combinedContext = responses.reduce((acc, response) => {
    return { ...acc, ...response.context };
  }, {});

  // Combine suggestions
  const allSuggestions = responses.flatMap(r => r.suggestions);

  // Combine risks
  const allRisks = responses.flatMap(r => r.risks);

  // Combine team activities
  const teamActivities = responses
    .filter(r => r.teamActivity)
    .map(r => r.teamActivity);

  const response = new EnhancedResponse({
    status,
    message,
    data: combinedData,
    context: combinedContext,
    suggestions: allSuggestions,
    risks: allRisks,
    teamActivity: teamActivities.length > 0 ? teamActivities : null
  });

  return response;
}

/**
 * Filter response content based on criteria
 */
export function filterResponse(response, criteria = {}) {
  const {
    includeData = true,
    includeContext = true,
    includeSuggestions = true,
    includeRisks = true,
    includeTeamActivity = true,
    minRiskLevel = RiskLevel.NONE
  } = criteria;

  const obj = response.toObject();
  const filtered = {
    status: obj.status,
    message: obj.message,
    metadata: obj.metadata
  };

  if (includeData) filtered.data = obj.data;
  if (includeContext) filtered.context = obj.context;
  if (includeSuggestions) filtered.suggestions = obj.suggestions;
  if (includeTeamActivity) filtered.teamActivity = obj.teamActivity;

  if (includeRisks) {
    const riskOrder = [RiskLevel.NONE, RiskLevel.LOW, RiskLevel.MEDIUM, RiskLevel.HIGH, RiskLevel.CRITICAL];
    const minIndex = riskOrder.indexOf(minRiskLevel);
    filtered.risks = obj.risks.filter(risk => {
      const riskIndex = riskOrder.indexOf(risk.level);
      return riskIndex >= minIndex;
    });
  }

  return ResponseFactory.fromObject(filtered);
}

/**
 * Chain responses together
 */
export function chainResponses(initialResponse, ...processors) {
  return processors.reduce((response, processor) => {
    if (response.hasErrors()) {
      return response; // Skip processing on error
    }
    return processor(response);
  }, initialResponse);
}

/**
 * Convert legacy response to enhanced response
 */
export function fromLegacyResponse(legacyResponse) {
  if (legacyResponse.success !== undefined) {
    // Handle old success/error format
    const status = legacyResponse.success ? ResponseStatus.SUCCESS : ResponseStatus.ERROR;
    return new EnhancedResponse({
      status,
      message: legacyResponse.message,
      data: legacyResponse.data || legacyResponse.error,
      metadata: {
        timestamp: legacyResponse.timestamp || new Date().toISOString(),
        legacy: true
      }
    });
  }

  if (legacyResponse.status !== undefined) {
    // Handle old status format
    return new EnhancedResponse({
      status: legacyResponse.status,
      message: legacyResponse.message,
      data: legacyResponse.data,
      metadata: {
        timestamp: legacyResponse.timestamp || new Date().toISOString(),
        legacy: true
      }
    });
  }

  // Default conversion
  return ResponseFactory.info('Converted legacy response', legacyResponse);
}

/**
 * Convert enhanced response to legacy format
 */
export function toLegacyResponse(enhancedResponse) {
  const obj = enhancedResponse.toObject();
  
  // Handle different legacy formats
  if (obj.status === ResponseStatus.ERROR) {
    return {
      success: false,
      message: obj.message,
      error: obj.data?.error || obj.data,
      timestamp: obj.metadata.timestamp
    };
  }
  
  // For status responses, preserve the original status
  if (enhancedResponse.originalStatus) {
    return {
      status: enhancedResponse.originalStatus,
      message: obj.message,
      data: obj.data || {},
      timestamp: obj.metadata.timestamp
    };
  }
  
  // Default success format
  return {
    success: obj.status === ResponseStatus.SUCCESS,
    message: obj.message,
    data: obj.data || {},
    timestamp: obj.metadata.timestamp
  };
}

/**
 * Add operation timing to response
 */
export function withTiming(operation, responseOrFactory) {
  const startTime = Date.now();
  
  return async (...args) => {
    try {
      const result = await operation(...args);
      const duration = Date.now() - startTime;
      
      let response;
      if (typeof responseOrFactory === 'function') {
        response = responseOrFactory(result);
      } else {
        response = responseOrFactory;
      }
      
      return response.addMetadata('duration', duration);
    } catch (error) {
      const duration = Date.now() - startTime;
      return ResponseFactory.error(error.message, error)
        .addMetadata('duration', duration);
    }
  };
}

/**
 * Create a response validator
 */
export function createResponseValidator(schema) {
  return (response) => {
    const obj = response.toObject();
    
    // Basic validation
    const errors = [];
    
    if (schema.requiredFields) {
      for (const field of schema.requiredFields) {
        if (!obj.data || obj.data[field] === undefined) {
          errors.push(`Missing required field: ${field}`);
        }
      }
    }
    
    if (schema.dataType && obj.data) {
      const actualType = Array.isArray(obj.data) ? 'array' : typeof obj.data;
      if (actualType !== schema.dataType) {
        errors.push(`Expected data type ${schema.dataType}, got ${actualType}`);
      }
    }
    
    if (errors.length > 0) {
      return ResponseFactory.error('Response validation failed', {
        errors,
        schema
      });
    }
    
    return response;
  };
}
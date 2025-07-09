/**
 * Enhanced Response Structure for MCP Server
 * Provides rich contextual responses with metadata, suggestions, and risk assessment
 */

/**
 * Response status types
 */
export const ResponseStatus = {
  SUCCESS: 'success',
  ERROR: 'error',
  WARNING: 'warning',
  INFO: 'info',
  PENDING: 'pending'
};

/**
 * Risk level types
 */
export const RiskLevel = {
  NONE: 'none',
  LOW: 'low',
  MEDIUM: 'medium',
  HIGH: 'high',
  CRITICAL: 'critical'
};

/**
 * Base response class with core functionality
 */
export class EnhancedResponse {
  constructor({
    status = ResponseStatus.SUCCESS,
    message = '',
    data = null,
    context = {},
    metadata = {},
    suggestions = [],
    risks = [],
    teamActivity = null
  }) {
    this.status = status;
    this.message = message;
    this.data = data;
    this.context = context;
    this.metadata = {
      ...metadata,
      timestamp: new Date().toISOString(),
      version: '1.0.0'
    };
    this.suggestions = suggestions;
    this.risks = risks;
    this.teamActivity = teamActivity;
  }

  /**
   * Add a suggestion to the response
   */
  addSuggestion(action, description, priority = 'medium') {
    this.suggestions.push({
      action,
      description,
      priority,
      timestamp: new Date().toISOString()
    });
    return this;
  }

  /**
   * Add a risk assessment to the response
   */
  addRisk(level, description, mitigation = null) {
    this.risks.push({
      level,
      description,
      mitigation,
      timestamp: new Date().toISOString()
    });
    return this;
  }

  /**
   * Add context information
   */
  addContext(key, value) {
    this.context[key] = value;
    return this;
  }

  /**
   * Add metadata
   */
  addMetadata(key, value) {
    this.metadata[key] = value;
    return this;
  }

  /**
   * Set team activity information
   */
  setTeamActivity(activity) {
    this.teamActivity = activity;
    return this;
  }

  /**
   * Convert to plain object
   */
  toObject() {
    return {
      status: this.status,
      message: this.message,
      data: this.data,
      context: this.context,
      metadata: this.metadata,
      suggestions: this.suggestions,
      risks: this.risks,
      teamActivity: this.teamActivity
    };
  }

  /**
   * Convert to JSON string
   */
  toJSON() {
    return JSON.stringify(this.toObject(), null, 2);
  }

  /**
   * Check if response is successful
   */
  isSuccess() {
    return this.status === ResponseStatus.SUCCESS;
  }

  /**
   * Check if response has errors
   */
  hasErrors() {
    return this.status === ResponseStatus.ERROR;
  }

  /**
   * Check if response has warnings
   */
  hasWarnings() {
    return this.status === ResponseStatus.WARNING || this.risks.some(r => r.level !== RiskLevel.NONE);
  }

  /**
   * Get highest risk level
   */
  getHighestRiskLevel() {
    if (this.risks.length === 0) return RiskLevel.NONE;
    
    const riskOrder = [RiskLevel.NONE, RiskLevel.LOW, RiskLevel.MEDIUM, RiskLevel.HIGH, RiskLevel.CRITICAL];
    return this.risks.reduce((highest, risk) => {
      const currentIndex = riskOrder.indexOf(risk.level);
      const highestIndex = riskOrder.indexOf(highest);
      return currentIndex > highestIndex ? risk.level : highest;
    }, RiskLevel.NONE);
  }
}

/**
 * Success response factory
 */
export class SuccessResponse extends EnhancedResponse {
  constructor(message, data = null, options = {}) {
    super({
      status: ResponseStatus.SUCCESS,
      message,
      data,
      ...options
    });
  }
}

/**
 * Error response factory
 */
export class ErrorResponse extends EnhancedResponse {
  constructor(message, error = null, options = {}) {
    super({
      status: ResponseStatus.ERROR,
      message,
      data: error ? {
        error: error?.message || error,
        stack: error?.stack,
        code: error?.code
      } : null,
      ...options
    });
  }
}

/**
 * Warning response factory
 */
export class WarningResponse extends EnhancedResponse {
  constructor(message, data = null, options = {}) {
    super({
      status: ResponseStatus.WARNING,
      message,
      data,
      ...options
    });
  }
}

/**
 * Info response factory
 */
export class InfoResponse extends EnhancedResponse {
  constructor(message, data = null, options = {}) {
    super({
      status: ResponseStatus.INFO,
      message,
      data,
      ...options
    });
  }
}

/**
 * Response factory for creating responses
 */
export class ResponseFactory {
  static success(message, data = null, options = {}) {
    return new SuccessResponse(message, data, options);
  }

  static error(message, error = null, options = {}) {
    return new ErrorResponse(message, error, options);
  }

  static warning(message, data = null, options = {}) {
    return new WarningResponse(message, data, options);
  }

  static info(message, data = null, options = {}) {
    return new InfoResponse(message, data, options);
  }

  static fromObject(obj) {
    return new EnhancedResponse(obj);
  }

  static fromJSON(json) {
    const obj = typeof json === 'string' ? JSON.parse(json) : json;
    return ResponseFactory.fromObject(obj);
  }
}
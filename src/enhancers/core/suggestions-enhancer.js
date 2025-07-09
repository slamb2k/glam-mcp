/**
 * Suggestions Enhancer
 * Adds contextual suggestions for next actions
 */

import { BaseEnhancer, EnhancerPriority } from '../base-enhancer.js';
import { ResponseStatus } from '../../core/enhanced-response.js';

/**
 * Enhancer that adds suggestions based on response context
 */
export class SuggestionsEnhancer extends BaseEnhancer {
  constructor(options = {}) {
    super({
      name: 'SuggestionsEnhancer',
      priority: EnhancerPriority.MEDIUM,
      description: 'Adds contextual suggestions for next actions',
      version: '1.0.0',
      tags: ['suggestions', 'guidance'],
      config: {
        maxSuggestions: options.maxSuggestions || 5,
        includeDocLinks: options.includeDocLinks !== false,
        contextAnalysis: options.contextAnalysis !== false,
        suggestionProviders: options.suggestionProviders || [],
        ...options
      }
    });

    // Default suggestion rules
    this.suggestionRules = new Map([
      ['git.branch.created', [
        { action: 'checkout', description: 'Switch to the new branch', priority: 'high' },
        { action: 'push', description: 'Push the branch to remote', priority: 'medium' }
      ]],
      ['git.commit.success', [
        { action: 'push', description: 'Push changes to remote', priority: 'high' },
        { action: 'pr-create', description: 'Create a pull request', priority: 'medium' }
      ]],
      ['git.merge.conflict', [
        { action: 'resolve', description: 'Resolve merge conflicts', priority: 'critical' },
        { action: 'abort', description: 'Abort the merge operation', priority: 'medium' }
      ]],
      ['error.permission', [
        { action: 'authenticate', description: 'Check authentication status', priority: 'high' },
        { action: 'permissions', description: 'Verify required permissions', priority: 'high' }
      ]]
    ]);
  }

  /**
   * Enhance response with suggestions
   * @param {EnhancedResponse} response - The response to enhance
   * @param {Object} context - Additional context
   * @returns {Promise<EnhancedResponse>} - Enhanced response
   * @protected
   */
  async _doEnhance(response, context) {
    const suggestions = [];

    // Get suggestions based on response status
    if (response.status === ResponseStatus.ERROR) {
      suggestions.push(...this._getErrorSuggestions(response, context));
    } else if (response.status === ResponseStatus.WARNING) {
      suggestions.push(...this._getWarningSuggestions(response, context));
    } else if (response.status === ResponseStatus.SUCCESS) {
      suggestions.push(...this._getSuccessSuggestions(response, context));
    }

    // Get context-based suggestions
    if (this.config.contextAnalysis && context.operation) {
      suggestions.push(...this._getContextSuggestions(context));
    }

    // Get custom suggestions from providers
    for (const provider of this.config.suggestionProviders) {
      if (typeof provider === 'function') {
        const customSuggestions = await provider(response, context);
        if (Array.isArray(customSuggestions)) {
          suggestions.push(...customSuggestions);
        }
      }
    }

    // Sort by priority and limit
    const sortedSuggestions = this._sortAndLimitSuggestions(suggestions);

    // Add suggestions to response
    for (const suggestion of sortedSuggestions) {
      response.addSuggestion(
        suggestion.action,
        suggestion.description,
        suggestion.priority
      );
    }

    return response;
  }

  /**
   * Get error-specific suggestions
   * @param {EnhancedResponse} response - The response
   * @param {Object} context - Context
   * @returns {Array} - Suggestions
   * @private
   */
  _getErrorSuggestions(response, context) {
    const suggestions = [];
    const errorData = response.data;

    // Check for specific error types
    if (errorData?.error?.includes('permission') || errorData?.error?.includes('denied')) {
      suggestions.push(...(this.suggestionRules.get('error.permission') || []));
    }

    if (errorData?.error?.includes('not found')) {
      suggestions.push({
        action: 'verify-path',
        description: 'Verify the file or resource path',
        priority: 'high'
      });
    }

    if (errorData?.error?.includes('network') || errorData?.error?.includes('timeout')) {
      suggestions.push({
        action: 'retry',
        description: 'Retry the operation',
        priority: 'medium'
      });
    }

    // Generic error suggestions
    suggestions.push({
      action: 'check-logs',
      description: 'Check detailed logs for more information',
      priority: 'medium'
    });

    return suggestions;
  }

  /**
   * Get warning-specific suggestions
   * @param {EnhancedResponse} response - The response
   * @param {Object} context - Context
   * @returns {Array} - Suggestions
   * @private
   */
  _getWarningSuggestions(response, context) {
    const suggestions = [];

    // Check for high-risk warnings
    const highestRisk = response.getHighestRiskLevel();
    if (highestRisk === 'high' || highestRisk === 'critical') {
      suggestions.push({
        action: 'review-risks',
        description: 'Review identified risks before proceeding',
        priority: 'high'
      });
    }

    return suggestions;
  }

  /**
   * Get success-specific suggestions
   * @param {EnhancedResponse} response - The response
   * @param {Object} context - Context
   * @returns {Array} - Suggestions
   * @private
   */
  _getSuccessSuggestions(response, context) {
    const suggestions = [];

    // Check for operation-specific suggestions
    if (context.operation) {
      const rules = this.suggestionRules.get(context.operation);
      if (rules) {
        suggestions.push(...rules);
      }
    }

    // Git-specific success suggestions
    if (context.operation?.startsWith('git.')) {
      if (response.data?.branch && !context.operation.includes('push')) {
        suggestions.push({
          action: 'push',
          description: `Push branch '${response.data.branch}' to remote`,
          priority: 'medium'
        });
      }
    }

    return suggestions;
  }

  /**
   * Get context-based suggestions
   * @param {Object} context - Context
   * @returns {Array} - Suggestions
   * @private
   */
  _getContextSuggestions(context) {
    const suggestions = [];

    // Session-based suggestions
    if (context.session?.data?.gitContext) {
      const gitContext = context.session.data.gitContext;
      
      if (gitContext.hasUncommittedChanges) {
        suggestions.push({
          action: 'commit',
          description: 'Commit uncommitted changes',
          priority: 'high'
        });
      }

      if (gitContext.behindRemote > 0) {
        suggestions.push({
          action: 'pull',
          description: `Pull ${gitContext.behindRemote} commits from remote`,
          priority: 'medium'
        });
      }

      if (gitContext.aheadRemote > 0) {
        suggestions.push({
          action: 'push',
          description: `Push ${gitContext.aheadRemote} commits to remote`,
          priority: 'medium'
        });
      }
    }

    // Add documentation links if enabled
    if (this.config.includeDocLinks && context.operation) {
      suggestions.push({
        action: 'view-docs',
        description: `View documentation for ${context.operation}`,
        priority: 'low',
        metadata: {
          url: this._getDocUrl(context.operation)
        }
      });
    }

    return suggestions;
  }

  /**
   * Sort and limit suggestions
   * @param {Array} suggestions - Raw suggestions
   * @returns {Array} - Sorted and limited suggestions
   * @private
   */
  _sortAndLimitSuggestions(suggestions) {
    // Define priority order
    const priorityOrder = {
      'critical': 0,
      'high': 1,
      'medium': 2,
      'low': 3
    };

    // Remove duplicates
    const unique = suggestions.filter((suggestion, index, self) =>
      index === self.findIndex(s => s.action === suggestion.action)
    );

    // Sort by priority
    unique.sort((a, b) => {
      const aPriority = priorityOrder[a.priority] ?? 99;
      const bPriority = priorityOrder[b.priority] ?? 99;
      return aPriority - bPriority;
    });

    // Limit to max suggestions
    return unique.slice(0, this.config.maxSuggestions);
  }

  /**
   * Get documentation URL for an operation
   * @param {string} operation - Operation name
   * @returns {string} - Documentation URL
   * @private
   */
  _getDocUrl(operation) {
    // This would map to actual documentation URLs
    const baseUrl = 'https://docs.example.com/';
    const category = operation.split('.')[0];
    const action = operation.split('.').slice(1).join('/');
    
    return `${baseUrl}${category}/${action}`;
  }
}
/**
 * Enhancer System Exports
 * Central export point for all enhancer components
 */

// Base components
export { BaseEnhancer, EnhancerPriority } from './base-enhancer.js';
export { EnhancerPipeline } from './enhancer-pipeline.js';
export { EnhancerRegistry, defaultRegistry } from './enhancer-registry.js';

// Core enhancers
export { MetadataEnhancer } from './core/metadata-enhancer.js';
export { SuggestionsEnhancer } from './core/suggestions-enhancer.js';
export { RiskAssessmentEnhancer } from './core/risk-assessment-enhancer.js';
export { TeamActivityEnhancer } from './core/team-activity-enhancer.js';

/**
 * Initialize default enhancers in the registry
 * @param {EnhancerRegistry} registry - Registry to initialize
 * @returns {Promise<EnhancerRegistry>} - Initialized registry
 */
export async function initializeDefaultEnhancers(registry = defaultRegistry) {
  // Register core enhancers
  registry
    .register(MetadataEnhancer, { 
      enabled: true,
      config: {
        includeSystemInfo: true,
        includeProcessInfo: false,
        includeTimestamps: true
      }
    })
    .register(SuggestionsEnhancer, { 
      enabled: true,
      config: {
        maxSuggestions: 5,
        includeDocLinks: true,
        contextAnalysis: true
      }
    })
    .register(RiskAssessmentEnhancer, { 
      enabled: true,
      config: {
        evaluateGitRisks: true,
        evaluateFileRisks: true,
        evaluateSecurityRisks: true
      }
    })
    .register(TeamActivityEnhancer, { 
      enabled: true,
      config: {
        includeRecentCommits: true,
        includeActiveBranches: true,
        includeContributors: true,
        maxRecentItems: 5
      }
    });

  // Create default pipeline
  registry.createPipeline('default', {
    parallel: false,
    continueOnError: true,
    timeout: 5000
  });

  return registry;
}

/**
 * Create a custom enhancer pipeline
 * @param {Array<string>} enhancerNames - Names of enhancers to include
 * @param {Object} options - Pipeline options
 * @returns {EnhancerPipeline} - Created pipeline
 */
export function createCustomPipeline(enhancerNames, options = {}) {
  const registry = defaultRegistry;
  const pipelineName = options.name || `custom-${Date.now()}`;
  
  return registry.createPipeline(pipelineName, {
    enhancers: enhancerNames,
    ...options
  });
}

/**
 * Quick helper to enhance a response with default pipeline
 * @param {EnhancedResponse} response - Response to enhance
 * @param {Object} context - Enhancement context
 * @returns {Promise<EnhancedResponse>} - Enhanced response
 */
export async function enhance(response, context = {}) {
  const pipeline = defaultRegistry.getPipeline('default');
  if (!pipeline) {
    throw new Error('Default pipeline not initialized. Call initializeDefaultEnhancers() first.');
  }
  return pipeline.process(response, context);
}
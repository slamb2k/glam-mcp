/**
 * Risk Assessment Enhancer
 * Evaluates and adds risk information to responses
 */

import { BaseEnhancer, EnhancerPriority } from '../base-enhancer.js';
import { RiskLevel } from '../../core/enhanced-response.js';

/**
 * Enhancer that performs risk assessment on operations
 */
export class RiskAssessmentEnhancer extends BaseEnhancer {
  constructor(options = {}) {
    super({
      name: 'RiskAssessmentEnhancer',
      priority: EnhancerPriority.HIGH,
      description: 'Evaluates and adds risk information to responses',
      version: '1.0.0',
      tags: ['risk', 'safety', 'assessment'],
      dependencies: ['MetadataEnhancer'], // Depends on metadata for context
      config: {
        evaluateGitRisks: options.evaluateGitRisks !== false,
        evaluateFileRisks: options.evaluateFileRisks !== false,
        evaluateSecurityRisks: options.evaluateSecurityRisks !== false,
        customRiskEvaluators: options.customRiskEvaluators || [],
        ...options
      }
    });

    // Risk patterns
    this.riskPatterns = {
      git: {
        forcePush: { level: RiskLevel.HIGH, pattern: /force|--force|-f/ },
        deleteBranch: { level: RiskLevel.MEDIUM, pattern: /delete.*branch|branch.*delete/ },
        resetHard: { level: RiskLevel.HIGH, pattern: /reset.*--hard/ },
        rebase: { level: RiskLevel.MEDIUM, pattern: /rebase/ },
        mainBranch: { level: RiskLevel.HIGH, pattern: /main|master|production/ }
      },
      file: {
        systemFile: { level: RiskLevel.CRITICAL, pattern: /^\/etc\/|^\/sys\/|^\/proc\// },
        hiddenFile: { level: RiskLevel.LOW, pattern: /^\./ },
        largeFile: { level: RiskLevel.MEDIUM, threshold: 50 * 1024 * 1024 }, // 50MB
        executable: { level: RiskLevel.MEDIUM, pattern: /\.(exe|sh|bat|cmd)$/ }
      },
      security: {
        credentials: { level: RiskLevel.CRITICAL, pattern: /password|secret|key|token|credential/i },
        personalData: { level: RiskLevel.HIGH, pattern: /ssn|social.security|credit.card/i },
        apiEndpoint: { level: RiskLevel.MEDIUM, pattern: /api\..*\.com|localhost:\d+/i }
      }
    };
  }

  /**
   * Enhance response with risk assessment
   * @param {EnhancedResponse} response - The response to enhance
   * @param {Object} context - Additional context
   * @returns {Promise<EnhancedResponse>} - Enhanced response
   * @protected
   */
  async _doEnhance(response, context) {
    const risks = [];

    // Evaluate Git-related risks
    if (this.config.evaluateGitRisks && context.operation?.startsWith('git.')) {
      risks.push(...this._evaluateGitRisks(response, context));
    }

    // Evaluate file-related risks
    if (this.config.evaluateFileRisks && context.files) {
      risks.push(...this._evaluateFileRisks(context.files));
    }

    // Evaluate security risks
    if (this.config.evaluateSecurityRisks) {
      risks.push(...this._evaluateSecurityRisks(response, context));
    }

    // Evaluate custom risks
    for (const evaluator of this.config.customRiskEvaluators) {
      if (typeof evaluator === 'function') {
        const customRisks = await evaluator(response, context);
        if (Array.isArray(customRisks)) {
          risks.push(...customRisks);
        }
      }
    }

    // Evaluate contextual risks
    risks.push(...this._evaluateContextualRisks(response, context));

    // Add unique risks to response
    const addedRisks = new Set();
    for (const risk of risks) {
      const riskKey = `${risk.level}-${risk.description}`;
      if (!addedRisks.has(riskKey)) {
        response.addRisk(risk.level, risk.description, risk.mitigation);
        addedRisks.add(riskKey);
      }
    }

    return response;
  }

  /**
   * Evaluate Git operation risks
   * @param {EnhancedResponse} response - The response
   * @param {Object} context - Context
   * @returns {Array} - Identified risks
   * @private
   */
  _evaluateGitRisks(response, context) {
    const risks = [];
    const operation = context.operation || '';
    const command = context.command || '';

    // Check for force push
    if (this.riskPatterns.git.forcePush.pattern.test(command)) {
      risks.push({
        level: RiskLevel.HIGH,
        description: 'Force push can overwrite remote history',
        mitigation: 'Ensure all team members are aware before force pushing'
      });
    }

    // Check for main branch operations
    const branch = context.branch || response.data?.branch || '';
    if (this.riskPatterns.git.mainBranch.pattern.test(branch)) {
      if (operation.includes('delete') || operation.includes('reset')) {
        risks.push({
          level: RiskLevel.CRITICAL,
          description: `Dangerous operation on protected branch: ${branch}`,
          mitigation: 'Consider using a feature branch instead'
        });
      } else if (operation.includes('commit') || operation.includes('push')) {
        risks.push({
          level: RiskLevel.MEDIUM,
          description: `Direct commit to protected branch: ${branch}`,
          mitigation: 'Consider using pull requests for code review'
        });
      }
    }

    // Check for uncommitted changes
    if (context.session?.data?.gitContext?.hasUncommittedChanges) {
      if (operation.includes('checkout') || operation.includes('pull')) {
        risks.push({
          level: RiskLevel.MEDIUM,
          description: 'Uncommitted changes may be lost',
          mitigation: 'Commit or stash changes before proceeding'
        });
      }
    }

    // Check for rebase operations
    if (this.riskPatterns.git.rebase.pattern.test(operation)) {
      risks.push({
        level: RiskLevel.MEDIUM,
        description: 'Rebase rewrites commit history',
        mitigation: 'Ensure you understand the implications of rebasing'
      });
    }

    return risks;
  }

  /**
   * Evaluate file-related risks
   * @param {Array} files - Files being operated on
   * @returns {Array} - Identified risks
   * @private
   */
  _evaluateFileRisks(files) {
    const risks = [];

    for (const file of files) {
      // Check for system files
      if (this.riskPatterns.file.systemFile.pattern.test(file.path)) {
        risks.push({
          level: RiskLevel.CRITICAL,
          description: `Modifying system file: ${file.path}`,
          mitigation: 'Ensure you have proper permissions and backups'
        });
      }

      // Check for large files
      if (file.size && file.size > this.riskPatterns.file.largeFile.threshold) {
        risks.push({
          level: RiskLevel.MEDIUM,
          description: `Large file detected: ${file.path} (${Math.round(file.size / 1024 / 1024)}MB)`,
          mitigation: 'Consider using Git LFS for large files'
        });
      }

      // Check for executables
      if (this.riskPatterns.file.executable.pattern.test(file.path)) {
        risks.push({
          level: RiskLevel.MEDIUM,
          description: `Executable file: ${file.path}`,
          mitigation: 'Verify the source and scan for security issues'
        });
      }
    }

    return risks;
  }

  /**
   * Evaluate security-related risks
   * @param {EnhancedResponse} response - The response
   * @param {Object} context - Context
   * @returns {Array} - Identified risks
   * @private
   */
  _evaluateSecurityRisks(response, context) {
    const risks = [];
    
    // Check response data for sensitive information
    const dataStr = JSON.stringify(response.data || {});
    
    if (this.riskPatterns.security.credentials.pattern.test(dataStr)) {
      risks.push({
        level: RiskLevel.CRITICAL,
        description: 'Potential credentials detected in response',
        mitigation: 'Remove sensitive information before sharing or logging'
      });
    }

    if (this.riskPatterns.security.personalData.pattern.test(dataStr)) {
      risks.push({
        level: RiskLevel.HIGH,
        description: 'Potential personal data detected',
        mitigation: 'Ensure compliance with data protection regulations'
      });
    }

    // Check for API endpoints
    if (this.riskPatterns.security.apiEndpoint.pattern.test(dataStr)) {
      risks.push({
        level: RiskLevel.LOW,
        description: 'API endpoints detected in response',
        mitigation: 'Verify endpoints are intended to be exposed'
      });
    }

    return risks;
  }

  /**
   * Evaluate contextual risks based on current state
   * @param {EnhancedResponse} response - The response
   * @param {Object} context - Context
   * @returns {Array} - Identified risks
   * @private
   */
  _evaluateContextualRisks(response, context) {
    const risks = [];

    // Check for error patterns that indicate risks
    if (response.hasErrors()) {
      const error = response.data?.error || response.message;
      
      if (error.includes('permission denied')) {
        risks.push({
          level: RiskLevel.MEDIUM,
          description: 'Permission issues detected',
          mitigation: 'Verify user permissions and authentication'
        });
      }

      if (error.includes('conflict')) {
        risks.push({
          level: RiskLevel.MEDIUM,
          description: 'Conflicts detected in operation',
          mitigation: 'Resolve conflicts before proceeding'
        });
      }
    }

    // Check session context for risks
    if (context.session?.data) {
      const sessionData = context.session.data;
      
      // Multiple failed operations
      const recentOps = sessionData.recentOperations || [];
      const recentFailures = recentOps.filter(op => 
        op.type === 'error' && 
        (Date.now() - new Date(op.timestamp).getTime()) < 300000 // Last 5 minutes
      );
      
      if (recentFailures.length > 3) {
        risks.push({
          level: RiskLevel.MEDIUM,
          description: 'Multiple recent failures detected',
          mitigation: 'Review recent operations for systemic issues'
        });
      }
    }

    // Check for production environment
    if (context.environment === 'production' || context.branch === 'production') {
      risks.push({
        level: RiskLevel.HIGH,
        description: 'Operating in production environment',
        mitigation: 'Exercise extra caution with all operations'
      });
    }

    return risks;
  }
}
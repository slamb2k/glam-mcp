import chalk from 'chalk';
import predictiveEngine from '../predictive-engine.js';
import contextEngine from '../context-engine.js';
import stateManager from '../state-manager.js';
import logger from '../../utils/logger.js';

/**
 * SLAM Suggest - Predictive Suggestions Tool
 * Provides intelligent suggestions based on context and learning
 */
export class SlamSuggestTool {
  constructor() {
    this.suggestionTypes = {
      command: '🔧',
      workflow: '🔄',
      file: '📄',
      completion: '✨'
    };
  }

  /**
   * Get suggestions for user input
   */
  async getSuggestions(input = '', options = {}) {
    try {
      // Get current context
      const context = await contextEngine.getInferredContext();
      const snapshot = contextEngine.getSnapshot();
      
      // Get predictions
      const predictions = predictiveEngine.predict(input);
      
      // Enhance with additional suggestions
      const enhanced = await this.enhanceSuggestions(predictions, {
        input,
        context,
        snapshot,
        options
      });
      
      // Format result
      const result = {
        success: true,
        input,
        suggestions: enhanced,
        context: {
          workflow: context.workflow?.type,
          branch: snapshot.git?.currentBranch,
          confidence: predictiveEngine.getConfidence()
        },
        stats: predictiveEngine.getStatistics()
      };
      
      // Track usage
      contextEngine.trackUserActivity({
        type: 'suggestions_requested',
        input,
        count: enhanced.length
      });
      
      return result;
    } catch (error) {
      logger.error('Error getting suggestions:', error);
      throw error;
    }
  }

  /**
   * Enhance suggestions with additional context
   */
  async enhanceSuggestions(predictions, { input, context, snapshot, options }) {
    const enhanced = [...predictions];
    
    // Add context-based suggestions
    if (context.workflow) {
      const workflowSuggestions = await this.getWorkflowSuggestions(context.workflow);
      enhanced.push(...workflowSuggestions);
    }
    
    // Add git-based suggestions
    if (snapshot.git) {
      const gitSuggestions = this.getGitSuggestions(snapshot.git, input);
      enhanced.push(...gitSuggestions);
    }
    
    // Add smart suggestions based on patterns
    const smartSuggestions = await this.getSmartSuggestions(input, context);
    enhanced.push(...smartSuggestions);
    
    // Sort and deduplicate
    const unique = this.deduplicateSuggestions(enhanced);
    unique.sort((a, b) => b.confidence - a.confidence);
    
    // Apply filters
    let filtered = unique;
    
    if (options.type) {
      filtered = filtered.filter(s => s.type === options.type);
    }
    
    if (options.minConfidence) {
      filtered = filtered.filter(s => s.confidence >= options.minConfidence);
    }
    
    // Limit results
    const limit = options.limit || 10;
    return filtered.slice(0, limit);
  }

  /**
   * Get workflow-specific suggestions
   */
  async getWorkflowSuggestions(workflow) {
    const suggestions = [];
    
    switch (workflow.type) {
      case 'featureDevelopment':
        suggestions.push(
          {
            type: 'command',
            value: 'slam develop --type=feature',
            confidence: 0.8,
            description: 'Start feature development workflow',
            metadata: { workflow: true }
          },
          {
            type: 'command',
            value: 'npm test',
            confidence: 0.7,
            description: 'Run tests before committing',
            metadata: { workflow: true }
          }
        );
        break;
        
      case 'bugFixing':
        suggestions.push(
          {
            type: 'command',
            value: 'slam develop --type=bugfix',
            confidence: 0.8,
            description: 'Start bugfix workflow',
            metadata: { workflow: true }
          },
          {
            type: 'command',
            value: 'git log --oneline -10',
            confidence: 0.6,
            description: 'Review recent commits',
            metadata: { workflow: true }
          }
        );
        break;
        
      case 'reviewing':
        suggestions.push(
          {
            type: 'command',
            value: 'git diff --cached',
            confidence: 0.7,
            description: 'Review staged changes',
            metadata: { workflow: true }
          },
          {
            type: 'command',
            value: 'slam commit --analyze',
            confidence: 0.8,
            description: 'Analyze commit history',
            metadata: { workflow: true }
          }
        );
        break;
    }
    
    return suggestions;
  }

  /**
   * Get git-based suggestions
   */
  getGitSuggestions(gitState, input) {
    const suggestions = [];
    
    // Suggest based on git status
    if (gitState.hasUncommittedChanges) {
      suggestions.push({
        type: 'command',
        value: 'slam commit',
        confidence: 0.9,
        description: 'Commit your changes with AI-generated message',
        metadata: { git: true }
      });
    }
    
    // Branch-based suggestions
    if (gitState.currentBranch && gitState.currentBranch !== gitState.mainBranch) {
      suggestions.push({
        type: 'command',
        value: 'git push -u origin ' + gitState.currentBranch,
        confidence: 0.7,
        description: 'Push current branch to remote',
        metadata: { git: true }
      });
      
      if (!input || 'pr'.includes(input.toLowerCase())) {
        suggestions.push({
          type: 'command',
          value: 'gh pr create',
          confidence: 0.6,
          description: 'Create pull request',
          metadata: { git: true }
        });
      }
    }
    
    // Stash suggestions
    if (gitState.stashCount > 0) {
      suggestions.push({
        type: 'command',
        value: 'git stash pop',
        confidence: 0.5,
        description: `Apply stashed changes (${gitState.stashCount} stashes)`,
        metadata: { git: true }
      });
    }
    
    return suggestions;
  }

  /**
   * Get smart suggestions based on patterns
   */
  async getSmartSuggestions(input, context) {
    const suggestions = [];
    const hour = new Date().getHours();
    
    // Time-based suggestions
    if (hour >= 9 && hour < 10 && (!input || 'standup'.includes(input))) {
      suggestions.push({
        type: 'workflow',
        value: 'Show yesterday\'s commits',
        confidence: 0.6,
        description: 'Review work for standup',
        metadata: { smart: true, command: 'git log --since=yesterday --author=$(git config user.name) --oneline' }
      });
    }
    
    // End of day suggestions
    if (hour >= 17 && hour < 19) {
      suggestions.push({
        type: 'workflow',
        value: 'slam commit && git push',
        confidence: 0.7,
        description: 'Commit and push before ending the day',
        metadata: { smart: true }
      });
    }
    
    // Pattern-based suggestions
    if (context.recentActivity) {
      const recentTests = context.recentActivity.filter(a => 
        a.type === 'command' && a.value?.includes('test')
      );
      
      if (recentTests.length > 2) {
        suggestions.push({
          type: 'command',
          value: 'npm run test:watch',
          confidence: 0.7,
          description: 'Run tests in watch mode',
          metadata: { smart: true, pattern: 'frequent-testing' }
        });
      }
    }
    
    // Input-based smart suggestions
    if (input) {
      const lower = input.toLowerCase();
      
      if (lower.includes('deploy') || lower.includes('ship')) {
        suggestions.push({
          type: 'command',
          value: 'slam ship --environment=staging',
          confidence: 0.8,
          description: 'Deploy to staging environment',
          metadata: { smart: true }
        });
      }
      
      if (lower.includes('fix') || lower.includes('bug')) {
        suggestions.push({
          type: 'workflow',
          value: 'slam develop --type=bugfix',
          confidence: 0.8,
          description: 'Start bugfix workflow',
          metadata: { smart: true }
        });
      }
      
      if (lower.includes('clean') || lower.includes('tidy')) {
        suggestions.push({
          type: 'command',
          value: 'npm run lint --fix',
          confidence: 0.7,
          description: 'Auto-fix linting issues',
          metadata: { smart: true }
        });
      }
    }
    
    return suggestions;
  }

  /**
   * Deduplicate suggestions
   */
  deduplicateSuggestions(suggestions) {
    const seen = new Map();
    
    return suggestions.filter(suggestion => {
      const key = `${suggestion.type}:${suggestion.value}`;
      
      if (seen.has(key)) {
        // Keep the one with higher confidence
        const existing = seen.get(key);
        if (suggestion.confidence > existing.confidence) {
          seen.set(key, suggestion);
          return true;
        }
        return false;
      }
      
      seen.set(key, suggestion);
      return true;
    });
  }

  /**
   * Learn from user selection
   */
  async learnFromSelection(suggestion, result = {}) {
    try {
      await predictiveEngine.learn({
        type: suggestion.type,
        value: suggestion.value,
        context: {
          ...contextEngine.getSnapshot(),
          suggestion: true,
          accepted: result.accepted !== false
        },
        result: result.output || result,
        description: suggestion.description
      });
      
      // Track learning
      await stateManager.logAudit({
        action: 'suggestion_learned',
        resource: 'slam_suggest',
        details: {
          type: suggestion.type,
          value: suggestion.value,
          accepted: result.accepted !== false
        }
      });
      
      return {
        success: true,
        message: 'Learning recorded'
      };
    } catch (error) {
      logger.error('Failed to learn from selection:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Get learning statistics
   */
  async getStatistics() {
    const stats = predictiveEngine.getStatistics();
    
    return {
      confidence: predictiveEngine.getConfidence(),
      history: stats.historySize,
      patterns: stats.patterns,
      models: stats.modelStats
    };
  }

  /**
   * Reset learning data
   */
  async resetLearning() {
    try {
      await predictiveEngine.reset();
      
      return {
        success: true,
        message: 'Learning data reset successfully'
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Format suggestions for display
   */
  formatSuggestions(result) {
    const lines = [];
    
    // Header
    lines.push(chalk.bold.blue('💡 Intelligent Suggestions'));
    
    if (result.input) {
      lines.push(chalk.dim(`Input: "${result.input}"`));
    }
    
    lines.push('');
    
    // Suggestions
    if (result.suggestions.length === 0) {
      lines.push(chalk.yellow('No suggestions available. Keep working to train the system!'));
    } else {
      result.suggestions.forEach((suggestion, index) => {
        const icon = this.suggestionTypes[suggestion.type] || '•';
        const confidence = Math.round(suggestion.confidence * 100);
        
        lines.push(`${chalk.cyan(`${index + 1}.`)} ${icon} ${chalk.white(suggestion.value)}`);
        lines.push(`   ${chalk.dim(suggestion.description)}`);
        lines.push(`   ${chalk.gray(`Confidence: ${confidence}%`)}`);
        
        if (suggestion.metadata?.command) {
          lines.push(`   ${chalk.gray(`Command: ${suggestion.metadata.command}`)}`);
        }
        
        lines.push('');
      });
    }
    
    // Context info
    lines.push(chalk.dim('Context:'));
    lines.push(`  ${chalk.gray('•')} Workflow: ${chalk.cyan(result.context.workflow || 'none')}`);
    lines.push(`  ${chalk.gray('•')} Branch: ${chalk.cyan(result.context.branch || 'none')}`);
    lines.push(`  ${chalk.gray('•')} System confidence: ${chalk.cyan(Math.round(result.context.confidence * 100) + '%')}`);
    
    // Tips
    lines.push('');
    lines.push(chalk.dim('Tips:'));
    lines.push(`  ${chalk.gray('•')} The system learns from your choices`);
    lines.push(`  ${chalk.gray('•')} Use "slam suggest --stats" to see learning statistics`);
    lines.push(`  ${chalk.gray('•')} Suggestions improve as you use the system more`);
    
    return lines.join('\n');
  }

  /**
   * Format statistics for display
   */
  formatStatistics(stats) {
    const lines = [];
    
    lines.push(chalk.bold.blue('📊 Predictive System Statistics'));
    lines.push('');
    
    // Overall confidence
    lines.push(chalk.white('System Confidence: ') + 
      chalk.cyan(`${Math.round(stats.confidence * 100)}%`));
    lines.push('');
    
    // History size
    lines.push(chalk.white('Learning History:'));
    Object.entries(stats.history).forEach(([type, count]) => {
      lines.push(`  ${chalk.gray('•')} ${type}: ${chalk.cyan(count)} items`);
    });
    lines.push('');
    
    // Patterns
    lines.push(chalk.white('Detected Patterns:'));
    const sortedPatterns = Object.entries(stats.patterns)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10);
    
    sortedPatterns.forEach(([pattern, count]) => {
      lines.push(`  ${chalk.gray('•')} ${pattern}: ${chalk.cyan(count)} occurrences`);
    });
    
    if (Object.keys(stats.patterns).length === 0) {
      lines.push(chalk.gray('  No patterns detected yet'));
    }
    lines.push('');
    
    // Model statistics
    lines.push(chalk.white('Model Performance:'));
    Object.entries(stats.models).forEach(([model, data]) => {
      lines.push(`  ${chalk.yellow(model)}:`);
      lines.push(`    Weight: ${chalk.cyan((data.weight * 100).toFixed(0) + '%')}`);
      lines.push(`    Data points: ${chalk.cyan(data.commands || data.workflows || data.files || data.completions || 0)}`);
    });
    
    return lines.join('\n');
  }
}

// Export singleton instance
const slamSuggest = new SlamSuggestTool();

/**
 * Main slam_suggest function
 */
export async function slam_suggest(input = '', options = {}) {
  // Handle special commands
  if (options.stats || input === '--stats') {
    const stats = await slamSuggest.getStatistics();
    return {
      success: true,
      stats,
      output: slamSuggest.formatStatistics(stats)
    };
  }
  
  if (options.reset || input === '--reset') {
    const result = await slamSuggest.resetLearning();
    result.output = result.success ? 
      chalk.green('✓ Learning data reset successfully') :
      chalk.red(`✗ Failed to reset: ${result.error}`);
    return result;
  }
  
  if (options.learn) {
    return await slamSuggest.learnFromSelection(options.learn, options.result);
  }
  
  // Get suggestions
  const result = await slamSuggest.getSuggestions(input, options);
  result.output = slamSuggest.formatSuggestions(result);
  
  return result;
}

export default slamSuggest;
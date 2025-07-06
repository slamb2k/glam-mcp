import chalk from 'chalk';
import logger from '../utils/logger.js';
import { slam_tool } from '../mcp/tools/slam_mcp.js';
import { slam_context } from '../mcp/tools/slam_context.js';
import { slam_suggest } from '../mcp/tools/slam_suggest.js';
import { slam_develop } from '../mcp/tools/slam_develop.js';
import { slam_ship } from '../mcp/tools/slam_ship.js';
import { slam_commit } from '../mcp/tools/slam_commit.js';
import { slam_collaborate } from '../mcp/tools/slam_collaborate.js';
import { slam_learn } from '../mcp/tools/slam_learn.js';
import { slam_recover } from '../mcp/tools/slam_recover.js';

/**
 * Compatibility Layer
 * Provides backward compatibility for existing CLI commands
 */
export class CompatibilityLayer {
  constructor() {
    // Command mapping from old to new
    this.commandMap = new Map([
      // Old CLI patterns -> New MCP tools
      ['status', { tool: 'slam_context', action: 'status', args: {} }],
      ['context', { tool: 'slam_context', action: 'status', args: {} }],
      ['suggest', { tool: 'slam_suggest', action: 'get', args: {} }],
      ['suggestions', { tool: 'slam_suggest', action: 'get', args: {} }],
      ['dev', { tool: 'slam_develop', action: 'start', args: {} }],
      ['develop', { tool: 'slam_develop', action: 'start', args: {} }],
      ['ship', { tool: 'slam_ship', action: 'deploy', args: {} }],
      ['deploy', { tool: 'slam_ship', action: 'deploy', args: {} }],
      ['commit', { tool: 'slam_commit', action: 'generate', args: {} }],
      ['team', { tool: 'slam_collaborate', action: 'status', args: {} }],
      ['collaborate', { tool: 'slam_collaborate', action: 'status', args: {} }],
      ['learn', { tool: 'slam_learn', action: 'profile', args: {} }],
      ['profile', { tool: 'slam_learn', action: 'profile', args: {} }],
      ['recover', { tool: 'slam_recover', action: 'history', args: {} }],
      ['undo', { tool: 'slam_recover', action: 'undo', args: { count: 1 } }],
      ['history', { tool: 'slam_recover', action: 'history', args: {} }],
      
      // Legacy patterns with arguments
      ['git status', { tool: 'slam_context', action: 'status', args: { git: true } }],
      ['git commit', { tool: 'slam_commit', action: 'generate', args: {} }],
      ['npm run', { tool: 'slam_develop', action: 'run', args: {} }],
      ['yarn run', { tool: 'slam_develop', action: 'run', args: {} }],
      
      // Common developer commands
      ['ls', { tool: 'slam_context', action: 'status', args: { project: true } }],
      ['pwd', { tool: 'slam_context', action: 'status', args: { system: true } }],
      ['whoami', { tool: 'slam_learn', action: 'profile', args: {} }],
      
      // Help commands
      ['help', { tool: 'slam', action: 'help', args: {} }],
      ['--help', { tool: 'slam', action: 'help', args: {} }],
      ['-h', { tool: 'slam', action: 'help', args: {} }]
    ]);

    // Deprecated commands with alternatives
    this.deprecatedCommands = new Map([
      ['old-status', { 
        replacement: 'slam_context', 
        message: 'Use "slam_context" for comprehensive project status'
      }],
      ['old-commit', { 
        replacement: 'slam_commit', 
        message: 'Use "slam_commit" for AI-powered commit messages'
      }],
      ['old-suggest', { 
        replacement: 'slam_suggest', 
        message: 'Use "slam_suggest" for intelligent suggestions'
      }]
    ]);

    // Command aliases
    this.aliases = new Map([
      ['s', 'slam_context'],
      ['c', 'slam_commit'],
      ['d', 'slam_develop'],
      ['sh', 'slam_ship'],
      ['sg', 'slam_suggest'],
      ['cl', 'slam_collaborate'],
      ['l', 'slam_learn'],
      ['r', 'slam_recover']
    ]);

    // Tool handlers
    this.toolHandlers = new Map([
      ['slam', this.handleSlamTool.bind(this)],
      ['slam_context', this.handleContextTool.bind(this)],
      ['slam_suggest', this.handleSuggestTool.bind(this)],
      ['slam_develop', this.handleDevelopTool.bind(this)],
      ['slam_ship', this.handleShipTool.bind(this)],
      ['slam_commit', this.handleCommitTool.bind(this)],
      ['slam_collaborate', this.handleCollaborateTool.bind(this)],
      ['slam_learn', this.handleLearnTool.bind(this)],
      ['slam_recover', this.handleRecoverTool.bind(this)]
    ]);

    // Usage statistics
    this.usageStats = {
      oldCommands: 0,
      newCommands: 0,
      deprecatedWarnings: 0,
      lastCleanup: Date.now()
    };
  }

  /**
   * Process command and route to appropriate handler
   */
  async processCommand(input, options = {}) {
    try {
      const { showWarnings = true, logUsage = true } = options;
      
      // Parse command input
      const parsed = this.parseCommand(input);
      
      // Check for deprecated commands
      if (this.deprecatedCommands.has(parsed.command)) {
        const deprecated = this.deprecatedCommands.get(parsed.command);
        
        if (showWarnings) {
          console.warn(chalk.yellow(`⚠️  Command "${parsed.command}" is deprecated. ${deprecated.message}`));
        }
        
        this.usageStats.deprecatedWarnings++;
        
        if (logUsage) {
          logger.warn(`Deprecated command used: ${parsed.command}`);
        }
        
        return {
          success: false,
          deprecated: true,
          message: deprecated.message,
          replacement: deprecated.replacement
        };
      }
      
      // Resolve aliases
      const resolvedCommand = this.resolveAlias(parsed.command);
      
      // Check command mapping
      let mapping = this.commandMap.get(resolvedCommand) || this.commandMap.get(input.trim());
      
      if (!mapping) {
        // Try to infer from context
        mapping = await this.inferCommand(parsed);
      }
      
      if (!mapping) {
        // Default to slam tool
        mapping = { tool: 'slam', action: 'execute', args: { command: input } };
      }
      
      // Merge parsed arguments with mapping
      const finalArgs = { ...mapping.args, ...parsed.args };
      
      // Route to appropriate handler
      const handler = this.toolHandlers.get(mapping.tool);
      if (!handler) {
        throw new Error(`No handler found for tool: ${mapping.tool}`);
      }
      
      // Track usage
      if (logUsage) {
        this.trackUsage(parsed.command, mapping.tool, mapping.action);
      }
      
      // Execute command
      const result = await handler(mapping.action, finalArgs);
      
      // Show migration suggestion for old commands
      if (this.isOldCommand(parsed.command) && showWarnings) {
        this.showMigrationSuggestion(parsed.command, mapping);
      }
      
      return result;
    } catch (error) {
      logger.error('Compatibility layer error:', error);
      return {
        success: false,
        error: error.message,
        command: input
      };
    }
  }

  /**
   * Parse command input
   */
  parseCommand(input) {
    const parts = input.trim().split(/\s+/);
    const command = parts[0];
    const args = {};
    
    // Parse arguments
    for (let i = 1; i < parts.length; i++) {
      const part = parts[i];
      
      if (part.startsWith('--')) {
        const [key, value] = part.substring(2).split('=');
        args[key] = value || true;
      } else if (part.startsWith('-')) {
        args[part.substring(1)] = true;
      } else {
        // Positional argument
        if (!args.positional) args.positional = [];
        args.positional.push(part);
      }
    }
    
    return { command, args };
  }

  /**
   * Resolve command alias
   */
  resolveAlias(command) {
    return this.aliases.get(command) || command;
  }

  /**
   * Infer command from context
   */
  async inferCommand(parsed) {
    const { command, args } = parsed;
    
    // Git-related commands
    if (command === 'git' && args.positional) {
      const gitAction = args.positional[0];
      switch (gitAction) {
        case 'status':
          return { tool: 'slam_context', action: 'status', args: { git: true } };
        case 'commit':
          return { tool: 'slam_commit', action: 'generate', args: {} };
        case 'log':
          return { tool: 'slam_recover', action: 'history', args: {} };
        default:
          return { tool: 'slam_context', action: 'status', args: {} };
      }
    }
    
    // NPM/Yarn commands
    if ((command === 'npm' || command === 'yarn') && args.positional) {
      const action = args.positional[0];
      if (action === 'run') {
        return { tool: 'slam_develop', action: 'run', args: { script: args.positional[1] } };
      }
      return { tool: 'slam_develop', action: 'start', args: {} };
    }
    
    // File system commands
    if (['ls', 'dir', 'tree'].includes(command)) {
      return { tool: 'slam_context', action: 'status', args: { project: true } };
    }
    
    return null;
  }

  /**
   * Handle slam tool
   */
  async handleSlamTool(action, args) {
    return await slam_tool.handler({ action, ...args });
  }

  /**
   * Handle context tool
   */
  async handleContextTool(action, args) {
    return await slam_context(action, args);
  }

  /**
   * Handle suggest tool
   */
  async handleSuggestTool(action, args) {
    return await slam_suggest(action, args);
  }

  /**
   * Handle develop tool
   */
  async handleDevelopTool(action, args) {
    return await slam_develop(action, args);
  }

  /**
   * Handle ship tool
   */
  async handleShipTool(action, args) {
    return await slam_ship(action, args);
  }

  /**
   * Handle commit tool
   */
  async handleCommitTool(action, args) {
    return await slam_commit(action, args);
  }

  /**
   * Handle collaborate tool
   */
  async handleCollaborateTool(action, args) {
    return await slam_collaborate(action, args);
  }

  /**
   * Handle learn tool
   */
  async handleLearnTool(action, args) {
    return await slam_learn(action, args);
  }

  /**
   * Handle recover tool
   */
  async handleRecoverTool(action, args) {
    return await slam_recover(action, args);
  }

  /**
   * Check if command is old/legacy
   */
  isOldCommand(command) {
    const oldPatterns = [
      'git', 'npm', 'yarn', 'ls', 'pwd', 'whoami',
      'status', 'context', 'suggest', 'dev', 'deploy'
    ];
    
    return oldPatterns.includes(command.toLowerCase());
  }

  /**
   * Show migration suggestion
   */
  showMigrationSuggestion(oldCommand, mapping) {
    console.log(chalk.blue(`💡 Consider using "${mapping.tool} ${mapping.action}" instead of "${oldCommand}"`));
  }

  /**
   * Track usage statistics
   */
  trackUsage(command, tool, action) {
    if (this.isOldCommand(command)) {
      this.usageStats.oldCommands++;
    } else {
      this.usageStats.newCommands++;
    }
    
    logger.info(`Command usage: ${command} -> ${tool}:${action}`);
  }

  /**
   * Get usage statistics
   */
  getUsageStats() {
    return {
      ...this.usageStats,
      total: this.usageStats.oldCommands + this.usageStats.newCommands,
      migrationProgress: this.usageStats.newCommands / (this.usageStats.oldCommands + this.usageStats.newCommands) * 100
    };
  }

  /**
   * Add custom command mapping
   */
  addCommandMapping(oldCommand, newMapping) {
    this.commandMap.set(oldCommand, newMapping);
    logger.info(`Added command mapping: ${oldCommand} -> ${newMapping.tool}:${newMapping.action}`);
  }

  /**
   * Remove command mapping
   */
  removeCommandMapping(command) {
    const removed = this.commandMap.delete(command);
    if (removed) {
      logger.info(`Removed command mapping: ${command}`);
    }
    return removed;
  }

  /**
   * Add command alias
   */
  addAlias(alias, command) {
    this.aliases.set(alias, command);
    logger.info(`Added alias: ${alias} -> ${command}`);
  }

  /**
   * Remove alias
   */
  removeAlias(alias) {
    const removed = this.aliases.delete(alias);
    if (removed) {
      logger.info(`Removed alias: ${alias}`);
    }
    return removed;
  }

  /**
   * Mark command as deprecated
   */
  deprecateCommand(command, replacement, message) {
    this.deprecatedCommands.set(command, { replacement, message });
    logger.info(`Deprecated command: ${command} -> ${replacement}`);
  }

  /**
   * Remove deprecation
   */
  undeprecateCommand(command) {
    const removed = this.deprecatedCommands.delete(command);
    if (removed) {
      logger.info(`Removed deprecation: ${command}`);
    }
    return removed;
  }

  /**
   * List all mappings
   */
  listMappings() {
    return {
      commands: Object.fromEntries(this.commandMap),
      aliases: Object.fromEntries(this.aliases),
      deprecated: Object.fromEntries(this.deprecatedCommands)
    };
  }

  /**
   * Generate migration report
   */
  generateMigrationReport() {
    const stats = this.getUsageStats();
    
    return {
      summary: {
        totalCommands: stats.total,
        oldCommands: stats.oldCommands,
        newCommands: stats.newCommands,
        migrationProgress: `${Math.round(stats.migrationProgress)}%`,
        deprecationWarnings: stats.deprecatedWarnings
      },
      recommendations: this.generateRecommendations(),
      mappings: this.listMappings()
    };
  }

  /**
   * Generate migration recommendations
   */
  generateRecommendations() {
    const recommendations = [];
    
    if (this.usageStats.oldCommands > this.usageStats.newCommands) {
      recommendations.push({
        type: 'migration',
        priority: 'high',
        message: 'Consider migrating to new command structure for better performance and features'
      });
    }
    
    if (this.usageStats.deprecatedWarnings > 10) {
      recommendations.push({
        type: 'deprecation',
        priority: 'medium',
        message: 'Multiple deprecated commands used. Review and update scripts.'
      });
    }
    
    return recommendations;
  }

  /**
   * Clean up usage statistics
   */
  cleanupStats() {
    this.usageStats = {
      oldCommands: 0,
      newCommands: 0,
      deprecatedWarnings: 0,
      lastCleanup: Date.now()
    };
  }
}

// Export singleton instance
export default new CompatibilityLayer();
import chalk from 'chalk';
import archy from 'archy';
import fs from 'fs-extra';
import path from 'path';
import yaml from 'js-yaml';
import contextEngine from '../context-engine.js';
import stateManager from '../state-manager.js';
import workflowOrchestrator from '../workflow-orchestrator.js';
import predictiveEngine from '../predictive-engine.js';
import gitHelpersMCP from '../../utils/git-helpers-mcp.js';
import logger from '../../utils/logger.js';

/**
 * SLAM Context - Rich Context Tool
 * Provides comprehensive context about the current project state
 */
export class SlamContextTool {
  constructor() {
    this.exportFormats = ['json', 'yaml', 'markdown', 'tree'];
  }

  /**
   * Get comprehensive context
   */
  async getContext(options = {}) {
    try {
      // Gather context from all sources
      const [
        projectContext,
        gitContext,
        workflowContext,
        activityContext,
        teamContext,
        systemContext
      ] = await Promise.all([
        this.getProjectContext(),
        this.getGitContext(),
        this.getWorkflowContext(),
        this.getActivityContext(),
        this.getTeamContext(),
        this.getSystemContext()
      ]);

      // Build comprehensive context
      const context = {
        timestamp: new Date().toISOString(),
        project: projectContext,
        git: gitContext,
        workflow: workflowContext,
        activity: activityContext,
        team: teamContext,
        system: systemContext
      };

      // Apply filters if requested
      if (options.filter) {
        const filtered = this.filterContext(context, options.filter);
        return {
          success: true,
          context: filtered,
          format: options.format || 'tree'
        };
      }

      // Calculate context diff if requested
      if (options.diff) {
        const diff = await this.calculateContextDiff(context);
        return {
          success: true,
          context,
          diff,
          format: options.format || 'tree'
        };
      }

      return {
        success: true,
        context,
        format: options.format || 'tree'
      };

    } catch (error) {
      logger.error('Error getting context:', error);
      throw error;
    }
  }

  /**
   * Get project context
   */
  async getProjectContext() {
    const projectRoot = process.cwd();
    const context = {
      name: path.basename(projectRoot),
      path: projectRoot,
      structure: {},
      dependencies: {},
      configuration: {}
    };

    try {
      // Get project structure
      context.structure = await this.getProjectStructure(projectRoot);

      // Get dependencies
      if (await fs.pathExists(path.join(projectRoot, 'package.json'))) {
        const packageData = await fs.readJson(path.join(projectRoot, 'package.json'));
        context.dependencies = {
          production: Object.keys(packageData.dependencies || {}),
          development: Object.keys(packageData.devDependencies || {}),
          count: {
            production: Object.keys(packageData.dependencies || {}).length,
            development: Object.keys(packageData.devDependencies || {}).length
          }
        };
        context.scripts = packageData.scripts || {};
      }

      // Get configuration files
      const configFiles = [
        '.env', '.env.local', '.env.production',
        'config.json', 'config.js', 'config.yaml',
        '.eslintrc', '.prettierrc', 'tsconfig.json',
        'webpack.config.js', 'vite.config.js'
      ];

      for (const file of configFiles) {
        if (await fs.pathExists(path.join(projectRoot, file))) {
          context.configuration[file] = true;
        }
      }

    } catch (error) {
      logger.warn('Error getting project context:', error);
    }

    return context;
  }

  /**
   * Get project structure
   */
  async getProjectStructure(rootPath, depth = 3) {
    const structure = {
      directories: [],
      files: [],
      stats: {
        totalFiles: 0,
        totalDirectories: 0,
        fileTypes: {}
      }
    };

    const ignorePaths = [
      'node_modules', '.git', 'dist', 'build', 'coverage',
      '.next', '.nuxt', '.cache', 'tmp', 'temp'
    ];

    const scanDirectory = async (dirPath, currentDepth = 0) => {
      if (currentDepth >= depth) return;

      try {
        const items = await fs.readdir(dirPath);

        for (const item of items) {
          if (ignorePaths.includes(item)) continue;

          const itemPath = path.join(dirPath, item);
          const stat = await fs.stat(itemPath);
          const relativePath = path.relative(rootPath, itemPath);

          if (stat.isDirectory()) {
            structure.directories.push(relativePath);
            structure.stats.totalDirectories++;
            await scanDirectory(itemPath, currentDepth + 1);
          } else {
            structure.files.push(relativePath);
            structure.stats.totalFiles++;

            // Track file types
            const ext = path.extname(item).toLowerCase();
            structure.stats.fileTypes[ext] = (structure.stats.fileTypes[ext] || 0) + 1;
          }
        }
      } catch (error) {
        // Ignore permission errors
      }
    };

    await scanDirectory(rootPath);

    // Sort file types by count
    structure.stats.topFileTypes = Object.entries(structure.stats.fileTypes)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([ext, count]) => ({ extension: ext || 'no-ext', count }));

    return structure;
  }

  /**
   * Get git context
   */
  async getGitContext() {
    try {
      const status = await gitHelpersMCP.getComprehensiveStatus();
      const recentCommits = await gitHelpersMCP.getRecentCommits(5);

      return {
        repository: true,
        branch: status.current,
        mainBranch: status.mainBranch,
        status: status.status,
        branches: {
          local: status.branches.length,
          list: status.branches.slice(0, 10)
        },
        remotes: status.remotes.map(r => ({
          name: r.name,
          url: r.refs.fetch
        })),
        stashes: status.stashes.length,
        tags: status.tags.length,
        divergence: status.divergence,
        recentCommits: recentCommits.map(c => ({
          hash: c.hash.substring(0, 7),
          message: c.message,
          author: c.author,
          date: c.date
        })),
        recommendations: status.recommendations
      };
    } catch (error) {
      return {
        repository: false,
        error: error.message
      };
    }
  }

  /**
   * Get workflow context
   */
  async getWorkflowContext() {
    const inferredContext = await contextEngine.getInferredContext();
    const runningWorkflows = workflowOrchestrator.listRunningWorkflows();
    const snapshot = contextEngine.getSnapshot();

    return {
      current: inferredContext.workflow,
      running: runningWorkflows,
      projectState: inferredContext.projectState,
      recommendations: inferredContext.recommendations,
      patterns: snapshot.patterns || [],
      confidence: inferredContext.confidence
    };
  }

  /**
   * Get activity context
   */
  async getActivityContext() {
    const snapshot = contextEngine.getSnapshot();
    const predictions = predictiveEngine.getCurrentPredictions();
    const stats = predictiveEngine.getStatistics();

    return {
      recentActivity: snapshot.recentActivity?.slice(0, 10) || [],
      currentFile: snapshot.currentFile,
      recentFiles: snapshot.recentFiles?.slice(0, 5) || [],
      predictions: predictions.slice(0, 3).map(p => ({
        type: p.type,
        value: p.value,
        confidence: Math.round(p.confidence * 100)
      })),
      learningStats: {
        confidence: Math.round(stats.confidence * 100),
        dataPoints: stats.historySize.commands + stats.historySize.workflows + stats.historySize.files,
        patterns: Object.keys(stats.patterns).length
      }
    };
  }

  /**
   * Get team context
   */
  async getTeamContext() {
    const context = {
      collaborators: [],
      recentCollaborators: [],
      activeNow: []
    };

    try {
      // Get git collaborators from recent commits
      const commits = await gitHelpersMCP.getRecentCommits(50);
      const collaborators = new Map();

      commits.forEach(commit => {
        const key = `${commit.author}:${commit.email}`;
        if (!collaborators.has(key)) {
          collaborators.set(key, {
            name: commit.author,
            email: commit.email,
            commits: 0,
            lastCommit: commit.date
          });
        }
        collaborators.get(key).commits++;
      });

      context.collaborators = Array.from(collaborators.values())
        .sort((a, b) => b.commits - a.commits);

      // Recent collaborators (last 7 days)
      const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
      context.recentCollaborators = context.collaborators
        .filter(c => new Date(c.lastCommit).getTime() > weekAgo);

    } catch (error) {
      logger.warn('Error getting team context:', error);
    }

    return context;
  }

  /**
   * Get system context
   */
  async getSystemContext() {
    return {
      platform: process.platform,
      nodeVersion: process.version,
      cwd: process.cwd(),
      env: {
        NODE_ENV: process.env.NODE_ENV || 'development',
        CI: process.env.CI || false
      },
      memory: {
        used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
        total: Math.round(process.memoryUsage().heapTotal / 1024 / 1024)
      },
      uptime: Math.round(process.uptime())
    };
  }

  /**
   * Filter context by specified fields
   */
  filterContext(context, filter) {
    const filters = Array.isArray(filter) ? filter : filter.split(',');
    const filtered = {};

    filters.forEach(f => {
      const parts = f.trim().split('.');
      let source = context;
      let target = filtered;

      for (let i = 0; i < parts.length; i++) {
        const key = parts[i];

        if (i === parts.length - 1) {
          if (source && source[key] !== undefined) {
            target[key] = source[key];
          }
        } else {
          if (!source || !source[key]) break;
          source = source[key];
          
          if (!target[key]) {
            target[key] = {};
          }
          target = target[key];
        }
      }
    });

    return filtered;
  }

  /**
   * Calculate context diff
   */
  async calculateContextDiff(currentContext) {
    try {
      // Get previous context
      const previousContext = await stateManager.getState('last_context');
      
      if (!previousContext) {
        // Store current as baseline
        await stateManager.setState('last_context', currentContext);
        return null;
      }

      // Calculate differences
      const diff = {
        timestamp: {
          previous: previousContext.timestamp,
          current: currentContext.timestamp
        },
        changes: []
      };

      // Compare git status
      if (previousContext.git?.branch !== currentContext.git?.branch) {
        diff.changes.push({
          type: 'branch_change',
          from: previousContext.git.branch,
          to: currentContext.git.branch
        });
      }

      // Compare file changes
      const prevFiles = previousContext.git?.status?.files?.length || 0;
      const currFiles = currentContext.git?.status?.files?.length || 0;
      
      if (prevFiles !== currFiles) {
        diff.changes.push({
          type: 'file_changes',
          from: prevFiles,
          to: currFiles,
          delta: currFiles - prevFiles
        });
      }

      // Compare workflow
      if (previousContext.workflow?.current?.type !== currentContext.workflow?.current?.type) {
        diff.changes.push({
          type: 'workflow_change',
          from: previousContext.workflow?.current?.type || 'none',
          to: currentContext.workflow?.current?.type || 'none'
        });
      }

      // Compare activity
      const prevActivity = previousContext.activity?.recentActivity?.length || 0;
      const currActivity = currentContext.activity?.recentActivity?.length || 0;
      
      if (currActivity > prevActivity) {
        const newActivities = currentContext.activity.recentActivity.slice(0, currActivity - prevActivity);
        diff.changes.push({
          type: 'new_activities',
          count: newActivities.length,
          activities: newActivities
        });
      }

      // Store current context
      await stateManager.setState('last_context', currentContext);

      return diff;

    } catch (error) {
      logger.warn('Error calculating context diff:', error);
      return null;
    }
  }

  /**
   * Export context in specified format
   */
  async exportContext(context, format = 'json', outputPath = null) {
    let output;

    switch (format) {
      case 'json':
        output = JSON.stringify(context, null, 2);
        break;

      case 'yaml':
        output = yaml.dump(context, { indent: 2 });
        break;

      case 'markdown':
        output = this.formatAsMarkdown(context);
        break;

      case 'tree':
        output = this.formatAsTree(context);
        break;

      default:
        throw new Error(`Unsupported format: ${format}`);
    }

    if (outputPath) {
      await fs.ensureDir(path.dirname(outputPath));
      await fs.writeFile(outputPath, output);
      return { success: true, path: outputPath };
    }

    return { success: true, output };
  }

  /**
   * Format context as markdown
   */
  formatAsMarkdown(context) {
    const lines = [];

    lines.push('# Project Context Report');
    lines.push(`Generated: ${context.timestamp}`);
    lines.push('');

    // Project section
    lines.push('## Project Information');
    lines.push(`- **Name**: ${context.project.name}`);
    lines.push(`- **Path**: ${context.project.path}`);
    lines.push(`- **Files**: ${context.project.structure.stats.totalFiles}`);
    lines.push(`- **Directories**: ${context.project.structure.stats.totalDirectories}`);
    lines.push('');

    if (context.project.dependencies.count.production > 0) {
      lines.push('### Dependencies');
      lines.push(`- Production: ${context.project.dependencies.count.production}`);
      lines.push(`- Development: ${context.project.dependencies.count.development}`);
      lines.push('');
    }

    // Git section
    if (context.git.repository) {
      lines.push('## Git Status');
      lines.push(`- **Branch**: ${context.git.branch}`);
      lines.push(`- **Status**: ${context.git.status.clean ? 'Clean' : `${context.git.status.files.length} files changed`}`);
      lines.push(`- **Behind/Ahead**: ${context.git.divergence.behind}/${context.git.divergence.ahead}`);
      lines.push('');

      if (context.git.recentCommits.length > 0) {
        lines.push('### Recent Commits');
        context.git.recentCommits.forEach(commit => {
          lines.push(`- \`${commit.hash}\` ${commit.message} (${commit.author})`);
        });
        lines.push('');
      }
    }

    // Workflow section
    if (context.workflow.current) {
      lines.push('## Current Workflow');
      lines.push(`- **Type**: ${context.workflow.current.type}`);
      lines.push(`- **Confidence**: ${Math.round(context.workflow.confidence * 100)}%`);
      
      if (context.workflow.current.inProgress) {
        lines.push('- **Status**: In Progress');
      }
      lines.push('');
    }

    // Activity section
    if (context.activity.predictions.length > 0) {
      lines.push('## Predicted Next Actions');
      context.activity.predictions.forEach((pred, i) => {
        lines.push(`${i + 1}. ${pred.value} (${pred.confidence}% confidence)`);
      });
      lines.push('');
    }

    // Team section
    if (context.team.recentCollaborators.length > 0) {
      lines.push('## Recent Collaborators');
      context.team.recentCollaborators.forEach(collab => {
        lines.push(`- ${collab.name} (${collab.commits} commits)`);
      });
      lines.push('');
    }

    return lines.join('\n');
  }

  /**
   * Format context as tree
   */
  formatAsTree(context) {
    const tree = {
      label: chalk.bold.blue('Project Context'),
      nodes: []
    };

    // Project node
    const projectNode = {
      label: chalk.yellow('📁 Project'),
      nodes: [
        `Name: ${chalk.cyan(context.project.name)}`,
        `Files: ${chalk.green(context.project.structure.stats.totalFiles)}`,
        `Directories: ${chalk.green(context.project.structure.stats.totalDirectories)}`
      ]
    };

    if (context.project.dependencies.count.production > 0) {
      projectNode.nodes.push({
        label: 'Dependencies',
        nodes: [
          `Production: ${context.project.dependencies.count.production}`,
          `Development: ${context.project.dependencies.count.development}`
        ]
      });
    }

    tree.nodes.push(projectNode);

    // Git node
    if (context.git.repository) {
      const gitNode = {
        label: chalk.yellow('🔀 Git'),
        nodes: [
          `Branch: ${chalk.cyan(context.git.branch)}`,
          `Status: ${context.git.status.clean ? chalk.green('Clean') : chalk.yellow(`${context.git.status.files.length} changes`)}`,
          `Divergence: ${chalk.red(`↓${context.git.divergence.behind}`)} ${chalk.green(`↑${context.git.divergence.ahead}`)}`
        ]
      };

      if (context.git.recommendations.length > 0) {
        gitNode.nodes.push({
          label: 'Recommendations',
          nodes: context.git.recommendations.map(r => r.message)
        });
      }

      tree.nodes.push(gitNode);
    }

    // Workflow node
    if (context.workflow.current) {
      tree.nodes.push({
        label: chalk.yellow('🔄 Workflow'),
        nodes: [
          `Type: ${chalk.cyan(context.workflow.current.type)}`,
          `Confidence: ${chalk.green(Math.round(context.workflow.confidence * 100) + '%')}`,
          context.workflow.current.inProgress ? chalk.yellow('In Progress') : chalk.gray('Idle')
        ]
      });
    }

    // Activity node
    const activityNode = {
      label: chalk.yellow('📊 Activity'),
      nodes: [
        `Learning confidence: ${chalk.green(context.activity.learningStats.confidence + '%')}`,
        `Data points: ${chalk.cyan(context.activity.learningStats.dataPoints)}`,
        `Patterns detected: ${chalk.cyan(context.activity.learningStats.patterns)}`
      ]
    };

    if (context.activity.predictions.length > 0) {
      activityNode.nodes.push({
        label: 'Predictions',
        nodes: context.activity.predictions.map(p => `${p.value} ${chalk.gray(`(${p.confidence}%)`)}`)
      });
    }

    tree.nodes.push(activityNode);

    // System node
    tree.nodes.push({
      label: chalk.yellow('⚙️  System'),
      nodes: [
        `Platform: ${context.system.platform}`,
        `Node: ${context.system.nodeVersion}`,
        `Memory: ${context.system.memory.used}/${context.system.memory.total} MB`,
        `Uptime: ${Math.round(context.system.uptime / 60)} minutes`
      ]
    });

    return archy(tree);
  }

  /**
   * Format result for display
   */
  formatResult(result) {
    if (result.format === 'tree') {
      return this.formatAsTree(result.context);
    } else if (result.format === 'markdown') {
      return this.formatAsMarkdown(result.context);
    } else {
      return result.output || JSON.stringify(result.context, null, 2);
    }
  }

  /**
   * Format diff for display
   */
  formatDiff(diff) {
    if (!diff) {
      return chalk.gray('No previous context to compare');
    }

    const lines = [];
    
    lines.push(chalk.bold.blue('📊 Context Changes'));
    lines.push(chalk.dim(`Since: ${diff.timestamp.previous}`));
    lines.push('');

    if (diff.changes.length === 0) {
      lines.push(chalk.gray('No significant changes detected'));
    } else {
      diff.changes.forEach(change => {
        switch (change.type) {
          case 'branch_change':
            lines.push(`${chalk.yellow('🔀')} Branch: ${chalk.red(change.from)} → ${chalk.green(change.to)}`);
            break;
            
          case 'file_changes':
            const icon = change.delta > 0 ? chalk.green('+') : chalk.red('-');
            lines.push(`${chalk.yellow('📝')} Files: ${change.from} → ${change.to} (${icon}${Math.abs(change.delta)})`);
            break;
            
          case 'workflow_change':
            lines.push(`${chalk.yellow('🔄')} Workflow: ${chalk.red(change.from)} → ${chalk.green(change.to)}`);
            break;
            
          case 'new_activities':
            lines.push(`${chalk.yellow('✨')} New activities: ${change.count}`);
            change.activities.forEach(activity => {
              lines.push(`   ${chalk.gray('•')} ${activity.type}: ${activity.description || activity.value}`);
            });
            break;
        }
      });
    }

    return lines.join('\n');
  }
}

// Export singleton instance
const slamContext = new SlamContextTool();

/**
 * Main slam_context function
 */
export async function slam_context(options = {}) {
  const result = await slamContext.getContext(options);
  
  // Handle export
  if (options.export) {
    const exportResult = await slamContext.exportContext(
      result.context,
      options.format || 'json',
      options.export
    );
    
    if (exportResult.path) {
      result.output = chalk.green(`✓ Context exported to: ${exportResult.path}`);
    } else {
      result.output = exportResult.output;
    }
  } else {
    // Format for display
    result.output = slamContext.formatResult(result);
    
    // Add diff if present
    if (result.diff) {
      result.output += '\n\n' + slamContext.formatDiff(result.diff);
    }
  }
  
  return result;
}

export default slamContext;
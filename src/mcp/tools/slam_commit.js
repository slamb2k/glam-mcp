import simpleGit from 'simple-git';
import chalk from 'chalk';
import { execSync } from 'child_process';
import fs from 'fs-extra';
import contextEngine from '../context-engine.js';
import stateManager from '../state-manager.js';
import intentResolver from '../intent-resolver.js';
import logger from '../../utils/logger.js';

/**
 * SLAM Commit - AI-powered commit message generator
 * Generates intelligent commit messages based on code changes and context
 */
export class SlamCommitTool {
  constructor() {
    this.git = simpleGit();
    this.commitTypes = {
      feat: 'new feature',
      fix: 'bug fix',
      docs: 'documentation change',
      style: 'formatting, missing semi colons, etc; no code change',
      refactor: 'refactoring production code',
      test: 'adding tests, refactoring test; no production code change',
      chore: 'updating build tasks, package manager configs, etc; no production code change',
      perf: 'performance improvements',
      ci: 'CI/CD configuration',
      build: 'build system changes',
      revert: 'reverting previous commit'
    };
  }

  /**
   * Generate AI-powered commit message
   */
  async generateCommitMessage(options = {}) {
    try {
      // Get git status and diff
      const status = await this.git.status();
      
      if (status.files.length === 0) {
        return {
          success: false,
          message: 'No changes to commit'
        };
      }

      // Get staged and unstaged changes
      const stagedDiff = await this.getStagedDiff();
      const unstagedDiff = await this.getUnstagedDiff();
      
      // Analyze changes
      const analysis = await this.analyzeChanges({
        status,
        stagedDiff,
        unstagedDiff,
        options
      });
      
      // Generate commit message
      const commitMessage = await this.buildCommitMessage(analysis, options);
      
      // Format result
      const result = {
        success: true,
        message: commitMessage,
        analysis,
        stats: {
          filesChanged: status.files.length,
          additions: analysis.stats.additions,
          deletions: analysis.stats.deletions
        }
      };
      
      // Store in state for potential reuse
      await this.storeCommitContext(result);
      
      return result;
    } catch (error) {
      logger.error('Error generating commit message:', error);
      throw error;
    }
  }

  /**
   * Get staged diff
   */
  async getStagedDiff() {
    try {
      const diff = await this.git.diff(['--cached']);
      const stats = await this.git.diff(['--cached', '--stat']);
      const nameStatus = await this.git.diff(['--cached', '--name-status']);
      
      return {
        content: diff,
        stats,
        files: this.parseNameStatus(nameStatus)
      };
    } catch (error) {
      return { content: '', stats: '', files: [] };
    }
  }

  /**
   * Get unstaged diff
   */
  async getUnstagedDiff() {
    try {
      const diff = await this.git.diff();
      const stats = await this.git.diff(['--stat']);
      const nameStatus = await this.git.diff(['--name-status']);
      
      return {
        content: diff,
        stats,
        files: this.parseNameStatus(nameStatus)
      };
    } catch (error) {
      return { content: '', stats: '', files: [] };
    }
  }

  /**
   * Parse name-status output
   */
  parseNameStatus(nameStatus) {
    if (!nameStatus) return [];
    
    return nameStatus
      .split('\n')
      .filter(line => line.trim())
      .map(line => {
        const [status, ...pathParts] = line.split(/\s+/);
        const path = pathParts.join(' ');
        return { status, path };
      });
  }

  /**
   * Analyze code changes
   */
  async analyzeChanges({ status, stagedDiff, unstagedDiff, options }) {
    const analysis = {
      type: 'feat',
      scope: null,
      breaking: false,
      files: {
        added: [],
        modified: [],
        deleted: [],
        renamed: []
      },
      patterns: [],
      stats: {
        additions: 0,
        deletions: 0,
        filesChanged: 0
      },
      context: {}
    };

    // Categorize files
    for (const file of status.files) {
      const path = file.path;
      
      if (file.index === 'A' || file.working_dir === 'A') {
        analysis.files.added.push(path);
      } else if (file.index === 'D' || file.working_dir === 'D') {
        analysis.files.deleted.push(path);
      } else if (file.index === 'R' || file.working_dir === 'R') {
        analysis.files.renamed.push(path);
      } else {
        analysis.files.modified.push(path);
      }
    }

    // Analyze diff content
    const diffContent = stagedDiff.content || unstagedDiff.content;
    
    // Extract stats
    const statsMatch = (stagedDiff.stats || unstagedDiff.stats).match(/(\d+) insertions?\(\+\).*?(\d+) deletions?\(-\)/);
    if (statsMatch) {
      analysis.stats.additions = parseInt(statsMatch[1]) || 0;
      analysis.stats.deletions = parseInt(statsMatch[2]) || 0;
    }
    analysis.stats.filesChanged = status.files.length;

    // Detect patterns
    analysis.patterns = this.detectPatterns(diffContent);
    
    // Determine commit type
    analysis.type = await this.determineCommitType(analysis, diffContent);
    
    // Determine scope
    analysis.scope = await this.determineScope(analysis);
    
    // Check for breaking changes
    analysis.breaking = this.detectBreakingChanges(diffContent);
    
    // Get context from Context Engine
    const context = await contextEngine.getInferredContext();
    analysis.context = {
      workflow: context.workflow,
      recentActivity: context.recentActivity.slice(0, 5)
    };
    
    return analysis;
  }

  /**
   * Detect code patterns
   */
  detectPatterns(diff) {
    const patterns = [];
    
    // Test file changes
    if (diff.match(/\.(test|spec)\.(js|ts|jsx|tsx)/)) {
      patterns.push('test-changes');
    }
    
    // Documentation changes
    if (diff.match(/\.(md|txt|rst)$|README|CHANGELOG|docs\//m)) {
      patterns.push('documentation');
    }
    
    // Configuration changes
    if (diff.match(/\.(json|yml|yaml|toml|ini|config|rc)$/m)) {
      patterns.push('configuration');
    }
    
    // API changes
    if (diff.match(/\/(api|routes|endpoints|controllers)\//)) {
      patterns.push('api-changes');
    }
    
    // Component changes
    if (diff.match(/\/(components|views|pages)\//)) {
      patterns.push('ui-changes');
    }
    
    // Style changes
    if (diff.match(/\.(css|scss|sass|less|style)$/m)) {
      patterns.push('style-changes');
    }
    
    // Build/CI changes
    if (diff.match(/(webpack|rollup|vite|babel|tsconfig|jest|karma|dockerfile|\.github\/workflows)/i)) {
      patterns.push('build-changes');
    }
    
    // Database migrations
    if (diff.match(/migrations?\/|\.sql$/m)) {
      patterns.push('database-changes');
    }
    
    // Performance optimizations
    if (diff.match(/(optimize|performance|cache|lazy|memo|debounce|throttle)/i)) {
      patterns.push('performance');
    }
    
    // Security fixes
    if (diff.match(/(security|vulnerability|auth|permission|sanitize|escape|xss|csrf)/i)) {
      patterns.push('security');
    }
    
    return patterns;
  }

  /**
   * Determine commit type
   */
  async determineCommitType(analysis, diff) {
    // Use patterns to determine type
    if (analysis.patterns.includes('test-changes') && 
        !analysis.patterns.some(p => !['test-changes', 'documentation'].includes(p))) {
      return 'test';
    }
    
    if (analysis.patterns.includes('documentation') && 
        !analysis.patterns.some(p => p !== 'documentation')) {
      return 'docs';
    }
    
    if (analysis.patterns.includes('build-changes') || 
        analysis.patterns.includes('configuration')) {
      const isCIChange = diff.match(/\.github\/workflows|\.gitlab-ci|jenkins|travis|circle/i);
      return isCIChange ? 'ci' : 'chore';
    }
    
    if (analysis.patterns.includes('style-changes') && 
        !diff.match(/function|class|const|let|var|if|for|while/)) {
      return 'style';
    }
    
    if (analysis.patterns.includes('performance')) {
      return 'perf';
    }
    
    // Check for bug fixes
    if (diff.match(/fix|bug|issue|error|problem|correct|resolve/i)) {
      return 'fix';
    }
    
    // Check for refactoring
    if (analysis.files.modified.length > 0 && 
        analysis.files.added.length === 0 && 
        analysis.files.deleted.length === 0) {
      const hasStructuralChanges = diff.match(/class\s+\w+|function\s+\w+|export|import/);
      if (hasStructuralChanges) {
        return 'refactor';
      }
    }
    
    // Default to feat
    return 'feat';
  }

  /**
   * Determine scope
   */
  async determineScope(analysis) {
    const files = [
      ...analysis.files.added,
      ...analysis.files.modified,
      ...analysis.files.deleted,
      ...analysis.files.renamed
    ];
    
    if (files.length === 0) return null;
    
    // Find common directory
    const directories = files.map(f => {
      const parts = f.split('/');
      if (parts.length > 1) {
        // Skip common prefixes like 'src'
        const start = parts[0] === 'src' ? 1 : 0;
        return parts[start];
      }
      return null;
    }).filter(Boolean);
    
    // Find most common directory
    const dirCounts = {};
    directories.forEach(dir => {
      dirCounts[dir] = (dirCounts[dir] || 0) + 1;
    });
    
    const sortedDirs = Object.entries(dirCounts)
      .sort((a, b) => b[1] - a[1]);
    
    if (sortedDirs.length > 0 && sortedDirs[0][1] >= files.length * 0.5) {
      return sortedDirs[0][0];
    }
    
    // Check for specific scopes
    if (analysis.patterns.includes('api-changes')) return 'api';
    if (analysis.patterns.includes('ui-changes')) return 'ui';
    if (analysis.patterns.includes('database-changes')) return 'db';
    if (analysis.patterns.includes('build-changes')) return 'build';
    
    return null;
  }

  /**
   * Detect breaking changes
   */
  detectBreakingChanges(diff) {
    const breakingPatterns = [
      /BREAKING[\s-]?CHANGE/i,
      /removed?\s+(public\s+)?(function|method|class|api|endpoint)/i,
      /changed?\s+(public\s+)?(interface|api|signature)/i,
      /deprecated/i,
      /no longer supported/i,
      /incompatible/i
    ];
    
    return breakingPatterns.some(pattern => diff.match(pattern));
  }

  /**
   * Build commit message
   */
  async buildCommitMessage(analysis, options = {}) {
    const parts = [];
    
    // Type
    parts.push(analysis.type);
    
    // Scope
    if (analysis.scope) {
      parts.push(`(${analysis.scope})`);
    }
    
    // Breaking change indicator
    if (analysis.breaking) {
      parts.push('!');
    }
    
    parts.push(': ');
    
    // Subject line
    const subject = await this.generateSubject(analysis, options);
    parts.push(subject);
    
    // Body (if needed)
    const body = await this.generateBody(analysis, options);
    if (body) {
      parts.push('\n\n');
      parts.push(body);
    }
    
    // Footer (breaking changes, issues)
    const footer = this.generateFooter(analysis, options);
    if (footer) {
      parts.push('\n\n');
      parts.push(footer);
    }
    
    return parts.join('');
  }

  /**
   * Generate commit subject
   */
  async generateSubject(analysis, options) {
    const { type, files, stats, patterns } = analysis;
    
    // Use AI intent resolution for natural language input
    if (options.userMessage) {
      const intent = await intentResolver.resolve(options.userMessage, {
        context: { analysis }
      });
      
      if (intent.entities.commitMessage) {
        return intent.entities.commitMessage;
      }
    }
    
    // Generate based on changes
    const fileCount = stats.filesChanged;
    const primaryAction = this.getPrimaryAction(analysis);
    
    let subject = '';
    
    switch (type) {
      case 'feat':
        if (files.added.length > 0) {
          const feature = this.extractFeatureName(files.added[0]);
          subject = `add ${feature}`;
        } else {
          subject = `implement ${primaryAction}`;
        }
        break;
        
      case 'fix':
        subject = `fix ${primaryAction}`;
        break;
        
      case 'docs':
        subject = `update documentation`;
        if (files.modified.length === 1) {
          const docName = files.modified[0].split('/').pop().replace(/\.[^.]+$/, '');
          subject = `update ${docName} documentation`;
        }
        break;
        
      case 'style':
        subject = `format code`;
        if (patterns.includes('style-changes')) {
          subject = `update styles`;
        }
        break;
        
      case 'refactor':
        subject = `refactor ${primaryAction}`;
        break;
        
      case 'test':
        subject = `add tests for ${primaryAction}`;
        if (files.modified.length > files.added.length) {
          subject = `update tests`;
        }
        break;
        
      case 'chore':
        if (patterns.includes('build-changes')) {
          subject = `update build configuration`;
        } else if (patterns.includes('configuration')) {
          subject = `update configuration`;
        } else {
          subject = `update dependencies`;
        }
        break;
        
      case 'perf':
        subject = `optimize ${primaryAction}`;
        break;
        
      case 'ci':
        subject = `update CI configuration`;
        break;
        
      default:
        subject = `update ${primaryAction}`;
    }
    
    // Ensure subject is not too long
    if (subject.length > 50) {
      subject = subject.substring(0, 47) + '...';
    }
    
    return subject;
  }

  /**
   * Get primary action from changes
   */
  getPrimaryAction(analysis) {
    const { files, patterns } = analysis;
    
    // Determine from file changes
    if (files.added.length > 0) {
      const fileName = files.added[0].split('/').pop().replace(/\.[^.]+$/, '');
      return this.humanizeName(fileName);
    }
    
    if (files.modified.length > 0) {
      const fileName = files.modified[0].split('/').pop().replace(/\.[^.]+$/, '');
      return this.humanizeName(fileName);
    }
    
    // Determine from patterns
    if (patterns.includes('api-changes')) return 'API';
    if (patterns.includes('ui-changes')) return 'UI components';
    if (patterns.includes('database-changes')) return 'database schema';
    
    return 'codebase';
  }

  /**
   * Extract feature name from file path
   */
  extractFeatureName(filePath) {
    const fileName = filePath.split('/').pop();
    const nameWithoutExt = fileName.replace(/\.[^.]+$/, '');
    return this.humanizeName(nameWithoutExt);
  }

  /**
   * Humanize name
   */
  humanizeName(name) {
    return name
      .replace(/[-_]/g, ' ')
      .replace(/([A-Z])/g, ' $1')
      .trim()
      .toLowerCase()
      .replace(/\b\w/g, l => l.toLowerCase());
  }

  /**
   * Generate commit body
   */
  async generateBody(analysis, options) {
    const bodyParts = [];
    
    // Add context if significant changes
    if (analysis.stats.filesChanged > 5 || 
        analysis.stats.additions > 100 ||
        analysis.stats.deletions > 100) {
      
      // Summary of changes
      bodyParts.push('Changes:');
      
      if (analysis.files.added.length > 0) {
        bodyParts.push(`- Added ${analysis.files.added.length} new files`);
      }
      
      if (analysis.files.modified.length > 0) {
        bodyParts.push(`- Modified ${analysis.files.modified.length} files`);
      }
      
      if (analysis.files.deleted.length > 0) {
        bodyParts.push(`- Removed ${analysis.files.deleted.length} files`);
      }
      
      if (analysis.files.renamed.length > 0) {
        bodyParts.push(`- Renamed ${analysis.files.renamed.length} files`);
      }
    }
    
    // Add pattern-specific details
    if (analysis.patterns.includes('performance')) {
      bodyParts.push('\nPerformance improvements included in this commit.');
    }
    
    if (analysis.patterns.includes('security')) {
      bodyParts.push('\nSecurity enhancements included in this commit.');
    }
    
    // Add user-provided description
    if (options.description) {
      if (bodyParts.length > 0) bodyParts.push('');
      bodyParts.push(options.description);
    }
    
    return bodyParts.join('\n');
  }

  /**
   * Generate commit footer
   */
  generateFooter(analysis, options) {
    const footerParts = [];
    
    // Breaking changes
    if (analysis.breaking) {
      footerParts.push('BREAKING CHANGE: This commit contains breaking changes.');
      if (options.breakingDescription) {
        footerParts.push(options.breakingDescription);
      }
    }
    
    // Issue references
    if (options.issues) {
      const issues = Array.isArray(options.issues) ? options.issues : [options.issues];
      issues.forEach(issue => {
        if (issue.startsWith('#')) {
          footerParts.push(`Fixes ${issue}`);
        } else {
          footerParts.push(`Fixes #${issue}`);
        }
      });
    }
    
    // Co-authors
    if (options.coAuthors) {
      const coAuthors = Array.isArray(options.coAuthors) ? options.coAuthors : [options.coAuthors];
      coAuthors.forEach(author => {
        footerParts.push(`Co-authored-by: ${author}`);
      });
    }
    
    return footerParts.join('\n');
  }

  /**
   * Store commit context for reuse
   */
  async storeCommitContext(result) {
    const commitId = stateManager.generateId();
    
    await stateManager.createTask({
      id: commitId,
      type: 'commit_context',
      status: 'completed',
      data: {
        message: result.message,
        analysis: result.analysis,
        stats: result.stats,
        timestamp: new Date().toISOString()
      }
    });
    
    // Clean up old commit contexts (keep last 10)
    const contexts = await stateManager.getTasksByStatus('completed', 'commit_context');
    if (contexts.length > 10) {
      const toDelete = contexts.slice(10);
      for (const context of toDelete) {
        await stateManager.deleteTask(context.id);
      }
    }
    
    return commitId;
  }

  /**
   * Commit with generated message
   */
  async commit(options = {}) {
    try {
      // Generate commit message
      const messageResult = await this.generateCommitMessage(options);
      
      if (!messageResult.success) {
        return messageResult;
      }
      
      // Stage files if specified
      if (options.files && options.files.length > 0) {
        await this.git.add(options.files);
      } else if (options.all) {
        await this.git.add('.');
      }
      
      // Perform commit
      const commitResult = await this.git.commit(messageResult.message);
      
      // Track activity
      contextEngine.trackUserActivity({
        type: 'ai_commit',
        message: messageResult.message,
        hash: commitResult.commit,
        stats: messageResult.stats
      });
      
      // Log audit
      await stateManager.logAudit({
        action: 'ai_commit_created',
        resource: 'slam_commit',
        details: {
          hash: commitResult.commit,
          message: messageResult.message,
          stats: messageResult.stats
        }
      });
      
      return {
        success: true,
        commit: commitResult.commit,
        message: messageResult.message,
        stats: messageResult.stats,
        output: this.formatCommitResult({
          commit: commitResult.commit,
          message: messageResult.message,
          stats: messageResult.stats
        })
      };
      
    } catch (error) {
      logger.error('Commit error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Format commit result
   */
  formatCommitResult(result) {
    const lines = [];
    
    lines.push(chalk.bold.green('✓ Commit created successfully'));
    lines.push('');
    lines.push(chalk.dim('Commit:') + ' ' + chalk.yellow(result.commit.substring(0, 7)));
    lines.push('');
    lines.push(chalk.dim('Message:'));
    lines.push(chalk.cyan(result.message));
    
    if (result.stats) {
      lines.push('');
      lines.push(chalk.dim('Changes:'));
      lines.push(`  ${chalk.green(`+${result.stats.additions}`)} ${chalk.red(`-${result.stats.deletions}`)} (${result.stats.filesChanged} files)`);
    }
    
    return lines.join('\n');
  }

  /**
   * Get commit history with AI analysis
   */
  async analyzeHistory(options = {}) {
    const limit = options.limit || 10;
    const log = await this.git.log({ n: limit });
    
    const analysis = {
      commits: [],
      patterns: {
        types: {},
        authors: {},
        timeDistribution: {}
      },
      recommendations: []
    };
    
    // Analyze each commit
    for (const commit of log.all) {
      const parsed = this.parseCommitMessage(commit.message);
      analysis.commits.push({
        hash: commit.hash,
        author: commit.author_name,
        date: commit.date,
        message: commit.message,
        type: parsed.type,
        scope: parsed.scope,
        breaking: parsed.breaking
      });
      
      // Track patterns
      analysis.patterns.types[parsed.type] = (analysis.patterns.types[parsed.type] || 0) + 1;
      analysis.patterns.authors[commit.author_name] = (analysis.patterns.authors[commit.author_name] || 0) + 1;
      
      const hour = new Date(commit.date).getHours();
      const timeSlot = `${hour}:00-${hour + 1}:00`;
      analysis.patterns.timeDistribution[timeSlot] = (analysis.patterns.timeDistribution[timeSlot] || 0) + 1;
    }
    
    // Generate recommendations
    const mostCommonType = Object.entries(analysis.patterns.types)
      .sort((a, b) => b[1] - a[1])[0];
    
    if (mostCommonType && mostCommonType[1] > limit * 0.5) {
      analysis.recommendations.push({
        type: 'commit-type-balance',
        message: `Consider diversifying commit types. ${mostCommonType[0]} commits dominate (${mostCommonType[1]}/${limit})`
      });
    }
    
    return analysis;
  }

  /**
   * Parse commit message
   */
  parseCommitMessage(message) {
    const conventionalPattern = /^(\w+)(?:\(([^)]+)\))?(!)?:\s*(.+)/;
    const match = message.match(conventionalPattern);
    
    if (match) {
      return {
        type: match[1],
        scope: match[2] || null,
        breaking: !!match[3],
        subject: match[4]
      };
    }
    
    // Fallback parsing
    if (message.toLowerCase().includes('fix')) return { type: 'fix', scope: null, breaking: false };
    if (message.toLowerCase().includes('add')) return { type: 'feat', scope: null, breaking: false };
    if (message.toLowerCase().includes('update')) return { type: 'chore', scope: null, breaking: false };
    
    return { type: 'other', scope: null, breaking: false };
  }
}

// Export singleton instance
const slamCommit = new SlamCommitTool();

/**
 * Main slam_commit function
 */
export async function slam_commit(options = {}) {
  if (options.analyze) {
    return await slamCommit.analyzeHistory(options);
  }
  
  if (options.generate || options.dryRun) {
    const result = await slamCommit.generateCommitMessage(options);
    result.output = slamCommit.formatCommitResult({
      commit: 'DRY-RUN',
      message: result.message,
      stats: result.stats
    });
    return result;
  }
  
  return await slamCommit.commit(options);
}

export default slamCommit;
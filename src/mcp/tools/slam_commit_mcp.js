/**
 * MCP Tool Binding for slam_commit
 * AI-powered commit message generation
 */

import { slam_commit } from './slam_commit.js';

export const slam_commit_tool = {
  name: 'slam_commit',
  description: 'Generate AI-powered commit messages based on code changes and context',
  inputSchema: {
    type: 'object',
    properties: {
      // Commit options
      message: {
        type: 'string',
        description: 'Optional user message to guide commit generation'
      },
      description: {
        type: 'string',
        description: 'Additional description for commit body'
      },
      type: {
        type: 'string',
        enum: ['feat', 'fix', 'docs', 'style', 'refactor', 'test', 'chore', 'perf', 'ci', 'build', 'revert'],
        description: 'Force specific commit type'
      },
      scope: {
        type: 'string',
        description: 'Commit scope (e.g., component name)'
      },
      breaking: {
        type: 'boolean',
        description: 'Mark as breaking change'
      },
      breakingDescription: {
        type: 'string',
        description: 'Description of breaking changes'
      },
      issues: {
        oneOf: [
          { type: 'string' },
          { type: 'array', items: { type: 'string' } }
        ],
        description: 'Issue references to include (e.g., "#123")'
      },
      coAuthors: {
        oneOf: [
          { type: 'string' },
          { type: 'array', items: { type: 'string' } }
        ],
        description: 'Co-authors to credit'
      },
      
      // File staging options
      files: {
        type: 'array',
        items: { type: 'string' },
        description: 'Specific files to stage and commit'
      },
      all: {
        type: 'boolean',
        description: 'Stage all changes before committing'
      },
      
      // Action options
      generate: {
        type: 'boolean',
        description: 'Only generate message without committing'
      },
      dryRun: {
        type: 'boolean',
        description: 'Generate message without committing (alias for generate)'
      },
      analyze: {
        type: 'boolean',
        description: 'Analyze commit history instead of creating commit'
      },
      limit: {
        type: 'number',
        description: 'Number of commits to analyze (default: 10)'
      },
      
      // User context
      userMessage: {
        type: 'string',
        description: 'Natural language description of changes'
      }
    }
  },
  handler: async (args) => {
    const result = await slam_commit(args);
    
    // Format response for MCP
    if (result.output) {
      return {
        content: [{
          type: 'text',
          text: result.output
        }]
      };
    }
    
    // For analysis mode
    if (args.analyze && result.commits) {
      const output = [
        '📊 Commit History Analysis',
        '',
        `Analyzed ${result.commits.length} commits:`,
        '',
        'Commit Type Distribution:',
        ...Object.entries(result.patterns.types).map(([type, count]) => 
          `  ${type}: ${count} commits`
        ),
        '',
        'Top Contributors:',
        ...Object.entries(result.patterns.authors)
          .sort((a, b) => b[1] - a[1])
          .slice(0, 5)
          .map(([author, count]) => `  ${author}: ${count} commits`),
        ''
      ];
      
      if (result.recommendations.length > 0) {
        output.push('Recommendations:');
        result.recommendations.forEach((rec, i) => {
          output.push(`  ${i + 1}. ${rec.message}`);
        });
      }
      
      return {
        content: [{
          type: 'text',
          text: output.join('\n')
        }]
      };
    }
    
    // For generation mode
    if (args.generate || args.dryRun) {
      const output = [
        '💡 Generated Commit Message:',
        '',
        result.message,
        '',
        'Changes Summary:',
        `  Files: ${result.stats.filesChanged}`,
        `  Additions: +${result.stats.additions}`,
        `  Deletions: -${result.stats.deletions}`,
        '',
        'To commit with this message, run:',
        'slam_commit'
      ];
      
      return {
        content: [{
          type: 'text',
          text: output.join('\n')
        }]
      };
    }
    
    // Default response
    return {
      content: [{
        type: 'text',
        text: JSON.stringify(result, null, 2)
      }]
    };
  }
};

// Export for MCP registration
export default slam_commit_tool;
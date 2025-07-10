/**
 * Tool Discovery Service
 * Service for discovering and querying registered tools
 */

import { toolRegistry } from '../core/tool-registry.js';

export class ToolDiscoveryService {
  constructor(registry = toolRegistry) {
    this.registry = registry;
    this.cache = new Map();
    this.cacheTimeout = 5 * 60 * 1000; // 5 minutes
  }

  /**
   * Find tools by capability
   */
  findByCapability(capability) {
    const cacheKey = `capability:${capability}`;
    const cached = this.getFromCache(cacheKey);
    if (cached) return cached;
    
    // Map capabilities to tags and categories
    const capabilityMap = {
      'git': ['git', 'github-flow'],
      'test': ['test', 'testing', 'automation'],
      'code-quality': ['code-quality', 'analysis', 'lint'],
      'documentation': ['docs', 'documentation'],
      'safety': ['safety', 'risk', 'validation'],
      'team': ['team', 'collaboration'],
      'performance': ['performance', 'monitoring']
    };
    
    const searchTerms = capabilityMap[capability] || [capability];
    const results = new Set();
    
    // Search by tags
    searchTerms.forEach(term => {
      this.registry.search({ tag: term }).forEach(tool => results.add(tool));
      this.registry.search({ keyword: term }).forEach(tool => results.add(tool));
    });
    
    const toolArray = Array.from(results);
    this.setCache(cacheKey, toolArray);
    
    return toolArray;
  }

  /**
   * Get recommended tools for a workflow
   */
  getWorkflowRecommendations(workflow) {
    const recommendations = {
      'development': [
        'get_status',
        'github_flow_start',
        'run_tests',
        'analyze_code',
        'auto_commit'
      ],
      'review': [
        'show_diff',
        'analyze_changes',
        'search_todos',
        'check_dependencies'
      ],
      'deployment': [
        'run_tests',
        'check_for_conflicts',
        'npm_publish',
        'github_flow_merge_pr'
      ],
      'maintenance': [
        'repo_health_check',
        'cleanup_merged_branches',
        'check_dependencies',
        'search_todos'
      ]
    };
    
    const toolNames = recommendations[workflow] || [];
    const tools = [];
    
    toolNames.forEach(name => {
      const tool = this.registry.get(name);
      if (tool) {
        tools.push({
          ...tool,
          recommendation: {
            workflow,
            reason: this.getRecommendationReason(tool, workflow)
          }
        });
      }
    });
    
    return tools;
  }

  /**
   * Find similar tools
   */
  findSimilar(toolName, maxResults = 5) {
    const tool = this.registry.get(toolName);
    if (!tool) return [];
    
    const cacheKey = `similar:${toolName}`;
    const cached = this.getFromCache(cacheKey);
    if (cached) return cached;
    
    // Build similarity criteria
    const scores = new Map();
    
    for (const [name, candidate] of this.registry.tools) {
      if (name === toolName) continue;
      
      let score = 0;
      
      // Same category = high similarity
      if (candidate.metadata.category === tool.metadata.category) {
        score += 5;
      }
      
      // Shared tags
      const sharedTags = tool.metadata.tags.filter(tag => 
        candidate.metadata.tags.includes(tag)
      );
      score += sharedTags.length * 2;
      
      // Related tools
      if (tool.metadata.relatedTools?.includes(name) ||
          candidate.metadata.relatedTools?.includes(toolName)) {
        score += 10;
      }
      
      // Similar keywords in description
      const toolWords = new Set(tool.description.toLowerCase().split(/\s+/));
      const candidateWords = new Set(candidate.description.toLowerCase().split(/\s+/));
      const commonWords = [...toolWords].filter(w => candidateWords.has(w));
      score += Math.min(commonWords.length, 5);
      
      if (score > 0) {
        scores.set(name, score);
      }
    }
    
    // Sort by score and return top results
    const sorted = Array.from(scores.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, maxResults)
      .map(([name]) => this.registry.get(name));
    
    this.setCache(cacheKey, sorted);
    return sorted;
  }

  /**
   * Get tool usage patterns
   */
  async getUsagePatterns(toolName) {
    const tool = this.registry.get(toolName);
    if (!tool) return null;
    
    // Analyze common usage patterns
    const patterns = {
      commonCombinations: this.findCommonCombinations(toolName),
      typicalWorkflow: this.getTypicalWorkflow(toolName),
      prerequisites: this.getPrerequisites(toolName),
      followUpTools: this.getFollowUpTools(toolName)
    };
    
    return patterns;
  }

  /**
   * Get popular tools based on usage metrics
   */
  getPopularTools(maxResults = 10) {
    const cacheKey = `popular:${maxResults}`;
    const cached = this.getFromCache(cacheKey);
    if (cached) return cached;
    
    // Get all tools and sort by usage count
    const allTools = Array.from(this.registry.tools.values());
    
    // Sort by usage count (if available in metadata) or fall back to a default score
    const sortedTools = allTools
      .map(tool => ({
        ...tool,
        usageCount: tool.metadata?.usageCount || 0
      }))
      .sort((a, b) => b.usageCount - a.usageCount)
      .slice(0, maxResults);
    
    this.setCache(cacheKey, sortedTools);
    return sortedTools;
  }

  /**
   * Search with natural language
   */
  searchNatural(query) {
    // Simple natural language processing
    const queryLower = query.toLowerCase();
    
    // Extract intent
    const intents = {
      'create': ['create', 'make', 'new', 'init', 'start'],
      'check': ['check', 'verify', 'validate', 'test', 'analyze'],
      'fix': ['fix', 'repair', 'resolve', 'solve'],
      'clean': ['clean', 'cleanup', 'remove', 'delete'],
      'show': ['show', 'display', 'list', 'get', 'view']
    };
    
    let detectedIntent = null;
    for (const [intent, keywords] of Object.entries(intents)) {
      if (keywords.some(k => queryLower.includes(k))) {
        detectedIntent = intent;
        break;
      }
    }
    
    // Extract entities
    const entities = [];
    const entityPatterns = [
      { pattern: /branch/i, entity: 'branch' },
      { pattern: /commit/i, entity: 'commit' },
      { pattern: /pr|pull request/i, entity: 'pr' },
      { pattern: /test/i, entity: 'test' },
      { pattern: /code/i, entity: 'code' },
      { pattern: /depend/i, entity: 'dependencies' }
    ];
    
    entityPatterns.forEach(({ pattern, entity }) => {
      if (pattern.test(queryLower)) {
        entities.push(entity);
      }
    });
    
    // Build search criteria
    const results = [];
    
    // Search by keywords
    const keywords = queryLower.split(/\s+/).filter(w => w.length > 2);
    keywords.forEach(keyword => {
      this.registry.search({ keyword }).forEach(tool => {
        if (!results.find(t => t.name === tool.name)) {
          results.push({
            ...tool,
            relevance: this.calculateRelevance(tool, queryLower, detectedIntent, entities)
          });
        }
      });
    });
    
    // Sort by relevance
    results.sort((a, b) => b.relevance - a.relevance);
    
    return {
      query,
      intent: detectedIntent,
      entities,
      results: results.slice(0, 10)
    };
  }

  /**
   * Get tool chain suggestions
   */
  getToolChain(startTool, _goal) {
    const start = this.registry.get(startTool);
    if (!start) return null;
    
    // Define common tool chains
    const chains = {
      'feature-development': [
        'get_status',
        'github_flow_start',
        'analyze_code',
        'run_tests',
        'auto_commit',
        'github_flow_finish'
      ],
      'bug-fix': [
        'get_status',
        'search_code',
        'analyze_changes',
        'run_tests',
        'smart_commit',
        'create_pr'
      ],
      'release': [
        'repo_health_check',
        'run_tests',
        'check_dependencies',
        'npm_publish',
        'tag_operations'
      ]
    };
    
    // Find chain containing start tool
    for (const [chainName, tools] of Object.entries(chains)) {
      if (tools.includes(startTool)) {
        const startIndex = tools.indexOf(startTool);
        const chain = tools.slice(startIndex);
        
        return {
          name: chainName,
          tools: chain.map(name => ({
            name,
            tool: this.registry.get(name),
            optional: this.isOptionalInChain(name, chainName)
          }))
        };
      }
    }
    
    return null;
  }

  // Private helper methods
  
  getFromCache(key) {
    const cached = this.cache.get(key);
    if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
      return cached.data;
    }
    this.cache.delete(key);
    return null;
  }
  
  setCache(key, data) {
    this.cache.set(key, { data, timestamp: Date.now() });
  }
  
  getRecommendationReason(tool, workflow) {
    const reasons = {
      'development': {
        'get_status': 'Start by understanding current repository state',
        'github_flow_start': 'Create feature branch following best practices',
        'run_tests': 'Ensure code quality before committing',
        'analyze_code': 'Check for code quality issues',
        'auto_commit': 'Streamline commit and PR workflow'
      },
      'review': {
        'show_diff': 'Review detailed changes',
        'analyze_changes': 'Understand impact of changes',
        'search_todos': 'Check for pending work',
        'check_dependencies': 'Verify dependency health'
      }
    };
    
    return reasons[workflow]?.[tool.name] || 'Recommended for this workflow';
  }
  
  findCommonCombinations(toolName) {
    // Hardcoded common combinations - in real implementation would analyze usage data
    const combinations = {
      'github_flow_start': ['get_status', 'auto_commit'],
      'run_tests': ['analyze_code', 'auto_commit'],
      'auto_commit': ['github_flow_finish', 'github_flow_merge_pr']
    };
    
    return combinations[toolName] || [];
  }
  
  getTypicalWorkflow(toolName) {
    const workflows = {
      'github_flow_start': 'feature-development',
      'run_tests': 'quality-assurance',
      'npm_publish': 'release-deployment'
    };
    
    return workflows[toolName] || 'general';
  }
  
  getPrerequisites(toolName) {
    const prerequisites = {
      'github_flow_finish': ['github_flow_start'],
      'npm_publish': ['run_tests'],
      'cleanup_merged_branches': ['get_status']
    };
    
    return prerequisites[toolName] || [];
  }
  
  getFollowUpTools(toolName) {
    const followUps = {
      'github_flow_start': ['auto_commit', 'run_tests'],
      'run_tests': ['analyze_code', 'auto_commit'],
      'auto_commit': ['github_flow_finish']
    };
    
    return followUps[toolName] || [];
  }
  
  calculateRelevance(tool, query, intent, entities) {
    let score = 0;
    
    // Name match
    if (tool.name.includes(query)) score += 10;
    
    // Description match
    const descWords = tool.description.toLowerCase().split(/\s+/);
    const queryWords = query.split(/\s+/);
    const matches = queryWords.filter(qw => descWords.some(dw => dw.includes(qw)));
    score += matches.length * 2;
    
    // Intent match
    if (intent) {
      const intentMap = {
        'create': ['create', 'init', 'start', 'new'],
        'check': ['check', 'analyze', 'test', 'validate'],
        'fix': ['fix', 'resolve', 'repair'],
        'clean': ['clean', 'remove', 'delete'],
        'show': ['show', 'list', 'get', 'status']
      };
      
      if (intentMap[intent].some(keyword => tool.name.includes(keyword))) {
        score += 5;
      }
    }
    
    // Entity match
    entities.forEach(entity => {
      if (tool.name.includes(entity) || tool.metadata.tags.includes(entity)) {
        score += 3;
      }
    });
    
    return score;
  }
  
  isOptionalInChain(toolName, chainName) {
    const optional = {
      'feature-development': ['analyze_code'],
      'bug-fix': ['search_code'],
      'release': ['check_dependencies']
    };
    
    return optional[chainName]?.includes(toolName) || false;
  }
}

// Create singleton instance
export const toolDiscovery = new ToolDiscoveryService();
import nlp from 'compromise';
import Fuse from 'fuse.js';
import { OpenAI } from 'openai';
import logger from '../utils/logger.js';

/**
 * Intent Resolution Layer
 * Parses natural language commands into structured intents
 */
export class IntentResolver {
  constructor(contextEngine = null) {
    this.contextEngine = contextEngine;
    this.nlp = nlp;
    
    // Initialize OpenAI if API key is available
    this.openai = process.env.OPENAI_API_KEY ? 
      new OpenAI({ apiKey: process.env.OPENAI_API_KEY }) : null;
    
    // Intent patterns and mappings
    this.intentPatterns = this.initializeIntentPatterns();
    this.commandMappings = this.initializeCommandMappings();
    
    // Initialize fuzzy matcher
    this.fuzzyMatcher = new Fuse(Object.keys(this.commandMappings), {
      includeScore: true,
      threshold: 0.4,
      keys: ['command']
    });
    
    // Cache for resolved intents
    this.intentCache = new Map();
    this.cacheMaxSize = 100;
  }

  /**
   * Initialize intent patterns for NLP analysis
   */
  initializeIntentPatterns() {
    return {
      // Git operations
      commit: {
        verbs: ['commit', 'save', 'record', 'check in'],
        keywords: ['changes', 'files', 'code', 'work'],
        patterns: [
          /commit\s+(all\s+)?changes?/i,
          /save\s+my\s+work/i,
          /check\s+in\s+changes/i
        ]
      },
      
      push: {
        verbs: ['push', 'upload', 'sync', 'publish'],
        keywords: ['remote', 'origin', 'github', 'upstream'],
        patterns: [
          /push\s+(to\s+)?(remote|origin|github)/i,
          /upload\s+changes/i,
          /sync\s+with\s+remote/i
        ]
      },
      
      pull: {
        verbs: ['pull', 'fetch', 'download', 'get'],
        keywords: ['latest', 'changes', 'updates', 'remote'],
        patterns: [
          /pull\s+(latest\s+)?changes/i,
          /get\s+latest/i,
          /fetch\s+updates/i
        ]
      },
      
      branch: {
        verbs: ['create', 'switch', 'checkout', 'new'],
        keywords: ['branch', 'feature', 'fix', 'release'],
        patterns: [
          /create\s+(new\s+)?branch/i,
          /switch\s+to\s+branch/i,
          /checkout\s+\w+/i
        ]
      },
      
      merge: {
        verbs: ['merge', 'combine', 'integrate'],
        keywords: ['branch', 'changes', 'into', 'main'],
        patterns: [
          /merge\s+\w+\s+into\s+\w+/i,
          /combine\s+branches/i,
          /integrate\s+changes/i
        ]
      },
      
      // Development workflows
      develop: {
        verbs: ['develop', 'build', 'implement', 'create'],
        keywords: ['feature', 'functionality', 'component', 'module'],
        patterns: [
          /develop\s+(new\s+)?feature/i,
          /implement\s+\w+/i,
          /build\s+\w+\s+(component|module)/i
        ]
      },
      
      deploy: {
        verbs: ['deploy', 'ship', 'release', 'publish'],
        keywords: ['production', 'staging', 'live', 'server'],
        patterns: [
          /deploy\s+to\s+(production|staging)/i,
          /ship\s+(to\s+)?production/i,
          /release\s+version/i
        ]
      },
      
      test: {
        verbs: ['test', 'run', 'execute', 'verify'],
        keywords: ['tests', 'unit', 'integration', 'coverage'],
        patterns: [
          /run\s+tests?/i,
          /execute\s+test\s+suite/i,
          /verify\s+functionality/i
        ]
      },
      
      // Context queries
      status: {
        verbs: ['show', 'get', 'check', 'what'],
        keywords: ['status', 'state', 'current', 'changes'],
        patterns: [
          /show\s+(me\s+)?status/i,
          /what('s|\s+is)\s+the\s+status/i,
          /check\s+current\s+state/i
        ]
      },
      
      context: {
        verbs: ['show', 'get', 'provide', 'what'],
        keywords: ['context', 'information', 'details', 'about'],
        patterns: [
          /show\s+(me\s+)?context/i,
          /what('s|\s+is)\s+the\s+context/i,
          /provide\s+context/i
        ]
      },
      
      // Collaboration
      collaborate: {
        verbs: ['share', 'collaborate', 'work', 'team'],
        keywords: ['with', 'together', 'team', 'colleagues'],
        patterns: [
          /collaborate\s+with\s+\w+/i,
          /share\s+with\s+team/i,
          /work\s+together/i
        ]
      },
      
      // General actions
      help: {
        verbs: ['help', 'assist', 'guide', 'show'],
        keywords: ['how', 'what', 'can', 'commands'],
        patterns: [
          /help\s*(me)?/i,
          /what\s+can\s+(you|I)\s+do/i,
          /show\s+commands/i
        ]
      }
    };
  }

  /**
   * Initialize command mappings
   */
  initializeCommandMappings() {
    return {
      // Git commands
      'commit changes': {
        tool: 'auto-commit',
        params: { all: true },
        description: 'Commit all changes with an AI-generated message'
      },
      'push to remote': {
        tool: 'git-push',
        params: {},
        description: 'Push local commits to remote repository'
      },
      'pull latest': {
        tool: 'git-pull',
        params: {},
        description: 'Pull latest changes from remote'
      },
      'create branch': {
        tool: 'create-branch',
        params: { type: 'feature' },
        description: 'Create a new feature branch'
      },
      'switch branch': {
        tool: 'checkout-branch',
        params: {},
        description: 'Switch to a different branch'
      },
      
      // Workflow commands
      'develop feature': {
        tool: 'slam_develop',
        params: {},
        description: 'Start feature development workflow'
      },
      'deploy to production': {
        tool: 'slam_ship',
        params: { target: 'production' },
        description: 'Deploy to production environment'
      },
      'run tests': {
        tool: 'run-tests',
        params: {},
        description: 'Execute test suite'
      },
      
      // Context commands
      'show status': {
        tool: 'git-status',
        params: { detailed: true },
        description: 'Show current git status'
      },
      'show context': {
        tool: 'slam_context',
        params: {},
        description: 'Display current context information'
      },
      
      // Collaboration
      'start collaboration': {
        tool: 'slam_collaborate',
        params: {},
        description: 'Start collaboration session'
      },
      
      // Help
      'show help': {
        tool: 'help',
        params: {},
        description: 'Display available commands and help'
      }
    };
  }

  /**
   * Resolve natural language input to structured intent
   */
  async resolve(input, options = {}) {
    try {
      // Check cache first
      if (this.intentCache.has(input)) {
        return this.intentCache.get(input);
      }

      // Preprocess input
      const processed = this.preprocessInput(input);
      
      // Try multiple resolution strategies
      let intent = null;
      
      // 1. Pattern matching
      intent = this.resolveByPatterns(processed);
      
      // 2. NLP analysis
      if (!intent || intent.confidence < 0.7) {
        const nlpIntent = this.resolveByNLP(processed);
        if (!nlpIntent || nlpIntent.confidence > (intent?.confidence || 0)) {
          intent = nlpIntent;
        }
      }
      
      // 3. Fuzzy matching
      if (!intent || intent.confidence < 0.7) {
        const fuzzyIntent = this.resolveByFuzzyMatch(processed);
        if (!fuzzyIntent || fuzzyIntent.confidence > (intent?.confidence || 0)) {
          intent = fuzzyIntent;
        }
      }
      
      // 4. AI-powered resolution (if available and needed)
      if ((!intent || intent.confidence < 0.5) && this.openai && options.useAI !== false) {
        const aiIntent = await this.resolveByAI(input, processed);
        if (aiIntent && aiIntent.confidence > (intent?.confidence || 0)) {
          intent = aiIntent;
        }
      }
      
      // 5. Context-aware refinement
      if (intent && this.contextEngine) {
        intent = await this.refineWithContext(intent);
      }
      
      // Handle ambiguity
      if (!intent || intent.confidence < 0.3) {
        intent = this.handleAmbiguity(input, intent);
      }
      
      // Cache the result
      this.cacheIntent(input, intent);
      
      return intent;
    } catch (error) {
      logger.error('Error resolving intent:', error);
      return this.createErrorIntent(input, error);
    }
  }

  /**
   * Preprocess input text
   */
  preprocessInput(input) {
    // Convert to lowercase and trim
    let processed = input.toLowerCase().trim();
    
    // Remove common filler words
    const fillers = ['please', 'could you', 'can you', 'i want to', 'i need to', 'help me'];
    fillers.forEach(filler => {
      processed = processed.replace(new RegExp(`^${filler}\\s+`, 'i'), '');
    });
    
    // Normalize common variations
    const normalizations = {
      'commit all': 'commit changes',
      'push code': 'push to remote',
      'pull code': 'pull latest',
      'make branch': 'create branch',
      'new branch': 'create branch',
      'change branch': 'switch branch'
    };
    
    Object.entries(normalizations).forEach(([from, to]) => {
      if (processed.includes(from)) {
        processed = processed.replace(from, to);
      }
    });
    
    return processed;
  }

  /**
   * Resolve by pattern matching
   */
  resolveByPatterns(input) {
    let bestMatch = null;
    let highestConfidence = 0;
    
    for (const [intentType, config] of Object.entries(this.intentPatterns)) {
      // Check patterns
      for (const pattern of config.patterns) {
        if (pattern.test(input)) {
          const confidence = 0.8;
          if (confidence > highestConfidence) {
            highestConfidence = confidence;
            bestMatch = {
              type: intentType,
              confidence,
              method: 'pattern',
              raw: input
            };
          }
        }
      }
      
      // Check verb and keyword combinations
      const hasVerb = config.verbs.some(verb => input.includes(verb));
      const hasKeyword = config.keywords.some(keyword => input.includes(keyword));
      
      if (hasVerb && hasKeyword) {
        const confidence = 0.7;
        if (confidence > highestConfidence) {
          highestConfidence = confidence;
          bestMatch = {
            type: intentType,
            confidence,
            method: 'verb-keyword',
            raw: input
          };
        }
      }
    }
    
    // Map to command if found
    if (bestMatch) {
      const command = this.findCommandForIntent(bestMatch.type, input);
      if (command) {
        return {
          ...bestMatch,
          command: command.name,
          tool: command.config.tool,
          params: command.config.params,
          description: command.config.description
        };
      }
    }
    
    return bestMatch;
  }

  /**
   * Resolve using NLP analysis
   */
  resolveByNLP(input) {
    const doc = this.nlp(input);
    
    // Extract verbs and nouns
    const verbs = doc.verbs().out('array');
    const nouns = doc.nouns().out('array');
    const entities = doc.topics().out('array');
    
    // Analyze sentence structure
    const hasQuestion = doc.has('#Question');
    const hasCommand = doc.has('#Imperative') || verbs.length > 0;
    
    // Match against intent patterns
    let bestMatch = null;
    let highestScore = 0;
    
    for (const [intentType, config] of Object.entries(this.intentPatterns)) {
      let score = 0;
      
      // Score based on verb matches
      const verbMatches = verbs.filter(v => 
        config.verbs.some(cv => v.toLowerCase().includes(cv))
      );
      score += verbMatches.length * 0.4;
      
      // Score based on keyword matches
      const keywordMatches = [...nouns, ...entities].filter(n =>
        config.keywords.some(k => n.toLowerCase().includes(k))
      );
      score += keywordMatches.length * 0.3;
      
      // Bonus for sentence type match
      if ((intentType === 'help' && hasQuestion) || 
          (intentType !== 'help' && hasCommand)) {
        score += 0.3;
      }
      
      if (score > highestScore) {
        highestScore = score;
        bestMatch = {
          type: intentType,
          confidence: Math.min(score, 1),
          method: 'nlp',
          raw: input,
          analysis: {
            verbs,
            nouns,
            entities,
            hasQuestion,
            hasCommand
          }
        };
      }
    }
    
    // Map to command if found
    if (bestMatch && bestMatch.confidence > 0.3) {
      const command = this.findCommandForIntent(bestMatch.type, input);
      if (command) {
        return {
          ...bestMatch,
          command: command.name,
          tool: command.config.tool,
          params: this.extractParams(input, command.config.params),
          description: command.config.description
        };
      }
    }
    
    return bestMatch;
  }

  /**
   * Resolve using fuzzy matching
   */
  resolveByFuzzyMatch(input) {
    const commands = Object.keys(this.commandMappings).map(cmd => ({
      command: cmd,
      normalized: cmd.toLowerCase()
    }));
    
    const fuse = new Fuse(commands, {
      keys: ['normalized'],
      includeScore: true,
      threshold: 0.4
    });
    
    const results = fuse.search(input);
    
    if (results.length > 0) {
      const bestMatch = results[0];
      const commandName = bestMatch.item.command;
      const config = this.commandMappings[commandName];
      
      return {
        type: this.inferIntentType(commandName),
        command: commandName,
        tool: config.tool,
        params: this.extractParams(input, config.params),
        description: config.description,
        confidence: 1 - bestMatch.score,
        method: 'fuzzy',
        raw: input
      };
    }
    
    return null;
  }

  /**
   * Resolve using AI (OpenAI)
   */
  async resolveByAI(originalInput, processedInput) {
    if (!this.openai) return null;
    
    try {
      const systemPrompt = `You are an intent resolution system. Analyze the user's input and extract:
1. The primary intent (one of: ${Object.keys(this.intentPatterns).join(', ')})
2. The most appropriate command from the available commands
3. Any parameters mentioned in the input
4. A confidence score (0-1)

Available commands:
${JSON.stringify(this.commandMappings, null, 2)}

Respond in JSON format with: { intent, command, params, confidence }`;

      const response = await this.openai.chat.completions.create({
        model: 'gpt-3.5-turbo',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: `Original: "${originalInput}"\nProcessed: "${processedInput}"` }
        ],
        temperature: 0.3,
        response_format: { type: 'json_object' }
      });
      
      const result = JSON.parse(response.choices[0].message.content);
      
      if (result.command && this.commandMappings[result.command]) {
        const config = this.commandMappings[result.command];
        return {
          type: result.intent,
          command: result.command,
          tool: config.tool,
          params: { ...config.params, ...result.params },
          description: config.description,
          confidence: result.confidence || 0.7,
          method: 'ai',
          raw: originalInput
        };
      }
    } catch (error) {
      logger.error('AI intent resolution failed:', error);
    }
    
    return null;
  }

  /**
   * Refine intent with context
   */
  async refineWithContext(intent) {
    if (!this.contextEngine) return intent;
    
    const context = this.contextEngine.getSnapshot();
    const inferences = await this.contextEngine.getInferredContext();
    
    // Adjust confidence based on context
    if (intent.type === 'commit' && inferences.projectState.hasUncommittedChanges) {
      intent.confidence = Math.min(intent.confidence * 1.2, 1);
    }
    
    if (intent.type === 'push' && inferences.projectState.needsPush) {
      intent.confidence = Math.min(intent.confidence * 1.2, 1);
    }
    
    if (intent.type === 'pull' && inferences.projectState.needsPull) {
      intent.confidence = Math.min(intent.confidence * 1.2, 1);
    }
    
    // Add context-aware parameters
    if (intent.type === 'branch' && !intent.params.name) {
      const currentBranch = context.git?.currentBranch;
      if (currentBranch && currentBranch !== 'main' && currentBranch !== 'master') {
        intent.params.from = currentBranch;
      }
    }
    
    // Add contextual information
    intent.context = {
      currentBranch: context.git?.currentBranch,
      hasChanges: inferences.projectState.hasUncommittedChanges,
      recommendations: inferences.recommendations
    };
    
    return intent;
  }

  /**
   * Handle ambiguous intents
   */
  handleAmbiguity(input, partialIntent) {
    const suggestions = [];
    
    // Generate suggestions based on partial matches
    if (partialIntent) {
      const similarCommands = this.findSimilarCommands(partialIntent.type);
      suggestions.push(...similarCommands.map(cmd => ({
        command: cmd.name,
        description: cmd.config.description,
        confidence: 0.5
      })));
    }
    
    // Add common commands as fallback
    const commonCommands = ['show help', 'show status', 'show context'];
    suggestions.push(...commonCommands.map(cmd => ({
      command: cmd,
      description: this.commandMappings[cmd].description,
      confidence: 0.3
    })));
    
    return {
      type: 'ambiguous',
      confidence: 0,
      method: 'ambiguity-handler',
      raw: input,
      message: `I'm not sure what you want to do. Did you mean one of these?`,
      suggestions: suggestions.slice(0, 5),
      original: partialIntent
    };
  }

  /**
   * Extract parameters from input
   */
  extractParams(input, defaultParams = {}) {
    const params = { ...defaultParams };
    
    // Extract branch names
    const branchMatch = input.match(/(?:branch|checkout|switch to)\s+([a-zA-Z0-9-_/]+)/i);
    if (branchMatch) {
      params.name = branchMatch[1];
    }
    
    // Extract file paths
    const fileMatch = input.match(/(?:file|path)\s+([^\s]+)/i);
    if (fileMatch) {
      params.file = fileMatch[1];
    }
    
    // Extract targets (production, staging, etc.)
    const targetMatch = input.match(/(?:to|into|on)\s+(production|staging|development|main|master)/i);
    if (targetMatch) {
      params.target = targetMatch[1];
    }
    
    // Extract messages
    const messageMatch = input.match(/(?:message|description|with)\s+"([^"]+)"/i);
    if (messageMatch) {
      params.message = messageMatch[1];
    }
    
    return params;
  }

  /**
   * Find command for intent type
   */
  findCommandForIntent(intentType, input) {
    const candidates = [];
    
    for (const [name, config] of Object.entries(this.commandMappings)) {
      if (name.toLowerCase().includes(intentType) || 
          config.tool.toLowerCase().includes(intentType)) {
        candidates.push({ name, config });
      }
    }
    
    // Return best match based on input similarity
    if (candidates.length === 1) {
      return candidates[0];
    } else if (candidates.length > 1) {
      // Use fuzzy matching to find best candidate
      const fuse = new Fuse(candidates, {
        keys: ['name'],
        includeScore: true
      });
      const results = fuse.search(input);
      return results[0]?.item || candidates[0];
    }
    
    return null;
  }

  /**
   * Find similar commands
   */
  findSimilarCommands(intentType) {
    const similar = [];
    
    for (const [name, config] of Object.entries(this.commandMappings)) {
      if (this.inferIntentType(name) === intentType) {
        similar.push({ name, config });
      }
    }
    
    return similar;
  }

  /**
   * Infer intent type from command name
   */
  inferIntentType(commandName) {
    const normalized = commandName.toLowerCase();
    
    for (const [type, config] of Object.entries(this.intentPatterns)) {
      if (config.verbs.some(v => normalized.includes(v)) ||
          config.keywords.some(k => normalized.includes(k))) {
        return type;
      }
    }
    
    return 'unknown';
  }

  /**
   * Cache intent resolution
   */
  cacheIntent(input, intent) {
    if (this.intentCache.size >= this.cacheMaxSize) {
      // Remove oldest entry
      const firstKey = this.intentCache.keys().next().value;
      this.intentCache.delete(firstKey);
    }
    
    this.intentCache.set(input, {
      ...intent,
      cached: true,
      cachedAt: new Date().toISOString()
    });
  }

  /**
   * Create error intent
   */
  createErrorIntent(input, error) {
    return {
      type: 'error',
      confidence: 0,
      method: 'error',
      raw: input,
      error: error.message,
      message: 'Failed to understand your request. Please try rephrasing or use "show help" for available commands.'
    };
  }

  /**
   * Get available commands
   */
  getAvailableCommands() {
    return Object.entries(this.commandMappings).map(([name, config]) => ({
      name,
      tool: config.tool,
      description: config.description,
      type: this.inferIntentType(name)
    }));
  }

  /**
   * Clear intent cache
   */
  clearCache() {
    this.intentCache.clear();
  }
}

export default IntentResolver;
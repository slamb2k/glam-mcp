/**
 * Configuration system for Slambed MCP
 * Supports both file-based and environment variable configuration
 */

import fs from "fs";
import path from "path";
import os from "os";

/**
 * Default configuration
 */
const DEFAULT_CONFIG = {
  // Git flow settings
  gitFlow: {
    defaultBranch: "main",
    branchPrefixes: {
      feature: "feature/",
      release: "release/",
      hotfix: "hotfix/",
      bugfix: "bugfix/",
      chore: "chore/",
      docs: "docs/",
    },
    autoMerge: true,
    deleteBranch: true,
    targetBranch: "main",
    branchStrategy: "auto", // auto | auto-fresh | reuse-with-check | always-reuse
    autoCleanupMerged: false, // Automatically cleanup merged branches before creating new ones
    warnOnMergedBranch: true, // Show warnings when working on merged branches
    allowOutdatedBase: false, // When true, allows operations on outdated base branches
  },

  // Automation settings
  automation: {
    runFormat: true,
    runLint: true,
    runTests: false,
    pushAfterCommit: true,
    createPR: true,
    prTemplate: {
      title: "{{type}}: {{message}}",
      body: `## Summary
{{message}}

## Changes Made
{{changes}}

## Testing
- [ ] Code formatting applied
- [ ] Linting checks passed
- [ ] Manual testing completed
- [ ] Automated tests pass

🤖 Generated with [Slambed MCP](https://github.com/your-username/slambed-mcp)`,
    },
  },

  // Script detection settings
  scripts: {
    format: [
      "npm run format",
      "yarn format",
      "pnpm format",
      "prettier --write .",
    ],
    lint: ["npm run lint", "yarn lint", "pnpm lint", "eslint ."],
    test: ["npm test", "yarn test", "pnpm test", "jest"],
    build: ["npm run build", "yarn build", "pnpm build"],
  },

  // Commit message templates
  commitTemplates: {
    feat: "feat: {{message}}",
    fix: "fix: {{message}}",
    docs: "docs: {{message}}",
    style: "style: {{message}}",
    refactor: "refactor: {{message}}",
    test: "test: {{message}}",
    chore: "chore: {{message}}",
    ci: "ci: {{message}}",
    perf: "perf: {{message}}",
  },

  // Branch name generation
  branchNaming: {
    maxLength: 50,
    separator: "-",
    includeDate: true,
    dateFormat: "YYYY-MM-DD",
    sanitization: {
      removeSpecialChars: true,
      lowercase: true,
      replaceSpaces: true,
    },
  },

  // CLI settings
  cli: {
    colors: true,
    interactive: true,
    confirmDestructive: true,
    verboseOutput: false,
  },

  // MCP server settings
  mcp: {
    maxConcurrentOperations: 5,
    timeout: 30000,
    retryAttempts: 3,
    logLevel: "info",
  },
};

/**
 * Configuration manager class
 */
export class ConfigManager {
  constructor() {
    this.config = { ...DEFAULT_CONFIG };
    this.configPaths = this.getConfigPaths();
    this.loadConfig();
  }

  /**
   * Get possible configuration file paths
   */
  getConfigPaths() {
    const cwd = process.cwd();
    const home = os.homedir();

    return [
      path.join(cwd, ".slambed.json"),
      path.join(cwd, ".slambed.config.json"),
      path.join(cwd, "slambed.config.json"),
      path.join(home, ".slambed.json"),
      path.join(home, ".config", "slambed", "config.json"),
    ];
  }

  /**
   * Load configuration from files and environment
   */
  loadConfig() {
    // Load from config files (in order of precedence)
    for (const configPath of this.configPaths) {
      if (fs.existsSync(configPath)) {
        try {
          const fileConfig = JSON.parse(fs.readFileSync(configPath, "utf8"));
          this.mergeConfig(fileConfig);
          console.log(`[Config] Loaded configuration from: ${configPath}`);
          break;
        } catch (error) {
          console.warn(
            `[Config] Warning: Could not parse config file ${configPath}: ${error.message}`,
          );
        }
      }
    }

    // Load from environment variables
    this.loadFromEnvironment();
  }

  /**
   * Load configuration from environment variables
   */
  loadFromEnvironment() {
    const envConfig = {};

    // Map environment variables to config paths
    const envMappings = {
      SLAMBED_DEFAULT_BRANCH: "gitFlow.defaultBranch",
      SLAMBED_AUTO_MERGE: "automation.autoMerge",
      SLAMBED_RUN_FORMAT: "automation.runFormat",
      SLAMBED_RUN_LINT: "automation.runLint",
      SLAMBED_RUN_TESTS: "automation.runTests",
      SLAMBED_TARGET_BRANCH: "gitFlow.targetBranch",
      SLAMBED_DELETE_BRANCH: "gitFlow.deleteBranch",
      SLAMBED_MAX_BRANCH_LENGTH: "branchNaming.maxLength",
      SLAMBED_VERBOSE: "cli.verboseOutput",
      SLAMBED_NO_COLORS: "cli.colors",
      SLAMBED_LOG_LEVEL: "mcp.logLevel",
    };

    for (const [envVar, configPath] of Object.entries(envMappings)) {
      const value = process.env[envVar];
      if (value !== undefined) {
        this.setNestedValue(envConfig, configPath, this.parseEnvValue(value));
      }
    }

    if (Object.keys(envConfig).length > 0) {
      this.mergeConfig(envConfig);
      console.log("[Config] Loaded configuration from environment variables");
    }
  }

  /**
   * Parse environment variable value to appropriate type
   */
  parseEnvValue(value) {
    // Boolean values
    if (value.toLowerCase() === "true") return true;
    if (value.toLowerCase() === "false") return false;

    // Number values
    if (/^\d+$/.test(value)) return parseInt(value);
    if (/^\d+\.\d+$/.test(value)) return parseFloat(value);

    // String values
    return value;
  }

  /**
   * Set nested object value using dot notation
   */
  setNestedValue(obj, path, value) {
    const keys = path.split(".");
    let current = obj;

    for (let i = 0; i < keys.length - 1; i++) {
      const key = keys[i];
      if (!(key in current)) {
        current[key] = {};
      }
      current = current[key];
    }

    current[keys[keys.length - 1]] = value;
  }

  /**
   * Deep merge configuration objects
   */
  mergeConfig(newConfig) {
    this.config = this.deepMerge(this.config, newConfig);
  }

  /**
   * Deep merge two objects
   */
  deepMerge(target, source) {
    const result = { ...target };

    for (const key in source) {
      if (
        source[key] &&
        typeof source[key] === "object" &&
        !Array.isArray(source[key])
      ) {
        result[key] = this.deepMerge(result[key] || {}, source[key]);
      } else {
        result[key] = source[key];
      }
    }

    return result;
  }

  /**
   * Get configuration value using dot notation
   */
  get(path, defaultValue = undefined) {
    const keys = path.split(".");
    let current = this.config;

    for (const key of keys) {
      if (current && typeof current === "object" && key in current) {
        current = current[key];
      } else {
        return defaultValue;
      }
    }

    return current;
  }

  /**
   * Set configuration value using dot notation
   */
  set(path, value) {
    this.setNestedValue(this.config, path, value);
  }

  /**
   * Get full configuration object
   */
  getAll() {
    return { ...this.config };
  }

  /**
   * Save current configuration to file
   */
  save(filePath = null) {
    const configPath = filePath || this.configPaths[0];

    try {
      // Ensure directory exists
      const dir = path.dirname(configPath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }

      fs.writeFileSync(configPath, JSON.stringify(this.config, null, 2));
      console.log(`[Config] Configuration saved to: ${configPath}`);
      return true;
    } catch (error) {
      console.error(`[Config] Error saving configuration: ${error.message}`);
      return false;
    }
  }

  /**
   * Reset configuration to defaults
   */
  reset() {
    this.config = { ...DEFAULT_CONFIG };
  }

  /**
   * Validate configuration
   */
  validate() {
    const errors = [];

    // Validate branch prefixes
    const prefixes = this.get("gitFlow.branchPrefixes", {});
    for (const [type, prefix] of Object.entries(prefixes)) {
      if (typeof prefix !== "string" || prefix.length === 0) {
        errors.push(
          `Invalid branch prefix for ${type}: must be non-empty string`,
        );
      }
    }

    // Validate branch naming settings
    const maxLength = this.get("branchNaming.maxLength");
    if (typeof maxLength !== "number" || maxLength < 10 || maxLength > 100) {
      errors.push("branchNaming.maxLength must be between 10 and 100");
    }

    // Validate MCP settings
    const timeout = this.get("mcp.timeout");
    if (typeof timeout !== "number" || timeout < 1000 || timeout > 120000) {
      errors.push("mcp.timeout must be between 1000 and 120000 milliseconds");
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * Get configuration for specific tool or operation
   */
  getToolConfig(toolName) {
    const toolConfigs = {
      "auto-commit": {
        autoMerge: this.get("gitFlow.autoMerge"),
        runFormat: this.get("automation.runFormat"),
        runLint: this.get("automation.runLint"),
        targetBranch: this.get("gitFlow.targetBranch"),
        deleteBranch: this.get("gitFlow.deleteBranch"),
        branchPrefix: this.get("gitFlow.branchPrefixes.feature"),
      },
      "git-flow": {
        defaultBranch: this.get("gitFlow.defaultBranch"),
        branchPrefixes: this.get("gitFlow.branchPrefixes"),
        autoMerge: this.get("gitFlow.autoMerge"),
        deleteBranch: this.get("gitFlow.deleteBranch"),
      },
      "branch-naming": {
        maxLength: this.get("branchNaming.maxLength"),
        separator: this.get("branchNaming.separator"),
        includeDate: this.get("branchNaming.includeDate"),
        sanitization: this.get("branchNaming.sanitization"),
      },
    };

    return toolConfigs[toolName] || {};
  }
}

// Export singleton instance
export const config = new ConfigManager();

// Export convenience function
export const getConfig = () => config.getAll();

// Export default configuration for reference
export { DEFAULT_CONFIG };

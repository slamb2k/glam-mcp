/**
 * Tests for configuration system
 */

import { ConfigManager, DEFAULT_CONFIG } from "../src/config.js";

export async function testConfiguration() {
  const tests = [];

  // Test ConfigManager instantiation
  try {
    const config = new ConfigManager();
    tests.push({
      name: "ConfigManager - should instantiate successfully",
      passed: config instanceof ConfigManager,
      details: "ConfigManager created",
    });

    // Test default configuration loading
    const defaultBranch = config.get("gitFlow.defaultBranch");
    tests.push({
      name: "Configuration - should load default values",
      passed: defaultBranch === "main",
      details: `Default branch: ${defaultBranch}`,
    });

    // Test nested configuration access
    const branchPrefixes = config.get("gitFlow.branchPrefixes");
    tests.push({
      name: "Configuration - should access nested values",
      passed:
        typeof branchPrefixes === "object" &&
        branchPrefixes.feature === "feature/" &&
        branchPrefixes.hotfix === "hotfix/",
      details: `Feature prefix: ${branchPrefixes.feature}, Hotfix prefix: ${branchPrefixes.hotfix}`,
    });

    // Test configuration with default fallback
    const nonExistent = config.get("nonexistent.path", "fallback");
    tests.push({
      name: "Configuration - should return fallback for non-existent paths",
      passed: nonExistent === "fallback",
      details: `Fallback value returned: ${nonExistent}`,
    });

    // Test configuration setting
    config.set("test.value", "test123");
    const testValue = config.get("test.value");
    tests.push({
      name: "Configuration - should set and get values",
      passed: testValue === "test123",
      details: `Set and retrieved: ${testValue}`,
    });

    // Test configuration validation
    const validation = config.validate();
    tests.push({
      name: "Configuration - should validate successfully",
      passed: validation.valid === true && Array.isArray(validation.errors),
      details: `Valid: ${validation.valid}, Errors: ${validation.errors.length}`,
    });

    // Test tool-specific configuration
    const autoCommitConfig = config.getToolConfig("auto-commit");
    tests.push({
      name: "Configuration - should provide tool-specific config",
      passed:
        typeof autoCommitConfig === "object" &&
        typeof autoCommitConfig.autoMerge === "boolean" &&
        typeof autoCommitConfig.targetBranch === "string",
      details: `Auto-merge: ${autoCommitConfig.autoMerge}, Target: ${autoCommitConfig.targetBranch}`,
    });

    // Test configuration merging
    config.mergeConfig({
      gitFlow: {
        customSetting: "test",
      },
      newSection: {
        newValue: 42,
      },
    });

    const customSetting = config.get("gitFlow.customSetting");
    const newValue = config.get("newSection.newValue");
    tests.push({
      name: "Configuration - should merge configurations",
      passed: customSetting === "test" && newValue === 42,
      details: `Merged values: ${customSetting}, ${newValue}`,
    });

    // Test environment variable parsing
    const boolTrue = config.parseEnvValue("true");
    const boolFalse = config.parseEnvValue("false");
    const number = config.parseEnvValue("42");
    const string = config.parseEnvValue("hello");

    tests.push({
      name: "Configuration - should parse environment values correctly",
      passed:
        boolTrue === true &&
        boolFalse === false &&
        number === 42 &&
        string === "hello",
      details: `Parsed: ${boolTrue}, ${boolFalse}, ${number}, ${string}`,
    });

    // Test configuration paths
    const paths = config.getConfigPaths();
    tests.push({
      name: "Configuration - should provide config file paths",
      passed: Array.isArray(paths) && paths.length > 0,
      details: `Found ${paths.length} potential config paths`,
    });

    // Test configuration reset
    config.reset();
    const resetBranch = config.get("gitFlow.defaultBranch");
    const resetCustom = config.get("gitFlow.customSetting");
    tests.push({
      name: "Configuration - should reset to defaults",
      passed: resetBranch === "main" && resetCustom === undefined,
      details: `Reset successful, custom setting removed: ${resetCustom === undefined}`,
    });
  } catch (error) {
    tests.push({
      name: "ConfigManager - should instantiate successfully",
      passed: false,
      error: error.message,
    });
  }

  // Test DEFAULT_CONFIG structure
  try {
    tests.push({
      name: "DEFAULT_CONFIG - should have required structure",
      passed:
        typeof DEFAULT_CONFIG === "object" &&
        typeof DEFAULT_CONFIG.gitFlow === "object" &&
        typeof DEFAULT_CONFIG.automation === "object" &&
        typeof DEFAULT_CONFIG.branchNaming === "object" &&
        typeof DEFAULT_CONFIG.cli === "object" &&
        typeof DEFAULT_CONFIG.mcp === "object",
      details: "All required configuration sections present",
    });

    tests.push({
      name: "DEFAULT_CONFIG - should have valid git flow settings",
      passed:
        DEFAULT_CONFIG.gitFlow.defaultBranch === "main" &&
        typeof DEFAULT_CONFIG.gitFlow.branchPrefixes === "object" &&
        DEFAULT_CONFIG.gitFlow.branchPrefixes.feature === "feature/" &&
        typeof DEFAULT_CONFIG.gitFlow.autoMerge === "boolean",
      details: "Git flow settings are valid",
    });

    tests.push({
      name: "DEFAULT_CONFIG - should have valid automation settings",
      passed:
        typeof DEFAULT_CONFIG.automation.runFormat === "boolean" &&
        typeof DEFAULT_CONFIG.automation.runLint === "boolean" &&
        typeof DEFAULT_CONFIG.automation.prTemplate === "object" &&
        typeof DEFAULT_CONFIG.automation.prTemplate.title === "string",
      details: "Automation settings are valid",
    });
  } catch (error) {
    tests.push({
      name: "DEFAULT_CONFIG - should have required structure",
      passed: false,
      error: error.message,
    });
  }

  return tests;
}

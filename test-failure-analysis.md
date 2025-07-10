# Test Failure Analysis Report

Generated: 7/11/2025, 2:35:14 AM

## Summary

Total Failing Tests: **93**

### Failure Categories

| Category | Count | Percentage |
|----------|-------|------------|
| API_MISMATCH | 1 | 1.1% |
| ASSERTION_MISMATCH | 6 | 6.5% |
| TYPE_ERROR | 5 | 5.4% |
| MODULE_NOT_FOUND | 2 | 2.2% |
| UNDEFINED_PROPERTY | 4 | 4.3% |
| ENHANCER_ISSUE | 22 | 23.7% |
| TOOL_HANDLER_ISSUE | 19 | 20.4% |
| SESSION_CONTEXT_ISSUE | 7 | 7.5% |
| GIT_OPERATION_ISSUE | 18 | 19.4% |
| OTHER | 9 | 9.7% |

## Detailed Analysis

### API_MISMATCH (1 failures)

#### tests/unit/tools/automation.test.js

- **should run tests in watch mode**
  ```
  ✕ should run tests in watch mode (1 ms)
  ● Automation Tools › auto_commit › should be registered with correct metadata
    expect(received).toHaveProperty(path)
  ...
  ```

### ASSERTION_MISMATCH (6 failures)

#### tests/unit/enhancers/core-enhancers.test.js

- **should find file contributors**
  ```
  ✕ should find file contributors (1 ms)
      ✕ should detect potential conflicts
      ✕ should handle errors gracefully
  ...
  ```

#### tests/unit/services/tool-discovery.test.js

- **should search tools with combined criteria**
  ```
  ✕ should search tools with combined criteria (1 ms)
      ✕ should handle empty search
    getToolChain
  ...
  ```

#### tests/unit/enhancers/enhancer-registry.test.js

- **should return undefined for non-existent pipeline**
  ```
  ✕ should return undefined for non-existent pipeline (1 ms)
    removePipeline
      ✕ should remove existing pipeline
  ...
  ```

#### tests/unit/core/simple-response.test.js

- **should handle undefined data**
  ```
  ✕ should handle undefined data (2 ms)
  Git Helpers Coverage
  Tool Registry Singleton Coverage
  ...
  ```

#### tests/unit/boost-coverage.test.js

- **should test discovery patterns**
  ```
  ✕ should test discovery patterns (1 ms)
  ● Coverage Boost Tests › Context Operations › should test context operations
    Cannot find module '../../../src/context/context-operations.js' from 'tests/unit/boost-coverage.test.js'
  ...
  ```

#### tests/unit/enhancers/risk-assessment-enhancer.test.js

- **should respect configuration options**
  ```
  ✕ should respect configuration options (1 ms)
      error handling
        ✕ should handle missing context gracefully
  ...
  ```

### TYPE_ERROR (5 failures)

#### tests/unit/index.test.js

- **should handle tool execution errors**
  ```
  ✕ should handle tool execution errors (1 ms)
        ✕ should handle results without message property
        ✕ should stringify non-text results
  ...
  ```

#### tests/unit/tools/utilities.test.js

- **should generate documentation**
  ```
  ✕ should generate documentation (1 ms)
    code_metrics
      ✕ should calculate code metrics
  ...
  ```

#### tests/unit/tools/documentation.test.js

- **should generate catalog in different formats**
  ```
  ✕ should generate catalog in different formats (1 ms)
    generate_api_reference
      ✕ should generate API reference
  ...
  ```

#### tests/unit/enhancers/team-activity-enhancer.test.js

- **should invalidate cache after timeout**
  ```
  ✕ should invalidate cache after timeout (1 ms)
  ● TeamActivityEnhancer › enhance › recent activity detection › should add recent commits from team members
    TypeError: execSync.mockImplementation is not a function
  ...
  ```

#### tests/unit/services/tool-documentation.test.js

- **should generate documentation for a category**
  ```
  ✕ should generate documentation for a category (1 ms)
      ✕ should handle category not found
    generateQuickReference
  ...
  ```

### MODULE_NOT_FOUND (2 failures)

#### tests/unit/tools/tool-registry.test.js

- **should have required properties for each tool**
  ```
  ✕ should have required properties for each tool (1 ms)
      ✕ should have valid input schemas
  ● Tool Registry › registerAllTools › should register all tool categories
  ...
  ```

#### tests/unit/final-coverage-boost.test.js

- **should test git helper functions**
  ```
  ✕ should test git helper functions (1 ms)
    Enhancer Pipeline
      ✕ should test pipeline operations
  ...
  ```

### UNDEFINED_PROPERTY (4 failures)

#### tests/unit/enhancers/enhancer-registry.test.js

- **should register with custom options**
  ```
  ✕ should register with custom options (5 ms)
      ✕ should support method chaining
    unregister
  ...
  ```

#### tests/unit/core/simple-response.test.js

- **should handle null data**
  ```
  ✕ should handle null data (1 ms)
  ```

#### tests/unit/enhancers/index.test.js

- **should throw error if default pipeline not initialized**
  ```
  ✕ should throw error if default pipeline not initialized (2 ms)
    integration
      ✕ should support full initialization and enhancement flow
  ...
  ```

#### tests/unit/tools/tool-registry.test.js

- **should return specific tool by name**
  ```
  ✕ should return specific tool by name (2 ms)
        ✕ should return undefined for non-existent tool
      getToolsByCategory
  ```

### ENHANCER_ISSUE (22 failures)

#### tests/unit/enhancers/core-enhancers.test.js

- **should enhance response with all metadata**
  ```
  ✕ should enhance response with all metadata (2 ms)
      RiskAssessmentEnhancer
  ```
- **should identify system files as critical risk**
  ```
  ✕ should identify system files as critical risk (1 ms)
  ```
- **should identify security risks**
  ```
  ✕ should identify security risks (1 ms)
      SuggestionsEnhancer
  ```
- **should have correct initialization**
  ```
  ✕ should have correct initialization (1 ms)
  ```
- **should suggest commit when uncommitted changes exist**
  ```
  ✕ should suggest commit when uncommitted changes exist (1 ms)
        ✕ should provide workflow suggestions
        ✕ should handle custom suggestion generators
      TeamActivityEnhancer
  ```
- **should have correct initialization**
  ```
  ✕ should have correct initialization (2 ms)
  ```

#### tests/unit/enhancers/team-activity-enhancer.test.js

- **should provide collaboration suggestions**
  ```
  ✕ should provide collaboration suggestions (1 ms)
          ✕ should detect team working on similar features
        activity summary
          ✕ should generate activity summary
        error handling
  ```
- **should respect activity window configuration**
  ```
  ✕ should respect activity window configuration (2 ms)
  ```
- **should disable features based on configuration**
  ```
  ✕ should disable features based on configuration (1 ms)
        caching
  ```
- **should cache team activity data**
  ```
  ✕ should cache team activity data (1 ms)
  ```

#### tests/unit/enhancers/enhancer-registry.test.js

- **should create a new pipeline**
  ```
  ✕ should create a new pipeline (2 ms)
  ```
- **should create pipeline with options**
  ```
  ✕ should create pipeline with options (1 ms)
  ```
- **should use all enhancers if none specified**
  ```
  ✕ should use all enhancers if none specified (1 ms)
      ✕ should create pipeline with specific enhancers
      ✕ should throw error for duplicate pipeline name
  ...
  ```

#### tests/unit/boost-coverage.test.js

- **should test response creation patterns**
  ```
  ✕ should test response creation patterns (1 ms)
      Enhancer Patterns
  ```
- **should test enhancer registration patterns**
  ```
  ✕ should test enhancer registration patterns (1 ms)
      Session Patterns
  ```

#### tests/unit/enhancers/index.test.js

- **should create default pipeline**
  ```
  ✕ should create default pipeline (1 ms)
  ```
- **should return the registry**
  ```
  ✕ should return the registry (1 ms)
  ```
- **should accept custom registry**
  ```
  ✕ should accept custom registry (1 ms)
      createCustomPipeline
  ```
- **should create pipeline with specified enhancers**
  ```
  ✕ should create pipeline with specified enhancers (1 ms)
        ✕ should use custom name if provided
        ✕ should pass through all options
      enhance
  ```

#### tests/unit/enhancers/risk-assessment-enhancer.test.js

- **should identify system files as critical risk**
  ```
  ✕ should identify system files as critical risk (1 ms)
  ```
- **should identify executables as medium risk**
  ```
  ✕ should identify executables as medium risk (1 ms)
          ✕ should identify hidden files as low risk
        security risk assessment
  ```
- **should identify credentials as critical risk**
  ```
  ✕ should identify credentials as critical risk (1 ms)
          ✕ should identify personal data as high risk
          ✕ should identify API endpoints as medium risk
        risk mitigation
  ```

### TOOL_HANDLER_ISSUE (19 failures)

#### tests/unit/tools/automation.test.js

- **should be registered with correct metadata**
  ```
  ✕ should be registered with correct metadata (10 ms)
  ```
- **should handle full automation workflow**
  ```
  ✕ should handle full automation workflow (2 ms)
  ```
- **should handle full release workflow**
  ```
  ✕ should handle full release workflow (1 ms)
        ✕ should handle npm publish
      create_package
  ```
- **should create npm package**
  ```
  ✕ should create npm package (1 ms)
      run_tests
  ```
- **should run tests with coverage**
  ```
  ✕ should run tests with coverage (2 ms)
  ```

#### tests/unit/index.test.js

- **should create a server with correct configuration**
  ```
  ✕ should create a server with correct configuration (4 ms)
        ✕ should setup tool handlers
  ```
- **should handle registry registration errors gracefully**
  ```
  ✕ should handle registry registration errors gracefully (1 ms)
    tool request handlers
      ListToolsRequestSchema handler
  ...
  ```

#### tests/unit/services/tool-discovery.test.js

- **should get popular tools**
  ```
  ✕ should get popular tools (2 ms)
      searchTools
  ```

#### tests/unit/tools/utilities.test.js

- **should be registered with correct metadata**
  ```
  ✕ should be registered with correct metadata (2 ms)
  ```
- **should generate repository map**
  ```
  ✕ should generate repository map (1 ms)
      ✕ should respect max depth
    search_todos
  ...
  ```
- **should check for unused dependencies**
  ```
  ✕ should check for unused dependencies (1 ms)
    create_npm_package
      ✕ should create npm package structure
  ...
  ```
- **should filter by modified time**
  ```
  ✕ should filter by modified time (1 ms)
      count_lines
        ✕ should count lines of code
      analyze_bundle
  ```

#### tests/unit/tools/documentation.test.js

- **should be registered with correct metadata**
  ```
  ✕ should be registered with correct metadata (5 ms)
  ```
- **should generate all documentation sections**
  ```
  ✕ should generate all documentation sections (1 ms)
        ✕ should respect section inclusion options
      generate_tool_docs
        ✕ should generate documentation for all tools
  ```
- **should generate docs for specific category**
  ```
  ✕ should generate docs for specific category (1 ms)
        ✕ should generate docs for specific tools
      update_tool_catalog
        ✕ should generate tool catalog
  ```

#### tests/unit/services/tool-documentation.test.js

- **should initialize with registry**
  ```
  ✕ should initialize with registry (1 ms)
    generateToolDocs
      ✕ should generate documentation for a tool
  ...
  ```

#### tests/unit/tools/tool-registry.test.js

- **should register all tool categories**
  ```
  ✕ should register all tool categories (2 ms)
  ```
- **should register utility tools**
  ```
  ✕ should register utility tools (1 ms)
      getRegisteredTools
        ✕ should return list of registered tools
      getTool
  ```
- **should return tools by category**
  ```
  ✕ should return tools by category (1 ms)
      tool structure
  ```

### SESSION_CONTEXT_ISSUE (7 failures)

#### tests/unit/enhancers/team-activity-enhancer.test.js

- **should handle missing context**
  ```
  ✕ should handle missing context (1 ms)
        configuration
  ```

#### tests/unit/core/simple-response.test.js

- **should add context**
  ```
  ✕ should add context (2 ms)
      Response validation
  ```

#### tests/unit/boost-coverage.test.js

- **should test context operations**
  ```
  ✕ should test context operations (2 ms)
      Git Operations
  ```
- **should test session operations**
  ```
  ✕ should test session operations (2 ms)
      Config Patterns
  ```

#### tests/unit/enhancers/index.test.js

- **should enhance response using default pipeline**
  ```
  ✕ should enhance response using default pipeline (1 ms)
        ✕ should use empty context if not provided
  ```

#### tests/unit/enhancers/risk-assessment-enhancer.test.js

- **should add mitigation suggestions for high risks**
  ```
  ✕ should add mitigation suggestions for high risks (1 ms)
        ✕ should provide context-aware mitigations
      custom risk evaluators
  ...
  ```

#### tests/unit/final-coverage-boost.test.js

- **should test documentation generation**
  ```
  ✕ should test documentation generation (1 ms)
    Tool Discovery Service
      ✕ should test discovery methods
  ...
  ```

### GIT_OPERATION_ISSUE (18 failures)

#### tests/unit/tools/automation.test.js

- **should handle uncommitted changes**
  ```
  ✕ should handle uncommitted changes (1 ms)
  ```
- **should skip optional steps**
  ```
  ✕ should skip optional steps (1 ms)
      quick_commit
  ```
- **should commit all changes quickly**
  ```
  ✕ should commit all changes quickly (1 ms)
        ✕ should generate commit message if not provided
      smart_commit
  ```
- **should analyze changes and create smart commit**
  ```
  ✕ should analyze changes and create smart commit (1 ms)
  ```
- **should push if requested**
  ```
  ✕ should push if requested (1 ms)
    auto_pr
      ✕ should create PR with generated content
  ...
  ```

#### tests/unit/enhancers/core-enhancers.test.js

- **should suggest next steps after branch creation**
  ```
  ✕ should suggest next steps after branch creation (1 ms)
  ```
- **should suggest PR creation after commits**
  ```
  ✕ should suggest PR creation after commits (1 ms)
        ✕ should add safety suggestions for high-risk operations
  ```
- **should track recent commits**
  ```
  ✕ should track recent commits (1 ms)
  ```
- **should identify related branches**
  ```
  ✕ should identify related branches (1 ms)
  ```

#### tests/unit/tools/utilities.test.js

- **should analyze webpack bundle**
  ```
  ✕ should analyze webpack bundle (1 ms)
      create_github_action
        ✕ should create CI workflow
        ✕ should create deploy workflow
      env_info
  ```
- **should gather environment information**
  ```
  ✕ should gather environment information (1 ms)
      git_cleanup
        ✕ should clean up merged branches
        ✕ should handle dry run mode
      git_history
  ```
- **should get commit history**
  ```
  ✕ should get commit history (1 ms)
        ✕ should filter by author
      git_stats
        ✕ should get repository statistics
      generate_docs
  ```

#### tests/unit/enhancers/team-activity-enhancer.test.js

- **should identify related branches**
  ```
  ✕ should identify related branches (1 ms)
  ```
- **should find active pull requests**
  ```
  ✕ should find active pull requests (1 ms)
      file contributor analysis
        ✕ should identify contributors for affected files
  ...
  ```
- **should handle git command failures gracefully**
  ```
  ✕ should handle git command failures gracefully (1 ms)
  ```

#### tests/unit/boost-coverage.test.js

- **should test git helper patterns**
  ```
  ✕ should test git helper patterns (1 ms)
      Enhanced Server
  ```

#### tests/unit/enhancers/risk-assessment-enhancer.test.js

- **should identify force push as high risk**
  ```
  ✕ should identify force push as high risk (1 ms)
        ✕ should identify main branch operations as high risk
        ✕ should identify hard reset as high risk
  ...
  ```

#### tests/unit/tools/tool-registry.test.js

- **should register github flow tools**
  ```
  ✕ should register github flow tools (1 ms)
        ✕ should register automation tools
  ```

### OTHER (9 failures)

#### tests/unit/index.test.js

- **should setup error handling**
  ```
  ✕ should setup error handling (1 ms)
    registerTools
      ✕ should register all tool categories
  ...
  ```
- **should register tool in the centralized registry**
  ```
  ✕ should register tool in the centralized registry (1 ms)
  ```

#### tests/unit/core/simple-response.test.js

- **should create success response**
  ```
  ✕ should create success response (3 ms)
  ```
- **should create error response**
  ```
  ✕ should create error response (1 ms)
  ```
- **should handle empty data**
  ```
  ✕ should handle empty data (1 ms)
      ResponseFactory
  ```
- **should add metadata**
  ```
  ✕ should add metadata (9 ms)
  ```

#### tests/unit/boost-coverage.test.js

- **should test server patterns**
  ```
  ✕ should test server patterns (1 ms)
      Tool Categories
  ```
- **should test all tool categories**
  ```
  ✕ should test all tool categories (1 ms)
      Response Patterns
  ```
- **should test config edge cases**
  ```
  ✕ should test config edge cases (1 ms)
      Tool Discovery
  ```

## Recommendations

Based on the analysis:

1. **API Contract Mismatches (1 failures)**: Update test expectations to match current API
2. **Assertion Mismatches (6 failures)**: Review and update expected values
3. **Mock Issues (0 failures)**: Fix mock configurations and call expectations
4. **Other Issues (9 failures)**: Require individual investigation

## Next Steps

1. Fix API contract mismatches by updating test expectations
2. Update outdated assertions to match current behavior
3. Review and fix mock configurations
4. Remove tests for deprecated functionality

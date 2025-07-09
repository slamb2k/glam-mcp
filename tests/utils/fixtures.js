/**
 * Test fixtures and data generators
 */

/**
 * Generate a sample repository configuration
 * @param {object} overrides - Properties to override
 * @returns {object} Repository configuration
 */
export function createRepoConfig(overrides = {}) {
  return {
    name: 'test-repo',
    owner: 'test-user',
    defaultBranch: 'main',
    remote: 'origin',
    path: '/test/repo',
    ...overrides,
  };
}

/**
 * Generate a sample PR configuration
 * @param {object} overrides - Properties to override
 * @returns {object} PR configuration
 */
export function createPRConfig(overrides = {}) {
  return {
    title: 'Test PR',
    body: 'This is a test pull request',
    base: 'main',
    head: 'feature/test',
    draft: false,
    assignees: [],
    reviewers: [],
    labels: [],
    milestone: null,
    ...overrides,
  };
}

/**
 * Generate sample file content
 * @param {string} type - Type of file content
 * @returns {string} File content
 */
export function generateFileContent(type = 'javascript') {
  const contents = {
    javascript: `export function testFunction(input) {
  if (!input) {
    throw new Error('Input is required');
  }
  return input.toUpperCase();
}

export class TestClass {
  constructor(name) {
    this.name = name;
  }
  
  getName() {
    return this.name;
  }
}`,
    
    json: `{
  "name": "test-package",
  "version": "1.0.0",
  "description": "Test package",
  "main": "index.js",
  "scripts": {
    "test": "jest",
    "build": "npm run test"
  },
  "dependencies": {
    "example": "^1.0.0"
  }
}`,
    
    markdown: `# Test Document

This is a test markdown document.

## Features

- Feature 1
- Feature 2
- Feature 3

## Usage

\`\`\`javascript
import { test } from './test.js';
test();
\`\`\``,
    
    yaml: `name: Test Workflow
on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Run tests
        run: npm test`,
  };
  
  return contents[type] || contents.javascript;
}

/**
 * Create a sample user configuration
 * @param {object} overrides - Properties to override
 * @returns {object} User configuration
 */
export function createUserConfig(overrides = {}) {
  return {
    name: 'Test User',
    email: 'test@example.com',
    githubUsername: 'testuser',
    preferences: {
      editor: 'vscode',
      theme: 'dark',
      autoCommit: false,
      verboseOutput: true,
    },
    ...overrides,
  };
}

/**
 * Create sample test data for different scenarios
 * @param {string} scenario - Test scenario name
 * @returns {object} Test data for scenario
 */
export function getScenarioData(scenario) {
  const scenarios = {
    simpleCommit: {
      files: ['src/index.js', 'README.md'],
      message: 'Update documentation',
      branch: 'main',
    },
    
    featureBranch: {
      baseBranch: 'main',
      newBranch: 'feature/new-feature',
      files: ['src/feature.js', 'tests/feature.test.js'],
      commits: 3,
    },
    
    mergeConflict: {
      branch1: 'feature/a',
      branch2: 'feature/b',
      conflictFile: 'src/shared.js',
      conflictContent: {
        ours: 'export const VERSION = "1.0.0";',
        theirs: 'export const VERSION = "2.0.0";',
      },
    },
    
    pullRequest: {
      sourceBranch: 'feature/pr-test',
      targetBranch: 'main',
      title: 'Add new feature',
      description: 'This PR adds a new feature to the system',
      files: ['src/newFeature.js', 'docs/newFeature.md'],
      reviewers: ['reviewer1', 'reviewer2'],
    },
    
    largeRepository: {
      fileCount: 1000,
      directoryDepth: 5,
      branchCount: 50,
      commitCount: 10000,
    },
  };
  
  return scenarios[scenario] || {};
}

/**
 * Generate mock API responses
 * @param {string} endpoint - API endpoint name
 * @param {object} options - Response options
 * @returns {object} Mock API response
 */
export function createMockAPIResponse(endpoint, options = {}) {
  const responses = {
    '/repos/owner/repo': {
      id: 123456,
      name: 'repo',
      full_name: 'owner/repo',
      owner: {
        login: 'owner',
        id: 789,
      },
      private: false,
      description: 'Test repository',
      fork: false,
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z',
      pushed_at: '2024-01-01T00:00:00Z',
      homepage: '',
      size: 100,
      stargazers_count: 10,
      watchers_count: 10,
      language: 'JavaScript',
      has_issues: true,
      has_projects: true,
      has_downloads: true,
      has_wiki: true,
      has_pages: false,
      forks_count: 5,
      archived: false,
      disabled: false,
      open_issues_count: 3,
      license: {
        key: 'mit',
        name: 'MIT License',
      },
      topics: ['mcp', 'git', 'automation'],
      visibility: 'public',
      default_branch: 'main',
      ...options,
    },
    
    '/repos/owner/repo/pulls': [
      {
        id: 1,
        number: 42,
        state: 'open',
        title: 'Test PR',
        user: {
          login: 'testuser',
        },
        body: 'Test PR description',
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
        head: {
          ref: 'feature/test',
          sha: 'abc123',
        },
        base: {
          ref: 'main',
          sha: 'def456',
        },
        ...options,
      },
    ],
    
    '/user': {
      login: 'testuser',
      id: 12345,
      avatar_url: 'https://avatars.githubusercontent.com/u/12345',
      name: 'Test User',
      email: 'test@example.com',
      bio: 'Test user bio',
      company: 'Test Company',
      location: 'Test Location',
      hireable: true,
      public_repos: 10,
      public_gists: 5,
      followers: 100,
      following: 50,
      created_at: '2020-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z',
      ...options,
    },
  };
  
  return responses[endpoint] || {};
}
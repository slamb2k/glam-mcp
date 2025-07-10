/**
 * Mock data for testing
 */

export const mockGitData = {
  status: {
    clean: '',
    withChanges: 'M  src/file1.js\n A src/file2.js\n?? src/file3.js',
    withStaged: 'M  src/file1.js\nA  src/file2.js',
  },
  
  branches: {
    single: '* main',
    multiple: '* feature/test\n  main\n  develop',
    withRemotes: '* feature/test\n  main\n  remotes/origin/main\n  remotes/origin/develop',
  },
  
  commits: {
    single: 'abc123 Test commit',
    multiple: [
      'abc123 Latest commit',
      'def456 Previous commit',
      '789ghi Older commit',
    ].join('\n'),
    withDetails: [
      'abc123|John Doe|john@example.com|Latest feature|2 hours ago',
      'def456|Jane Smith|jane@example.com|Bug fix|1 day ago',
    ].join('\n'),
  },
  
  diff: {
    empty: '',
    simple: '+console.log("test");\n-console.log("old");',
    complex: `diff --git a/src/file.js b/src/file.js
index abc123..def456 100644
--- a/src/file.js
+++ b/src/file.js
@@ -1,5 +1,6 @@
 function test() {
-  console.log("old");
+  console.log("new");
+  console.log("added");
 }`,
  },
  
  remotes: {
    single: 'origin\thttps://github.com/user/repo.git (fetch)\norigin\thttps://github.com/user/repo.git (push)',
    multiple: [
      'origin\thttps://github.com/user/repo.git (fetch)',
      'origin\thttps://github.com/user/repo.git (push)',
      'upstream\thttps://github.com/upstream/repo.git (fetch)',
      'upstream\thttps://github.com/upstream/repo.git (push)',
    ].join('\n'),
  },
};

export const mockFileSystem = {
  packageJson: {
    minimal: JSON.stringify({
      name: 'test-project',
      version: '1.0.0',
    }, null, 2),
    
    withDeps: JSON.stringify({
      name: 'test-project',
      version: '1.0.0',
      dependencies: {
        'express': '^4.18.0',
        'lodash': '^4.17.21',
      },
      devDependencies: {
        'jest': '^29.0.0',
        'eslint': '^8.0.0',
      },
    }, null, 2),
    
    withScripts: JSON.stringify({
      name: 'test-project',
      version: '1.0.0',
      scripts: {
        'test': 'jest',
        'lint': 'eslint .',
        'build': 'webpack',
      },
    }, null, 2),
  },
  
  sourceFiles: {
    javascript: `// Test file
export function testFunction(param) {
  return param * 2;
}

export default testFunction;`,
    
    typescript: `// Test TypeScript file
export interface TestInterface {
  id: number;
  name: string;
}

export function testFunction(param: number): number {
  return param * 2;
}`,
    
    markdown: `# Test Document

## Section 1
This is a test document.

## Section 2
- Item 1
- Item 2`,
  },
  
  configs: {
    eslint: JSON.stringify({
      extends: ['eslint:recommended'],
      env: {
        node: true,
        es2022: true,
      },
      rules: {
        'no-console': 'warn',
      },
    }, null, 2),
    
    prettier: JSON.stringify({
      semi: true,
      singleQuote: true,
      tabWidth: 2,
      trailingComma: 'es5',
    }, null, 2),
  },
};

export const mockApiResponses = {
  github: {
    user: {
      login: 'testuser',
      id: 12345,
      avatar_url: 'https://github.com/testuser.png',
      type: 'User',
    },
    
    repo: {
      id: 123456,
      name: 'test-repo',
      full_name: 'testuser/test-repo',
      private: false,
      description: 'Test repository',
      default_branch: 'main',
    },
    
    pullRequest: {
      number: 42,
      title: 'Test PR',
      state: 'open',
      user: { login: 'testuser' },
      base: { ref: 'main' },
      head: { ref: 'feature/test' },
    },
    
    issues: [
      {
        number: 1,
        title: 'Test issue',
        state: 'open',
        user: { login: 'testuser' },
        labels: [{ name: 'bug' }],
      },
    ],
  },
  
  npm: {
    packageInfo: {
      name: 'test-package',
      version: '1.0.0',
      description: 'Test package',
      'dist-tags': { latest: '1.0.0' },
      versions: ['0.1.0', '0.2.0', '1.0.0'],
    },
    
    searchResults: {
      objects: [
        {
          package: {
            name: 'test-package',
            version: '1.0.0',
            description: 'Test package',
          },
        },
      ],
      total: 1,
    },
  },
};

export const mockToolResponses = {
  success: {
    success: true,
    data: { result: 'Operation completed' },
    message: 'Success',
  },
  
  error: {
    success: false,
    error: 'Operation failed',
    message: 'An error occurred',
  },
  
  withMetadata: {
    success: true,
    data: { result: 'Operation completed' },
    message: 'Success',
    metadata: {
      duration: 1500,
      timestamp: new Date().toISOString(),
    },
  },
  
  withContext: {
    success: true,
    data: { result: 'Operation completed' },
    message: 'Success',
    context: {
      workingDirectory: '/test/dir',
      currentBranch: 'main',
    },
  },
  
  enhanced: {
    success: true,
    data: { result: 'Operation completed' },
    message: 'Success',
    metadata: {
      enhanced: true,
      enhancers: ['MetadataEnhancer', 'RiskAssessmentEnhancer'],
    },
    risks: [
      {
        level: 'low',
        type: 'git',
        description: 'Minor changes',
      },
    ],
    suggestions: [
      {
        type: 'workflow',
        title: 'Next step',
        description: 'Consider creating a pull request',
      },
    ],
  },
};

export const mockErrors = {
  generic: new Error('Test error'),
  
  gitError: (() => {
    const err = new Error('fatal: not a git repository');
    err.code = 128;
    return err;
  })(),
  
  fileNotFound: (() => {
    const err = new Error('ENOENT: no such file or directory');
    err.code = 'ENOENT';
    err.path = '/test/missing.js';
    return err;
  })(),
  
  networkError: (() => {
    const err = new Error('ECONNREFUSED');
    err.code = 'ECONNREFUSED';
    err.syscall = 'connect';
    return err;
  })(),
  
  permissionError: (() => {
    const err = new Error('EACCES: permission denied');
    err.code = 'EACCES';
    err.path = '/test/protected.js';
    return err;
  })(),
};

/**
 * Helper to generate random test data
 */
export const generators = {
  randomString(length = 10) {
    return Math.random().toString(36).substring(2, 2 + length);
  },
  
  randomId() {
    return `${Date.now()}-${this.randomString(6)}`;
  },
  
  randomEmail() {
    return `test-${this.randomString(8)}@example.com`;
  },
  
  randomCommitHash() {
    return this.randomString(40);
  },
  
  randomBranchName() {
    const types = ['feature', 'bugfix', 'hotfix', 'chore'];
    const type = types[Math.floor(Math.random() * types.length)];
    return `${type}/${this.randomString(8)}`;
  },
  
  randomFileName() {
    const extensions = ['.js', '.ts', '.json', '.md', '.txt'];
    const ext = extensions[Math.floor(Math.random() * extensions.length)];
    return `${this.randomString(8)}${ext}`;
  },
};
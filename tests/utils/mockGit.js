import { jest } from '@jest/globals';

/**
 * Create a mock simpleGit instance
 * @param {object} overrides - Methods to override
 * @returns {object} Mock git instance
 */
export function createMockGit(overrides = {}) {
  const defaultMocks = {
    status: jest.fn().mockResolvedValue({
      current: 'main',
      tracking: 'origin/main',
      ahead: 0,
      behind: 0,
      files: [],
      created: [],
      deleted: [],
      modified: [],
      renamed: [],
      conflicted: [],
      isClean: () => true,
    }),
    
    branch: jest.fn().mockResolvedValue({
      current: 'main',
      all: ['main', 'feature/test'],
      branches: {
        main: { current: true, name: 'main', commit: 'abc123' },
        'feature/test': { current: false, name: 'feature/test', commit: 'def456' },
      },
    }),
    
    log: jest.fn().mockResolvedValue({
      all: [
        {
          hash: 'abc123',
          date: '2024-01-01',
          message: 'Initial commit',
          author_name: 'Test User',
          author_email: 'test@example.com',
        },
      ],
      latest: {
        hash: 'abc123',
        date: '2024-01-01',
        message: 'Initial commit',
        author_name: 'Test User',
        author_email: 'test@example.com',
      },
    }),
    
    add: jest.fn().mockResolvedValue(undefined),
    commit: jest.fn().mockResolvedValue({ commit: 'abc123' }),
    push: jest.fn().mockResolvedValue(undefined),
    pull: jest.fn().mockResolvedValue(undefined),
    fetch: jest.fn().mockResolvedValue(undefined),
    checkout: jest.fn().mockResolvedValue(undefined),
    checkoutBranch: jest.fn().mockResolvedValue(undefined),
    merge: jest.fn().mockResolvedValue(undefined),
    reset: jest.fn().mockResolvedValue(undefined),
    revert: jest.fn().mockResolvedValue(undefined),
    stash: jest.fn().mockResolvedValue(undefined),
    
    diff: jest.fn().mockResolvedValue(''),
    diffSummary: jest.fn().mockResolvedValue({
      changed: 0,
      insertions: 0,
      deletions: 0,
      files: [],
    }),
    
    getRemotes: jest.fn().mockResolvedValue([
      { name: 'origin', refs: { fetch: 'https://github.com/test/repo.git' } },
    ]),
    
    raw: jest.fn().mockResolvedValue(''),
    
    revparse: jest.fn().mockResolvedValue(''),
    
    clean: jest.fn().mockResolvedValue(undefined),
  };
  
  return {
    ...defaultMocks,
    ...overrides,
  };
}

/**
 * Create mock Git status with specific file states
 * @param {object} options - Status options
 * @returns {object} Mock status object
 */
export function createMockStatus(options = {}) {
  const {
    current = 'main',
    tracking = 'origin/main',
    ahead = 0,
    behind = 0,
    modified = [],
    created = [],
    deleted = [],
    renamed = [],
    conflicted = [],
  } = options;
  
  const files = [
    ...modified.map(file => ({ path: file, index: 'M', working_dir: 'M' })),
    ...created.map(file => ({ path: file, index: 'A', working_dir: '?' })),
    ...deleted.map(file => ({ path: file, index: 'D', working_dir: 'D' })),
    ...renamed.map(file => ({ path: file.from, path2: file.to, index: 'R', working_dir: 'R' })),
    ...conflicted.map(file => ({ path: file, index: 'U', working_dir: 'U' })),
  ];
  
  return {
    current,
    tracking,
    ahead,
    behind,
    files,
    created,
    deleted,
    modified,
    renamed,
    conflicted,
    isClean: () => files.length === 0,
  };
}

/**
 * Create mock commit history
 * @param {number} count - Number of commits to generate
 * @param {object} options - Commit options
 * @returns {array} Array of mock commits
 */
export function createMockCommits(count = 5, options = {}) {
  const commits = [];
  const baseDate = new Date();
  
  for (let i = 0; i < count; i++) {
    const date = new Date(baseDate);
    date.setHours(date.getHours() - i);
    
    commits.push({
      hash: `${i.toString(16).padStart(7, '0')}abcdef`,
      date: date.toISOString(),
      message: options.message || `Commit ${i + 1}`,
      author_name: options.author || 'Test User',
      author_email: options.email || 'test@example.com',
      body: '',
    });
  }
  
  return commits;
}

/**
 * Create mock branch information
 * @param {array} branchNames - Array of branch names
 * @param {string} current - Current branch name
 * @returns {object} Mock branch object
 */
export function createMockBranches(branchNames = ['main', 'develop'], current = 'main') {
  const branches = {};
  
  branchNames.forEach(name => {
    branches[name] = {
      current: name === current,
      name,
      commit: Math.random().toString(36).substring(2, 9),
      label: name,
    };
  });
  
  return {
    current,
    all: branchNames,
    branches,
  };
}

/**
 * Create mock diff summary
 * @param {array} files - Array of file changes
 * @returns {object} Mock diff summary
 */
export function createMockDiffSummary(files = []) {
  let insertions = 0;
  let deletions = 0;
  
  const fileDetails = files.map(file => {
    const ins = file.insertions || Math.floor(Math.random() * 100);
    const del = file.deletions || Math.floor(Math.random() * 50);
    
    insertions += ins;
    deletions += del;
    
    return {
      file: file.path || file,
      changes: ins + del,
      insertions: ins,
      deletions: del,
      binary: false,
    };
  });
  
  return {
    changed: files.length,
    insertions,
    deletions,
    files: fileDetails,
  };
}

/**
 * Create a mock remote configuration
 * @param {string} name - Remote name
 * @param {string} url - Remote URL
 * @returns {object} Mock remote object
 */
export function createMockRemote(name = 'origin', url = 'https://github.com/test/repo.git') {
  return {
    name,
    refs: {
      fetch: url,
      push: url,
    },
  };
}

/**
 * Mock Git error
 * @param {string} message - Error message
 * @param {string} code - Git error code
 * @returns {Error} Mock Git error
 */
export function createGitError(message, code = 'GitError') {
  const error = new Error(message);
  error.code = code;
  error.name = 'GitError';
  return error;
}
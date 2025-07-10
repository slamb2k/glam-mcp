/** @type {import('jest').Config} */
export default {
  testEnvironment: 'node',
  transform: {},
  coverageDirectory: 'coverage',
  collectCoverageFrom: [
    'src/**/*.js',
    '!src/**/*.test.js',
    '!src/**/*.spec.js',
    '!src/index.js',
  ],
  coverageReporters: ['text', 'lcov', 'html', 'json'],
  collectCoverage: true,
  coverageThreshold: {
    global: {
      branches: 70,
      functions: 70,
      lines: 70,
      statements: 70,
    },
    './src/core/**/*.js': {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80,
    },
    './src/tools/**/*.js': {
      branches: 60,
      functions: 60,
      lines: 60,
      statements: 60,
    },
    './src/utils/**/*.js': {
      branches: 70,
      functions: 70,
      lines: 70,
      statements: 70,
    },
    './src/services/**/*.js': {
      branches: 50,
      functions: 50,
      lines: 50,
      statements: 50,
    },
    './src/clients/**/*.js': {
      branches: 50,
      functions: 50,
      lines: 50,
      statements: 50,
    },
  },
  testMatch: [
    '**/__tests__/**/*.js',
    '**/*.test.js',
    '**/*.spec.js',
  ],
  testPathIgnorePatterns: [
    '/node_modules/',
    '/coverage/',
    '/dist/',
  ],
  verbose: true,
  testTimeout: 10000,
  moduleFileExtensions: ['js', 'json', 'node'],
  rootDir: '.',
  globals: {
    'NODE_ENV': 'test',
  },
};
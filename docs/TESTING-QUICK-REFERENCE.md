# Testing Quick Reference

## Essential Commands

```bash
npm test                    # Run all tests
npm test -- file.test.js    # Run specific file
npm run test:watch          # Watch mode
npm run coverage            # Run tests + coverage report
npm run coverage:report     # View coverage summary
```

## Writing a Basic Test

```javascript
import { jest } from '@jest/globals';

describe('MyModule', () => {
  it('should work', () => {
    expect(1 + 1).toBe(2);
  });
});
```

## Testing a Tool Handler

```javascript
import { setupToolTest, toolAssertions } from '../../test-utils/tool-testing-helpers.js';

describe('MyTool', () => {
  const testContext = setupToolTest('my-tool');
  
  beforeEach(async () => {
    await testContext.setup();
    // Register tool
  });
  
  afterEach(async () => {
    await testContext.teardown();
  });
  
  it('should handle request', async () => {
    const tool = testContext.getTool('tool_name');
    const result = await tool.handler({ param: 'value' });
    toolAssertions.assertSuccess(result);
  });
});
```

## Common Mocking Patterns

### Mock File System
```javascript
const mockFs = {
  readFileSync: jest.fn().mockReturnValue('content'),
  writeFileSync: jest.fn(),
  existsSync: jest.fn().mockReturnValue(true)
};

jest.unstable_mockModule('fs', () => ({ default: mockFs }));
```

### Mock Child Process
```javascript
const mockExecSync = jest.fn().mockReturnValue('output');
jest.unstable_mockModule('child_process', () => ({
  execSync: mockExecSync
}));
```

### Mock External Module
```javascript
jest.unstable_mockModule('../path/to/module.js', () => ({
  myFunction: jest.fn().mockResolvedValue('result')
}));
```

## Test Helpers

### Tool Assertions
```javascript
toolAssertions.assertSuccess(result);
toolAssertions.assertFailure(result, 'Expected error');
toolAssertions.assertValidToolResponse(result);
toolAssertions.assertToolMetadata(tool, { category: 'utility' });
```

### Input Simulators
```javascript
const fileInput = inputSimulators.createFileInput('/path', 'content');
const cmdInput = inputSimulators.createCommandInput('npm', ['test']);
const apiInput = inputSimulators.createApiInput('GET', '/api/test');
```

### Mock Builders
```javascript
const mockFs = mockBuilders.buildMockFileSystem({
  '/file.txt': 'content'
});
const mockHttp = mockBuilders.buildMockHttpClient({
  'GET /api': { data: 'response' }
});
```

### Side Effect Verifiers
```javascript
sideEffectVerifiers.verifyFileSystemChanges(mockFs, {
  created: [{ path: '/new.txt' }],
  modified: [{ path: '/existing.txt' }]
});

sideEffectVerifiers.verifyCommandExecutions(mockExec, [
  { command: 'git', args: ['status'] }
]);
```

## Coverage Thresholds

| Scope | Target |
|-------|--------|
| Global | 70% |
| Core (`src/core/**`) | 80% |
| Tools (`src/tools/**`) | 60% |

## Debugging Tips

```bash
# Run specific test
npm test -- --testNamePattern="should create"

# Verbose output
npm test -- --verbose

# Clear cache
npx jest --clearCache

# Debug with inspector
node --inspect-brk --experimental-vm-modules node_modules/.bin/jest --runInBand
```

## Best Practices Checklist

- [ ] Clear mocks in `beforeEach`
- [ ] Test success and failure cases
- [ ] Verify mock calls
- [ ] Use descriptive test names
- [ ] Keep tests focused
- [ ] Mock external dependencies
- [ ] Handle async properly
- [ ] Check coverage after changes

## Common Issues

**Module not found**: Mock before import
```javascript
jest.unstable_mockModule('module', () => ({ ... }));
const { myFunc } = await import('./my-module.js');
```

**Timeout errors**: Increase timeout
```javascript
jest.setTimeout(10000); // 10 seconds
```

**Mock not working**: Clear mocks
```javascript
beforeEach(() => {
  jest.clearAllMocks();
});
```
/* global describe, test, expect */

describe('Jest Setup', () => {
  test('Jest is configured correctly', () => {
    expect(true).toBe(true);
  });

  test('ES modules work correctly', async () => {
    const testModule = await import('../utils/responses.js');
    expect(testModule).toBeDefined();
  });
});
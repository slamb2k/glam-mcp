#!/usr/bin/env node

/**
 * Script to identify obsolete tests
 */

import fs from 'fs/promises';
import path from 'path';
import { glob } from 'glob';

const TESTS_DIR = './tests';
const SRC_DIR = './src';

/**
 * Check if a module exists in the src directory
 */
async function moduleExists(modulePath) {
  try {
    await fs.access(path.join(process.cwd(), modulePath));
    return true;
  } catch {
    return false;
  }
}

/**
 * Extract import/require statements from a test file
 */
async function extractImports(filePath) {
  const content = await fs.readFile(filePath, 'utf8');
  const imports = [];
  
  // Match ES6 imports
  const es6Imports = content.match(/import\s+.*?\s+from\s+['"]([^'"]+)['"]/g) || [];
  for (const imp of es6Imports) {
    const match = imp.match(/from\s+['"]([^'"]+)['"]/);
    if (match && match[1].startsWith('../')) {
      imports.push(match[1]);
    }
  }
  
  // Match dynamic imports
  const dynamicImports = content.match(/import\s*\(\s*['"]([^'"]+)['"]\s*\)/g) || [];
  for (const imp of dynamicImports) {
    const match = imp.match(/import\s*\(\s*['"]([^'"]+)['"]\s*\)/);
    if (match && match[1].startsWith('../')) {
      imports.push(match[1]);
    }
  }
  
  // Match jest.mock calls
  const jestMocks = content.match(/jest\.(mock|unstable_mockModule)\s*\(\s*['"]([^'"]+)['"]/g) || [];
  for (const mock of jestMocks) {
    const match = mock.match(/jest\.(mock|unstable_mockModule)\s*\(\s*['"]([^'"]+)['"]/);
    if (match && match[2].startsWith('../')) {
      imports.push(match[2]);
    }
  }
  
  return imports;
}

/**
 * Resolve relative import path to absolute
 */
function resolveImportPath(testFile, importPath) {
  const testDir = path.dirname(testFile);
  const resolved = path.join(testDir, importPath);
  return path.relative(process.cwd(), resolved);
}

/**
 * Check if a test is obsolete
 */
async function checkTestObsolete(testFile) {
  const imports = await extractImports(testFile);
  const missingModules = [];
  
  for (const imp of imports) {
    const resolvedPath = resolveImportPath(testFile, imp);
    
    // Check both .js and without extension
    const exists = await moduleExists(resolvedPath) || 
                   await moduleExists(resolvedPath + '.js') ||
                   await moduleExists(resolvedPath + '/index.js');
    
    if (!exists) {
      missingModules.push({
        import: imp,
        resolved: resolvedPath
      });
    }
  }
  
  return {
    testFile: path.relative(process.cwd(), testFile),
    missingModules,
    isObsolete: missingModules.length > 0
  };
}

/**
 * Main function
 */
async function main() {
  console.log('Identifying obsolete tests...\n');
  
  // Find all test files
  const testFiles = await glob('**/*.test.js', { cwd: TESTS_DIR, absolute: true });
  
  const results = {
    obsolete: [],
    valid: [],
    errors: []
  };
  
  for (const testFile of testFiles) {
    try {
      const result = await checkTestObsolete(testFile);
      
      if (result.isObsolete) {
        results.obsolete.push(result);
      } else {
        results.valid.push(result);
      }
    } catch (error) {
      results.errors.push({
        testFile: path.relative(process.cwd(), testFile),
        error: error.message
      });
    }
  }
  
  // Report results
  console.log(`Total tests analyzed: ${testFiles.length}`);
  console.log(`Valid tests: ${results.valid.length}`);
  console.log(`Obsolete tests: ${results.obsolete.length}`);
  console.log(`Errors: ${results.errors.length}\n`);
  
  if (results.obsolete.length > 0) {
    console.log('Obsolete tests (referencing non-existent modules):');
    for (const test of results.obsolete) {
      console.log(`\n  ${test.testFile}`);
      for (const mod of test.missingModules) {
        console.log(`    - Missing: ${mod.import} (${mod.resolved})`);
      }
    }
  }
  
  if (results.errors.length > 0) {
    console.log('\nErrors encountered:');
    for (const err of results.errors) {
      console.log(`  ${err.testFile}: ${err.error}`);
    }
  }
  
  // Save detailed report
  const report = {
    timestamp: new Date().toISOString(),
    summary: {
      total: testFiles.length,
      valid: results.valid.length,
      obsolete: results.obsolete.length,
      errors: results.errors.length
    },
    obsoleteTests: results.obsolete,
    errors: results.errors
  };
  
  await fs.writeFile(
    'obsolete-tests-report.json',
    JSON.stringify(report, null, 2)
  );
  
  console.log('\nDetailed report saved to obsolete-tests-report.json');
}

// Run the script
main().catch(console.error);
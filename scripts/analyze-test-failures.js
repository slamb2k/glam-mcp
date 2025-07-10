#!/usr/bin/env node

import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

const FAILURE_PATTERNS = {
  API_MISMATCH: /expect\(.*\)\.toHaveProperty|Expected path:|Received path:|properties\..*\.toBeDefined|properties\..*\.toEqual/,
  ASSERTION_MISMATCH: /expect\(.*\)\.toBe\(|expect\(.*\)\.toEqual\(|Expected.*Received:/,
  MOCK_ISSUE: /mock.*not.*called|mock.*called.*times|toHaveBeenCalled|Mock.*expected/i,
  TYPE_ERROR: /TypeError:|Cannot read property|Cannot access|is not a function/,
  MODULE_NOT_FOUND: /Cannot find module|Module not found|Could not locate module/,
  ASYNC_ISSUE: /timeout|Promise rejection|async.*failed/i,
  UNDEFINED_PROPERTY: /undefined|null|not defined|is undefined/,
  ENHANCER_ISSUE: /enhancer|enhancement|enhance.*failed/i,
  TOOL_HANDLER_ISSUE: /toolHandler|tool.*handler|handler.*not.*found/i,
  SESSION_CONTEXT_ISSUE: /session|context|SessionManager/i,
  GIT_OPERATION_ISSUE: /git|branch|commit|checkout|merge/i,
  FILE_SYSTEM_ISSUE: /ENOENT|file.*not.*found|directory.*not.*exist/i,
};

const CATEGORIES = {
  API_MISMATCH: { count: 0, tests: [] },
  ASSERTION_MISMATCH: { count: 0, tests: [] },
  MOCK_ISSUE: { count: 0, tests: [] },
  TYPE_ERROR: { count: 0, tests: [] },
  MODULE_NOT_FOUND: { count: 0, tests: [] },
  ASYNC_ISSUE: { count: 0, tests: [] },
  UNDEFINED_PROPERTY: { count: 0, tests: [] },
  ENHANCER_ISSUE: { count: 0, tests: [] },
  TOOL_HANDLER_ISSUE: { count: 0, tests: [] },
  SESSION_CONTEXT_ISSUE: { count: 0, tests: [] },
  GIT_OPERATION_ISSUE: { count: 0, tests: [] },
  FILE_SYSTEM_ISSUE: { count: 0, tests: [] },
  OTHER: { count: 0, tests: [] }
};

function analyzeTestFailures() {
  console.log('🔍 Analyzing test failures...\n');

  try {
    // Run tests and capture output
    const output = execSync('npm test -- --no-coverage 2>&1', { 
      encoding: 'utf8',
      maxBuffer: 10 * 1024 * 1024 // 10MB buffer
    });
    
    processTestOutput(output);
  } catch (error) {
    // Tests failed, but we have the output
    if (error.stdout) {
      processTestOutput(error.stdout);
    }
    if (error.stderr) {
      processTestOutput(error.stderr);
    }
  }

  generateReport();
}

function processTestOutput(output) {
  const lines = output.split('\n');
  let currentTest = null;
  let currentFile = null;
  let errorContext = [];
  let inFailure = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Detect test file
    if (line.includes('FAIL tests/')) {
      currentFile = line.match(/FAIL (tests\/.*\.js)/)?.[1] || currentFile;
    }

    // Detect test case
    if (line.match(/✕\s+(.+)\s+\(\d+\s+ms\)/)) {
      if (currentTest && errorContext.length > 0) {
        categorizeFailure(currentTest, errorContext.join('\n'));
      }
      currentTest = {
        name: line.match(/✕\s+(.+)\s+\(\d+\s+ms\)/)[1],
        file: currentFile
      };
      errorContext = [];
      inFailure = true;
    }

    // Collect error context
    if (inFailure && line.trim() && !line.includes('✓')) {
      errorContext.push(line);
      
      // Stop collecting after we see the test location
      if (line.includes('at Object.<anonymous>')) {
        inFailure = false;
      }
    }
  }

  // Process last test
  if (currentTest && errorContext.length > 0) {
    categorizeFailure(currentTest, errorContext.join('\n'));
  }
}

function categorizeFailure(test, errorContext) {
  let categorized = false;
  let bestMatch = { category: null, score: 0 };

  // Score each pattern based on matches
  for (const [category, pattern] of Object.entries(FAILURE_PATTERNS)) {
    const matches = errorContext.match(pattern);
    if (matches) {
      const score = matches.length;
      if (score > bestMatch.score) {
        bestMatch = { category, score };
      }
    }
  }

  // Additional specific checks for better categorization
  if (!bestMatch.category) {
    // Check for specific test failure patterns
    if (errorContext.includes('toolHandler is not a function') || 
        errorContext.includes('tool.handler is not a function')) {
      bestMatch.category = 'TOOL_HANDLER_ISSUE';
    } else if (errorContext.includes('Cannot destructure property') ||
               errorContext.includes('Cannot read properties of undefined')) {
      bestMatch.category = 'TYPE_ERROR';
    } else if (errorContext.includes('expect(') && errorContext.includes('toBe(')) {
      bestMatch.category = 'ASSERTION_MISMATCH';
    } else if (test.file && test.file.includes('enhancer')) {
      bestMatch.category = 'ENHANCER_ISSUE';
    } else if (test.file && test.file.includes('tool')) {
      bestMatch.category = 'TOOL_HANDLER_ISSUE';
    } else if (test.file && test.file.includes('session') || test.file && test.file.includes('context')) {
      bestMatch.category = 'SESSION_CONTEXT_ISSUE';
    }
  }

  if (bestMatch.category) {
    CATEGORIES[bestMatch.category].count++;
    CATEGORIES[bestMatch.category].tests.push({
      ...test,
      error: errorContext.trim(),
      matchScore: bestMatch.score
    });
    categorized = true;
  } else {
    CATEGORIES.OTHER.count++;
    CATEGORIES.OTHER.tests.push({
      ...test,
      error: errorContext.trim()
    });
  }
}

function generateReport() {
  const reportPath = path.join(process.cwd(), 'test-failure-analysis.json');
  const markdownPath = path.join(process.cwd(), 'test-failure-analysis.md');
  
  // Calculate totals
  const total = Object.values(CATEGORIES).reduce((sum, cat) => sum + cat.count, 0);
  
  // Generate JSON report
  const jsonReport = {
    timestamp: new Date().toISOString(),
    summary: {
      totalFailures: total,
      byCategory: Object.entries(CATEGORIES).map(([name, data]) => ({
        category: name,
        count: data.count,
        percentage: ((data.count / total) * 100).toFixed(1)
      })).filter(cat => cat.count > 0)
    },
    details: CATEGORIES
  };

  fs.writeFileSync(reportPath, JSON.stringify(jsonReport, null, 2));
  
  // Generate Markdown report
  let markdown = `# Test Failure Analysis Report

Generated: ${new Date().toLocaleString()}

## Summary

Total Failing Tests: **${total}**

### Failure Categories

| Category | Count | Percentage |
|----------|-------|------------|
`;

  for (const [category, data] of Object.entries(CATEGORIES)) {
    if (data.count > 0) {
      const percentage = ((data.count / total) * 100).toFixed(1);
      markdown += `| ${category} | ${data.count} | ${percentage}% |\n`;
    }
  }

  markdown += `\n## Detailed Analysis\n\n`;

  for (const [category, data] of Object.entries(CATEGORIES)) {
    if (data.count > 0) {
      markdown += `### ${category} (${data.count} failures)\n\n`;
      
      // Group by file
      const byFile = {};
      data.tests.forEach(test => {
        if (!byFile[test.file]) {
          byFile[test.file] = [];
        }
        byFile[test.file].push(test);
      });

      for (const [file, tests] of Object.entries(byFile)) {
        markdown += `#### ${file}\n\n`;
        tests.forEach(test => {
          markdown += `- **${test.name}**\n`;
          if (test.error.length < 200) {
            markdown += `  \`\`\`\n  ${test.error.split('\n').join('\n  ')}\n  \`\`\`\n`;
          } else {
            const shortError = test.error.split('\n').slice(0, 3).join('\n');
            markdown += `  \`\`\`\n  ${shortError}\n  ...\n  \`\`\`\n`;
          }
        });
        markdown += '\n';
      }
    }
  }

  markdown += `## Recommendations

Based on the analysis:

1. **API Contract Mismatches (${CATEGORIES.API_MISMATCH.count} failures)**: Update test expectations to match current API
2. **Assertion Mismatches (${CATEGORIES.ASSERTION_MISMATCH.count} failures)**: Review and update expected values
3. **Mock Issues (${CATEGORIES.MOCK_ISSUE.count} failures)**: Fix mock configurations and call expectations
4. **Other Issues (${CATEGORIES.OTHER.count} failures)**: Require individual investigation

## Next Steps

1. Fix API contract mismatches by updating test expectations
2. Update outdated assertions to match current behavior
3. Review and fix mock configurations
4. Remove tests for deprecated functionality
`;

  fs.writeFileSync(markdownPath, markdown);

  console.log(`\n✅ Analysis complete!`);
  console.log(`📊 JSON report: ${reportPath}`);
  console.log(`📄 Markdown report: ${markdownPath}`);
  console.log(`\n📈 Summary:`);
  console.log(`   Total failures: ${total}`);
  
  for (const [category, data] of Object.entries(CATEGORIES)) {
    if (data.count > 0) {
      const percentage = ((data.count / total) * 100).toFixed(1);
      console.log(`   ${category}: ${data.count} (${percentage}%)`);
    }
  }
}

// Run the analysis
analyzeTestFailures();
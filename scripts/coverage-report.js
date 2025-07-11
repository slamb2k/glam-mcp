#!/usr/bin/env node

/**
 * Generate a detailed coverage report
 * Task 35: Set Up Coverage Reporting in CI
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, '..');

// Read coverage summary
const coverageSummaryPath = path.join(projectRoot, 'coverage', 'coverage-summary.json');

if (!fs.existsSync(coverageSummaryPath)) {
  console.error('Coverage summary not found. Run "npm test -- --coverage" first.');
  process.exit(1);
}

const coverage = JSON.parse(fs.readFileSync(coverageSummaryPath, 'utf8'));

// Helper to format percentage
const formatPct = (pct) => {
  const formatted = pct.toFixed(2);
  if (pct >= 80) return `\x1b[32m${formatted}%\x1b[0m`; // Green
  if (pct >= 70) return `\x1b[33m${formatted}%\x1b[0m`; // Yellow
  return `\x1b[31m${formatted}%\x1b[0m`; // Red
};

// Helper to create bar chart
const createBar = (pct, width = 20) => {
  const filled = Math.round((pct / 100) * width);
  const empty = width - filled;
  return `[${'█'.repeat(filled)}${' '.repeat(empty)}]`;
};

console.log('\n📊 Coverage Report\n');
console.log('=' .repeat(80));

// Overall summary
const total = coverage.total;
console.log('\n📈 Overall Coverage\n');
console.log(`Statements : ${formatPct(total.statements.pct)} ${createBar(total.statements.pct)} (${total.statements.covered}/${total.statements.total})`);
console.log(`Branches   : ${formatPct(total.branches.pct)} ${createBar(total.branches.pct)} (${total.branches.covered}/${total.branches.total})`);
console.log(`Functions  : ${formatPct(total.functions.pct)} ${createBar(total.functions.pct)} (${total.functions.covered}/${total.functions.total})`);
console.log(`Lines      : ${formatPct(total.lines.pct)} ${createBar(total.lines.pct)} (${total.lines.covered}/${total.lines.total})`);

// File-level breakdown
console.log('\n📁 File Coverage\n');

// Group files by directory
const filesByDir = {};
Object.entries(coverage).forEach(([file, data]) => {
  if (file === 'total') return;
  
  const relativePath = path.relative(projectRoot, file);
  const dir = path.dirname(relativePath);
  
  if (!filesByDir[dir]) {
    filesByDir[dir] = [];
  }
  
  filesByDir[dir].push({
    name: path.basename(file),
    path: relativePath,
    ...data
  });
});

// Sort directories
const sortedDirs = Object.keys(filesByDir).sort();

// Display each directory
sortedDirs.forEach(dir => {
  console.log(`\n📂 ${dir}/`);
  console.log('-'.repeat(60));
  
  // Sort files by coverage (lowest first)
  const files = filesByDir[dir].sort((a, b) => a.lines.pct - b.lines.pct);
  
  files.forEach(file => {
    const coverage = formatPct(file.lines.pct);
    const bar = createBar(file.lines.pct, 15);
    console.log(`  ${file.name.padEnd(40)} ${bar} ${coverage}`);
  });
});

// Threshold status
console.log('\n✅ Threshold Status\n');

const thresholds = [
  { name: 'Global (70%)', paths: ['**/*'], target: 70 },
  { name: 'Core (80%)', paths: ['src/core/**'], target: 80 },
  { name: 'Tools (60%)', paths: ['src/tools/**'], target: 60 }
];

thresholds.forEach(threshold => {
  // Calculate coverage for matching files
  let stats = { statements: 0, branches: 0, functions: 0, lines: 0 };
  let counts = { statements: 0, branches: 0, functions: 0, lines: 0 };
  
  Object.entries(coverage).forEach(([file, data]) => {
    if (file === 'total' && threshold.paths[0] === '**/*') {
      stats = data;
      return;
    }
    
    // Simple path matching
    const matches = threshold.paths.some(pattern => {
      const relativePath = path.relative(projectRoot, file);
      if (pattern === '**/*') return true;
      if (pattern.includes('core') && relativePath.includes('core')) return true;
      if (pattern.includes('tools') && relativePath.includes('tools')) return true;
      return false;
    });
    
    if (matches && file !== 'total') {
      ['statements', 'branches', 'functions', 'lines'].forEach(metric => {
        stats[metric] = {
          total: (stats[metric]?.total || 0) + data[metric].total,
          covered: (stats[metric]?.covered || 0) + data[metric].covered,
          pct: 0
        };
      });
    }
  });
  
  // Calculate percentages
  ['statements', 'branches', 'functions', 'lines'].forEach(metric => {
    if (stats[metric].total > 0) {
      stats[metric].pct = (stats[metric].covered / stats[metric].total) * 100;
    }
  });
  
  const avgCoverage = (stats.statements.pct + stats.branches.pct + stats.functions.pct + stats.lines.pct) / 4;
  const status = avgCoverage >= threshold.target ? '✅' : '❌';
  
  console.log(`${status} ${threshold.name}: ${formatPct(avgCoverage)} (target: ${threshold.target}%)`);
});

// Uncovered files
console.log('\n⚠️  Files with Low Coverage (<50%)\n');

const lowCoverageFiles = Object.entries(coverage)
  .filter(([file, data]) => file !== 'total' && data.lines.pct < 50)
  .sort((a, b) => a[1].lines.pct - b[1].lines.pct);

if (lowCoverageFiles.length === 0) {
  console.log('None! Great job! 🎉');
} else {
  lowCoverageFiles.forEach(([file, data]) => {
    const relativePath = path.relative(projectRoot, file);
    console.log(`  ${relativePath} - ${formatPct(data.lines.pct)}`);
  });
}

console.log('\n' + '='.repeat(80));
console.log('\n💡 Run "npm test -- --coverage" to update coverage');
console.log('💡 Open coverage/lcov-report/index.html for detailed report\n');
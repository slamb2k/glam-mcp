/**
 * Git utility functions shared across tools
 */

import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

/**
 * Check if current directory is a git repository
 */
export function isGitRepository() {
  try {
    execSync('git rev-parse --git-dir', { stdio: 'pipe' });
    return true;
  } catch (error) {
    return false;
  }
}

/**
 * Get the default main branch name
 */
export function getMainBranch() {
  try {
    // Try to get the default branch from remote
    const defaultBranch = execSync('git symbolic-ref refs/remotes/origin/HEAD', { 
      encoding: 'utf8', 
      stdio: 'pipe' 
    }).trim().replace('refs/remotes/origin/', '');
    return defaultBranch;
  } catch (error) {
    // Fallback: check if main or master exists
    try {
      execSync('git show-ref --verify --quiet refs/heads/main', { stdio: 'pipe' });
      return 'main';
    } catch (e) {
      try {
        execSync('git show-ref --verify --quiet refs/heads/master', { stdio: 'pipe' });
        return 'master';
      } catch (e2) {
        return 'main'; // Default fallback
      }
    }
  }
}

/**
 * Get current branch name
 */
export function getCurrentBranch() {
  try {
    return execSync('git branch --show-current', { encoding: 'utf8' }).trim();
  } catch (error) {
    return execSync('git rev-parse --abbrev-ref HEAD', { encoding: 'utf8' }).trim();
  }
}

/**
 * Check if there are uncommitted changes
 */
export function hasUncommittedChanges() {
  try {
    const status = execSync('git status --porcelain', { encoding: 'utf8' }).trim();
    return status.length > 0;
  } catch (error) {
    return false;
  }
}

/**
 * Check if a branch exists
 */
export function branchExists(branchName) {
  try {
    execSync(`git show-ref --verify --quiet refs/heads/${branchName}`, { stdio: 'pipe' });
    return true;
  } catch (error) {
    return false;
  }
}

/**
 * Get list of files that have changed
 */
export function getChangedFiles() {
  try {
    const status = execSync('git status --porcelain', { encoding: 'utf8' });
    return status.split('\n')
      .filter(line => line.trim())
      .map(line => {
        const [status, ...fileParts] = line.split(' ');
        return {
          status: status.trim(),
          file: fileParts.join(' ').trim()
        };
      });
  } catch (error) {
    return [];
  }
}

/**
 * Check if a package.json script exists
 */
export function hasScript(scriptName) {
  try {
    const packageJsonPath = path.join(process.cwd(), 'package.json');
    if (!fs.existsSync(packageJsonPath)) {
      return false;
    }
    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
    return packageJson.scripts && packageJson.scripts[scriptName];
  } catch (error) {
    return false;
  }
}

/**
 * Generate a branch name from a message
 */
export function generateBranchName(message, prefix = 'feature/') {
  const sanitized = message
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .substring(0, 50);
  
  const timestamp = new Date().toISOString().slice(0, 10);
  return `${prefix}${sanitized}-${timestamp}`;
}

/**
 * Execute git command safely
 */
export function execGitCommand(command, options = {}) {
  try {
    return execSync(command, { 
      encoding: 'utf8', 
      stdio: options.silent ? 'pipe' : 'inherit',
      ...options 
    });
  } catch (error) {
    throw new Error(`Git command failed: ${command}\nError: ${error.message}`);
  }
}

/**
 * Get repository remote URL
 */
export function getRemoteUrl() {
  try {
    return execSync('git config --get remote.origin.url', { encoding: 'utf8' }).trim();
  } catch (error) {
    return null;
  }
}

/**
 * Get recent commits
 */
export function getRecentCommits(count = 10) {
  try {
    const commits = execSync(`git log --oneline -${count}`, { encoding: 'utf8' })
      .split('\n')
      .filter(line => line.trim())
      .map(line => {
        const [hash, ...messageParts] = line.split(' ');
        return {
          hash,
          message: messageParts.join(' ')
        };
      });
    return commits;
  } catch (error) {
    return [];
  }
}

/**
 * Get list of merged branches
 */
export function getMergedBranches(targetBranch = null) {
  try {
    const target = targetBranch || getMainBranch();
    const mergedBranches = execSync(`git branch --merged ${target}`, { encoding: 'utf8' })
      .split('\n')
      .map(branch => branch.trim().replace(/^\*?\s*/, ''))
      .filter(branch => branch && branch !== target && !branch.startsWith('('));
    return mergedBranches;
  } catch (error) {
    return [];
  }
}
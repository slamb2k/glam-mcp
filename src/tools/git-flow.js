/**
 * Traditional Git Flow Operations
 * Discrete start/finish operations for features, releases, and hotfixes
 */

import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import {
  isGitRepository,
  getMainBranch,
  getCurrentBranch,
  hasUncommittedChanges,
  branchExists,
  execGitCommand
} from '../utils/git-helpers.js';
import { createSuccessResponse, createErrorResponse } from '../utils/responses.js';

/**
 * Register traditional git-flow tools
 */
export function registerGitFlowTools(server) {
  // Feature operations
  server.addTool({
    name: 'git_flow_feature_start',
    description: 'Start a new feature branch from main',
    inputSchema: {
      type: 'object',
      properties: {
        name: {
          type: 'string',
          description: 'Feature name (without prefix)'
        }
      },
      required: ['name']
    },
    handler: async ({ name }) => startFeature(name)
  });

  server.addTool({
    name: 'git_flow_feature_finish',
    description: 'Finish a feature branch (create PR and optionally merge)',
    inputSchema: {
      type: 'object',
      properties: {
        name: {
          type: 'string',
          description: 'Feature name (optional if on feature branch)'
        },
        message: {
          type: 'string',
          description: 'PR description'
        },
        auto_merge: {
          type: 'boolean',
          description: 'Automatically merge PR after creation',
          default: false
        },
        delete_branch: {
          type: 'boolean',
          description: 'Delete branch after successful merge',
          default: true
        },
        target_branch: {
          type: 'string',
          description: 'Target branch for PR',
          default: 'main'
        }
      }
    },
    handler: async ({ name, message, auto_merge = false, delete_branch = true, target_branch = 'main' }) =>
      finishFeature(name, message, auto_merge, delete_branch, target_branch)
  });

  // Release operations
  server.addTool({
    name: 'git_flow_release_start',
    description: 'Start a new release branch with version bump',
    inputSchema: {
      type: 'object',
      properties: {
        version: {
          type: 'string',
          description: 'Release version (e.g., 1.2.0)'
        }
      },
      required: ['version']
    },
    handler: async ({ version }) => startRelease(version)
  });

  server.addTool({
    name: 'git_flow_release_finish',
    description: 'Finish a release branch (merge to main and create tag)',
    inputSchema: {
      type: 'object',
      properties: {
        version: {
          type: 'string',
          description: 'Release version (optional if on release branch)'
        },
        message: {
          type: 'string',
          description: 'Release message'
        }
      }
    },
    handler: async ({ version, message }) => finishRelease(version, message)
  });

  // Hotfix operations
  server.addTool({
    name: 'git_flow_hotfix_start',
    description: 'Start a new hotfix branch from main',
    inputSchema: {
      type: 'object',
      properties: {
        name: {
          type: 'string',
          description: 'Hotfix name'
        }
      },
      required: ['name']
    },
    handler: async ({ name }) => startHotfix(name)
  });

  server.addTool({
    name: 'git_flow_hotfix_finish',
    description: 'Finish a hotfix branch (create PR and optionally merge)',
    inputSchema: {
      type: 'object',
      properties: {
        name: {
          type: 'string',
          description: 'Hotfix name (optional if on hotfix branch)'
        },
        message: {
          type: 'string',
          description: 'PR description'
        },
        auto_merge: {
          type: 'boolean',
          description: 'Automatically merge PR after creation',
          default: false
        },
        delete_branch: {
          type: 'boolean',
          description: 'Delete branch after successful merge',
          default: true
        }
      }
    },
    handler: async ({ name, message, auto_merge = false, delete_branch = true }) =>
      finishHotfix(name, message, auto_merge, delete_branch)
  });

  // Standalone operations
  server.addTool({
    name: 'git_flow_create_pr',
    description: 'Create a pull request for current branch',
    inputSchema: {
      type: 'object',
      properties: {
        title: {
          type: 'string',
          description: 'PR title'
        },
        description: {
          type: 'string',
          description: 'PR description'
        },
        target_branch: {
          type: 'string',
          description: 'Target branch',
          default: 'main'
        }
      }
    },
    handler: async ({ title, description, target_branch = 'main' }) =>
      createPullRequest(title, description, target_branch)
  });

  server.addTool({
    name: 'git_flow_merge_pr',
    description: 'Merge a pull request',
    inputSchema: {
      type: 'object',
      properties: {
        pr_number: {
          type: 'string',
          description: 'PR number or URL'
        },
        delete_branch: {
          type: 'boolean',
          description: 'Delete branch after merge',
          default: true
        }
      }
    },
    handler: async ({ pr_number, delete_branch = true }) => mergePullRequest(pr_number, delete_branch)
  });

  server.addTool({
    name: 'git_flow_clean_branches',
    description: 'Clean up merged branches',
    inputSchema: {
      type: 'object',
      properties: {
        force: {
          type: 'boolean',
          description: 'Force cleanup without confirmation',
          default: false
        }
      }
    },
    handler: async ({ force = false }) => cleanBranches(force)
  });

  server.addTool({
    name: 'git_flow_status',
    description: 'Show git flow status and branch information',
    inputSchema: {
      type: 'object',
      properties: {}
    },
    handler: async () => getGitFlowStatus()
  });
}

/**
 * Start a new feature branch
 */
async function startFeature(name) {
  if (!name) {
    return createErrorResponse('Feature name is required');
  }

  if (!isGitRepository()) {
    return createErrorResponse('Not a git repository');
  }

  const mainBranch = getMainBranch();
  const featureBranch = `feature/${name}`;

  try {
    // Check if branch already exists
    if (branchExists(featureBranch)) {
      return createErrorResponse(`Feature branch '${featureBranch}' already exists`);
    }

    // Ensure we're on main branch and up to date
    execGitCommand(`git checkout ${mainBranch}`, { silent: true });
    
    try {
      execGitCommand('git pull origin HEAD', { silent: true });
    } catch (e) {
      // Ignore pull errors (might not have remote)
    }

    // Create and checkout feature branch
    execGitCommand(`git checkout -b ${featureBranch}`, { silent: true });

    return createSuccessResponse(`Started feature branch: ${featureBranch}`, {
      branch: featureBranch,
      baseBranch: mainBranch,
      operation: 'feature-start'
    });

  } catch (error) {
    return createErrorResponse(`Failed to start feature: ${error.message}`);
  }
}

/**
 * Finish a feature branch
 */
async function finishFeature(name, message, autoMerge, deleteBranch, targetBranch) {
  if (!isGitRepository()) {
    return createErrorResponse('Not a git repository');
  }

  const currentBranch = getCurrentBranch();
  const featureBranch = name ? `feature/${name}` : currentBranch;

  if (!featureBranch.startsWith('feature/')) {
    return createErrorResponse('Not on a feature branch or feature name not provided');
  }

  try {
    // Switch to feature branch if not already there
    if (currentBranch !== featureBranch) {
      execGitCommand(`git checkout ${featureBranch}`, { silent: true });
    }

    // Check for uncommitted changes
    if (hasUncommittedChanges()) {
      return createErrorResponse('Please commit or stash your changes before finishing the feature');
    }

    // Push feature branch to remote
    try {
      execGitCommand(`git push origin ${featureBranch}`, { silent: true });
    } catch (e) {
      execGitCommand(`git push -u origin ${featureBranch}`, { silent: true });
    }

    // Create pull request
    const prTitle = message || `Feature: ${featureBranch.replace('feature/', '')}`;
    const prBody = `## Feature: ${featureBranch.replace('feature/', '')}

${message || 'Implementing new feature'}

## Changes
- [ ] Add feature implementation
- [ ] Update tests
- [ ] Update documentation

## Testing
- [ ] Manual testing completed
- [ ] Automated tests pass

🤖 Generated with [Slambed MCP](https://github.com/your-username/slambed-mcp)`;

    const prUrl = execGitCommand(
      `gh pr create --title "${prTitle}" --body "${prBody}" --base ${targetBranch}`,
      { silent: true }
    ).trim();

    let result = {
      branch: featureBranch,
      targetBranch,
      prUrl,
      operation: 'feature-finish'
    };

    // Auto-merge if requested
    if (autoMerge) {
      try {
        execGitCommand(`gh pr merge ${prUrl} --squash${deleteBranch ? ' --delete-branch' : ''}`, { silent: true });
        result.merged = true;
        result.deleted = deleteBranch;
      } catch (e) {
        result.merged = false;
        result.mergeError = e.message;
      }
    }

    return createSuccessResponse(`Finished feature: ${featureBranch}`, result);

  } catch (error) {
    return createErrorResponse(`Failed to finish feature: ${error.message}`);
  }
}

/**
 * Start a release branch
 */
async function startRelease(version) {
  if (!version) {
    return createErrorResponse('Release version is required');
  }

  if (!isGitRepository()) {
    return createErrorResponse('Not a git repository');
  }

  const mainBranch = getMainBranch();
  const releaseBranch = `release/${version}`;

  try {
    // Check if branch already exists
    if (branchExists(releaseBranch)) {
      return createErrorResponse(`Release branch '${releaseBranch}' already exists`);
    }

    // Ensure we're on main branch and up to date
    execGitCommand(`git checkout ${mainBranch}`, { silent: true });
    
    try {
      execGitCommand('git pull origin HEAD', { silent: true });
    } catch (e) {
      // Ignore pull errors
    }

    // Create and checkout release branch
    execGitCommand(`git checkout -b ${releaseBranch}`, { silent: true });

    // Update version in package.json if it exists
    const packageJsonPath = path.join(process.cwd(), 'package.json');
    if (fs.existsSync(packageJsonPath)) {
      const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
      packageJson.version = version;
      fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2) + '\n');
      
      execGitCommand('git add package.json', { silent: true });
      execGitCommand(`git commit -m "chore: bump version to ${version}"`, { silent: true });
    }

    return createSuccessResponse(`Started release branch: ${releaseBranch}`, {
      branch: releaseBranch,
      version,
      baseBranch: mainBranch,
      operation: 'release-start'
    });

  } catch (error) {
    return createErrorResponse(`Failed to start release: ${error.message}`);
  }
}

/**
 * Finish a release branch
 */
async function finishRelease(version, message) {
  if (!isGitRepository()) {
    return createErrorResponse('Not a git repository');
  }

  const currentBranch = getCurrentBranch();
  const releaseBranch = version ? `release/${version}` : currentBranch;

  if (!releaseBranch.startsWith('release/')) {
    return createErrorResponse('Not on a release branch or version not provided');
  }

  const releaseVersion = releaseBranch.replace('release/', '');
  const mainBranch = getMainBranch();

  try {
    // Switch to release branch if not already there
    if (currentBranch !== releaseBranch) {
      execGitCommand(`git checkout ${releaseBranch}`, { silent: true });
    }

    // Check for uncommitted changes
    if (hasUncommittedChanges()) {
      return createErrorResponse('Please commit or stash your changes before finishing the release');
    }

    // Push release branch to remote
    try {
      execGitCommand(`git push origin ${releaseBranch}`, { silent: true });
    } catch (e) {
      execGitCommand(`git push -u origin ${releaseBranch}`, { silent: true });
    }

    // Merge to main
    execGitCommand(`git checkout ${mainBranch}`, { silent: true });
    execGitCommand(`git merge --no-ff ${releaseBranch} -m "Release ${releaseVersion}"`, { silent: true });

    // Create and push tag
    const tagMessage = message || `Release ${releaseVersion}`;
    execGitCommand(`git tag -a v${releaseVersion} -m "${tagMessage}"`, { silent: true });
    execGitCommand(`git push origin ${mainBranch}`, { silent: true });
    execGitCommand(`git push origin v${releaseVersion}`, { silent: true });

    // Clean up release branch
    execGitCommand(`git branch -d ${releaseBranch}`, { silent: true });
    try {
      execGitCommand(`git push origin --delete ${releaseBranch}`, { silent: true });
    } catch (e) {
      // Ignore remote delete errors
    }

    return createSuccessResponse(`Finished release: ${releaseVersion}`, {
      version: releaseVersion,
      tag: `v${releaseVersion}`,
      mainBranch,
      operation: 'release-finish'
    });

  } catch (error) {
    return createErrorResponse(`Failed to finish release: ${error.message}`);
  }
}

/**
 * Start a hotfix branch
 */
async function startHotfix(name) {
  if (!name) {
    return createErrorResponse('Hotfix name is required');
  }

  if (!isGitRepository()) {
    return createErrorResponse('Not a git repository');
  }

  const mainBranch = getMainBranch();
  const hotfixBranch = `hotfix/${name}`;

  try {
    // Check if branch already exists
    if (branchExists(hotfixBranch)) {
      return createErrorResponse(`Hotfix branch '${hotfixBranch}' already exists`);
    }

    // Ensure we're on main branch and up to date
    execGitCommand(`git checkout ${mainBranch}`, { silent: true });
    
    try {
      execGitCommand('git pull origin HEAD', { silent: true });
    } catch (e) {
      // Ignore pull errors
    }

    // Create and checkout hotfix branch
    execGitCommand(`git checkout -b ${hotfixBranch}`, { silent: true });

    return createSuccessResponse(`Started hotfix branch: ${hotfixBranch}`, {
      branch: hotfixBranch,
      baseBranch: mainBranch,
      operation: 'hotfix-start'
    });

  } catch (error) {
    return createErrorResponse(`Failed to start hotfix: ${error.message}`);
  }
}

/**
 * Finish a hotfix branch
 */
async function finishHotfix(name, message, autoMerge, deleteBranch) {
  if (!isGitRepository()) {
    return createErrorResponse('Not a git repository');
  }

  const currentBranch = getCurrentBranch();
  const hotfixBranch = name ? `hotfix/${name}` : currentBranch;

  if (!hotfixBranch.startsWith('hotfix/')) {
    return createErrorResponse('Not on a hotfix branch or hotfix name not provided');
  }

  const mainBranch = getMainBranch();

  try {
    // Switch to hotfix branch if not already there
    if (currentBranch !== hotfixBranch) {
      execGitCommand(`git checkout ${hotfixBranch}`, { silent: true });
    }

    // Check for uncommitted changes
    if (hasUncommittedChanges()) {
      return createErrorResponse('Please commit or stash your changes before finishing the hotfix');
    }

    // Push hotfix branch to remote
    try {
      execGitCommand(`git push origin ${hotfixBranch}`, { silent: true });
    } catch (e) {
      execGitCommand(`git push -u origin ${hotfixBranch}`, { silent: true });
    }

    // Create pull request
    const prTitle = message || `Hotfix: ${hotfixBranch.replace('hotfix/', '')}`;
    const prBody = `## Hotfix: ${hotfixBranch.replace('hotfix/', '')}

${message || 'Critical bug fix'}

## Changes
- [ ] Fix critical issue
- [ ] Update tests
- [ ] Verify fix

## Testing
- [ ] Manual testing completed
- [ ] Regression testing completed

🤖 Generated with [Slambed MCP](https://github.com/your-username/slambed-mcp)`;

    const prUrl = execGitCommand(
      `gh pr create --title "${prTitle}" --body "${prBody}" --base ${mainBranch}`,
      { silent: true }
    ).trim();

    let result = {
      branch: hotfixBranch,
      targetBranch: mainBranch,
      prUrl,
      operation: 'hotfix-finish'
    };

    // Auto-merge if requested
    if (autoMerge) {
      try {
        execGitCommand(`gh pr merge ${prUrl} --squash${deleteBranch ? ' --delete-branch' : ''}`, { silent: true });
        result.merged = true;
        result.deleted = deleteBranch;
      } catch (e) {
        result.merged = false;
        result.mergeError = e.message;
      }
    }

    return createSuccessResponse(`Finished hotfix: ${hotfixBranch}`, result);

  } catch (error) {
    return createErrorResponse(`Failed to finish hotfix: ${error.message}`);
  }
}

/**
 * Create a pull request for current branch
 */
async function createPullRequest(title, description, targetBranch) {
  if (!isGitRepository()) {
    return createErrorResponse('Not a git repository');
  }

  const currentBranch = getCurrentBranch();
  const mainBranch = getMainBranch();
  const target = targetBranch || mainBranch;

  if (currentBranch === target) {
    return createErrorResponse(`Cannot create PR from ${target} to itself`);
  }

  try {
    // Check for uncommitted changes
    if (hasUncommittedChanges()) {
      return createErrorResponse('Please commit or stash your changes before creating a PR');
    }

    // Push current branch to remote
    try {
      execGitCommand(`git push origin ${currentBranch}`, { silent: true });
    } catch (e) {
      execGitCommand(`git push -u origin ${currentBranch}`, { silent: true });
    }

    const prTitle = title || `${currentBranch.replace(/^(feature|hotfix|release)\//, '')}`;
    const prBody = description || `## ${currentBranch}

${description || 'Pull request description'}

## Changes
- [ ] Implement changes
- [ ] Update tests
- [ ] Update documentation

🤖 Generated with [Slambed MCP](https://github.com/your-username/slambed-mcp)`;

    const prUrl = execGitCommand(
      `gh pr create --title "${prTitle}" --body "${prBody}" --base ${target}`,
      { silent: true }
    ).trim();

    return createSuccessResponse(`Created pull request: ${prTitle}`, {
      branch: currentBranch,
      targetBranch: target,
      prUrl,
      operation: 'create-pr'
    });

  } catch (error) {
    return createErrorResponse(`Failed to create PR: ${error.message}`);
  }
}

/**
 * Merge a pull request
 */
async function mergePullRequest(prNumber, deleteBranch) {
  if (!isGitRepository()) {
    return createErrorResponse('Not a git repository');
  }

  try {
    let mergeCommand = `gh pr merge ${prNumber || ''} --squash`;
    if (deleteBranch) {
      mergeCommand += ' --delete-branch';
    }

    const result = execGitCommand(mergeCommand, { silent: true });

    return createSuccessResponse('Merged pull request', {
      deleted: deleteBranch,
      result: result.trim(),
      operation: 'merge-pr'
    });

  } catch (error) {
    return createErrorResponse(`Failed to merge PR: ${error.message}`);
  }
}

/**
 * Clean up merged branches
 */
async function cleanBranches(force) {
  if (!isGitRepository()) {
    return createErrorResponse('Not a git repository');
  }

  try {
    const mainBranch = getMainBranch();
    
    // Get list of merged branches
    const mergedBranches = execGitCommand(`git branch --merged ${mainBranch}`, { silent: true })
      .split('\n')
      .map(branch => branch.trim().replace(/^\*?\s*/, ''))
      .filter(branch => branch && branch !== mainBranch && !branch.startsWith('('));

    if (mergedBranches.length === 0) {
      return createSuccessResponse('No merged branches to clean up');
    }

    // Delete merged branches
    const deletedBranches = [];
    for (const branch of mergedBranches) {
      try {
        execGitCommand(`git branch -d ${branch}`, { silent: true });
        deletedBranches.push(branch);
      } catch (e) {
        // Continue with other branches if one fails
      }
    }

    // Clean up remote tracking branches
    try {
      execGitCommand('git remote prune origin', { silent: true });
    } catch (e) {
      // Ignore remote prune errors
    }

    return createSuccessResponse(`Cleaned up ${deletedBranches.length} merged branches`, {
      deletedBranches,
      operation: 'clean-branches'
    });

  } catch (error) {
    return createErrorResponse(`Failed to clean branches: ${error.message}`);
  }
}

/**
 * Get git flow status
 */
async function getGitFlowStatus() {
  if (!isGitRepository()) {
    return createErrorResponse('Not a git repository');
  }

  try {
    const currentBranch = getCurrentBranch();
    const mainBranch = getMainBranch();
    const hasChanges = hasUncommittedChanges();

    // Get list of feature/release/hotfix branches
    const branches = execGitCommand('git branch', { silent: true })
      .split('\n')
      .map(branch => branch.trim().replace(/^\*?\s*/, ''))
      .filter(branch => branch);

    const featureBranches = branches.filter(b => b.startsWith('feature/'));
    const releaseBranches = branches.filter(b => b.startsWith('release/'));
    const hotfixBranches = branches.filter(b => b.startsWith('hotfix/'));

    // Get recent commits
    const recentCommits = execGitCommand('git log --oneline -10', { silent: true })
      .split('\n')
      .filter(line => line.trim());

    // Get remote status
    let remoteStatus = 'unknown';
    try {
      const status = execGitCommand('git status -b --porcelain', { silent: true });
      const statusLine = status.split('\n')[0];
      if (statusLine.includes('ahead')) {
        remoteStatus = 'ahead';
      } else if (statusLine.includes('behind')) {
        remoteStatus = 'behind';
      } else {
        remoteStatus = 'up-to-date';
      }
    } catch (e) {
      // Ignore remote status errors
    }

    const statusData = {
      currentBranch,
      mainBranch,
      hasUncommittedChanges: hasChanges,
      remoteStatus,
      branches: {
        feature: featureBranches,
        release: releaseBranches,
        hotfix: hotfixBranches,
        total: branches.length
      },
      recentCommits: recentCommits.slice(0, 5),
      operation: 'status'
    };

    const statusText = `📊 Git Flow Status

🌿 Current Branch: ${currentBranch}
🏠 Main Branch: ${mainBranch}
📡 Remote Status: ${remoteStatus}
${hasChanges ? '⚠️  Uncommitted changes present' : '✅ Working directory clean'}

📝 Active Branches:
${featureBranches.length > 0 ? `Features: ${featureBranches.join(', ')}` : 'No feature branches'}
${releaseBranches.length > 0 ? `Releases: ${releaseBranches.join(', ')}` : 'No release branches'}  
${hotfixBranches.length > 0 ? `Hotfixes: ${hotfixBranches.join(', ')}` : 'No hotfix branches'}

📚 Recent Commits:
${recentCommits.slice(0, 5).join('\n')}`;

    return createSuccessResponse(statusText, statusData);

  } catch (error) {
    return createErrorResponse(`Failed to get status: ${error.message}`);
  }
}

// Export individual functions for CLI usage
export {
  startFeature,
  finishFeature,
  startRelease,
  finishRelease,
  startHotfix,
  finishHotfix,
  createPullRequest,
  mergePullRequest,
  cleanBranches,
  getGitFlowStatus
};

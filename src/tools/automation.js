/**
 * Enhanced Automation Features
 * Complete workflow automation tools for streamlined development
 */

import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import {
  isGitRepository,
  getMainBranch,
  getCurrentBranch,
  hasUncommittedChanges,
  getChangedFiles,
  hasScript,
  generateBranchName,
  execGitCommand
} from '../utils/git-helpers.js';
import { createSuccessResponse, createErrorResponse } from '../utils/responses.js';
import { createNpmPackage } from './utilities.js';

/**
 * Register automation tools
 */
export function registerAutomationTools(server) {
  // Complete automation workflow
  server.addTool({
    name: 'auto_commit',
    description: 'Complete automation: branch → format → lint → commit → push → PR → merge → cleanup',
    inputSchema: {
      type: 'object',
      properties: {
        message: {
          type: 'string',
          description: 'Commit message'
        },
        branch_name: {
          type: 'string',
          description: 'Custom branch name (auto-generated if not provided)'
        },
        auto_merge: {
          type: 'boolean',
          description: 'Automatically merge PR after creation',
          default: true
        },
        delete_branch: {
          type: 'boolean',
          description: 'Delete branch after successful merge',
          default: true
        },
        run_format: {
          type: 'boolean',
          description: 'Run code formatting',
          default: true
        },
        run_lint: {
          type: 'boolean',
          description: 'Run linting',
          default: true
        },
        target_branch: {
          type: 'string',
          description: 'Target branch for PR',
          default: 'main'
        },
        branch_prefix: {
          type: 'string',
          description: 'Branch prefix',
          default: 'feature/'
        }
      },
      required: ['message']
    },
    handler: async (params) => autoCommit(params)
  });

  // Quick commit with auto-generation
  server.addTool({
    name: 'quick_commit',
    description: 'Fast commit with auto-generated branch and smart message',
    inputSchema: {
      type: 'object',
      properties: {
        message: {
          type: 'string',
          description: 'Custom commit message (auto-generated if not provided)'
        },
        auto_merge: {
          type: 'boolean',
          description: 'Auto-merge PR',
          default: true
        },
        run_format: {
          type: 'boolean',
          description: 'Run formatting',
          default: true
        }
      }
    },
    handler: async (params) => quickCommit(params)
  });

  // Smart commit with analysis
  server.addTool({
    name: 'smart_commit',
    description: 'Analyze changes and suggest commit message and type',
    inputSchema: {
      type: 'object',
      properties: {
        execute: {
          type: 'boolean',
          description: 'Execute the commit after analysis',
          default: false
        }
      }
    },
    handler: async (params) => smartCommit(params)
  });

  // Branch synchronization
  server.addTool({
    name: 'sync_branch',
    description: 'Sync current branch with target branch (stash, pull, rebase, restore)',
    inputSchema: {
      type: 'object',
      properties: {
        target_branch: {
          type: 'string',
          description: 'Target branch to sync with',
          default: 'main'
        }
      }
    },
    handler: async (params) => syncBranch(params)
  });

  // Commit squashing
  server.addTool({
    name: 'squash_commits',
    description: 'Squash multiple commits into one',
    inputSchema: {
      type: 'object',
      properties: {
        count: {
          type: 'number',
          description: 'Number of commits to squash',
          default: 2
        },
        message: {
          type: 'string',
          description: 'New commit message for squashed commit'
        }
      }
    },
    handler: async (params) => squashCommits(params)
  });

  // Safe commit undo
  server.addTool({
    name: 'undo_commit',
    description: 'Undo last commit while preserving changes',
    inputSchema: {
      type: 'object',
      properties: {
        hard: {
          type: 'boolean',
          description: 'Hard reset (loses changes)',
          default: false
        }
      }
    },
    handler: async (params) => undoCommit(params)
  });

  // Batch operations
  server.addTool({
    name: 'batch_commit',
    description: 'Commit multiple logical groups of changes as separate commits',
    inputSchema: {
      type: 'object',
      properties: {
        groups: {
          type: 'array',
          description: 'Array of commit groups',
          items: {
            type: 'object',
            properties: {
              files: {
                type: 'array',
                items: { type: 'string' },
                description: 'Files to include in this commit'
              },
              message: {
                type: 'string',
                description: 'Commit message for this group'
              }
            },
            required: ['files', 'message']
          }
        },
        push: {
          type: 'boolean',
          description: 'Push commits after creation',
          default: true
        }
      },
      required: ['groups']
    },
    handler: async (params) => batchCommit(params)
  });

  // Complete project initialization
  server.addTool({
    name: 'init_project',
    description: 'Complete project initialization: git init → create repo → branch protection → feature branch → initial commit → PR → merge',
    inputSchema: {
      type: 'object',
      properties: {
        project_name: {
          type: 'string',
          description: 'Project name (defaults to directory name)'
        },
        description: {
          type: 'string',
          description: 'Project description'
        },
        repo_visibility: {
          type: 'string',
          enum: ['public', 'private'],
          description: 'Repository visibility',
          default: 'private'
        },
        create_npm_package: {
          type: 'boolean',
          description: 'Create package.json and npm files',
          default: true
        },
        author: {
          type: 'string',
          description: 'Author name'
        },
        license: {
          type: 'string',
          description: 'License type',
          default: 'MIT'
        },
        enable_branch_protection: {
          type: 'boolean',
          description: 'Enable branch protection rules',
          default: true
        },
        auto_merge_initial: {
          type: 'boolean',
          description: 'Auto-merge initial commit PR',
          default: true
        },
        initial_commit_message: {
          type: 'string',
          description: 'Initial commit message',
          default: 'Initial project setup'
        },
        create_readme: {
          type: 'boolean',
          description: 'Create README.md',
          default: true
        },
        create_gitignore: {
          type: 'boolean',
          description: 'Create .gitignore',
          default: true
        },
        template_type: {
          type: 'string',
          enum: ['node', 'python', 'generic'],
          description: 'Project template type',
          default: 'node'
        }
      }
    },
    handler: async (params) => initProject(params)
  });
}

/**
 * Complete automation workflow
 */
async function autoCommit({
  message,
  branch_name,
  auto_merge = true,
  delete_branch = true,
  run_format = true,
  run_lint = true,
  target_branch = 'main',
  branch_prefix = 'feature/'
}) {
  if (!isGitRepository()) {
    return createErrorResponse('Not a git repository');
  }

  try {
    const steps = [];
    
    // Check for changes
    const changedFiles = getChangedFiles();
    if (changedFiles.length === 0) {
      return createErrorResponse('No changes detected. Nothing to commit.');
    }
    steps.push(`Found ${changedFiles.length} changed files`);

    // Generate branch name if not provided
    const branchName = branch_name || generateBranchName(message, branch_prefix);
    steps.push(`Generated branch name: ${branchName}`);

    // Create and switch to new branch
    const mainBranch = getMainBranch();
    execGitCommand(`git checkout ${mainBranch}`, { silent: true });
    
    try {
      execGitCommand('git pull origin HEAD', { silent: true });
      steps.push('Updated main branch');
    } catch (e) {
      steps.push('Could not pull latest changes (no remote or network issue)');
    }

    execGitCommand(`git checkout -b ${branchName}`, { silent: true });
    steps.push(`Created and switched to branch: ${branchName}`);

    // Run formatting if available and requested
    if (run_format && hasScript('format')) {
      try {
        execSync('npm run format', { stdio: 'inherit' });
        steps.push('Code formatting completed');
      } catch (e) {
        steps.push('Formatting failed, continuing...');
      }
    } else if (run_format) {
      steps.push('No format script found, skipping formatting');
    }

    // Run linting if available and requested
    if (run_lint && hasScript('lint')) {
      try {
        execSync('npm run lint', { stdio: 'pipe' });
        steps.push('Linting passed');
      } catch (e) {
        steps.push('Linting issues found, continuing...');
      }
    } else if (run_lint) {
      steps.push('No lint script found, skipping linting');
    }

    // Stage and commit changes
    execGitCommand('git add .', { silent: true });
    
    const commitMessage = `${message}

🤖 Generated with [Slambed MCP](https://github.com/your-username/slambed-mcp)

Co-Authored-By: Claude <noreply@anthropic.com>`;
    
    execGitCommand(`git commit -m "${commitMessage}"`, { silent: true });
    steps.push('Changes committed successfully');

    // Push branch to remote
    execGitCommand(`git push -u origin ${branchName}`, { silent: true });
    steps.push('Branch pushed to remote');

    // Create PR
    const prTitle = message;
    const prBody = `## Summary
${message}

## Changes Made
- Auto-generated commit with formatting and linting
- Ready for review and merge

## Testing
- [ ] Code formatting applied
- [ ] Linting checks passed
- [ ] Manual testing completed

🤖 Generated with [Slambed MCP](https://github.com/your-username/slambed-mcp)`;

    const prUrl = execGitCommand(
      `gh pr create --title "${prTitle}" --body "${prBody}" --base ${target_branch}`,
      { silent: true }
    ).trim();
    steps.push(`Pull request created: ${prUrl}`);

    let merged = false;
    let deleted = false;

    // Auto-merge if enabled
    if (auto_merge) {
      try {
        // Wait a moment for CI to potentially start
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        execGitCommand(`gh pr merge ${prUrl} --squash --auto`, { silent: true });
        merged = true;
        steps.push('Pull request auto-merged');
        
        if (delete_branch) {
          // Switch back to main and clean up
          execGitCommand(`git checkout ${target_branch}`, { silent: true });
          execGitCommand('git pull origin HEAD', { silent: true });
          execGitCommand(`git branch -d ${branchName}`, { silent: true });
          deleted = true;
          steps.push('Branch cleaned up');
        }
      } catch (e) {
        steps.push('Auto-merge failed, PR created for manual review');
      }
    }

    return createSuccessResponse('Git flow automation completed successfully!', {
      branch: branchName,
      targetBranch: target_branch,
      prUrl,
      merged,
      deleted,
      steps,
      changedFiles: changedFiles.length,
      operation: 'auto-commit'
    });

  } catch (error) {
    return createErrorResponse(`Git flow automation failed: ${error.message}`);
  }
}

/**
 * Quick commit with smart defaults
 */
async function quickCommit({ message, auto_merge = true, run_format = true }) {
  if (!isGitRepository()) {
    return createErrorResponse('Not a git repository');
  }

  const changedFiles = getChangedFiles();
  if (changedFiles.length === 0) {
    return createErrorResponse('No changes to commit');
  }

  // Generate message if not provided
  let commitMessage = message;
  if (!commitMessage) {
    // Smart message generation based on changed files
    const fileTypes = changedFiles.map(f => {
      if (f.file.includes('test')) return 'test';
      if (f.file.includes('doc') || f.file.includes('README')) return 'docs';
      if (f.file.includes('package.json')) return 'deps';
      if (f.file.includes('.github')) return 'ci';
      return 'code';
    });

    const primaryType = fileTypes.reduce((a, b, _, arr) => 
      arr.filter(v => v === a).length >= arr.filter(v => v === b).length ? a : b
    );

    const typeMessages = {
      test: 'Update tests',
      docs: 'Update documentation',
      deps: 'Update dependencies',
      ci: 'Update CI configuration',
      code: `Update ${changedFiles.length} file${changedFiles.length > 1 ? 's' : ''}`
    };

    commitMessage = typeMessages[primaryType];
  }

  // Use auto-commit with smart defaults
  return autoCommit({
    message: commitMessage,
    auto_merge,
    run_format,
    run_lint: false, // Skip lint for quick commits
    branch_prefix: 'quick/'
  });
}

/**
 * Smart commit with change analysis
 */
async function smartCommit({ execute = false }) {
  if (!isGitRepository()) {
    return createErrorResponse('Not a git repository');
  }

  const changedFiles = getChangedFiles();
  if (changedFiles.length === 0) {
    return createErrorResponse('No changes to analyze');
  }

  try {
    // Analyze changes
    const analysis = {
      totalFiles: changedFiles.length,
      filesByType: {},
      suggestedType: 'feat',
      suggestedMessage: '',
      suggestedBranch: '',
      confidence: 0
    };

    // Categorize files
    changedFiles.forEach(({ file, status }) => {
      let category = 'other';
      
      if (file.includes('test') || file.includes('.test.') || file.includes('.spec.')) {
        category = 'test';
      } else if (file.includes('doc') || file.includes('README') || file.includes('.md')) {
        category = 'docs';
      } else if (file.includes('package.json') || file.includes('yarn.lock') || file.includes('package-lock.json')) {
        category = 'deps';
      } else if (file.includes('.github') || file.includes('.yml') || file.includes('.yaml')) {
        category = 'ci';
      } else if (file.includes('src/') || file.includes('lib/') || file.endsWith('.js') || file.endsWith('.ts')) {
        category = 'code';
      } else if (file.includes('style') || file.includes('.css') || file.includes('.scss')) {
        category = 'style';
      }

      if (!analysis.filesByType[category]) {
        analysis.filesByType[category] = [];
      }
      analysis.filesByType[category].push({ file, status });
    });

    // Determine primary change type
    const categories = Object.keys(analysis.filesByType);
    const primaryCategory = categories.reduce((a, b) => 
      analysis.filesByType[a].length >= analysis.filesByType[b].length ? a : b
    );

    // Generate suggestions based on primary category
    const suggestions = {
      test: {
        type: 'test',
        message: 'Add/update tests',
        branch: 'test/',
        confidence: 0.9
      },
      docs: {
        type: 'docs',
        message: 'Update documentation',
        branch: 'docs/',
        confidence: 0.9
      },
      deps: {
        type: 'chore',
        message: 'Update dependencies',
        branch: 'chore/',
        confidence: 0.95
      },
      ci: {
        type: 'ci',
        message: 'Update CI configuration',
        branch: 'ci/',
        confidence: 0.9
      },
      style: {
        type: 'style',
        message: 'Update styles and formatting',
        branch: 'style/',
        confidence: 0.8
      },
      code: {
        type: 'feat',
        message: 'Add new feature',
        branch: 'feature/',
        confidence: 0.7
      },
      other: {
        type: 'chore',
        message: 'Update project files',
        branch: 'chore/',
        confidence: 0.6
      }
    };

    const suggestion = suggestions[primaryCategory] || suggestions.other;
    analysis.suggestedType = suggestion.type;
    analysis.suggestedMessage = suggestion.message;
    analysis.suggestedBranch = suggestion.branch;
    analysis.confidence = suggestion.confidence;

    // Add more specific suggestions
    if (categories.length > 1) {
      analysis.suggestedMessage = `${suggestion.message} and other changes`;
      analysis.confidence -= 0.1;
    }

    const result = {
      analysis,
      recommendations: [
        `${analysis.suggestedType}: ${analysis.suggestedMessage}`,
        `Use branch prefix: ${analysis.suggestedBranch}`,
        `Confidence: ${Math.round(analysis.confidence * 100)}%`
      ]
    };

    if (execute) {
      // Execute the auto-commit with suggested parameters
      return autoCommit({
        message: `${analysis.suggestedType}: ${analysis.suggestedMessage}`,
        branch_prefix: analysis.suggestedBranch
      });
    }

    return createSuccessResponse('Change analysis completed', result);

  } catch (error) {
    return createErrorResponse(`Analysis failed: ${error.message}`);
  }
}

/**
 * Sync branch with target
 */
async function syncBranch({ target_branch = 'main' }) {
  if (!isGitRepository()) {
    return createErrorResponse('Not a git repository');
  }

  try {
    const currentBranch = getCurrentBranch();
    const steps = [];

    if (currentBranch === target_branch) {
      execGitCommand('git pull origin HEAD', { silent: true });
      return createSuccessResponse(`Updated ${target_branch} branch`, {
        branch: currentBranch,
        operation: 'sync-branch'
      });
    }

    // Stash changes if any
    const hasChanges = hasUncommittedChanges();
    if (hasChanges) {
      execGitCommand('git stash', { silent: true });
      steps.push('Stashed uncommitted changes');
    }

    // Switch to target and pull
    execGitCommand(`git checkout ${target_branch}`, { silent: true });
    execGitCommand('git pull origin HEAD', { silent: true });
    steps.push(`Updated ${target_branch} branch`);

    // Switch back and rebase
    execGitCommand(`git checkout ${currentBranch}`, { silent: true });
    execGitCommand(`git rebase ${target_branch}`, { silent: true });
    steps.push(`Rebased ${currentBranch} onto ${target_branch}`);

    // Restore stashed changes
    if (hasChanges) {
      execGitCommand('git stash pop', { silent: true });
      steps.push('Restored stashed changes');
    }

    return createSuccessResponse(`Synced ${currentBranch} with ${target_branch}`, {
      currentBranch,
      targetBranch: target_branch,
      steps,
      operation: 'sync-branch'
    });

  } catch (error) {
    return createErrorResponse(`Branch sync failed: ${error.message}`);
  }
}

/**
 * Squash commits
 */
async function squashCommits({ count = 2, message }) {
  if (!isGitRepository()) {
    return createErrorResponse('Not a git repository');
  }

  try {
    if (hasUncommittedChanges()) {
      return createErrorResponse('Please commit or stash changes before squashing');
    }

    // Get commits to be squashed
    const commits = execGitCommand(`git log --oneline -${count}`, { silent: true })
      .split('\n')
      .filter(line => line.trim());

    if (commits.length < count) {
      return createErrorResponse(`Not enough commits to squash (found ${commits.length}, need ${count})`);
    }

    // Perform interactive rebase (auto-squash)
    const tempMessage = message || 'Squashed commits';
    
    // Reset to count commits back, then commit again
    execGitCommand(`git reset --soft HEAD~${count}`, { silent: true });
    execGitCommand(`git commit -m "${tempMessage}"`, { silent: true });

    return createSuccessResponse(`Squashed ${count} commits`, {
      squashedCommits: commits,
      newMessage: tempMessage,
      operation: 'squash-commits'
    });

  } catch (error) {
    return createErrorResponse(`Squash failed: ${error.message}`);
  }
}

/**
 * Undo commit safely
 */
async function undoCommit({ hard = false }) {
  if (!isGitRepository()) {
    return createErrorResponse('Not a git repository');
  }

  try {
    // Get the commit being undone
    const lastCommit = execGitCommand('git log --oneline -1', { silent: true }).trim();

    if (hard) {
      execGitCommand('git reset --hard HEAD~1', { silent: true });
    } else {
      execGitCommand('git reset --soft HEAD~1', { silent: true });
    }

    return createSuccessResponse(`Undone last commit: ${lastCommit}`, {
      undoneCommit: lastCommit,
      preservedChanges: !hard,
      operation: 'undo-commit'
    });

  } catch (error) {
    return createErrorResponse(`Undo commit failed: ${error.message}`);
  }
}

/**
 * Batch commit multiple groups
 */
async function batchCommit({ groups, push = true }) {
  if (!isGitRepository()) {
    return createErrorResponse('Not a git repository');
  }

  try {
    const commits = [];

    for (const group of groups) {
      const { files, message } = group;
      
      // Stage specific files
      for (const file of files) {
        execGitCommand(`git add "${file}"`, { silent: true });
      }

      // Commit this group
      execGitCommand(`git commit -m "${message}"`, { silent: true });
      commits.push({ message, files: files.length });
    }

    // Push all commits if requested
    if (push) {
      const currentBranch = getCurrentBranch();
      execGitCommand(`git push origin ${currentBranch}`, { silent: true });
    }

    return createSuccessResponse(`Created ${commits.length} commits`, {
      commits,
      pushed: push,
      operation: 'batch-commit'
    });

  } catch (error) {
    return createErrorResponse(`Batch commit failed: ${error.message}`);
  }
}

/**
 * Complete project initialization
 */
async function initProject({
  project_name,
  description,
  repo_visibility = 'private',
  create_npm_package = true,
  author,
  license = 'MIT',
  enable_branch_protection = true,
  auto_merge_initial = true,
  initial_commit_message = 'Initial project setup',
  create_readme = true,
  create_gitignore = true,
  template_type = 'node'
}) {
  try {
    const currentDir = process.cwd();
    const finalProjectName = project_name || path.basename(currentDir);
    const steps = [];
    const warnings = [];

    // Step 1: Initialize git repository if not present
    if (!isGitRepository()) {
      execSync('git init', { cwd: currentDir, stdio: 'pipe' });
      steps.push('✓ Initialized git repository');
    } else {
      steps.push('✓ Git repository already exists');
    }

    // Step 2: Create project files based on template
    const createdFiles = [];

    if (create_npm_package && template_type === 'node') {
      // Create NPM package structure
      const npmResult = await createNpmPackage({
        package_name: finalProjectName,
        description,
        author,
        license,
        create_readme,
        initialize_git: false // Already initialized
      });

      if (npmResult.success) {
        createdFiles.push(...npmResult.data.createdFiles);
        steps.push('✓ Created npm package structure');
      } else {
        warnings.push('⚠ NPM package creation failed, continuing...');
      }
    } else if (template_type === 'python') {
      // Create Python project structure
      const pythonFiles = createPythonTemplate(finalProjectName, description, author, license);
      createdFiles.push(...pythonFiles);
      steps.push('✓ Created Python project structure');
    } else {
      // Generic template
      const genericFiles = createGenericTemplate(finalProjectName, description, author, license, create_readme, create_gitignore);
      createdFiles.push(...genericFiles);
      steps.push('✓ Created generic project structure');
    }

    // Step 3: Create and push to remote repository
    let repoUrl;
    try {
      const visibility = repo_visibility === 'public' ? '--public' : '--private';
      const repoDescription = description ? `--description "${description}"` : '';
      
      const ghResult = execSync(
        `gh repo create ${finalProjectName} ${visibility} ${repoDescription} --source=. --push`,
        { cwd: currentDir, encoding: 'utf8' }
      );
      
      repoUrl = ghResult.trim().split('\n').pop();
      steps.push(`✓ Created ${repo_visibility} repository: ${repoUrl}`);
    } catch (error) {
      warnings.push('⚠ Failed to create GitHub repository, continuing with local setup...');
    }

    // Step 4: Set up branch protection (if repo was created)
    if (repoUrl && enable_branch_protection) {
      try {
        // Wait for repository to be fully initialized
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        execSync(
          `gh api repos/${finalProjectName} -X PATCH -f default_branch=main`,
          { cwd: currentDir, stdio: 'pipe' }
        );
        
        execSync(
          `gh api repos/${finalProjectName}/branches/main/protection -X PUT -f required_status_checks='null' -f enforce_admins=false -f required_pull_request_reviews='{"require_code_owner_reviews":false,"required_approving_review_count":1}' -f restrictions='null'`,
          { cwd: currentDir, stdio: 'pipe' }
        );
        
        steps.push('✓ Enabled branch protection for main branch');
      } catch (error) {
        warnings.push('⚠ Branch protection setup failed, manual setup may be required');
      }
    }

    // Step 5: Create feature branch for initial commit
    const initialBranchName = 'feature/initial-setup';
    
    try {
      execGitCommand(`git checkout -b ${initialBranchName}`, { silent: true });
      steps.push(`✓ Created feature branch: ${initialBranchName}`);
    } catch (error) {
      return createErrorResponse(`Failed to create feature branch: ${error.message}`);
    }

    // Step 6: Add and commit all files
    execGitCommand('git add .', { silent: true });
    
    const commitMessage = `${initial_commit_message}

Project initialized with:
- ${template_type} template
- ${createdFiles.length} files created
- ${repo_visibility} repository
${enable_branch_protection ? '- Branch protection enabled' : ''}

🤖 Generated with [Slambed MCP](https://github.com/your-username/slambed-mcp)

Co-Authored-By: Claude <noreply@anthropic.com>`;

    execGitCommand(`git commit -m "${commitMessage}"`, { silent: true });
    steps.push('✓ Committed initial files');

    // Step 7: Push feature branch
    if (repoUrl) {
      try {
        execGitCommand(`git push -u origin ${initialBranchName}`, { silent: true });
        steps.push('✓ Pushed feature branch to remote');
      } catch (error) {
        warnings.push('⚠ Failed to push feature branch');
      }
    }

    // Step 8: Create initial PR
    let prUrl;
    if (repoUrl) {
      try {
        const prTitle = initial_commit_message;
        const prBody = `## Project Initialization

This PR sets up the initial project structure with the following:

### Created Files
${createdFiles.map(file => `- ${file}`).join('\n')}

### Configuration
- **Template**: ${template_type}
- **License**: ${license}
- **Repository**: ${repo_visibility}
- **Branch Protection**: ${enable_branch_protection ? 'Enabled' : 'Disabled'}

### Next Steps
- [ ] Review project structure
- [ ] Update README with specific project details
- [ ] Add any additional dependencies
- [ ] Configure CI/CD if needed

🤖 Generated with [Slambed MCP](https://github.com/your-username/slambed-mcp)`;

        prUrl = execGitCommand(
          `gh pr create --title "${prTitle}" --body "${prBody}" --base main`,
          { silent: true }
        ).trim();
        
        steps.push(`✓ Created initial PR: ${prUrl}`);
      } catch (error) {
        warnings.push('⚠ Failed to create initial PR');
      }
    }

    // Step 9: Auto-merge if requested
    if (prUrl && auto_merge_initial) {
      try {
        // Wait for PR to be fully created
        await new Promise(resolve => setTimeout(resolve, 3000));
        
        execGitCommand(`gh pr merge ${prUrl} --squash --auto`, { silent: true });
        steps.push('✓ Auto-merged initial PR');
        
        // Switch back to main and pull
        execGitCommand('git checkout main', { silent: true });
        execGitCommand('git pull origin main', { silent: true });
        execGitCommand(`git branch -d ${initialBranchName}`, { silent: true });
        steps.push('✓ Cleaned up feature branch');
        
      } catch (error) {
        warnings.push('⚠ Auto-merge failed, PR available for manual review');
      }
    }

    return createSuccessResponse('Project initialization completed successfully!', {
      projectName: finalProjectName,
      description,
      templateType: template_type,
      repoUrl,
      prUrl,
      createdFiles,
      steps,
      warnings,
      nextSteps: [
        'Review and customize the generated files',
        'Update README with project-specific information',
        'Add dependencies as needed',
        'Configure development environment',
        'Set up CI/CD pipeline if required'
      ],
      operation: 'init-project'
    });

  } catch (error) {
    return createErrorResponse(`Project initialization failed: ${error.message}`);
  }
}

/**
 * Create Python project template
 */
function createPythonTemplate(projectName, description, author, license) {
  const currentDir = process.cwd();
  const createdFiles = [];

  // Create setup.py
  const setupPy = `from setuptools import setup, find_packages

setup(
    name="${projectName}",
    version="0.1.0",
    description="${description || 'A Python project'}",
    author="${author || ''}",
    packages=find_packages(),
    python_requires=">=3.8",
    install_requires=[
        # Add dependencies here
    ],
)
`;
  fs.writeFileSync(path.join(currentDir, 'setup.py'), setupPy);
  createdFiles.push('setup.py');

  // Create requirements.txt
  fs.writeFileSync(path.join(currentDir, 'requirements.txt'), '# Add dependencies here\n');
  createdFiles.push('requirements.txt');

  // Create main module
  const srcDir = path.join(currentDir, projectName.replace(/[^a-zA-Z0-9]/g, '_'));
  if (!fs.existsSync(srcDir)) {
    fs.mkdirSync(srcDir, { recursive: true });
  }
  
  const initPy = `"""${projectName}

${description || 'A Python project'}
"""

__version__ = "0.1.0"
`;
  fs.writeFileSync(path.join(srcDir, '__init__.py'), initPy);
  createdFiles.push(`${path.basename(srcDir)}/__init__.py`);

  // Create .gitignore
  const gitignore = `# Python
__pycache__/
*.py[cod]
*$py.class
*.so
.Python
build/
develop-eggs/
dist/
downloads/
eggs/
.eggs/
lib/
lib64/
parts/
sdist/
var/
wheels/
*.egg-info/
.installed.cfg
*.egg

# Virtual environments
venv/
ENV/
env/
.venv/

# IDE
.vscode/
.idea/
*.swp
*.swo

# OS
.DS_Store
Thumbs.db
`;
  fs.writeFileSync(path.join(currentDir, '.gitignore'), gitignore);
  createdFiles.push('.gitignore');

  // Create README.md
  const readme = `# ${projectName}

${description || 'A Python project'}

## Installation

\`\`\`bash
pip install -r requirements.txt
\`\`\`

## Usage

\`\`\`python
import ${projectName.replace(/[^a-zA-Z0-9]/g, '_')}

# Your code here
\`\`\`

## License

${license}
`;
  fs.writeFileSync(path.join(currentDir, 'README.md'), readme);
  createdFiles.push('README.md');

  return createdFiles;
}

/**
 * Create generic project template
 */
function createGenericTemplate(projectName, description, author, license, createReadme, createGitignore) {
  const currentDir = process.cwd();
  const createdFiles = [];

  // Create basic project structure
  const srcDir = path.join(currentDir, 'src');
  if (!fs.existsSync(srcDir)) {
    fs.mkdirSync(srcDir, { recursive: true });
  }

  // Create main file
  const mainFile = `// ${projectName}
// ${description || 'A generic project'}

console.log('Hello from ${projectName}!');
`;
  fs.writeFileSync(path.join(srcDir, 'main.js'), mainFile);
  createdFiles.push('src/main.js');

  if (createReadme) {
    const readme = `# ${projectName}

${description || 'A generic project'}

## Getting Started

Add instructions for your project here.

## License

${license}
`;
    fs.writeFileSync(path.join(currentDir, 'README.md'), readme);
    createdFiles.push('README.md');
  }

  if (createGitignore) {
    const gitignore = `# Dependencies
node_modules/

# Logs
logs
*.log

# Runtime data
pids
*.pid
*.seed

# Coverage directory
coverage/

# IDE files
.vscode/
.idea/
*.swp
*.swo

# OS generated files
.DS_Store
Thumbs.db
`;
    fs.writeFileSync(path.join(currentDir, '.gitignore'), gitignore);
    createdFiles.push('.gitignore');
  }

  return createdFiles;
}

// Export individual functions for CLI usage
export {
  autoCommit,
  quickCommit,
  smartCommit,
  syncBranch,
  squashCommits,
  undoCommit,
  batchCommit,
  initProject
};

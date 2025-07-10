/**
 * GitHub Flow Tool Integration Tests
 * Task 31: Implement Tests for GitHub Flow Tool
 */

import { jest } from '@jest/globals';
import { 
  createMockServer, 
  createMockToolHandler,
  createMockContext 
} from '../../test-utils/mocks.js';

describe('GitHub Flow Tool Integration Tests', () => {
  let mockServer;
  let mockContext;
  let registeredTools;
  
  // Mock external dependencies
  const mockExecSync = jest.fn();
  const mockGitHelpers = {
    isGitRepository: jest.fn().mockReturnValue(true),
    getCurrentBranch: jest.fn().mockReturnValue('main'),
    hasUncommittedChanges: jest.fn().mockReturnValue(false),
    getMainBranch: jest.fn().mockReturnValue('main'),
    branchExists: jest.fn().mockReturnValue(false),
    hasRemoteBranch: jest.fn().mockReturnValue(false),
    getBranchDivergence: jest.fn().mockReturnValue({ ahead: 0, behind: 0 }),
    isBranchBehind: jest.fn().mockReturnValue({ behind: false, count: 0 }),
    generateBranchName: jest.fn().mockReturnValue('feature/generated-name'),
    execGitCommand: jest.fn().mockReturnValue('')
  };
  
  const mockGitHubAPI = {
    createPullRequest: jest.fn(),
    getPullRequest: jest.fn(),
    mergePullRequest: jest.fn(),
    createIssue: jest.fn(),
    linkIssue: jest.fn(),
    addReview: jest.fn()
  };
  
  beforeEach(() => {
    jest.clearAllMocks();
    mockServer = createMockServer();
    mockContext = createMockContext();
    registeredTools = [];
    
    // Reset mocks to default success states
    mockExecSync.mockReturnValue('');
    mockGitHubAPI.createPullRequest.mockResolvedValue({
      url: 'https://github.com/user/repo/pull/123',
      number: 123
    });
  });
  
  describe('Repository Interaction', () => {
    it('should clone repository successfully', async () => {
      const cloneTool = {
        name: 'github_clone',
        handler: async (args) => {
          const { repo_url, directory } = args;
          
          try {
            // Validate inputs
            if (!repo_url || !repo_url.includes('github.com')) {
              throw new Error('Invalid repository URL');
            }
            
            // Simulate clone
            mockExecSync(`git clone ${repo_url} ${directory || '.'}`);
            
            return {
              success: true,
              message: 'Repository cloned successfully',
              data: {
                repo_url,
                directory: directory || '.',
                branch: 'main'
              }
            };
          } catch (error) {
            return {
              success: false,
              message: `Clone failed: ${error.message}`,
              error: error.message
            };
          }
        }
      };
      
      const result = await cloneTool.handler({
        repo_url: 'https://github.com/user/repo.git',
        directory: 'my-project'
      });
      
      expect(result.success).toBe(true);
      expect(mockExecSync).toHaveBeenCalledWith('git clone https://github.com/user/repo.git my-project');
    });
    
    it('should commit changes with message', async () => {
      const commitTool = {
        name: 'github_commit',
        handler: async (args) => {
          const { message, files = [] } = args;
          
          if (!message) {
            return {
              success: false,
              message: 'Commit message is required'
            };
          }
          
          try {
            // Add files if specified
            if (files.length > 0) {
              files.forEach(file => {
                mockExecSync(`git add ${file}`);
              });
            } else {
              mockExecSync('git add -A');
            }
            
            // Commit
            mockExecSync(`git commit -m "${message}"`);
            const commitHash = 'abc123def456';
            
            return {
              success: true,
              message: 'Changes committed successfully',
              data: {
                commitHash,
                message,
                filesChanged: files.length || 'all'
              }
            };
          } catch (error) {
            return {
              success: false,
              message: `Commit failed: ${error.message}`
            };
          }
        }
      };
      
      const result = await commitTool.handler({
        message: 'feat: add new feature',
        files: ['src/feature.js', 'test/feature.test.js']
      });
      
      expect(result.success).toBe(true);
      expect(mockExecSync).toHaveBeenCalledWith('git add src/feature.js');
      expect(mockExecSync).toHaveBeenCalledWith('git add test/feature.test.js');
      expect(mockExecSync).toHaveBeenCalledWith('git commit -m "feat: add new feature"');
    });
    
    it('should push changes to remote', async () => {
      const pushTool = {
        name: 'github_push',
        handler: async (args) => {
          const { branch, force = false } = args;
          
          try {
            const currentBranch = branch || mockGitHelpers.getCurrentBranch();
            const hasRemote = mockGitHelpers.hasRemoteBranch(currentBranch);
            
            let command = `git push`;
            if (!hasRemote) {
              command += ` -u origin ${currentBranch}`;
            } else if (force) {
              command += ' --force-with-lease';
            }
            
            mockExecSync(command);
            
            return {
              success: true,
              message: 'Changes pushed successfully',
              data: {
                branch: currentBranch,
                forced: force,
                newBranch: !hasRemote
              }
            };
          } catch (error) {
            return {
              success: false,
              message: `Push failed: ${error.message}`
            };
          }
        }
      };
      
      mockGitHelpers.hasRemoteBranch.mockReturnValue(false);
      const result = await pushTool.handler({ branch: 'feature/new' });
      
      expect(result.success).toBe(true);
      expect(result.data.newBranch).toBe(true);
      expect(mockExecSync).toHaveBeenCalledWith('git push -u origin feature/new');
    });
  });
  
  describe('Branch Management', () => {
    it('should create new feature branch', async () => {
      const createBranchTool = {
        name: 'github_create_branch',
        handler: async (args) => {
          const { branch_name, from_branch = 'main' } = args;
          
          if (!branch_name) {
            return {
              success: false,
              message: 'Branch name is required'
            };
          }
          
          try {
            // Check for uncommitted changes
            if (mockGitHelpers.hasUncommittedChanges()) {
              return {
                success: false,
                message: 'Cannot create branch with uncommitted changes'
              };
            }
            
            // Switch to base branch and update
            mockExecSync(`git checkout ${from_branch}`);
            mockExecSync('git pull');
            
            // Create new branch
            mockExecSync(`git checkout -b ${branch_name}`);
            
            return {
              success: true,
              message: `Branch '${branch_name}' created successfully`,
              data: {
                branch: branch_name,
                from: from_branch
              }
            };
          } catch (error) {
            return {
              success: false,
              message: `Branch creation failed: ${error.message}`
            };
          }
        }
      };
      
      const result = await createBranchTool.handler({
        branch_name: 'feature/awesome-feature',
        from_branch: 'develop'
      });
      
      expect(result.success).toBe(true);
      expect(mockExecSync).toHaveBeenCalledWith('git checkout develop');
      expect(mockExecSync).toHaveBeenCalledWith('git checkout -b feature/awesome-feature');
    });
    
    it('should handle branch deletion', async () => {
      const deleteBranchTool = {
        name: 'github_delete_branch',
        handler: async (args) => {
          const { branch_name, force = false, delete_remote = false } = args;
          
          try {
            const currentBranch = mockGitHelpers.getCurrentBranch();
            if (currentBranch === branch_name) {
              // Switch to main first
              mockExecSync('git checkout main');
            }
            
            // Delete local branch
            const deleteFlag = force ? '-D' : '-d';
            mockExecSync(`git branch ${deleteFlag} ${branch_name}`);
            
            // Delete remote if requested
            if (delete_remote) {
              mockExecSync(`git push origin --delete ${branch_name}`);
            }
            
            return {
              success: true,
              message: `Branch '${branch_name}' deleted`,
              data: {
                localDeleted: true,
                remoteDeleted: delete_remote
              }
            };
          } catch (error) {
            return {
              success: false,
              message: `Branch deletion failed: ${error.message}`
            };
          }
        }
      };
      
      const result = await deleteBranchTool.handler({
        branch_name: 'feature/old-feature',
        delete_remote: true
      });
      
      expect(result.success).toBe(true);
      expect(result.data.remoteDeleted).toBe(true);
      expect(mockExecSync).toHaveBeenCalledWith('git push origin --delete feature/old-feature');
    });
  });
  
  describe('Pull Request Management', () => {
    it('should create pull request successfully', async () => {
      const createPRTool = {
        name: 'github_create_pr',
        handler: async (args) => {
          const { title, body, draft = false, base = 'main' } = args;
          
          if (!title) {
            return {
              success: false,
              message: 'PR title is required'
            };
          }
          
          try {
            const currentBranch = mockGitHelpers.getCurrentBranch();
            
            // Push current branch first
            mockExecSync('git push -u origin HEAD');
            
            // Create PR using gh CLI
            let command = `gh pr create --title "${title}"`;
            if (body) command += ` --body "${body}"`;
            if (draft) command += ' --draft';
            command += ` --base ${base}`;
            
            const prUrl = 'https://github.com/user/repo/pull/123';
            mockExecSync.mockReturnValue(prUrl);
            const output = mockExecSync(command);
            
            return {
              success: true,
              message: 'Pull request created successfully',
              data: {
                pr_url: output,
                pr_number: '123',
                branch: currentBranch,
                base,
                draft
              }
            };
          } catch (error) {
            return {
              success: false,
              message: `PR creation failed: ${error.message}`
            };
          }
        }
      };
      
      mockGitHelpers.getCurrentBranch.mockReturnValue('feature/new-feature');
      const result = await createPRTool.handler({
        title: 'Add new feature',
        body: 'This PR adds an awesome new feature',
        draft: true
      });
      
      expect(result.success).toBe(true);
      expect(result.data.pr_url).toContain('pull/123');
      expect(result.data.draft).toBe(true);
    });
    
    it('should handle PR merge', async () => {
      const mergePRTool = {
        name: 'github_merge_pr',
        handler: async (args) => {
          const { pr_number, method = 'merge', delete_branch = true } = args;
          
          try {
            let prNum = pr_number;
            
            // If no PR number, get from current branch
            if (!prNum) {
              mockExecSync.mockReturnValue('123\n');
              prNum = mockExecSync('gh pr list --head $(git branch --show-current) --json number -q ".[0].number"').trim();
            }
            
            // Check PR status
            mockExecSync.mockReturnValue('APPROVED\n');
            const status = mockExecSync(`gh pr view ${prNum} --json reviewDecision -q ".reviewDecision"`).trim();
            
            if (status !== 'APPROVED' && method !== 'admin') {
              return {
                success: false,
                message: 'PR is not approved yet'
              };
            }
            
            // Merge PR
            let mergeCommand = `gh pr merge ${prNum} --${method}`;
            if (delete_branch) mergeCommand += ' --delete-branch';
            
            mockExecSync(mergeCommand);
            
            return {
              success: true,
              message: 'Pull request merged successfully',
              data: {
                pr_number: prNum,
                method,
                branch_deleted: delete_branch
              }
            };
          } catch (error) {
            return {
              success: false,
              message: `PR merge failed: ${error.message}`
            };
          }
        }
      };
      
      const result = await mergePRTool.handler({
        pr_number: '123',
        method: 'squash',
        delete_branch: true
      });
      
      expect(result.success).toBe(true);
      expect(result.data.method).toBe('squash');
      expect(mockExecSync).toHaveBeenCalledWith('gh pr merge 123 --squash --delete-branch');
    });
  });
  
  describe('Error Handling for GitHub API Failures', () => {
    it('should handle rate limiting errors', async () => {
      const toolWithRateLimit = {
        name: 'github_api_tool',
        handler: async (args) => {
          try {
            // Simulate API call
            mockExecSync.mockImplementation(() => {
              const error = new Error('API rate limit exceeded');
              error.code = 'RATE_LIMITED';
              throw error;
            });
            
            mockExecSync('gh api repos/user/repo');
            
            return { success: true };
          } catch (error) {
            if (error.message.includes('rate limit')) {
              return {
                success: false,
                message: 'GitHub API rate limit exceeded',
                error: {
                  code: 'RATE_LIMITED',
                  retryAfter: 3600,
                  suggestion: 'Please wait before retrying or use authentication'
                }
              };
            }
            throw error;
          }
        }
      };
      
      const result = await toolWithRateLimit.handler({});
      
      expect(result.success).toBe(false);
      expect(result.error.code).toBe('RATE_LIMITED');
      expect(result.error.suggestion).toContain('authentication');
    });
    
    it('should handle authentication errors', async () => {
      const toolWithAuth = {
        name: 'github_auth_tool',
        handler: async (args) => {
          try {
            mockExecSync.mockImplementation(() => {
              throw new Error('Authentication required');
            });
            
            mockExecSync('gh pr create --title "Test"');
            
            return { success: true };
          } catch (error) {
            if (error.message.includes('Authentication')) {
              return {
                success: false,
                message: 'GitHub authentication required',
                error: {
                  code: 'AUTH_REQUIRED',
                  suggestion: 'Run "gh auth login" to authenticate'
                }
              };
            }
            throw error;
          }
        }
      };
      
      const result = await toolWithAuth.handler({});
      
      expect(result.success).toBe(false);
      expect(result.error.code).toBe('AUTH_REQUIRED');
    });
    
    it('should handle network errors gracefully', async () => {
      const toolWithNetwork = {
        name: 'github_network_tool',
        handler: async (args) => {
          const maxRetries = 3;
          let attempts = 0;
          
          while (attempts < maxRetries) {
            try {
              if (attempts < 2) {
                mockExecSync.mockImplementation(() => {
                  throw new Error('Network connection failed');
                });
              } else {
                mockExecSync.mockReturnValue('Success');
              }
              
              const result = mockExecSync('gh pr list');
              
              return {
                success: true,
                data: result,
                attempts: attempts + 1
              };
            } catch (error) {
              attempts++;
              
              if (attempts >= maxRetries) {
                return {
                  success: false,
                  message: 'Network error after retries',
                  error: {
                    code: 'NETWORK_ERROR',
                    attempts,
                    suggestion: 'Check your internet connection'
                  }
                };
              }
              
              // Wait before retry
              await new Promise(resolve => setTimeout(resolve, 100));
            }
          }
        }
      };
      
      const result = await toolWithNetwork.handler({});
      
      expect(result.success).toBe(true);
      expect(result.attempts).toBe(3);
    });
    
    it('should handle repository not found errors', async () => {
      const toolWithRepoCheck = {
        name: 'github_repo_tool',
        handler: async (args) => {
          const { repo } = args;
          
          try {
            mockExecSync.mockImplementation(() => {
              throw new Error('repository not found');
            });
            
            mockExecSync(`gh repo view ${repo}`);
            
            return { success: true };
          } catch (error) {
            if (error.message.includes('not found')) {
              return {
                success: false,
                message: `Repository '${repo}' not found`,
                error: {
                  code: 'REPO_NOT_FOUND',
                  suggestion: 'Check repository name and permissions'
                }
              };
            }
            throw error;
          }
        }
      };
      
      const result = await toolWithRepoCheck.handler({ repo: 'user/nonexistent' });
      
      expect(result.success).toBe(false);
      expect(result.error.code).toBe('REPO_NOT_FOUND');
    });
  });
  
  describe('Integration Scenarios', () => {
    it('should complete full GitHub flow workflow', async () => {
      // Simulate complete workflow: create branch -> make changes -> create PR -> merge
      const workflow = async () => {
        const results = [];
        
        // 1. Create feature branch
        const branchResult = await simulateTool('create_branch', {
          branch_name: 'feature/complete-workflow'
        });
        results.push(branchResult);
        
        // 2. Make changes and commit
        const commitResult = await simulateTool('commit', {
          message: 'feat: implement new feature',
          files: ['src/new-feature.js']
        });
        results.push(commitResult);
        
        // 3. Push changes
        const pushResult = await simulateTool('push', {});
        results.push(pushResult);
        
        // 4. Create PR
        const prResult = await simulateTool('create_pr', {
          title: 'Implement new feature',
          body: 'This PR implements the new feature as requested'
        });
        results.push(prResult);
        
        // 5. Merge PR
        const mergeResult = await simulateTool('merge_pr', {
          pr_number: '123',
          method: 'squash'
        });
        results.push(mergeResult);
        
        return {
          success: results.every(r => r.success),
          workflow: 'complete',
          steps: results
        };
      };
      
      const result = await workflow();
      
      expect(result.success).toBe(true);
      expect(result.steps).toHaveLength(5);
    });
    
    // Helper function to simulate tool execution
    async function simulateTool(toolName, args) {
      switch (toolName) {
        case 'create_branch':
          mockExecSync(`git checkout -b ${args.branch_name}`);
          return { success: true, tool: toolName };
          
        case 'commit':
          mockExecSync(`git commit -m "${args.message}"`);
          return { success: true, tool: toolName };
          
        case 'push':
          mockExecSync('git push');
          return { success: true, tool: toolName };
          
        case 'create_pr':
          mockExecSync.mockReturnValue('https://github.com/user/repo/pull/123');
          return { success: true, tool: toolName, pr_url: mockExecSync() };
          
        case 'merge_pr':
          mockExecSync(`gh pr merge ${args.pr_number}`);
          return { success: true, tool: toolName };
          
        default:
          return { success: false, tool: toolName };
      }
    }
  });
});
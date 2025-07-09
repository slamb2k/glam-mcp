/**
 * Safety Tools for MCP Server
 * Provides tools for risk analysis, conflict detection, and operation validation
 */

import { createSuccessResponse, createErrorResponse } from '../utils/responses.js';
import { GitClient } from '../clients/git-client.js';

// Create singleton instance
const gitClient = new GitClient();

/**
 * Register safety tools with the server
 * @param {Object} server - The MCP server instance
 */
export function registerSafetyTools(server) {
  const tools = safetyTools(gitClient);
  tools.forEach(tool => server.addTool(tool));
}

/**
 * Create safety-related tools
 * @param {GitClient} gitClient - Git client for repository operations
 * @returns {Array} Array of safety tool definitions
 */
export function safetyTools(gitClient) {
  return [
    {
      name: 'analyze_operation_risk',
      description: 'Analyze the risk level of a Git operation before execution. Use this to assess potential dangers of operations like force push, large merges, or operations on protected branches.',
      inputSchema: {
        type: 'object',
        properties: {
          operation: {
            type: 'string',
            description: 'The Git operation to analyze',
            enum: ['commit', 'push', 'pull', 'merge', 'rebase', 'checkout', 'reset', 'clean']
          },
          targetBranch: {
            type: 'string',
            description: 'Target branch for the operation'
          },
          force: {
            type: 'boolean',
            description: 'Whether this is a force operation',
            default: false
          },
          affectedFiles: {
            type: 'integer',
            description: 'Number of files affected by the operation'
          },
          options: {
            type: 'object',
            description: 'Additional operation options',
            additionalProperties: true
          }
        },
        required: ['operation']
      },
      handler: async (params) => {
        const { operation, targetBranch, force = false, affectedFiles, options = {} } = params;

        try {
          // Get repository state
          const repoState = await gitClient.getRepoState();
          
          // Initialize risk assessment
          let riskScore = 0;
          const risks = [];
          const recommendations = [];

          // Check for high-risk operations
          if (operation === 'push' && force) {
            riskScore += 40;
            risks.push({
              type: 'force-push',
              severity: 'high',
              description: 'Force push can overwrite remote history'
            });
            recommendations.push('Consider creating a backup branch before force pushing');

            // Extra risk for force push to main/master
            if (targetBranch === repoState.mainBranch || targetBranch === 'main' || targetBranch === 'master') {
              riskScore += 30;
              risks.push({
                type: 'force-push-main',
                severity: 'high',
                description: 'Force pushing to the main branch can affect all team members'
              });
              recommendations.push('Ensure all team members are aware of this operation');
            }
          }

          // Check for uncommitted changes
          if (repoState.hasUncommittedChanges && ['checkout', 'pull', 'merge', 'rebase'].includes(operation)) {
            riskScore += 20;
            risks.push({
              type: 'uncommitted-changes',
              severity: 'medium',
              description: 'Uncommitted changes may be lost or cause conflicts'
            });
            recommendations.push('Commit or stash changes before proceeding');
          }

          // Check for large-scale operations
          if (affectedFiles && affectedFiles > 100) {
            riskScore += Math.min(30, affectedFiles / 10);
            risks.push({
              type: 'large-scale-change',
              severity: affectedFiles > 500 ? 'high' : 'medium',
              description: `Operation affects ${affectedFiles} files`
            });
            recommendations.push('Consider breaking the operation into smaller chunks');
            recommendations.push('Ensure comprehensive testing after the operation');
          }

          // Check for operations on detached HEAD
          if (repoState.isDetachedHead && ['commit', 'merge'].includes(operation)) {
            riskScore += 25;
            risks.push({
              type: 'detached-head',
              severity: 'medium',
              description: 'Operating on detached HEAD state - commits may be lost'
            });
            recommendations.push('Create a branch to preserve your work');
          }

          // Check for operations on protected branches
          const protectedBranches = ['main', 'master', 'develop', 'production'];
          if (targetBranch && protectedBranches.includes(targetBranch)) {
            riskScore += 15;
            risks.push({
              type: 'protected-branch',
              severity: 'low',
              description: `Operating on protected branch: ${targetBranch}`
            });
            recommendations.push('Ensure changes have been reviewed');
          }

          // Check repository size impact
          if (repoState.fileCount > 10000) {
            riskScore += 10;
            risks.push({
              type: 'large-repository',
              severity: 'low',
              description: 'Large repository - operations may take longer'
            });
          }

          // Check for risky reset operations
          if (operation === 'reset' && options.hard) {
            riskScore += 35;
            risks.push({
              type: 'hard-reset',
              severity: 'high',
              description: 'Hard reset will discard all uncommitted changes'
            });
            recommendations.push('Ensure you have backups of important changes');
          }

          // Check for clean operations
          if (operation === 'clean') {
            riskScore += 25;
            risks.push({
              type: 'clean-operation',
              severity: 'medium',
              description: 'Clean operation will delete untracked files'
            });
            recommendations.push('Review untracked files before cleaning');
          }

          // Determine risk level
          const riskLevel = 
            riskScore >= 70 ? 'high' :
            riskScore >= 40 ? 'medium' :
            riskScore >= 20 ? 'low' : 'minimal';

          // Add general recommendations based on risk level
          if (riskLevel === 'high') {
            recommendations.unshift('⚠️ HIGH RISK: Consider canceling and reviewing the operation');
          } else if (riskLevel === 'medium') {
            recommendations.unshift('⚠️ MEDIUM RISK: Proceed with caution');
          }

          return createSuccessResponse('Risk analysis completed', {
            operation,
            targetBranch,
            riskScore: Math.min(100, riskScore),
            riskLevel,
            risks,
            recommendations,
            repoState: {
              fileCount: repoState.fileCount,
              branchCount: repoState.branchCount,
              hasUncommittedChanges: repoState.hasUncommittedChanges,
              currentBranch: repoState.currentBranch
            }
          });
        } catch (error) {
          return createErrorResponse('Failed to analyze operation risk', error);
        }
      }
    },

    {
      name: 'check_for_conflicts',
      description: 'Check for potential merge conflicts and branch divergence. Use this before merge or rebase operations to identify conflicts early.',
      inputSchema: {
        type: 'object',
        properties: {
          sourceBranch: {
            type: 'string',
            description: 'Source branch (defaults to current branch)'
          },
          targetBranch: {
            type: 'string',
            description: 'Target branch to check conflicts against'
          },
          checkUncommitted: {
            type: 'boolean',
            description: 'Also check for uncommitted changes',
            default: true
          }
        }
      },
      handler: async (params) => {
        const { sourceBranch, targetBranch, checkUncommitted = true } = params;

        try {
          const conflicts = {
            hasConflicts: false,
            conflictingFiles: [],
            divergence: null,
            hasUncommittedChanges: false,
            uncommittedFiles: [],
            resolutionGuidance: [],
            recommendations: []
          };

          // Check for merge conflicts if branches specified
          if (targetBranch) {
            const modifiedFiles = await gitClient.getModifiedFiles();
            const conflictingFiles = await gitClient.getConflictingFiles(modifiedFiles);
            if (conflictingFiles && conflictingFiles.length > 0) {
              conflicts.hasConflicts = true;
              conflicts.conflictingFiles = conflictingFiles;
              
              // Add resolution guidance
              conflicts.resolutionGuidance.push('1. Review each conflicting file');
              conflicts.resolutionGuidance.push('2. Decide which changes to keep');
              conflicts.resolutionGuidance.push('3. Test thoroughly after resolution');
              
              // Specific guidance based on conflict type
              conflictingFiles.forEach(conflict => {
                if (conflict.conflictType === 'both-modified') {
                  conflicts.recommendations.push(`File ${conflict.file} modified in both branches - manual merge required`);
                }
              });
            }

            // Check branch divergence
            if (sourceBranch || targetBranch) {
              const divergence = await gitClient.getDivergedCommits(sourceBranch, targetBranch);
              conflicts.divergence = {
                ahead: divergence.ahead,
                behind: divergence.behind,
                isDiverged: divergence.ahead > 0 && divergence.behind > 0
              };

              if (conflicts.divergence.isDiverged) {
                conflicts.recommendations.push('Branches have diverged - consider rebasing or merging');
                if (divergence.behind > 10) {
                  conflicts.recommendations.push('Source branch is significantly behind - update before merging');
                }
              }
            }
          }

          // Check for uncommitted changes
          if (checkUncommitted) {
            const isClean = await gitClient.isCleanWorkingTree();
            if (!isClean) {
              conflicts.hasUncommittedChanges = true;
              const changes = await gitClient.getUncommittedChanges();
              conflicts.uncommittedFiles = [
                ...changes.modified,
                ...changes.added,
                ...changes.deleted
              ];
              conflicts.recommendations.push('Commit or stash changes before merging to avoid conflicts');
            }
          }

          const hasAnyConflicts = conflicts.hasConflicts || conflicts.hasUncommittedChanges;

          return createSuccessResponse(
            hasAnyConflicts ? 'Conflicts detected' : 'No conflicts detected',
            conflicts
          );
        } catch (error) {
          return createErrorResponse('Failed to check for conflicts', error);
        }
      }
    },

    {
      name: 'validate_preconditions',
      description: 'Validate that all preconditions are met before executing a Git operation. Use this to ensure operations will succeed and are safe to perform.',
      inputSchema: {
        type: 'object',
        properties: {
          operation: {
            type: 'string',
            description: 'The Git operation to validate',
            enum: ['commit', 'push', 'pull', 'merge', 'rebase', 'checkout']
          },
          targetBranch: {
            type: 'string',
            description: 'Target branch for the operation'
          },
          options: {
            type: 'object',
            description: 'Additional validation options',
            additionalProperties: true
          }
        },
        required: ['operation']
      },
      handler: async (params) => {
        const { operation, targetBranch, options = {} } = params;

        try {
          const checks = [];
          const failedChecks = [];
          const recommendations = [];

          // Operation-specific validations
          switch (operation) {
            case 'commit':
              // Check for changes to commit
              const changes = await gitClient.getUncommittedChanges();
              const hasChanges = changes.modified.length > 0 || 
                               changes.added.length > 0 || 
                               changes.deleted.length > 0;
              
              checks.push({
                name: 'has-changes',
                description: 'Check for uncommitted changes',
                passed: hasChanges
              });

              if (!hasChanges) {
                failedChecks.push({
                  name: 'has-changes',
                  reason: 'No changes to commit'
                });
                recommendations.push('Make changes before committing');
              }

              // Check not in detached HEAD
              const repoState = await gitClient.getRepoState();
              checks.push({
                name: 'not-detached',
                description: 'Check not in detached HEAD state',
                passed: !repoState.isDetachedHead
              });

              if (repoState.isDetachedHead) {
                failedChecks.push({
                  name: 'not-detached',
                  reason: 'Cannot commit in detached HEAD state'
                });
                recommendations.push('Create a branch first: git checkout -b <branch-name>');
              }
              break;

            case 'push':
              // Check for upstream branch
              const currentBranch = await gitClient.getCurrentBranch();
              const hasUpstream = await gitClient.hasUpstreamBranch(currentBranch);
              
              checks.push({
                name: 'has-upstream',
                description: 'Check for upstream branch',
                passed: hasUpstream
              });

              if (!hasUpstream) {
                failedChecks.push({
                  name: 'has-upstream',
                  reason: 'No upstream branch set'
                });
                recommendations.push(`Set upstream: git push -u origin ${currentBranch}`);
              }

              // Check for commits to push
              const diverged = await gitClient.getDivergedCommits();
              checks.push({
                name: 'has-commits',
                description: 'Check for commits to push',
                passed: diverged.ahead > 0
              });

              if (diverged.ahead === 0) {
                failedChecks.push({
                  name: 'has-commits',
                  reason: 'No commits to push'
                });
              }
              break;

            case 'pull':
            case 'merge':
            case 'rebase':
              // Check for clean working tree
              const isClean = await gitClient.isCleanWorkingTree();
              checks.push({
                name: 'clean-working-tree',
                description: 'Check for clean working tree',
                passed: isClean
              });

              if (!isClean) {
                failedChecks.push({
                  name: 'clean-working-tree',
                  reason: 'Working tree has uncommitted changes'
                });
                recommendations.push('Commit or stash changes first');
                recommendations.push('Use: git stash');
              }

              // Check for conflicts
              if (targetBranch) {
                const conflicts = await gitClient.getConflictingFiles([targetBranch]);
                checks.push({
                  name: 'no-conflicts',
                  description: 'Check for merge conflicts',
                  passed: conflicts.length === 0
                });

                if (conflicts.length > 0) {
                  failedChecks.push({
                    name: 'no-conflicts',
                    reason: `${conflicts.length} conflicting files detected`
                  });
                  recommendations.push('Resolve conflicts before proceeding');
                }
              }
              break;

            case 'checkout':
              // Check for clean working tree if switching branches
              if (targetBranch) {
                const isClean = await gitClient.isCleanWorkingTree();
                checks.push({
                  name: 'clean-for-checkout',
                  description: 'Check working tree before checkout',
                  passed: isClean
                });

                if (!isClean) {
                  failedChecks.push({
                    name: 'clean-for-checkout',
                    reason: 'Uncommitted changes may be lost'
                  });
                  recommendations.push('Commit or stash changes before switching branches');
                  recommendations.push('Use: git stash');
                  recommendations.push('Or commit: git commit -am "Work in progress"');
                }
              }
              break;
          }

          const allChecksPassed = failedChecks.length === 0;

          return createSuccessResponse(
            allChecksPassed ? 'All preconditions met' : 'Some preconditions not met',
            {
              operation,
              targetBranch,
              valid: allChecksPassed,
              checks,
              failedChecks,
              recommendations,
              canProceed: allChecksPassed || failedChecks.every(c => c.severity !== 'blocking')
            }
          );
        } catch (error) {
          return createErrorResponse('Failed to validate preconditions', error);
        }
      }
    },

    {
      name: 'assess_critical_files',
      description: 'Assess the criticality of files being modified. Use this to identify operations affecting important system files, configurations, or dependencies.',
      inputSchema: {
        type: 'object',
        properties: {
          files: {
            type: 'array',
            description: 'List of files to assess',
            items: { type: 'string' }
          },
          operation: {
            type: 'string',
            description: 'The operation being performed on these files'
          }
        },
        required: ['files']
      },
      handler: async (params) => {
        const { files, operation } = params;

        try {
          const criticalPatterns = [
            { pattern: /package\.json$/, type: 'dependencies', score: 80 },
            { pattern: /package-lock\.json$/, type: 'dependencies', score: 70 },
            { pattern: /yarn\.lock$/, type: 'dependencies', score: 70 },
            { pattern: /\.github\/workflows\//, type: 'ci-cd', score: 75 },
            { pattern: /Dockerfile$/, type: 'deployment', score: 70 },
            { pattern: /docker-compose\.yml$/, type: 'deployment', score: 70 },
            { pattern: /\.env/, type: 'configuration', score: 90 },
            { pattern: /config\//, type: 'configuration', score: 60 },
            { pattern: /migrations\//, type: 'database', score: 85 },
            { pattern: /schema\.(sql|prisma|graphql)/, type: 'database', score: 80 },
            { pattern: /\.(key|pem|cert|crt)$/, type: 'security', score: 95 },
            { pattern: /webpack\.config/, type: 'build', score: 65 },
            { pattern: /tsconfig\.json$/, type: 'build', score: 60 },
            { pattern: /\.gitignore$/, type: 'vcs', score: 50 },
            { pattern: /README/, type: 'documentation', score: 40 }
          ];

          const criticalFiles = [];
          const filesByType = {};
          let totalCriticalityScore = 0;

          files.forEach(file => {
            criticalPatterns.forEach(({ pattern, type, score }) => {
              if (pattern.test(file)) {
                criticalFiles.push(file);
                totalCriticalityScore += score;
                
                if (!filesByType[type]) {
                  filesByType[type] = [];
                }
                filesByType[type].push(file);
              }
            });
          });

          // Calculate average criticality score
          const criticalityScore = criticalFiles.length > 0 
            ? Math.min(100, totalCriticalityScore / criticalFiles.length)
            : 0;

          const recommendations = [];

          // Add recommendations based on criticality
          if (criticalityScore > 70) {
            recommendations.push('⚠️ CRITICAL: Review changes very carefully');
            recommendations.push('Consider having another team member review');
            recommendations.push('Test thoroughly in a staging environment');
          } else if (criticalityScore > 40) {
            recommendations.push('Review changes carefully before proceeding');
            recommendations.push('Ensure you have backups');
          }

          // Type-specific recommendations
          if (filesByType.dependencies) {
            recommendations.push('Dependency changes detected - run tests after operation');
            recommendations.push('Update lock files if needed');
          }
          if (filesByType.security) {
            recommendations.push('🔒 SECURITY FILES: Ensure no sensitive data is exposed');
            recommendations.push('Verify file permissions after operation');
          }
          if (filesByType.database) {
            recommendations.push('Database changes detected - backup database before proceeding');
          }
          if (filesByType['ci-cd']) {
            recommendations.push('CI/CD changes - verify pipeline still works');
          }

          return createSuccessResponse('File criticality assessed', {
            totalFiles: files.length,
            criticalFiles,
            criticalityScore: Math.round(criticalityScore),
            filesByType,
            recommendations,
            riskLevel: 
              criticalityScore > 70 ? 'high' :
              criticalityScore > 40 ? 'medium' :
              criticalityScore > 20 ? 'low' : 'minimal'
          });
        } catch (error) {
          return createErrorResponse('Failed to assess file criticality', error);
        }
      }
    }
  ];
}
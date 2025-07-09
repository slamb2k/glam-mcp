/**
 * Team Tools for MCP Server
 * Provides tools for team activity detection, collaboration insights, and reviewer suggestions
 */

import { createSuccessResponse, createErrorResponse } from '../utils/responses.js';
import { GitClient } from '../clients/git-client.js';
import { GithubClient } from '../clients/github-client.js';

// Create singleton instances
const gitClient = new GitClient();
const githubClient = new GithubClient();

/**
 * Register team tools with the server
 * @param {Object} server - The MCP server instance
 */
export function registerTeamTools(server) {
  const tools = teamTools(gitClient, githubClient);
  tools.forEach(tool => server.addTool(tool));
}

/**
 * Create team-related tools
 * @param {GitClient} gitClient - Git client for repository operations
 * @param {GithubClient} githubClient - GitHub API client
 * @returns {Array} Array of team tool definitions
 */
export function teamTools(gitClient, githubClient) {
  return [
    {
      name: 'check_team_activity',
      description: 'Check recent team activity including commits, branches, and pull requests. Use this to understand what your team is working on and identify potential conflicts or collaboration opportunities.',
      inputSchema: {
        type: 'object',
        properties: {
          days: {
            type: 'integer',
            description: 'Number of days to look back for activity',
            default: 7,
            minimum: 1,
            maximum: 90
          },
          includeMyActivity: {
            type: 'boolean',
            description: 'Include your own activity in the results',
            default: false
          }
        }
      },
      handler: async (params) => {
        const { days = 7, includeMyActivity = false } = params;

        try {
          // Calculate date threshold
          const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();

          // Get recent commits and active branches
          const [commits, branches] = await Promise.all([
            gitClient.getRecentCommits({ since }),
            gitClient.getActiveBranches()
          ]);

          // Filter commits by date
          const recentCommits = commits.filter(commit => 
            new Date(commit.timestamp) > new Date(since)
          );

          // Extract unique contributors
          const contributors = [...new Set(recentCommits.map(c => c.author))];

          // Filter out own activity if requested
          const currentUser = await gitClient.getCurrentUser();
          let filteredCommits = recentCommits;
          let filteredBranches = branches;

          if (!includeMyActivity && currentUser) {
            filteredCommits = recentCommits.filter(c => c.author !== currentUser);
            filteredBranches = branches.filter(b => b.author !== currentUser);
          }

          // Group activity by author
          const activityByAuthor = {};
          filteredCommits.forEach(commit => {
            if (!activityByAuthor[commit.author]) {
              activityByAuthor[commit.author] = {
                commits: 0,
                files: new Set(),
                lastActivity: commit.timestamp
              };
            }
            activityByAuthor[commit.author].commits++;
            commit.files.forEach(file => activityByAuthor[commit.author].files.add(file));
          });

          // Convert sets to arrays
          Object.keys(activityByAuthor).forEach(author => {
            activityByAuthor[author].files = Array.from(activityByAuthor[author].files);
          });

          return createSuccessResponse('Team activity retrieved', {
            period: { days, since },
            commits: filteredCommits,
            activeBranches: filteredBranches,
            contributors: contributors.filter(c => includeMyActivity || c !== currentUser),
            activityByAuthor,
            summary: {
              totalCommits: filteredCommits.length,
              activeBranches: filteredBranches.length,
              activeContributors: Object.keys(activityByAuthor).length
            }
          });
        } catch (error) {
          return createErrorResponse('Failed to retrieve team activity', error);
        }
      }
    },

    {
      name: 'find_related_work',
      description: 'Find work related to specific files or the current branch. Use this to discover related pull requests, commits, and potential conflicts before starting work.',
      inputSchema: {
        type: 'object',
        properties: {
          files: {
            type: 'array',
            description: 'List of files to check for related work',
            items: { type: 'string' }
          },
          checkConflicts: {
            type: 'boolean',
            description: 'Check for potential merge conflicts',
            default: true
          },
          includeClosed: {
            type: 'boolean',
            description: 'Include closed/merged pull requests',
            default: false
          }
        }
      },
      handler: async (params) => {
        const { files = [], checkConflicts = true, includeClosed = false } = params;

        try {
          // If no files specified, get modified files in current branch
          const targetFiles = files && files.length > 0 ? files : await gitClient.getModifiedFiles();

          if (!targetFiles || targetFiles.length === 0) {
            return createSuccessResponse('No files to check', {
              relatedCommits: [],
              relatedPRs: [],
              potentialConflicts: [],
              collaborators: []
            });
          }

          // Get file history and related PRs
          const [fileHistory, pullRequests] = await Promise.all([
            Promise.all(targetFiles.map(file => gitClient.getFileHistory(file))),
            githubClient.getPullRequests({ state: includeClosed ? 'all' : 'open' })
          ]);

          // Extract related commits
          const relatedCommits = [];
          const collaborators = new Set();

          if (Array.isArray(fileHistory)) {
            fileHistory.forEach((history, index) => {
              if (history && history.commits && Array.isArray(history.commits)) {
                history.commits.forEach(commit => {
                  relatedCommits.push({
                    ...commit,
                    file: targetFiles[index]
                  });
                  if (commit.author) {
                    collaborators.add(commit.author);
                  }
                });
              }
            });
          }

          // Find PRs that touch the same files
          const relatedPRs = Array.isArray(pullRequests) ? pullRequests.filter(pr => 
            pr.files && Array.isArray(pr.files) && pr.files.some(file => targetFiles.includes(file))
          ) : [];

          relatedPRs.forEach(pr => {
            if (pr.author) {
              collaborators.add(pr.author);
            }
          });

          // Remove current user from collaborators
          const currentUser = await gitClient.getCurrentUser();
          collaborators.delete(currentUser);

          // Check for potential conflicts if requested
          let potentialConflicts = [];
          if (checkConflicts) {
            potentialConflicts = await gitClient.getConflictingFiles(targetFiles);
          }

          const hasRelatedWork = relatedCommits.length > 0 || relatedPRs.length > 0;

          return createSuccessResponse(
            hasRelatedWork ? 'Related work found' : 'No related work found',
            {
              files: targetFiles,
              relatedCommits: relatedCommits.slice(0, 20), // Limit results
              relatedPRs,
              potentialConflicts,
              collaborators: Array.from(collaborators),
              summary: {
                totalRelatedCommits: relatedCommits ? relatedCommits.length : 0,
                totalRelatedPRs: relatedPRs ? relatedPRs.length : 0,
                hasConflictRisk: potentialConflicts && potentialConflicts.length > 0
              }
            }
          );
        } catch (error) {
          return createErrorResponse('Failed to find related work', error);
        }
      }
    },

    {
      name: 'suggest_reviewers',
      description: 'Suggest appropriate code reviewers based on file expertise and workload. Use this when creating a pull request to find the best reviewers.',
      inputSchema: {
        type: 'object',
        properties: {
          files: {
            type: 'array',
            description: 'Files that need review (defaults to current branch files)',
            items: { type: 'string' }
          },
          maxReviewers: {
            type: 'integer',
            description: 'Maximum number of reviewers to suggest',
            default: 3,
            minimum: 1,
            maximum: 5
          },
          considerWorkload: {
            type: 'boolean',
            description: 'Consider reviewer workload when making suggestions',
            default: true
          },
          excludeAuthors: {
            type: 'array',
            description: 'Authors to exclude from suggestions',
            items: { type: 'string' }
          }
        }
      },
      handler: async (params) => {
        const { 
          files = [], 
          maxReviewers = 3, 
          considerWorkload = true,
          excludeAuthors = []
        } = params;

        try {
          // Get files to review
          const targetFiles = files.length > 0 ? files : await gitClient.getModifiedFiles();

          if (targetFiles.length === 0) {
            return createSuccessResponse('No files to review', {
              reviewers: [],
              message: 'No modified files found'
            });
          }

          // Get file experts and workload data
          const [fileExperts, reviewWorkload] = await Promise.all([
            Promise.all(targetFiles.map(file => gitClient.getFileHistory(file, { limit: 50 }))),
            considerWorkload ? githubClient.getReviewHistory() : Promise.resolve({})
          ]);

          // Calculate expertise scores
          const expertiseScores = {};
          const fileContributions = {};

          fileExperts.forEach((history, fileIndex) => {
            const file = targetFiles[fileIndex];
            if (!fileContributions[file]) {
              fileContributions[file] = {};
            }

            if (history && history.commits) {
              history.commits.forEach(commit => {
                const author = commit.author;
                
                if (!expertiseScores[author]) {
                  expertiseScores[author] = {
                    totalCommits: 0,
                    files: new Set(),
                    lastCommit: commit.timestamp,
                    recentCommits: 0
                  };
                }

                expertiseScores[author].totalCommits++;
                expertiseScores[author].files.add(file);
                
                // Weight recent commits more heavily
                const commitAge = Date.now() - new Date(commit.timestamp).getTime();
                const daysOld = commitAge / (1000 * 60 * 60 * 24);
                if (daysOld < 30) {
                  expertiseScores[author].recentCommits++;
                }

                // Track per-file contributions
                fileContributions[file][author] = (fileContributions[file][author] || 0) + 1;
              });
            }
          });

          // Get current user and exclude from suggestions
          const currentUser = await gitClient.getCurrentUser();
          const excludeList = new Set([currentUser, ...excludeAuthors]);

          // Calculate reviewer scores
          const reviewerScores = Object.entries(expertiseScores)
            .filter(([author]) => !excludeList.has(author))
            .map(([author, expertise]) => {
              const workload = reviewWorkload[author] || { activePRs: 0, recentReviews: 0 };
              
              // Calculate expertise score (0-100)
              const expertiseScore = 
                (expertise.totalCommits * 2) + 
                (expertise.recentCommits * 5) + 
                (expertise.files.size * 10);

              // Calculate workload penalty (0-50)
              const workloadPenalty = considerWorkload ? 
                (workload.activePRs * 5 + workload.recentReviews * 2) : 0;

              // Calculate file-specific expertise
              const fileExpertise = targetFiles.map(file => ({
                file,
                commits: fileContributions[file][author] || 0
              })).filter(f => f.commits > 0);

              return {
                user: author,
                expertise: {
                  score: expertiseScore,
                  totalCommits: expertise.totalCommits,
                  recentCommits: expertise.recentCommits,
                  filesKnown: Array.from(expertise.files),
                  lastActive: expertise.lastCommit,
                  fileBreakdown: fileExpertise
                },
                workload: {
                  activePRs: workload.activePRs,
                  recentReviews: workload.recentReviews,
                  workloadScore: workloadPenalty
                },
                finalScore: Math.max(0, expertiseScore - workloadPenalty),
                reason: generateReviewerReason(expertise, workload, fileExpertise)
              };
            })
            .sort((a, b) => b.finalScore - a.finalScore)
            .slice(0, maxReviewers);

          if (reviewerScores.length === 0) {
            return createSuccessResponse('No suitable reviewers found', {
              reviewers: [],
              fallbackSuggestion: 'Consider asking team lead or project maintainer for reviewer suggestions',
              analyzedFiles: targetFiles
            });
          }

          return createSuccessResponse('Reviewers suggested', {
            reviewers: reviewerScores,
            analyzedFiles: targetFiles,
            totalCandidates: Object.keys(expertiseScores).length - excludeList.size
          });
        } catch (error) {
          return createErrorResponse('Failed to suggest reviewers', error);
        }
      }
    },

    {
      name: 'get_collaboration_insights',
      description: 'Get insights about team collaboration patterns, knowledge clusters, and communication networks. Use this to understand team dynamics and improve collaboration.',
      inputSchema: {
        type: 'object',
        properties: {
          days: {
            type: 'integer',
            description: 'Number of days to analyze',
            default: 30,
            minimum: 7,
            maximum: 365
          },
          minCollaborations: {
            type: 'integer',
            description: 'Minimum collaborations to include in analysis',
            default: 2
          }
        }
      },
      handler: async (params) => {
        const { days = 30, minCollaborations = 2 } = params;

        try {
          const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();

          // Get collaboration data
          const collaborationData = await githubClient.getUserActivity({ since });

          // Filter by minimum collaborations
          const significantCollaborations = collaborationData.filter(
            collab => collab.collaborationCount >= minCollaborations
          );

          // Build collaboration network
          const collaborationNetwork = {};
          const knowledgeAreas = {};

          significantCollaborations.forEach(collab => {
            // Track collaboration pairs
            const pair = [collab.author1, collab.author2].sort().join('::');
            if (!collaborationNetwork[pair]) {
              collaborationNetwork[pair] = {
                authors: [collab.author1, collab.author2],
                strength: 0,
                sharedFiles: new Set()
              };
            }
            
            collaborationNetwork[pair].strength += collab.collaborationCount;
            collab.sharedFiles.forEach(file => {
              collaborationNetwork[pair].sharedFiles.add(file);
              
              // Track knowledge areas
              const area = file.split('/')[0]; // Use top-level directory as knowledge area
              if (!knowledgeAreas[area]) {
                knowledgeAreas[area] = new Set();
              }
              knowledgeAreas[area].add(collab.author1);
              knowledgeAreas[area].add(collab.author2);
            });
          });

          // Convert sets to arrays
          Object.keys(collaborationNetwork).forEach(pair => {
            collaborationNetwork[pair].sharedFiles = Array.from(collaborationNetwork[pair].sharedFiles);
          });

          const knowledgeClusters = Object.entries(knowledgeAreas).map(([area, experts]) => ({
            area,
            experts: Array.from(experts),
            size: experts.size
          })).sort((a, b) => b.size - a.size);

          // Find most active collaborators
          const collaboratorActivity = {};
          significantCollaborations.forEach(collab => {
            [collab.author1, collab.author2].forEach(author => {
              if (!collaboratorActivity[author]) {
                collaboratorActivity[author] = {
                  collaborations: 0,
                  uniqueCollaborators: new Set()
                };
              }
              collaboratorActivity[author].collaborations += collab.collaborationCount;
              collaboratorActivity[author].uniqueCollaborators.add(
                author === collab.author1 ? collab.author2 : collab.author1
              );
            });
          });

          const mostActiveCollaborators = Object.entries(collaboratorActivity)
            .map(([author, activity]) => ({
              author,
              totalCollaborations: activity.collaborations,
              uniqueCollaborators: activity.uniqueCollaborators.size,
              collaboratorsList: Array.from(activity.uniqueCollaborators)
            }))
            .sort((a, b) => b.totalCollaborations - a.totalCollaborations)
            .slice(0, 10);

          return createSuccessResponse('Collaboration insights generated', {
            period: { days, since },
            collaborationPairs: Object.values(collaborationNetwork)
              .sort((a, b) => b.strength - a.strength)
              .slice(0, 20),
            mostActiveCollaborators,
            knowledgeClusters,
            summary: {
              totalCollaborations: significantCollaborations.length,
              uniqueCollaborators: new Set(
                significantCollaborations.flatMap(c => [c.author1, c.author2])
              ).size,
              knowledgeAreas: knowledgeClusters.length
            }
          });
        } catch (error) {
          return createErrorResponse('Failed to generate collaboration insights', error);
        }
      }
    }
  ];
}

/**
 * Generate a human-readable reason for reviewer suggestion
 */
function generateReviewerReason(expertise, workload, fileExpertise) {
  const reasons = [];
  
  if (expertise.recentCommits > 5) {
    reasons.push(`Recently active with ${expertise.recentCommits} commits in the last 30 days`);
  }
  
  if (fileExpertise.length > 0) {
    const topFile = fileExpertise.sort((a, b) => b.commits - a.commits)[0];
    reasons.push(`Expert in ${topFile.file} (${topFile.commits} commits)`);
  }
  
  if (workload.activePRs < 3) {
    reasons.push(`Low current workload (${workload.activePRs} active PRs)`);
  } else if (workload.activePRs > 5) {
    reasons.push(`Note: Currently has ${workload.activePRs} active PRs`);
  }
  
  return reasons.join('. ');
}
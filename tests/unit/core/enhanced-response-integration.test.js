/**
 * Integration Tests for Enhanced Response System with Tools
 * Task 29.3: Develop Integration Tests with Different Tools
 */

import { jest } from '@jest/globals';
import {
  EnhancedResponse,
  ResponseFactory,
  ResponseStatus,
  RiskLevel
} from '../../../src/core/enhanced-response.js';
import { 
  createMockContext,
  createMockServer,
  createMockToolHandler
} from '../../test-utils/mocks.js';

describe('Enhanced Response System - Tool Integration', () => {
  let mockContext;
  let mockServer;

  beforeEach(() => {
    mockContext = createMockContext();
    mockServer = createMockServer();
  });

  describe('Git Tool Integration', () => {
    it('should integrate with git status tool', async () => {
      const gitStatusHandler = {
        name: 'git_status',
        execute: async (args, context) => {
          // Simulate git status check
          const status = {
            branch: 'feature/test',
            hasUncommittedChanges: true,
            modifiedFiles: ['src/index.js', 'test/app.test.js'],
            untrackedFiles: ['temp.log']
          };
          
          const response = ResponseFactory.success('Git status retrieved', status);
          
          // Add contextual information
          response.addContext('gitContext', {
            branch: status.branch,
            dirty: status.hasUncommittedChanges
          });
          
          // Add risks based on status
          if (status.hasUncommittedChanges) {
            response.addRisk(RiskLevel.MEDIUM, 
              'Uncommitted changes detected', 
              'Commit or stash changes before proceeding'
            );
          }
          
          // Add suggestions
          if (status.untrackedFiles.length > 0) {
            response.addSuggestion('add', 
              `Add ${status.untrackedFiles.length} untracked files`, 
              'medium'
            );
          }
          
          return response;
        }
      };
      
      const result = await gitStatusHandler.execute({}, mockContext);
      
      expect(result.isSuccess()).toBe(true);
      expect(result.data.branch).toBe('feature/test');
      expect(result.context.gitContext.dirty).toBe(true);
      expect(result.risks).toHaveLength(1);
      expect(result.suggestions).toHaveLength(1);
    });

    it('should handle git operations with error recovery', async () => {
      const gitPushHandler = {
        name: 'git_push',
        execute: async (args, context) => {
          const { force = false, branch = 'main' } = args;
          
          // Simulate push with potential failures
          try {
            if (branch === 'main' && !force) {
              throw new Error('Protected branch: direct push not allowed');
            }
            
            if (Math.random() > 0.8) { // Simulate network failure
              throw new Error('Network error: Could not connect to remote');
            }
            
            return ResponseFactory.success('Push successful', {
              branch,
              commits: 3,
              forced: force
            });
          } catch (error) {
            const response = ResponseFactory.error('Push failed', error);
            
            // Add recovery suggestions
            if (error.message.includes('Protected branch')) {
              response.addSuggestion('create-pr', 
                'Create a pull request instead', 
                'high'
              );
              response.addRisk(RiskLevel.HIGH, 
                'Attempted to push to protected branch'
              );
            }
            
            if (error.message.includes('Network error')) {
              response.addSuggestion('retry', 
                'Check network connection and retry', 
                'high'
              );
              response.addMetadata('retryable', true);
            }
            
            return response;
          }
        }
      };
      
      // Test protected branch error
      const protectedResult = await gitPushHandler.execute(
        { branch: 'main' }, 
        mockContext
      );
      expect(protectedResult.hasErrors()).toBe(true);
      expect(protectedResult.suggestions[0].action).toBe('create-pr');
    });
  });

  describe('Code Analysis Tool Integration', () => {
    it('should integrate with linting tools', async () => {
      const lintHandler = {
        name: 'analyze_code',
        execute: async (args, context) => {
          const { files = [], fix = false } = args;
          
          // Simulate linting results
          const issues = [
            { file: 'src/index.js', line: 10, severity: 'error', message: 'Missing semicolon' },
            { file: 'src/index.js', line: 15, severity: 'warning', message: 'Unused variable' },
            { file: 'src/app.js', line: 25, severity: 'error', message: 'Undefined function' }
          ];
          
          const errors = issues.filter(i => i.severity === 'error');
          const warnings = issues.filter(i => i.severity === 'warning');
          
          // Create response based on error count
          let response;
          if (errors.length > 0) {
            response = ResponseFactory.error('Linting failed');
            response.data = {
              errors: errors.length,
              warnings: warnings.length,
              issues
            };
          } else {
            response = ResponseFactory.warning('Linting completed with warnings');
            response.data = {
              warnings: warnings.length,
              issues
            };
          }
          
          // Add metadata
          response.addMetadata('filesAnalyzed', files.length || 2);
          response.addMetadata('totalIssues', issues.length);
          
          // Add risks based on severity
          if (errors.length > 0) {
            response.addRisk(RiskLevel.HIGH, 
              `${errors.length} errors must be fixed`,
              'Run with --fix flag or fix manually'
            );
          }
          
          // Add suggestions
          if (fix && errors.length > 0) {
            response.addSuggestion('manual-fix', 
              'Some errors require manual intervention', 
              'high'
            );
          }
          
          return response;
        }
      };
      
      const result = await lintHandler.execute({ files: ['src/index.js'] }, mockContext);
      
      expect(result.hasErrors()).toBe(true);
      expect(result.data.errors).toBe(2);
      expect(result.metadata.totalIssues).toBe(3);
      expect(result.risks[0].level).toBe(RiskLevel.HIGH);
    });

    it('should handle test runner integration', async () => {
      const testHandler = {
        name: 'run_tests',
        execute: async (args, context) => {
          const { pattern = '**/*.test.js', coverage = false } = args;
          
          // Simulate test execution
          const testResults = {
            total: 45,
            passed: 42,
            failed: 3,
            skipped: 0,
            duration: 3500
          };
          
          const coverageData = coverage ? {
            lines: 85.5,
            branches: 78.2,
            functions: 90.1,
            statements: 86.3
          } : null;
          
          let response;
          if (testResults.failed > 0) {
            response = ResponseFactory.error(`${testResults.failed} tests failed`);
            response.data = {
              results: testResults,
              coverage: coverageData,
              failedTests: [
                'auth.test.js: login should handle invalid credentials',
                'api.test.js: should return 404 for unknown endpoints',
                'db.test.js: should rollback on error'
              ]
            };
          } else {
            response = ResponseFactory.success('All tests passed');
            response.data = {
              results: testResults,
              coverage: coverageData
            };
          }
          
          // Add performance metadata
          response.addMetadata('executionTime', testResults.duration);
          response.addMetadata('testsPerSecond', 
            (testResults.total / (testResults.duration / 1000)).toFixed(2)
          );
          
          // Add coverage risks if enabled
          if (coverage && coverageData) {
            if (coverageData.branches < 80) {
              response.addRisk(RiskLevel.MEDIUM, 
                'Branch coverage below 80%',
                'Add tests for conditional logic'
              );
            }
          }
          
          // Add next steps
          if (testResults.failed === 0) {
            response.addSuggestion('commit', 
              'All tests passing - safe to commit', 
              'high'
            );
          } else {
            response.addSuggestion('fix-tests', 
              'Fix failing tests before proceeding', 
              'high'
            );
          }
          
          return response;
        }
      };
      
      const result = await testHandler.execute({ coverage: true }, mockContext);
      
      expect(result.hasErrors()).toBe(true);
      expect(result.data.results.failed).toBe(3);
      expect(result.data.coverage).toBeDefined();
      expect(result.risks[0].description).toContain('Branch coverage');
    });
  });

  describe('Build Tool Integration', () => {
    it('should integrate with build systems', async () => {
      const buildHandler = {
        name: 'build_project',
        execute: async (args, context) => {
          const { target = 'production', optimize = true } = args;
          
          const buildSteps = [
            { name: 'clean', status: 'success', duration: 100 },
            { name: 'compile', status: 'success', duration: 2500 },
            { name: 'optimize', status: optimize ? 'success' : 'skipped', duration: optimize ? 1200 : 0 },
            { name: 'bundle', status: 'success', duration: 800 }
          ];
          
          const response = ResponseFactory.success('Build completed', {
            target,
            steps: buildSteps,
            totalDuration: buildSteps.reduce((sum, step) => sum + step.duration, 0),
            artifacts: [
              { path: 'dist/app.js', size: 125000 },
              { path: 'dist/app.css', size: 45000 },
              { path: 'dist/index.html', size: 2500 }
            ]
          });
          
          // Add build metadata
          response.addMetadata('buildTarget', target);
          response.addMetadata('optimized', optimize);
          response.addMetadata('timestamp', new Date().toISOString());
          
          // Add performance insights
          const totalSize = response.data.artifacts.reduce((sum, a) => sum + a.size, 0);
          if (totalSize > 500000) {
            response.addRisk(RiskLevel.LOW, 
              'Bundle size exceeds 500KB',
              'Consider code splitting or lazy loading'
            );
          }
          
          // Add deployment suggestion
          response.addSuggestion('deploy', 
            `Deploy ${target} build to environment`, 
            'medium'
          );
          
          return response;
        }
      };
      
      const result = await buildHandler.execute({ optimize: true }, mockContext);
      
      expect(result.isSuccess()).toBe(true);
      expect(result.data.steps).toHaveLength(4);
      expect(result.metadata.optimized).toBe(true);
      expect(result.suggestions[0].action).toBe('deploy');
    });
  });

  describe('Multi-Tool Workflow Integration', () => {
    it('should chain multiple tool responses', async () => {
      // Simulate a complete workflow: lint -> test -> build -> deploy
      const workflow = async () => {
        const responses = [];
        
        // Step 1: Lint
        const lintResponse = ResponseFactory.success('Linting passed', {
          warnings: 2,
          errors: 0
        });
        lintResponse.addContext('step', 'lint');
        responses.push(lintResponse);
        
        // Step 2: Test (conditional on lint)
        if (lintResponse.isSuccess()) {
          const testResponse = ResponseFactory.success('Tests passed', {
            total: 50,
            passed: 50
          });
          testResponse.addContext('step', 'test');
          responses.push(testResponse);
          
          // Step 3: Build (conditional on test)
          if (testResponse.isSuccess()) {
            const buildResponse = ResponseFactory.success('Build completed', {
              artifacts: ['dist/app.js']
            });
            buildResponse.addContext('step', 'build');
            responses.push(buildResponse);
            
            // Step 4: Deploy (conditional on build)
            if (buildResponse.isSuccess()) {
              const deployResponse = ResponseFactory.success('Deployment successful', {
                environment: 'staging',
                url: 'https://staging.example.com'
              });
              deployResponse.addContext('step', 'deploy');
              responses.push(deployResponse);
            }
          }
        }
        
        // Create aggregate response
        const allSuccess = responses.every(r => r.isSuccess());
        const aggregateResponse = allSuccess
          ? ResponseFactory.success('Workflow completed successfully')
          : ResponseFactory.error('Workflow failed');
        
        // Aggregate all steps
        aggregateResponse.addMetadata('workflowSteps', 
          responses.map(r => ({
            step: r.context.step,
            status: r.status,
            message: r.message
          }))
        );
        
        // Add workflow timing
        aggregateResponse.addMetadata('totalSteps', responses.length);
        aggregateResponse.addMetadata('completedAt', new Date().toISOString());
        
        // Add final suggestion
        if (allSuccess) {
          aggregateResponse.addSuggestion('monitor', 
            'Monitor deployment for issues', 
            'medium'
          );
        }
        
        return aggregateResponse;
      };
      
      const result = await workflow();
      
      expect(result.isSuccess()).toBe(true);
      expect(result.metadata.totalSteps).toBe(4);
      expect(result.metadata.workflowSteps).toHaveLength(4);
      expect(result.suggestions[0].action).toBe('monitor');
    });

    it('should handle partial workflow failures', async () => {
      const runWorkflowWithFailure = async () => {
        const steps = [];
        
        // Successful lint
        steps.push({
          name: 'lint',
          response: ResponseFactory.success('Lint passed')
        });
        
        // Failed tests
        steps.push({
          name: 'test',
          response: ResponseFactory.error('Tests failed', {
            failed: 3,
            passed: 47
          })
        });
        
        // Build skipped due to test failure
        steps.push({
          name: 'build',
          response: ResponseFactory.warning('Build skipped', {
            reason: 'Test failures detected'
          })
        });
        
        // Create summary response
        const summary = ResponseFactory.warning('Workflow completed with errors', {
          steps: steps.map(s => ({
            name: s.name,
            status: s.response.status
          })),
          successful: steps.filter(s => s.response.isSuccess()).length,
          failed: steps.filter(s => s.response.hasErrors()).length,
          warnings: steps.filter(s => s.response.status === ResponseStatus.WARNING).length
        });
        
        // Add recovery suggestions
        summary.addSuggestion('fix-tests', 
          'Fix the 3 failing tests', 
          'high'
        );
        summary.addSuggestion('retry-workflow', 
          'Retry workflow after fixes', 
          'medium'
        );
        
        // Add risk assessment
        summary.addRisk(RiskLevel.HIGH, 
          'Cannot deploy with failing tests',
          'All tests must pass before deployment'
        );
        
        return summary;
      };
      
      const result = await runWorkflowWithFailure();
      
      expect(result.status).toBe(ResponseStatus.WARNING);
      expect(result.data.failed).toBe(1);
      expect(result.suggestions).toHaveLength(2);
      expect(result.risks[0].level).toBe(RiskLevel.HIGH);
    });
  });

  describe('External API Integration', () => {
    it('should handle external service responses', async () => {
      const apiHandler = {
        name: 'call_external_api',
        execute: async (args, context) => {
          const { endpoint, method = 'GET', data = null } = args;
          
          // Simulate API call with various response scenarios
          const mockApiCall = async () => {
            // Simulate latency
            await new Promise(resolve => setTimeout(resolve, 100));
            
            // Simulate different API responses
            if (endpoint.includes('/health')) {
              return { status: 200, data: { healthy: true } };
            }
            
            if (endpoint.includes('/auth') && !context.authToken) {
              throw { status: 401, message: 'Unauthorized' };
            }
            
            if (endpoint.includes('/rate-limited')) {
              throw { status: 429, message: 'Rate limit exceeded', retryAfter: 60 };
            }
            
            return { status: 200, data: { result: 'success' } };
          };
          
          try {
            const apiResponse = await mockApiCall();
            const response = ResponseFactory.success('API call successful', apiResponse);
            
            response.addMetadata('endpoint', endpoint);
            response.addMetadata('method', method);
            response.addMetadata('statusCode', apiResponse.status);
            
            return response;
          } catch (error) {
            const response = ResponseFactory.error('API call failed', error);
            
            // Handle specific error scenarios
            if (error.status === 401) {
              response.addSuggestion('authenticate', 
                'Provide valid authentication credentials', 
                'high'
              );
              response.addContext('authRequired', true);
            }
            
            if (error.status === 429) {
              response.addMetadata('retryAfter', error.retryAfter);
              response.addSuggestion('wait', 
                `Wait ${error.retryAfter} seconds before retrying`, 
                'medium'
              );
            }
            
            return response;
          }
        }
      };
      
      // Test successful call
      const successResult = await apiHandler.execute(
        { endpoint: '/api/health' }, 
        mockContext
      );
      expect(successResult.isSuccess()).toBe(true);
      
      // Test auth failure
      const authResult = await apiHandler.execute(
        { endpoint: '/api/auth/user' }, 
        mockContext
      );
      expect(authResult.hasErrors()).toBe(true);
      expect(authResult.context.authRequired).toBe(true);
      
      // Test rate limiting
      const rateLimitResult = await apiHandler.execute(
        { endpoint: '/api/rate-limited' }, 
        mockContext
      );
      expect(rateLimitResult.metadata.retryAfter).toBe(60);
    });
  });
});
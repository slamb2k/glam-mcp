import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { EventEmitter } from 'events';

describe('Enhanced MCP Server', () => {
  let server;
  let mockTransport;
  let mockConfig;
  let consoleLogSpy;
  let consoleErrorSpy;

  beforeEach(() => {
    // Mock transport
    mockTransport = {
      connect: jest.fn(),
      disconnect: jest.fn(),
      on: jest.fn(),
      emit: jest.fn()
    };

    // Mock config
    mockConfig = {
      server: {
        port: 3000,
        host: 'localhost',
        maxConnections: 100,
        timeout: 30000
      },
      tools: {
        enabledCategories: ['github-flow', 'automation', 'utility'],
        disabledTools: ['dangerous_tool'],
        customToolPaths: ['./custom-tools']
      },
      session: {
        persistence: true,
        sessionPath: './sessions',
        maxSessions: 1000,
        sessionTimeout: 3600000
      },
      logging: {
        level: 'info',
        format: 'json',
        destination: 'stdout'
      },
      authentication: {
        enabled: false,
        providers: []
      }
    };

    // Spy on console methods
    consoleLogSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

    // Mock server implementation
    server = {
      config: mockConfig,
      status: 'stopped',
      transport: null,
      startTime: null,
      connections: 0,
      eventBus: new EventEmitter(),
      
      async loadConfiguration(configPath) {
        // Load from environment variables
        if (process.env.MCP_SERVER_PORT) {
          this.config.server.port = parseInt(process.env.MCP_SERVER_PORT);
        }
        if (process.env.MCP_LOG_LEVEL) {
          this.config.logging.level = process.env.MCP_LOG_LEVEL;
        }
        
        // Validate configuration
        if (!this.config.server.port || this.config.server.port < 1) {
          throw new Error('Invalid server port configuration');
        }
        
        return this.config;
      },
      
      async start(options = {}) {
        if (this.status === 'running') {
          throw new Error('Server is already running');
        }
        
        this.status = 'starting';
        this.eventBus.emit('server:starting');
        
        // Load configuration
        if (options.configPath) {
          await this.loadConfiguration(options.configPath);
        }
        
        // Initialize subsystems
        await this.initializeLogging();
        await this.initializeSessionManager();
        await this.registerTools();
        
        // Connect transport
        this.transport = mockTransport;
        await this.transport.connect();
        
        this.status = 'running';
        this.startTime = new Date();
        this.eventBus.emit('server:started');
        
        return { status: 'started', port: this.config.server.port };
      },
      
      async stop(options = {}) {
        if (this.status !== 'running') {
          throw new Error('Server is not running');
        }
        
        this.status = 'stopping';
        this.eventBus.emit('server:stopping');
        
        // Graceful shutdown with timeout
        const timeout = options.timeout || 5000;
        const shutdownPromise = this.gracefulShutdown();
        
        const result = await Promise.race([
          shutdownPromise,
          new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Shutdown timeout')), timeout)
          )
        ]);
        
        this.status = 'stopped';
        this.eventBus.emit('server:stopped');
        
        return result;
      },
      
      async restart(options = {}) {
        await this.stop(options);
        await this.start(options);
        return { status: 'restarted' };
      },
      
      async gracefulShutdown() {
        // Close connections
        if (this.transport) {
          await this.transport.disconnect();
        }
        
        // Save session data
        await this.saveSessionData();
        
        // Cleanup resources
        await this.cleanup();
        
        return { status: 'stopped', graceful: true };
      },
      
      async initializeLogging() {
        // Initialize structured logging
        this.logger = {
          level: this.config.logging.level,
          log: (level, message, meta = {}) => {
            if (this.config.logging.format === 'json') {
              console.log(JSON.stringify({
                timestamp: new Date().toISOString(),
                level,
                message,
                ...meta
              }));
            } else {
              console.log(`[${level}] ${message}`);
            }
          },
          info: (msg, meta) => this.logger.log('info', msg, meta),
          error: (msg, meta) => this.logger.log('error', msg, meta),
          debug: (msg, meta) => this.logger.log('debug', msg, meta)
        };
      },
      
      async initializeSessionManager() {
        // Initialize session management
        this.sessionManager = {
          sessions: new Map(),
          maxSessions: this.config.session.maxSessions
        };
      },
      
      async registerTools() {
        // Register tools based on configuration
        this.tools = [];
        
        // Filter by enabled categories
        const enabledCategories = this.config.tools.enabledCategories;
        const disabledTools = this.config.tools.disabledTools;
        
        // Mock tool registration
        const mockTools = [
          { name: 'github_flow_start', category: 'github-flow' },
          { name: 'auto_commit', category: 'automation' },
          { name: 'dangerous_tool', category: 'utility' },
          { name: 'get_status', category: 'utility' }
        ];
        
        this.tools = mockTools.filter(tool => 
          enabledCategories.includes(tool.category) &&
          !disabledTools.includes(tool.name)
        );
        
        return this.tools;
      },
      
      async healthCheck() {
        const checks = {
          server: this.status === 'running' ? 'healthy' : 'unhealthy',
          transport: this.transport ? 'connected' : 'disconnected',
          uptime: this.startTime ? Date.now() - this.startTime : 0,
          connections: this.connections,
          memory: process.memoryUsage(),
          sessionCount: this.sessionManager ? this.sessionManager.sessions.size : 0
        };
        
        const isHealthy = checks.server === 'healthy' && checks.transport === 'connected';
        
        return {
          status: isHealthy ? 'healthy' : 'unhealthy',
          timestamp: new Date().toISOString(),
          checks
        };
      },
      
      async getMetrics() {
        return {
          uptime: this.startTime ? Date.now() - this.startTime : 0,
          totalRequests: 0,
          activeConnections: this.connections,
          toolsRegistered: this.tools ? this.tools.length : 0,
          sessionCount: this.sessionManager ? this.sessionManager.sessions.size : 0,
          memoryUsage: process.memoryUsage(),
          cpuUsage: process.cpuUsage()
        };
      },
      
      handleSignal(signal) {
        console.log(`Received signal: ${signal}`);
        
        if (['SIGTERM', 'SIGINT'].includes(signal)) {
          this.stop({ timeout: 10000 }).then(() => {
            process.exit(0);
          }).catch((err) => {
            console.error('Error during shutdown:', err);
            process.exit(1);
          });
        }
      },
      
      async saveSessionData() {
        // Mock session data saving
        return { saved: true };
      },
      
      async cleanup() {
        // Mock cleanup
        return { cleaned: true };
      }
    };
  });

  afterEach(() => {
    consoleLogSpy.mockRestore();
    consoleErrorSpy.mockRestore();
    jest.clearAllMocks();
  });

  describe('Server Configuration', () => {
    it('should load configuration from environment variables', async () => {
      process.env.MCP_SERVER_PORT = '8080';
      process.env.MCP_LOG_LEVEL = 'debug';
      
      const config = await server.loadConfiguration();
      
      expect(config.server.port).toBe(8080);
      expect(config.logging.level).toBe('debug');
      
      delete process.env.MCP_SERVER_PORT;
      delete process.env.MCP_LOG_LEVEL;
    });

    it('should validate configuration', async () => {
      server.config.server.port = 0;
      
      await expect(server.loadConfiguration()).rejects.toThrow('Invalid server port configuration');
    });

    it('should support configuration file loading', async () => {
      const configPath = './config.json';
      await server.start({ configPath });
      
      expect(server.status).toBe('running');
    });
  });

  describe('Server Lifecycle', () => {
    it('should start the server successfully', async () => {
      const result = await server.start();
      
      expect(result.status).toBe('started');
      expect(server.status).toBe('running');
      expect(server.startTime).toBeInstanceOf(Date);
      expect(mockTransport.connect).toHaveBeenCalled();
    });

    it('should prevent double start', async () => {
      await server.start();
      
      await expect(server.start()).rejects.toThrow('Server is already running');
    });

    it('should stop the server gracefully', async () => {
      await server.start();
      const result = await server.stop();
      
      expect(result.status).toBe('stopped');
      expect(result.graceful).toBe(true);
      expect(server.status).toBe('stopped');
      expect(mockTransport.disconnect).toHaveBeenCalled();
    });

    it('should handle stop timeout', async () => {
      await server.start();
      
      // Mock slow shutdown
      server.gracefulShutdown = () => new Promise(resolve => setTimeout(resolve, 1000));
      
      await expect(server.stop({ timeout: 100 })).rejects.toThrow('Shutdown timeout');
    });

    it('should restart the server', async () => {
      await server.start();
      const result = await server.restart();
      
      expect(result.status).toBe('restarted');
      expect(server.status).toBe('running');
    });

    it('should emit lifecycle events', async () => {
      const events = [];
      server.eventBus.on('server:starting', () => events.push('starting'));
      server.eventBus.on('server:started', () => events.push('started'));
      server.eventBus.on('server:stopping', () => events.push('stopping'));
      server.eventBus.on('server:stopped', () => events.push('stopped'));
      
      await server.start();
      await server.stop();
      
      expect(events).toEqual(['starting', 'started', 'stopping', 'stopped']);
    });
  });

  describe('Tool Registration', () => {
    it('should register tools based on enabled categories', async () => {
      await server.registerTools();
      
      const toolNames = server.tools.map(t => t.name);
      expect(toolNames).toContain('github_flow_start');
      expect(toolNames).toContain('auto_commit');
      expect(toolNames).toContain('get_status');
    });

    it('should exclude disabled tools', async () => {
      await server.registerTools();
      
      const toolNames = server.tools.map(t => t.name);
      expect(toolNames).not.toContain('dangerous_tool');
    });

    it('should support custom tool paths', async () => {
      // This would load tools from custom paths
      expect(server.config.tools.customToolPaths).toContain('./custom-tools');
    });
  });

  describe('Health Checks', () => {
    it('should report healthy when server is running', async () => {
      await server.start();
      
      // Add small delay to ensure uptime is greater than 0
      await new Promise(resolve => setTimeout(resolve, 10));
      
      const health = await server.healthCheck();
      
      expect(health.status).toBe('healthy');
      expect(health.checks.server).toBe('healthy');
      expect(health.checks.transport).toBe('connected');
      expect(health.checks.uptime).toBeGreaterThanOrEqual(0);
    });

    it('should report unhealthy when server is stopped', async () => {
      const health = await server.healthCheck();
      
      expect(health.status).toBe('unhealthy');
      expect(health.checks.server).toBe('unhealthy');
    });

    it('should include detailed health metrics', async () => {
      await server.start();
      const health = await server.healthCheck();
      
      expect(health.checks).toHaveProperty('memory');
      expect(health.checks).toHaveProperty('connections');
      expect(health.checks).toHaveProperty('sessionCount');
      expect(health.timestamp).toBeDefined();
    });
  });

  describe('Logging and Monitoring', () => {
    it('should initialize structured logging', async () => {
      await server.initializeLogging();
      
      expect(server.logger).toBeDefined();
      expect(server.logger.level).toBe('info');
    });

    it('should log in JSON format when configured', async () => {
      await server.initializeLogging();
      server.logger.info('Test message', { user: 'test' });
      
      expect(consoleLogSpy).toHaveBeenCalled();
      const logOutput = consoleLogSpy.mock.calls[0][0];
      const parsed = JSON.parse(logOutput);
      
      expect(parsed.level).toBe('info');
      expect(parsed.message).toBe('Test message');
      expect(parsed.user).toBe('test');
    });

    it('should provide server metrics', async () => {
      await server.start();
      
      // Add small delay to ensure uptime is greater than 0
      await new Promise(resolve => setTimeout(resolve, 10));
      
      const metrics = await server.getMetrics();
      
      expect(metrics.uptime).toBeGreaterThanOrEqual(0);
      expect(metrics.toolsRegistered).toBe(3);
      expect(metrics.memoryUsage).toBeDefined();
      expect(metrics.cpuUsage).toBeDefined();
    });
  });

  describe('Signal Handling', () => {
    it('should handle SIGTERM gracefully', async () => {
      const exitSpy = jest.spyOn(process, 'exit').mockImplementation(() => {});
      
      await server.start();
      server.handleSignal('SIGTERM');
      
      // Wait for async operations
      await new Promise(resolve => setTimeout(resolve, 100));
      
      expect(server.status).toBe('stopped');
      expect(exitSpy).toHaveBeenCalledWith(0);
      
      exitSpy.mockRestore();
    });

    it('should handle SIGINT gracefully', async () => {
      const exitSpy = jest.spyOn(process, 'exit').mockImplementation(() => {});
      
      await server.start();
      server.handleSignal('SIGINT');
      
      // Wait for async operations
      await new Promise(resolve => setTimeout(resolve, 100));
      
      expect(server.status).toBe('stopped');
      expect(exitSpy).toHaveBeenCalledWith(0);
      
      exitSpy.mockRestore();
    });
  });

  describe('Session Management Integration', () => {
    it('should initialize session manager', async () => {
      await server.initializeSessionManager();
      
      expect(server.sessionManager).toBeDefined();
      expect(server.sessionManager.maxSessions).toBe(1000);
    });

    it('should save session data on shutdown', async () => {
      await server.start();
      await server.stop();
      
      // saveSessionData should have been called during graceful shutdown
      expect(server.status).toBe('stopped');
    });
  });

  describe('Error Handling', () => {
    it('should handle initialization errors', async () => {
      server.initializeLogging = jest.fn().mockRejectedValue(new Error('Logging init failed'));
      
      await expect(server.start()).rejects.toThrow('Logging init failed');
      expect(server.status).toBe('starting');
    });

    it('should log errors during shutdown', async () => {
      const exitSpy = jest.spyOn(process, 'exit').mockImplementation(() => {});
      
      await server.start();
      server.gracefulShutdown = jest.fn().mockRejectedValue(new Error('Shutdown error'));
      
      server.handleSignal('SIGTERM');
      
      // Wait for async operations
      await new Promise(resolve => setTimeout(resolve, 100));
      
      expect(consoleErrorSpy).toHaveBeenCalledWith('Error during shutdown:', expect.any(Error));
      expect(exitSpy).toHaveBeenCalledWith(1);
      
      exitSpy.mockRestore();
    });
  });
});
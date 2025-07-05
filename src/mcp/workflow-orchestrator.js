import fs from 'fs-extra';
import path from 'path';
import { EventEmitter } from 'events';
import stateManager from './state-manager.js';
import contextEngine from './context-engine.js';
import logger from '../utils/logger.js';

/**
 * Workflow Orchestrator
 * Executes and manages complex multi-step operations with parallel execution support
 */
export class WorkflowOrchestrator extends EventEmitter {
  constructor() {
    super();
    this.workflows = new Map();
    this.runningWorkflows = new Map();
    this.taskQueue = [];
    this.maxConcurrentTasks = 5;
    this.currentlyRunning = 0;
  }

  /**
   * Parse workflow definition from YAML/JSON
   */
  async parseWorkflow(definition, format = 'json') {
    try {
      let parsed;
      
      if (typeof definition === 'string') {
        if (format === 'yaml') {
          // Simple YAML parsing (basic implementation)
          parsed = this.parseSimpleYAML(definition);
        } else {
          parsed = JSON.parse(definition);
        }
      } else {
        parsed = definition;
      }
      
      // Validate workflow
      this.validateWorkflow(parsed);
      
      return parsed;
    } catch (error) {
      throw new Error(`Failed to parse workflow: ${error.message}`);
    }
  }

  /**
   * Simple YAML parser (basic implementation)
   */
  parseSimpleYAML(yaml) {
    const lines = yaml.split('\n');
    const result = {
      name: '',
      version: '1.0.0',
      description: '',
      tasks: []
    };
    
    let currentTask = null;
    let indent = 0;
    
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      
      const currentIndent = line.length - line.trimStart().length;
      
      if (trimmed.startsWith('name:')) {
        result.name = trimmed.split(':')[1].trim();
      } else if (trimmed.startsWith('version:')) {
        result.version = trimmed.split(':')[1].trim();
      } else if (trimmed.startsWith('description:')) {
        result.description = trimmed.split(':')[1].trim();
      } else if (trimmed.startsWith('tasks:')) {
        indent = currentIndent + 2;
      } else if (currentIndent === indent && trimmed.startsWith('-')) {
        if (currentTask) result.tasks.push(currentTask);
        currentTask = { 
          id: trimmed.split('-')[1].trim(),
          type: 'task',
          dependencies: []
        };
      } else if (currentTask && trimmed.includes(':')) {
        const [key, value] = trimmed.split(':').map(s => s.trim());
        if (key === 'depends_on') {
          currentTask.dependencies = value.split(',').map(s => s.trim());
        } else {
          currentTask[key] = value;
        }
      }
    }
    
    if (currentTask) result.tasks.push(currentTask);
    
    return result;
  }

  /**
   * Validate workflow definition
   */
  validateWorkflow(workflow) {
    if (!workflow.name) {
      throw new Error('Workflow must have a name');
    }
    
    if (!workflow.tasks || !Array.isArray(workflow.tasks)) {
      throw new Error('Workflow must have a tasks array');
    }
    
    // Check for circular dependencies
    const visited = new Set();
    const recursionStack = new Set();
    
    const hasCycle = (taskId) => {
      visited.add(taskId);
      recursionStack.add(taskId);
      
      const task = workflow.tasks.find(t => t.id === taskId);
      if (task && task.dependencies) {
        for (const dep of task.dependencies) {
          if (!visited.has(dep)) {
            if (hasCycle(dep)) return true;
          } else if (recursionStack.has(dep)) {
            return true;
          }
        }
      }
      
      recursionStack.delete(taskId);
      return false;
    };
    
    for (const task of workflow.tasks) {
      if (!visited.has(task.id) && hasCycle(task.id)) {
        throw new Error(`Circular dependency detected involving task: ${task.id}`);
      }
    }
    
    return true;
  }

  /**
   * Execute workflow
   */
  async execute(workflow, options = {}) {
    const workflowId = this.generateWorkflowId();
    const parsedWorkflow = await this.parseWorkflow(workflow, options.format);
    
    // Create workflow instance
    const instance = {
      id: workflowId,
      workflow: parsedWorkflow,
      status: 'running',
      startTime: Date.now(),
      tasks: new Map(),
      results: {},
      options
    };
    
    this.workflows.set(workflowId, parsedWorkflow);
    this.runningWorkflows.set(workflowId, instance);
    
    // Emit workflow start event
    this.emit('workflow:start', { workflowId, workflow: parsedWorkflow });
    
    try {
      // Initialize workflow state
      await this.initializeWorkflowState(workflowId, instance);
      
      // Build execution plan
      const executionPlan = this.buildExecutionPlan(parsedWorkflow);
      
      // Execute tasks
      await this.executeTasks(workflowId, instance, executionPlan);
      
      // Finalize workflow
      instance.status = 'completed';
      instance.endTime = Date.now();
      instance.duration = instance.endTime - instance.startTime;
      
      // Emit workflow complete event
      this.emit('workflow:complete', { 
        workflowId, 
        results: instance.results,
        duration: instance.duration
      });
      
      return {
        workflowId,
        status: 'completed',
        results: instance.results,
        duration: instance.duration
      };
      
    } catch (error) {
      // Handle workflow failure
      instance.status = 'failed';
      instance.error = error.message;
      instance.endTime = Date.now();
      instance.duration = instance.endTime - instance.startTime;
      
      // Emit workflow error event
      this.emit('workflow:error', { workflowId, error });
      
      // Rollback if enabled
      if (options.rollbackOnError) {
        await this.rollbackWorkflow(workflowId, instance);
      }
      
      throw error;
    } finally {
      // Cleanup
      this.runningWorkflows.delete(workflowId);
    }
  }

  /**
   * Initialize workflow state
   */
  async initializeWorkflowState(workflowId, instance) {
    // Store in state manager
    await stateManager.createTask({
      id: workflowId,
      type: 'workflow',
      status: 'running',
      data: {
        name: instance.workflow.name,
        startTime: instance.startTime,
        tasks: instance.workflow.tasks.map(t => t.id)
      }
    });
    
    // Initialize task states
    for (const task of instance.workflow.tasks) {
      instance.tasks.set(task.id, {
        id: task.id,
        status: 'pending',
        dependencies: task.dependencies || [],
        result: null,
        error: null
      });
    }
  }

  /**
   * Build execution plan
   */
  buildExecutionPlan(workflow) {
    const plan = {
      stages: [],
      taskMap: new Map()
    };
    
    // Create task map
    for (const task of workflow.tasks) {
      plan.taskMap.set(task.id, task);
    }
    
    // Topological sort to determine execution order
    const visited = new Set();
    const temp = new Set();
    const order = [];
    
    const visit = (taskId) => {
      if (temp.has(taskId)) {
        throw new Error(`Circular dependency detected at task: ${taskId}`);
      }
      
      if (!visited.has(taskId)) {
        temp.add(taskId);
        
        const task = plan.taskMap.get(taskId);
        if (task && task.dependencies) {
          for (const dep of task.dependencies) {
            visit(dep);
          }
        }
        
        temp.delete(taskId);
        visited.add(taskId);
        order.push(taskId);
      }
    };
    
    // Visit all tasks
    for (const task of workflow.tasks) {
      if (!visited.has(task.id)) {
        visit(task.id);
      }
    }
    
    // Group tasks into stages based on dependencies
    const taskLevels = new Map();
    
    for (const taskId of order) {
      const task = plan.taskMap.get(taskId);
      let level = 0;
      
      if (task.dependencies && task.dependencies.length > 0) {
        level = Math.max(...task.dependencies.map(dep => 
          (taskLevels.get(dep) || 0) + 1
        ));
      }
      
      taskLevels.set(taskId, level);
    }
    
    // Create stages
    const maxLevel = Math.max(...taskLevels.values());
    
    for (let i = 0; i <= maxLevel; i++) {
      const stageTasks = [];
      
      for (const [taskId, level] of taskLevels) {
        if (level === i) {
          stageTasks.push(plan.taskMap.get(taskId));
        }
      }
      
      if (stageTasks.length > 0) {
        plan.stages.push({
          level: i,
          tasks: stageTasks
        });
      }
    }
    
    return plan;
  }

  /**
   * Execute tasks according to plan
   */
  async executeTasks(workflowId, instance, plan) {
    for (const stage of plan.stages) {
      // Execute tasks in parallel within each stage
      const stagePromises = stage.tasks.map(task => 
        this.executeTask(workflowId, instance, task)
      );
      
      await Promise.all(stagePromises);
    }
  }

  /**
   * Execute individual task
   */
  async executeTask(workflowId, instance, task) {
    const taskState = instance.tasks.get(task.id);
    
    try {
      // Update task status
      taskState.status = 'running';
      taskState.startTime = Date.now();
      
      // Emit task start event
      this.emit('task:start', { workflowId, taskId: task.id });
      
      // Wait for dependencies if needed
      if (task.dependencies && task.dependencies.length > 0) {
        await this.waitForDependencies(instance, task.dependencies);
      }
      
      // Execute task based on type
      let result;
      
      switch (task.type) {
        case 'command':
          result = await this.executeCommand(task);
          break;
        case 'function':
          result = await this.executeFunction(task);
          break;
        case 'http':
          result = await this.executeHttpRequest(task);
          break;
        case 'parallel':
          result = await this.executeParallelTasks(workflowId, instance, task);
          break;
        default:
          result = await this.executeCustomTask(task);
      }
      
      // Update task state
      taskState.status = 'completed';
      taskState.result = result;
      taskState.endTime = Date.now();
      taskState.duration = taskState.endTime - taskState.startTime;
      
      // Store result
      instance.results[task.id] = result;
      
      // Update state manager
      await stateManager.updateTask(workflowId, {
        data: {
          tasks: Object.fromEntries(instance.tasks)
        }
      });
      
      // Emit task complete event
      this.emit('task:complete', { 
        workflowId, 
        taskId: task.id, 
        result,
        duration: taskState.duration
      });
      
    } catch (error) {
      // Handle task failure
      taskState.status = 'failed';
      taskState.error = error.message;
      taskState.endTime = Date.now();
      taskState.duration = taskState.endTime - taskState.startTime;
      
      // Emit task error event
      this.emit('task:error', { workflowId, taskId: task.id, error });
      
      // Handle error based on policy
      if (task.continueOnError) {
        logger.warn(`Task ${task.id} failed but continuing: ${error.message}`);
      } else {
        throw error;
      }
    }
  }

  /**
   * Wait for task dependencies
   */
  async waitForDependencies(instance, dependencies) {
    const checkInterval = 100; // ms
    const maxWait = 300000; // 5 minutes
    const startTime = Date.now();
    
    while (true) {
      const allCompleted = dependencies.every(dep => {
        const depState = instance.tasks.get(dep);
        return depState && depState.status === 'completed';
      });
      
      if (allCompleted) break;
      
      if (Date.now() - startTime > maxWait) {
        throw new Error('Dependency wait timeout');
      }
      
      await new Promise(resolve => setTimeout(resolve, checkInterval));
    }
  }

  /**
   * Execute command task
   */
  async executeCommand(task) {
    const { execSync } = require('child_process');
    
    try {
      const output = execSync(task.command, {
        encoding: 'utf8',
        env: { ...process.env, ...task.env }
      });
      
      return {
        type: 'command',
        output,
        exitCode: 0
      };
    } catch (error) {
      return {
        type: 'command',
        error: error.message,
        exitCode: error.status || 1
      };
    }
  }

  /**
   * Execute function task
   */
  async executeFunction(task) {
    // Dynamic function execution (simplified)
    const fn = new Function('context', 'params', task.function);
    const context = await contextEngine.getSnapshot();
    
    return await fn(context, task.params || {});
  }

  /**
   * Execute HTTP request task
   */
  async executeHttpRequest(task) {
    // Simple fetch implementation
    try {
      const response = await fetch(task.url, {
        method: task.method || 'GET',
        headers: task.headers || {},
        body: task.body ? JSON.stringify(task.body) : undefined
      });
      
      const data = await response.json();
      
      return {
        type: 'http',
        status: response.status,
        data
      };
    } catch (error) {
      return {
        type: 'http',
        error: error.message
      };
    }
  }

  /**
   * Execute parallel tasks
   */
  async executeParallelTasks(workflowId, instance, task) {
    const subtasks = task.tasks || [];
    const results = await Promise.all(
      subtasks.map(subtask => 
        this.executeTask(workflowId, instance, subtask)
      )
    );
    
    return {
      type: 'parallel',
      results
    };
  }

  /**
   * Execute custom task
   */
  async executeCustomTask(task) {
    // Hook for custom task handlers
    this.emit('task:custom', task);
    
    return {
      type: 'custom',
      taskType: task.type,
      completed: true
    };
  }

  /**
   * Rollback workflow
   */
  async rollbackWorkflow(workflowId, instance) {
    logger.info(`Rolling back workflow: ${workflowId}`);
    
    // Execute rollback tasks in reverse order
    const completedTasks = Array.from(instance.tasks.entries())
      .filter(([_, state]) => state.status === 'completed')
      .reverse();
    
    for (const [taskId, _] of completedTasks) {
      const task = instance.workflow.tasks.find(t => t.id === taskId);
      
      if (task && task.rollback) {
        try {
          await this.executeTask(workflowId, instance, {
            ...task.rollback,
            id: `${taskId}-rollback`
          });
        } catch (error) {
          logger.error(`Rollback failed for task ${taskId}: ${error.message}`);
        }
      }
    }
    
    // Update workflow status
    instance.status = 'rolled-back';
    
    // Emit rollback event
    this.emit('workflow:rollback', { workflowId });
  }

  /**
   * Get workflow status
   */
  getWorkflowStatus(workflowId) {
    const instance = this.runningWorkflows.get(workflowId);
    
    if (!instance) {
      return null;
    }
    
    return {
      id: workflowId,
      name: instance.workflow.name,
      status: instance.status,
      progress: this.calculateProgress(instance),
      tasks: Object.fromEntries(instance.tasks),
      duration: instance.endTime ? 
        instance.duration : 
        Date.now() - instance.startTime
    };
  }

  /**
   * Calculate workflow progress
   */
  calculateProgress(instance) {
    const total = instance.tasks.size;
    const completed = Array.from(instance.tasks.values())
      .filter(t => t.status === 'completed').length;
    
    return {
      total,
      completed,
      percentage: Math.round((completed / total) * 100)
    };
  }

  /**
   * List running workflows
   */
  listRunningWorkflows() {
    return Array.from(this.runningWorkflows.entries()).map(([id, instance]) => ({
      id,
      name: instance.workflow.name,
      status: instance.status,
      progress: this.calculateProgress(instance),
      startTime: instance.startTime
    }));
  }

  /**
   * Cancel workflow
   */
  async cancelWorkflow(workflowId) {
    const instance = this.runningWorkflows.get(workflowId);
    
    if (!instance) {
      throw new Error(`Workflow ${workflowId} not found`);
    }
    
    instance.status = 'cancelled';
    
    // Update all pending tasks
    for (const [taskId, state] of instance.tasks) {
      if (state.status === 'pending' || state.status === 'running') {
        state.status = 'cancelled';
      }
    }
    
    // Emit cancel event
    this.emit('workflow:cancel', { workflowId });
    
    // Remove from running workflows
    this.runningWorkflows.delete(workflowId);
  }

  /**
   * Generate workflow ID
   */
  generateWorkflowId() {
    return `wf-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Save workflow definition
   */
  async saveWorkflow(name, definition) {
    const workflowPath = path.join(process.cwd(), '.slambed', 'workflows', `${name}.json`);
    await fs.ensureDir(path.dirname(workflowPath));
    await fs.writeJson(workflowPath, definition, { spaces: 2 });
    return workflowPath;
  }

  /**
   * Load workflow definition
   */
  async loadWorkflow(name) {
    const workflowPath = path.join(process.cwd(), '.slambed', 'workflows', `${name}.json`);
    
    if (!await fs.pathExists(workflowPath)) {
      throw new Error(`Workflow '${name}' not found`);
    }
    
    return await fs.readJson(workflowPath);
  }

  /**
   * List saved workflows
   */
  async listSavedWorkflows() {
    const workflowDir = path.join(process.cwd(), '.slambed', 'workflows');
    
    if (!await fs.pathExists(workflowDir)) {
      return [];
    }
    
    const files = await fs.readdir(workflowDir);
    return files
      .filter(f => f.endsWith('.json'))
      .map(f => f.replace('.json', ''));
  }
}

// Export singleton instance
export default new WorkflowOrchestrator();
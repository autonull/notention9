import { AutonomousTask, TaskExecutionResult } from '../types.js';
import { TaskExecutionError } from '../../utils/errors/index.js';
import { logInfo, logError, logWarn } from '../../utils/logging.js';
import { RetryStrategy, defaultRetryStrategy } from './RetryStrategy.js';
import { TaskQueue } from './TaskQueue.js';

export interface TaskRunnerHooks {
  beforeExecute?: (task: AutonomousTask) => void | Promise<void>;
  afterExecute?: (task: AutonomousTask, result: TaskExecutionResult) => void | Promise<void>;
  onError?: (task: AutonomousTask, error: Error) => void | Promise<void>;
}

export interface TaskRunnerConfig {
  maxConcurrentTasks: number;
  retryStrategy?: RetryStrategy;
  hooks?: TaskRunnerHooks;
}

export class TaskRunner {
  private readonly queue: TaskQueue;
  private readonly retryStrategy: RetryStrategy;
  private readonly hooks: TaskRunnerHooks;

  constructor(config: TaskRunnerConfig) {
    this.queue = new TaskQueue(config.maxConcurrentTasks);
    this.retryStrategy = config.retryStrategy ?? defaultRetryStrategy;
    this.hooks = config.hooks ?? {};
  }

  async execute(task: AutonomousTask): Promise<TaskExecutionResult> {
    await this.hooks.beforeExecute?.(task);

    try {
      const result = await this.retryStrategy.executeWithRetry(
        () => this.performExecution(task),
        context => logWarn(`Task ${task.id} retry ${context.attempt}/${context.maxRetries}`, context.lastError)
      );

      await this.hooks.afterExecute?.(task, result);
      return result;
    } catch (error) {
      const executionError = error as Error;
      await this.hooks.onError?.(task, executionError);
      throw executionError;
    } finally {
      this.queue.release();
    }
  }

  private async performExecution(task: AutonomousTask): Promise<TaskExecutionResult> {
    const startTime = Date.now();

    try {
      const result = await this.executeAction(task);
      const executionTime = Date.now() - startTime;

      logInfo(`Task executed successfully`, { taskId: task.id, executionTime });

      return {
        taskId: task.id,
        success: true,
        result,
        executionTime,
      };
    } catch (error) {
      const executionTime = Date.now() - startTime;
      logError(`Task execution failed`, error as Error, { taskId: task.id, executionTime });
      throw error;
    }
  }

  protected async executeAction(task: AutonomousTask): Promise<any> {
    await new Promise(resolve => setTimeout(resolve, 100));

    return {
      action: task.predictedAction,
      noteId: task.noteContext.id,
      timestamp: Date.now(),
    };
  }

  getQueue(): TaskQueue {
    return this.queue;
  }

  getActiveCount(): number {
    return this.queue.getActiveCount();
  }

  getQueuedCount(): number {
    return this.queue.getQueuedCount();
  }
}

export function createTaskRunner(config: TaskRunnerConfig): TaskRunner {
  return new TaskRunner(config);
}
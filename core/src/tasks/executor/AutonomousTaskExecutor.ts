import {
  AutonomousTask,
  TaskAuthorization,
  TaskExecutionResult,
  TaskSchedulerConfig,
  TaskStatus,
  TaskPriority,
} from '../types.js';
import { TaskExecutionError } from '../../utils/errors/index.js';
import { logInfo, logError, logWarn } from '../../utils/logging.js';
import { generateId, safeDivide, clamp } from '../../utils/common.js';
import { patternRecognitionService } from '../../patternRecognition/patternRecognition.js';
import { predictionAccuracyTracker } from '../../patternRecognition/predictionTracking.js';
import type { Pattern } from '../../patternRecognition/types.js';
import { TaskRunner, TaskRunnerConfig } from './TaskRunner.js';
import { TaskScheduler, ScheduledTask } from './TaskScheduler.js';
import { RetryStrategy } from './RetryStrategy.js';

export interface AutonomousTaskExecutorConfig extends TaskSchedulerConfig {
  runner?: Partial<TaskRunnerConfig>;
}

export class AutonomousTaskExecutor {
  private readonly tasks: Map<string, AutonomousTask> = new Map();
  private readonly runner: TaskRunner;
  private readonly scheduler: TaskScheduler;
  private readonly config: TaskSchedulerConfig;

  constructor(config: Partial<AutonomousTaskExecutorConfig> = {}) {
    this.config = {
      maxConcurrentTasks: config.maxConcurrentTasks ?? 3,
      taskRetryLimit: config.taskRetryLimit ?? 3,
      defaultPriority: config.defaultPriority ?? TaskPriority.MEDIUM,
      autoApprovalEnabled: config.autoApprovalEnabled ?? false,
      confirmationRequiredThreshold: config.confirmationRequiredThreshold ?? 0.8,
    };

    const retryStrategy = new RetryStrategy({
      maxRetries: this.config.taskRetryLimit,
    });

    this.runner = new TaskRunner({
      maxConcurrentTasks: this.config.maxConcurrentTasks,
      retryStrategy,
      hooks: config.runner?.hooks,
    });

    this.scheduler = new TaskScheduler(this.config);
  }

  createAutonomousTask(
    userId: string,
    note: AutonomousTask['noteContext'],
    predictedAction: string,
    confidence: number,
    authorization: TaskAuthorization
  ): AutonomousTask {
    try {
      const task: AutonomousTask = {
        id: generateId('autotask_'),
        userId,
        title: `Autonomous: ${predictedAction}`,
        description: 'Automatically created task based on pattern recognition',
        noteContext: note,
        predictedAction,
        confidence,
        status: TaskStatus.PENDING,
        priority: this.determinePriority(confidence),
        authorization,
        retryCount: 0,
        maxRetries: this.config.taskRetryLimit,
        requiresUserConfirmation: confidence >= this.config.confirmationRequiredThreshold,
      };

      this.tasks.set(task.id, task);

      if (this.config.autoApprovalEnabled &&
          confidence >= authorization.autoApproveThreshold &&
          !task.requiresUserConfirmation) {
        this.approveTask(task.id);
      }

      logInfo(`Created autonomous task`, {
        taskId: task.id,
        userId,
        confidence,
        action: predictedAction,
      });

      return task;
    } catch (error) {
      logError(`Failed to create autonomous task for user ${userId}`, error as Error);
      throw new TaskExecutionError(`Failed to create autonomous task for user ${userId}`, undefined, error as Error);
    }
  }

  private determinePriority(confidence: number): TaskPriority {
    if (confidence >= 0.9) return TaskPriority.CRITICAL;
    if (confidence >= 0.7) return TaskPriority.HIGH;
    if (confidence >= 0.5) return TaskPriority.MEDIUM;
    return TaskPriority.LOW;
  }

  approveTask(taskId: string): boolean {
    try {
      const task = this.tasks.get(taskId);
      if (!task || task.status !== TaskStatus.PENDING) return false;

      if (!this.isUserAuthorized(task)) {
        task.status = TaskStatus.REJECTED;
        logWarn(`Task rejected due to authorization failure`, { taskId, userId: task.userId });
        return false;
      }

      task.status = TaskStatus.APPROVED;
      task.confirmationReceived = true;

      if (this.canExecuteTask(task)) {
        this.executeTask(taskId);
      }

      logInfo(`Task approved`, { taskId, userId: task.userId });
      return true;
    } catch (error) {
      logError(`Failed to approve task ${taskId}`, error as Error);
      throw new TaskExecutionError(`Failed to approve task ${taskId}`, taskId, error as Error);
    }
  }

  rejectTask(taskId: string): boolean {
    try {
      const task = this.tasks.get(taskId);
      if (!task || ![TaskStatus.PENDING, TaskStatus.APPROVED].includes(task.status)) return false;

      task.status = TaskStatus.REJECTED;
      logInfo(`Task rejected`, { taskId, userId: task.userId });
      return true;
    } catch (error) {
      logError(`Failed to reject task ${taskId}`, error as Error);
      throw new TaskExecutionError(`Failed to reject task ${taskId}`, taskId, error as Error);
    }
  }

  confirmTask(taskId: string): boolean {
    try {
      const task = this.tasks.get(taskId);
      if (!task || task.status !== TaskStatus.PENDING || !task.requiresUserConfirmation) return false;

      task.confirmationReceived = true;

      if (this.isUserAuthorized(task)) {
        task.status = TaskStatus.APPROVED;
        if (this.canExecuteTask(task)) {
          this.executeTask(taskId);
        }
      }

      logInfo(`Task confirmed`, { taskId, userId: task.userId });
      return true;
    } catch (error) {
      logError(`Failed to confirm task ${taskId}`, error as Error);
      throw new TaskExecutionError(`Failed to confirm task ${taskId}`, taskId, error as Error);
    }
  }

  private isUserAuthorized(task: AutonomousTask): boolean {
    return task.authorization.authorizedActions.some(action =>
      task.predictedAction.toLowerCase().includes(action.toLowerCase())
    );
  }

  private canExecuteTask(task: AutonomousTask): boolean {
    return task.status === TaskStatus.APPROVED &&
           (!task.requiresUserConfirmation || !!task.confirmationReceived) &&
           task.retryCount < task.maxRetries;
  }

  async executeTask(taskId: string): Promise<TaskExecutionResult> {
    const task = this.tasks.get(taskId);
    if (!task || !this.canExecuteTask(task)) {
      throw new TaskExecutionError(`Task ${taskId} cannot be executed`, taskId);
    }

    task.status = TaskStatus.EXECUTING;
    task.startTime = Date.now();

    try {
      const result = await this.runner.execute(task);

      task.status = TaskStatus.COMPLETED;
      task.result = result.result;
      task.endTime = Date.now();

      this.trackAccuracy(task);

      logInfo(`Task completed successfully`, {
        taskId,
        executionTime: result.executionTime,
        result: JSON.stringify(result.result).slice(0, 100),
      });

      return result;
    } catch (error) {
      return this.handleTaskExecutionError(taskId, error as Error);
    }
  }

  private async handleTaskExecutionError(taskId: string, error: Error): Promise<TaskExecutionResult> {
    const task = this.tasks.get(taskId);
    if (!task) {
      logError(`Task not found for error handling: ${taskId}`, error);
      return { taskId, success: false, error: error.message, executionTime: 0 };
    }

    task.retryCount++;
    const willRetry = task.retryCount < task.maxRetries;

    if (willRetry) {
      task.status = TaskStatus.PENDING;
      const delay = this.runner['retryStrategy'].calculateDelay(task.retryCount);
      logWarn(`Task execution failed, will retry in ${delay}ms (attempt ${task.retryCount}/${task.maxRetries})`, error);

      setTimeout(() => this.executeTask(taskId), delay);

      return {
        taskId,
        success: false,
        error: `Retry scheduled: ${error.message}`,
        executionTime: 0,
      };
    }

    task.status = TaskStatus.FAILED;
    task.error = error.message;
    task.endTime = Date.now();

    this.trackAccuracy(task);

    logError(`Task failed after all retries: ${taskId}`, error, {
      retryCount: task.retryCount,
    });

    return {
      taskId,
      success: false,
      error: error.message,
      executionTime: task.endTime - (task.startTime ?? 0),
    };
  }

  private trackAccuracy(task: AutonomousTask): void {
    const pattern: Pattern = {
      id: 'autonomous',
      name: 'Autonomous Task',
      description: 'Auto-generated task from pattern recognition',
      conditions: [],
      predictedActions: [task.predictedAction],
      confidence: task.confidence,
      lastUsed: task.startTime || Date.now(),
      usageCount: 1,
      accuracyRate: 0,
    };
    predictionAccuracyTracker.recordPrediction(task.userId, {
      pattern,
      noteContext: task.noteContext,
      predictedAction: task.predictedAction,
      confidence: task.confidence,
      timestamp: task.startTime || Date.now(),
    });
  }

  getTask(taskId: string): AutonomousTask | undefined {
    return this.tasks.get(taskId);
  }

  getUserTasks(userId: string): AutonomousTask[] {
    return Array.from(this.tasks.values()).filter(task => task.userId === userId);
  }

  getActiveTasks(): AutonomousTask[] {
    return Array.from(this.tasks.values()).filter(task =>
      [TaskStatus.PENDING, TaskStatus.APPROVED, TaskStatus.EXECUTING].includes(task.status)
    );
  }

  getTaskStats(): {
    total: number;
    byStatus: Record<string, number>;
    activeExecutions: number;
    queuedTasks: number;
  } {
    const byStatus: Record<string, number> = {};
    for (const task of this.tasks.values()) {
      byStatus[task.status] = (byStatus[task.status] || 0) + 1;
    }

    return {
      total: this.tasks.size,
      byStatus,
      activeExecutions: this.runner.getActiveCount(),
      queuedTasks: this.runner.getQueuedCount(),
    };
  }

  cancelTask(taskId: string): boolean {
    const task = this.tasks.get(taskId);
    if (!task || [TaskStatus.COMPLETED, TaskStatus.FAILED].includes(task.status)) {
      return false;
    }

    task.status = TaskStatus.CANCELLED;
    task.endTime = Date.now();

    this.runner.getQueue().remove(taskId);

    logInfo(`Task cancelled`, { taskId });
    return true;
  }

  updateConfig(config: Partial<TaskSchedulerConfig>): void {
    Object.assign(this.config, config);
    logInfo(`Task executor config updated`, { config: this.config });
  }

  scheduleTask(task: AutonomousTask, cronExpression: string): string {
    return this.scheduler.scheduleTask(task, cronExpression);
  }

  scheduleInterval(task: AutonomousTask, intervalMs: number): string {
    return this.scheduler.scheduleInterval(task, intervalMs);
  }

  unschedule(scheduledId: string): boolean {
    return this.scheduler.unschedule(scheduledId);
  }

  getScheduled(scheduledId: string): ScheduledTask | undefined {
    return this.scheduler.getScheduled(scheduledId);
  }

  getAllScheduled(): ScheduledTask[] {
    return this.scheduler.getAllScheduled();
  }
}

export const autonomousTaskExecutor = new AutonomousTaskExecutor();
import type { Note, Property } from '../types/index.js';
import { patternRecognitionService } from '../patternRecognition.js';
import { predictionAccuracyTracker } from '../predictionTracking.js';
import { generateId, safeDivide, clamp } from '../utils/common.js';
import { TaskExecutionError } from '../utils/errors.js';
import { logInfo, logError, logWarn } from '../utils/logging.js';
import {
  TaskStatus,
  TaskPriority,
  type TaskAuthorization,
  type AutonomousTask,
  type TaskExecutionResult,
  type TaskSchedulerConfig
} from './types.js';
import type { Pattern } from '../patternRecognition/types.js';

/**
 * AutonomousTaskExecutor - Manages creation, approval, and execution of autonomous tasks
 * 
 * Autonomous tasks are created from pattern recognition predictions and can execute
 * automatically based on confidence levels and user authorization settings.
 */
export class AutonomousTaskExecutor {
  private tasks: Map<string, AutonomousTask> = new Map();
  private config: TaskSchedulerConfig;
  private activeExecutions: Set<string> = new Set();

  constructor(config?: Partial<TaskSchedulerConfig>) {
    this.config = {
      maxConcurrentTasks: 3,
      taskRetryLimit: 3,
      defaultPriority: TaskPriority.MEDIUM,
      autoApprovalEnabled: false,
      confirmationRequiredThreshold: 0.8,
      ...config
    };
  }

  /**
   * Creates an autonomous task based on a prediction
   */
  createAutonomousTask(
    userId: string,
    note: Note,
    predictedAction: string,
    confidence: number,
    authorization: TaskAuthorization
  ): AutonomousTask {
    try {
      const task: AutonomousTask = {
        id: generateId('autotask_'),
        userId,
        title: `Autonomous: ${predictedAction}`,
        description: `Automatically created task based on pattern recognition`,
        noteContext: note,
        predictedAction,
        confidence,
        status: TaskStatus.PENDING,
        priority: this.determinePriority(confidence),
        authorization,
        retryCount: 0,
        maxRetries: this.config.taskRetryLimit,
        requiresUserConfirmation: confidence >= this.config.confirmationRequiredThreshold
      };

      this.tasks.set(task.id, task);

      // If auto-approval is enabled and confidence is high enough, approve automatically
      if (this.config.autoApprovalEnabled &&
          confidence >= authorization.autoApproveThreshold &&
          !task.requiresUserConfirmation) {
        this.approveTask(task.id);
      }

      logInfo(`Created autonomous task`, {
        taskId: task.id,
        userId,
        confidence,
        action: predictedAction
      });

      return task;
    } catch (error) {
      logError(`Failed to create autonomous task for user ${userId}`, error as Error);
      throw new TaskExecutionError(`Failed to create autonomous task for user ${userId}`, undefined, error as Error);
    }
  }

  /**
   * Determines task priority based on confidence
   */
  private determinePriority(confidence: number): TaskPriority {
    if (confidence >= 0.9) return TaskPriority.CRITICAL;
    if (confidence >= 0.7) return TaskPriority.HIGH;
    if (confidence >= 0.5) return TaskPriority.MEDIUM;
    return TaskPriority.LOW;
  }

  /**
   * Approves a task for execution
   */
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

  /**
   * Rejects a task
   */
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

  /**
   * Confirms a task (for tasks that require user confirmation)
   */
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

  /**
   * Checks if user is authorized to perform the task
   */
  private isUserAuthorized(task: AutonomousTask): boolean {
    return task.authorization.authorizedActions.some(action =>
      task.predictedAction.toLowerCase().includes(action.toLowerCase())
    );
  }

  /**
   * Checks if a task can be executed
   */
  private canExecuteTask(task: AutonomousTask): boolean {
    return task.status === TaskStatus.APPROVED &&
           (!task.requiresUserConfirmation || !!task.confirmationReceived) &&
           task.retryCount < task.maxRetries;
  }

  /**
   * Executes a task
   */
  async executeTask(taskId: string): Promise<TaskExecutionResult> {
    try {
      const task = this.tasks.get(taskId);
      if (!task || !this.canExecuteTask(task)) {
        throw new TaskExecutionError(`Task ${taskId} cannot be executed`, taskId);
      }

      if (this.activeExecutions.size >= this.config.maxConcurrentTasks) {
        setTimeout(() => this.executeTask(taskId), 1000);
        logInfo(`Task queued due to concurrency limits`, { taskId });
        return {
          taskId,
          success: false,
          error: 'Task queued due to concurrency limits',
          executionTime: 0
        };
      }

      task.status = TaskStatus.EXECUTING;
      task.startTime = Date.now();

      this.activeExecutions.add(taskId);

      const result = await this.performPredictedAction(task);

      task.status = TaskStatus.COMPLETED;
      task.result = result;
      task.endTime = Date.now();

      this.activeExecutions.delete(taskId);

      const executionTime = task.endTime - task.startTime;

      // Track prediction accuracy
      const pattern: Pattern = {
        id: 'autonomous',
        name: 'Autonomous Task',
        description: 'Auto-generated task from pattern recognition',
        conditions: [],
        predictedActions: [task.predictedAction],
        confidence: task.confidence,
        lastUsed: task.startTime!,
        usageCount: 1,
        accuracyRate: 0
      };
      predictionAccuracyTracker.recordPrediction(task.userId, {
        pattern,
        noteContext: task.noteContext,
        predictedAction: task.predictedAction,
        confidence: task.confidence,
        timestamp: task.startTime!
      });

      logInfo(`Task completed successfully`, {
        taskId,
        executionTime,
        result: JSON.stringify(result).slice(0, 100)
      });

      return {
        taskId,
        success: true,
        result,
        executionTime
      };
    } catch (error: any) {
      return this.handleTaskExecutionError(taskId, error);
    }
  }

  /**
   * Handles task execution errors with retry logic
   */
  private async handleTaskExecutionError(taskId: string, error: Error): Promise<TaskExecutionResult> {
    const task = this.tasks.get(taskId);
    if (!task) {
      logError(`Task not found for error handling: ${taskId}`, error);
      return { taskId, success: false, error: error.message, executionTime: 0 };
    }

    task.retryCount++;
    const willRetry = task.retryCount < task.maxRetries;

    if (willRetry) {
      const delay = this.calculateRetryDelay(task.retryCount);
      logWarn(`Task execution failed, will retry in ${delay}ms (attempt ${task.retryCount}/${task.maxRetries})`, error);

      task.status = TaskStatus.PENDING;
      setTimeout(() => this.executeTask(taskId), delay);

      return {
        taskId,
        success: false,
        error: `Retry scheduled: ${error.message}`,
        executionTime: 0
      };
    }

    task.status = TaskStatus.FAILED;
    task.error = error.message;
    task.endTime = Date.now();

    this.activeExecutions.delete(taskId);

    // Track prediction accuracy
    const pattern: Pattern = {
      id: 'autonomous',
      name: 'Autonomous Task',
      description: 'Auto-generated task from pattern recognition',
      conditions: [],
      predictedActions: [task.predictedAction],
      confidence: task.confidence,
      lastUsed: task.startTime!,
      usageCount: 1,
      accuracyRate: 0
    };
    predictionAccuracyTracker.recordPrediction(task.userId, {
      pattern,
      noteContext: task.noteContext,
      predictedAction: task.predictedAction,
      confidence: task.confidence,
      timestamp: task.startTime!
    });

    logError(`Task failed after all retries: ${taskId}`, error, {
      retryCount: task.retryCount
    });

    return {
      taskId,
      success: false,
      error: error.message,
      executionTime: task.endTime - task.startTime!
    };
  }

  /**
   * Calculates exponential backoff delay for retries
   */
  private calculateRetryDelay(retryCount: number): number {
    const baseDelay = 1000;
    const maxDelay = 30000;
    return Math.min(baseDelay * Math.pow(2, retryCount), maxDelay);
  }

  /**
   * Performs the predicted action (placeholder for actual implementation)
   */
  private async performPredictedAction(task: AutonomousTask): Promise<any> {
    // Placeholder - in real implementation, this would:
    // 1. Parse the predicted action
    // 2. Select appropriate skill/agent
    // 3. Execute with note context
    // 4. Return structured result

    await new Promise(resolve => setTimeout(resolve, 100));

    return {
      action: task.predictedAction,
      noteId: task.noteContext.id,
      timestamp: Date.now()
    };
  }

  /**
   * Gets task by ID
   */
  getTask(taskId: string): AutonomousTask | undefined {
    return this.tasks.get(taskId);
  }

  /**
   * Gets all tasks for a user
   */
  getUserTasks(userId: string): AutonomousTask[] {
    return Array.from(this.tasks.values()).filter(task => task.userId === userId);
  }

  /**
   * Gets active tasks
   */
  getActiveTasks(): AutonomousTask[] {
    return Array.from(this.tasks.values()).filter(task =>
      [TaskStatus.PENDING, TaskStatus.APPROVED, TaskStatus.EXECUTING].includes(task.status)
    );
  }

  /**
   * Gets task statistics
   */
  getTaskStats(): {
    total: number;
    byStatus: Record<string, number>;
    activeExecutions: number;
  } {
    const byStatus: Record<string, number> = {};
    for (const task of this.tasks.values()) {
      byStatus[task.status] = (byStatus[task.status] || 0) + 1;
    }

    return {
      total: this.tasks.size,
      byStatus,
      activeExecutions: this.activeExecutions.size
    };
  }

  /**
   * Cancels a task
   */
  cancelTask(taskId: string): boolean {
    const task = this.tasks.get(taskId);
    if (!task || [TaskStatus.COMPLETED, TaskStatus.FAILED].includes(task.status)) {
      return false;
    }

    task.status = TaskStatus.CANCELLED;
    task.endTime = Date.now();

    if (this.activeExecutions.has(taskId)) {
      // In real implementation, this would abort the execution
      this.activeExecutions.delete(taskId);
    }

    logInfo(`Task cancelled`, { taskId });
    return true;
  }

  /**
   * Updates task configuration
   */
  updateConfig(config: Partial<TaskSchedulerConfig>): void {
    this.config = { ...this.config, ...config };
    logInfo(`Task executor config updated`, { config: this.config });
  }
}

// Export singleton instance
export const autonomousTaskExecutor = new AutonomousTaskExecutor();

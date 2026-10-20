/**
 * Autonomous Tasks Module
 * 
 * Provides autonomous task creation, approval, and execution capabilities
 * based on pattern recognition predictions.
 */

export {
  TaskStatus,
  TaskPriority,
  type TaskAuthorization,
  type AutonomousTask,
  type TaskExecutionResult,
  type TaskSchedulerConfig
} from './types.js';

export {
  AutonomousTaskExecutor,
  autonomousTaskExecutor,
  TaskRunner,
  createTaskRunner,
  TaskScheduler,
  createTaskScheduler,
  TaskQueue,
  createTaskQueue,
  RetryStrategy,
  defaultRetryStrategy,
} from './executor/index.js';

export type {
  TaskRunnerConfig,
  TaskRunnerHooks,
  RetryConfig,
  RetryContext,
  ScheduledTask,
} from './executor/index.js';

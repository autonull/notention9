/**
 * @deprecated Use `@notention/core/tasks` instead
 * 
 * This file is maintained for backward compatibility.
 * All functionality has been moved to the modular tasks/ directory.
 */

export {
  TaskStatus,
  TaskPriority,
  type TaskAuthorization,
  type AutonomousTask,
  type TaskExecutionResult,
  type TaskSchedulerConfig,
  AutonomousTaskExecutor,
  autonomousTaskExecutor
} from './tasks/index.js';

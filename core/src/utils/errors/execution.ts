import { NotentionError } from './base.js';

export class TaskExecutionError extends NotentionError {
  constructor(message: string, public readonly taskId?: string, cause?: Error, context?: Record<string, unknown>) {
    super(message, context, cause);
    this.name = 'TaskExecutionError';
  }
}

export class SkillExecutionError extends NotentionError {
  constructor(message: string, public readonly skillId?: string, cause?: Error, context?: Record<string, unknown>) {
    super(message, context, cause);
    this.name = 'SkillExecutionError';
  }
}
/**
 * Custom error types for Notention system
 */

export class PredictionError extends Error {
  constructor(message: string, public readonly cause?: Error) {
    super(message);
    this.name = 'PredictionError';
  }
}

export class ValidationError extends Error {
  constructor(message: string, public readonly details?: any) {
    super(message);
    this.name = 'ValidationError';
  }
}

export class TaskExecutionError extends Error {
  constructor(message: string, public readonly taskId?: string, public readonly cause?: Error) {
    super(message);
    this.name = 'TaskExecutionError';
  }
}

export class AuthorizationError extends Error {
  constructor(message: string, public readonly userId?: string, public readonly action?: string) {
    super(message);
    this.name = 'AuthorizationError';
  }
}

export class ConfigurationError extends Error {
  constructor(message: string, public readonly configKey?: string) {
    super(message);
    this.name = 'ConfigurationError';
  }
}

export class DataIntegrityError extends Error {
  constructor(message: string, public readonly entity?: string, public readonly entityId?: string) {
    super(message);
    this.name = 'DataIntegrityError';
  }
}

export class RateLimitError extends Error {
  constructor(message: string, public readonly limit?: number, public readonly windowMs?: number) {
    super(message);
    this.name = 'RateLimitError';
  }
}

export class TimeoutError extends Error {
  constructor(message: string, public readonly timeoutMs?: number) {
    super(message);
    this.name = 'TimeoutError';
  }
}
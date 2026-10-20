import { NotentionError } from './base.js';

export class ValidationError extends NotentionError {
  constructor(message: string, public readonly details?: unknown, context?: Record<string, unknown>) {
    super(message, context);
    this.name = 'ValidationError';
  }
}

export class PropertyValidationError extends ValidationError {
  constructor(message: string, public readonly propertyKey?: string, context?: Record<string, unknown>) {
    super(message, undefined, context);
    this.name = 'PropertyValidationError';
  }
}
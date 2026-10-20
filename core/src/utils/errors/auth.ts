import { NotentionError } from './base.js';

export class AuthorizationError extends NotentionError {
  constructor(message: string, public readonly userId?: string, public readonly action?: string, context?: Record<string, unknown>) {
    super(message, context);
    this.name = 'AuthorizationError';
  }
}
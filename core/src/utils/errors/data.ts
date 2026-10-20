import { NotentionError } from './base.js';

export class DataIntegrityError extends NotentionError {
  constructor(message: string, public readonly entity?: string, public readonly entityId?: string, context?: Record<string, unknown>) {
    super(message, context);
    this.name = 'DataIntegrityError';
  }
}
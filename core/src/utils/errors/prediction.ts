import { NotentionError } from './base.js';

export class PredictionError extends NotentionError {
  constructor(message: string, cause?: Error, context?: Record<string, unknown>) {
    super(message, context, cause);
    this.name = 'PredictionError';
  }
}
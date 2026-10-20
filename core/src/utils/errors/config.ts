import { NotentionError } from './base.js';

export class ConfigurationError extends NotentionError {
  constructor(message: string, public readonly configKey?: string, context?: Record<string, unknown>) {
    super(message, context);
    this.name = 'ConfigurationError';
  }
}
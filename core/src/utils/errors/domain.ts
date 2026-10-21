import { NotentionError } from './base.js';

export class OntologyError extends NotentionError {
  constructor(message: string, public readonly ontologyNode?: string, context?: Record<string, unknown>) {
    super(message, context);
    this.name = 'OntologyError';
  }
}

export class PredictionError extends NotentionError {
  constructor(message: string, cause?: Error, context?: Record<string, unknown>) {
    super(message, context, cause);
    this.name = 'PredictionError';
  }
}

export class ConfigurationError extends NotentionError {
  constructor(message: string, public readonly configKey?: string, context?: Record<string, unknown>) {
    super(message, context);
    this.name = 'ConfigurationError';
  }
}

export class AuthorizationError extends NotentionError {
  constructor(message: string, public readonly userId?: string, public readonly action?: string, context?: Record<string, unknown>) {
    super(message, context);
    this.name = 'AuthorizationError';
  }
}

export class DataIntegrityError extends NotentionError {
  constructor(message: string, public readonly entity?: string, public readonly entityId?: string, context?: Record<string, unknown>) {
    super(message, context);
    this.name = 'DataIntegrityError';
  }
}
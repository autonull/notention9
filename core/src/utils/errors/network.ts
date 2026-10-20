import { NotentionError } from './base.js';

export class NetworkTransmissionError extends NotentionError {
  constructor(message: string, public readonly endpoint?: string, cause?: Error, context?: Record<string, unknown>) {
    super(message, context, cause);
    this.name = 'NetworkTransmissionError';
  }
}

export class RateLimitError extends NotentionError {
  constructor(message: string, public readonly limit?: number, public readonly windowMs?: number, context?: Record<string, unknown>) {
    super(message, context);
    this.name = 'RateLimitError';
  }
}

export class TimeoutError extends NotentionError {
  constructor(message: string, public readonly timeoutMs?: number, context?: Record<string, unknown>) {
    super(message, context);
    this.name = 'TimeoutError';
  }
}
import { NotentionError } from './base.js';

export class OntologyError extends NotentionError {
  constructor(message: string, public readonly ontologyNode?: string, context?: Record<string, unknown>) {
    super(message, context);
    this.name = 'OntologyError';
  }
}
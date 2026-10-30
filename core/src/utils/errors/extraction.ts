import { NotentionError } from './base.js';

export class ExtractionError extends NotentionError {
    constructor(
        message: string,
        public readonly stage?: string,
        public readonly input?: string,
        context?: Record<string, unknown>
    ) {
        super(message, context);
        this.name = 'ExtractionError';
    }
}

export class PipelineError extends ExtractionError {
    constructor(message: string, public readonly failedStage: string, context?: Record<string, unknown>) {
        super(message, failedStage, undefined, context);
        this.name = 'PipelineError';
    }
}

export class OntologyAlignmentError extends ExtractionError {
    constructor(message: string, public readonly nodeId?: string, context?: Record<string, unknown>) {
        super(message, undefined, undefined, context);
        this.name = 'OntologyAlignmentError';
    }
}
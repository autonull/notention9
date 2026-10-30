import { NotentionError } from './base.js';

export class StrategyError extends NotentionError {
    constructor(
        message: string,
        public readonly strategyId?: string,
        public readonly seamId?: string,
        context?: Record<string, unknown>
    ) {
        super(message, context);
        this.name = 'StrategyError';
    }
}

export class StrategyNotFoundError extends StrategyError {
    constructor(seamId: string, strategyId: string) {
        super(`Strategy '${strategyId}' not found for seam '${seamId}'`, strategyId, seamId);
        this.name = 'StrategyNotFoundError';
    }
}

export class StrategyExecutionError extends StrategyError {
    constructor(
        message: string,
        strategyId: string,
        public readonly originalError: Error,
        seamId?: string
    ) {
        super(message, strategyId, seamId, { cause: originalError });
        this.name = 'StrategyExecutionError';
    }
}
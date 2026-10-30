import { NotentionError } from './base.js';

export class ProviderError extends NotentionError {
    constructor(
        message: string,
        public readonly providerId: string,
        public readonly operation: string,
        context?: Record<string, unknown>
    ) {
        super(message, context);
        this.name = 'ProviderError';
    }
}

export class ProviderNotConfiguredError extends ProviderError {
    constructor(providerId: string, missingConfig: string[]) {
        super(
            `Provider '${providerId}' not configured: missing ${missingConfig.join(', ')}`,
            providerId,
            'configure'
        );
        this.name = 'ProviderNotConfiguredError';
    }
}

export class ProviderQuotaExceededError extends ProviderError {
    constructor(providerId: string, quota: string, retryAfter?: number) {
        super(
            `Provider '${providerId}' quota exceeded: ${quota}`,
            providerId,
            'execute',
            { retryAfter }
        );
        this.name = 'ProviderQuotaExceededError';
    }
}

export class ProviderTimeoutError extends ProviderError {
    constructor(providerId: string, timeoutMs: number) {
        super(
            `Provider '${providerId}' timed out after ${timeoutMs}ms`,
            providerId,
            'execute',
            { timeoutMs }
        );
        this.name = 'ProviderTimeoutError';
    }
}

export class ProviderModelError extends ProviderError {
    constructor(providerId: string, model: string, message: string) {
        super(
            `Provider '${providerId}' model '${model}' error: ${message}`,
            providerId,
            'execute',
            { model }
        );
        this.name = 'ProviderModelError';
    }
}
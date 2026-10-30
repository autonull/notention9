import { NotentionError } from './base.js';

export class NetworkError extends NotentionError {
    constructor(
        message: string,
        public readonly url?: string,
        public readonly statusCode?: number,
        context?: Record<string, unknown>
    ) {
        super(message, context);
        this.name = 'NetworkError';
    }
}

export class NetworkTimeoutError extends NetworkError {
    constructor(url: string, timeoutMs: number) {
        super(`Request to '${url}' timed out after ${timeoutMs}ms`, url, 408, { timeoutMs });
        this.name = 'NetworkTimeoutError';
    }
}

export class NetworkOfflineError extends NetworkError {
    constructor(message: string = 'Network is offline') {
        super(message, undefined, 0);
        this.name = 'NetworkOfflineError';
    }
}
import { logWarn } from '../../utils/logging.js';

export interface RetryConfig {
  maxRetries: number;
  baseDelay: number;
  maxDelay: number;
  backoffMultiplier: number;
}

export interface RetryContext {
  attempt: number;
  maxRetries: number;
  lastError: Error;
}

export class RetryStrategy {
  private readonly config: RetryConfig;

  constructor(config: Partial<RetryConfig> = {}) {
    this.config = {
      maxRetries: config.maxRetries ?? 3,
      baseDelay: config.baseDelay ?? 1000,
      maxDelay: config.maxDelay ?? 30000,
      backoffMultiplier: config.backoffMultiplier ?? 2,
    };
  }

  calculateDelay(attempt: number): number {
    const delay = this.config.baseDelay * Math.pow(this.config.backoffMultiplier, attempt);
    return Math.min(delay, this.config.maxDelay);
  }

  shouldRetry(context: RetryContext): boolean {
    return context.attempt < context.maxRetries;
  }

  async executeWithRetry<T>(
    operation: () => Promise<T>,
    onRetry?: (context: RetryContext) => void
  ): Promise<T> {
    let lastError: Error | undefined;
    let attempt = 0;

    while (true) {
      try {
        return await operation();
      } catch (error) {
        lastError = error as Error;
        attempt++;

        if (!this.shouldRetry({ attempt, maxRetries: this.config.maxRetries, lastError })) {
          throw lastError;
        }

        const delay = this.calculateDelay(attempt);
        onRetry?.({ attempt, maxRetries: this.config.maxRetries, lastError });
        logWarn(`Retry attempt ${attempt}/${this.config.maxRetries} in ${delay}ms`, lastError);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }
}

export const defaultRetryStrategy = new RetryStrategy();
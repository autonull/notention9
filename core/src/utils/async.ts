export interface RetryOptions {
  attempts?: number;
  delayMs?: number;
  onRetry?: (attempt: number, error: unknown) => void;
}

/**
 * Reject with a timeout error when the promise does not settle in time.
 */
export const withTimeout = <T>(promise: Promise<T>, ms: number, message: string): Promise<T> =>
  new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(message)), ms);
    promise.then(resolve, reject).finally(() => clearTimeout(timer));
  });

/**
 * Run an operation until it succeeds or the attempt budget is exhausted.
 */
export const retry = async <T>(
  operation: (attempt: number) => Promise<T>,
  { attempts = 3, delayMs = 2000, onRetry }: RetryOptions = {}
): Promise<T> => {
  let lastError: unknown;
  for (let attempt = 1; attempt <= attempts; attempt++) {
    try {
      return await operation(attempt);
    } catch (error) {
      lastError = error;
      if (attempt === attempts) break;
      onRetry?.(attempt, error);
      await new Promise(resolve => setTimeout(resolve, delayMs));
    }
  }
  throw lastError;
};

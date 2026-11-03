/**
 * Reject with a timeout error when the promise does not settle in time.
 */
export const withTimeout = <T>(promise: Promise<T>, ms: number, message: string): Promise<T> =>
  new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(message)), ms);
    promise.then(resolve, reject).finally(() => clearTimeout(timer));
  });

// Note: retry and RetryOptions are exported from common.ts directly

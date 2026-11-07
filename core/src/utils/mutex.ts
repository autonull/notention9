/**
 * Simple mutex implementation for synchronizing async operations
 */
export class Mutex {
  private locked = false;
  private waitQueue: Array<() => void> = [];

  /**
   * Execute a function with exclusive access
   */
  async dispatch<T>(fn: () => Promise<T>): Promise<T> {
    if (!this.locked) {
      this.locked = true;
      try {
        return await fn();
      } finally {
        this.locked = false;
        this.processQueue();
      }
    }

    return new Promise<T>((resolve, reject) => {
      this.waitQueue.push(() => {
        fn().then(resolve).catch(reject);
      });
    });
  }

  private processQueue() {
    if (this.waitQueue.length > 0 && !this.locked) {
      this.locked = true;
      const next = this.waitQueue.shift()!;
      next();
    }
  }

  /**
   * Check if mutex is currently locked
   */
  isLocked(): boolean {
    return this.locked;
  }
}
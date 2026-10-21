export const generateId = (prefix = ''): string => `${prefix}${crypto.randomUUID()}`;
export const safeDivide = (numerator: number, denominator: number): number => (denominator !== 0 ? numerator / denominator : 0);
export const clamp = (value: number, min: number, max: number): number => Math.min(Math.max(value, min), max);

export const deepClone = <T>(obj: T): T => (typeof structuredClone === 'function' ? structuredClone(obj) : JSON.parse(JSON.stringify(obj)));

export const average = (numbers: number[]): number => (numbers.length > 0 ? numbers.reduce((a, b) => a + b, 0) / numbers.length : 0);

export class Mutex {
    private mutex = Promise.resolve();

    async lock(): Promise<() => void> {
      let unlockNext: () => void = () => {};
      const willLock = new Promise<void>(resolve => { unlockNext = resolve; });
      const willUnlock = this.mutex.then(() => unlockNext);
      this.mutex = willLock;
      return willUnlock;
    }

    async dispatch<T>(fn: (() => T) | (() => PromiseLike<T>)): Promise<T> {
      const unlock = await this.lock();
      try { return await Promise.resolve(fn()); } finally { unlock(); }
    }
}

export class Mutex {
    private mutex = Promise.resolve();

    async lock(): Promise<() => void> {
      let unlockNext: () => void = () => {};

      const willLock = new Promise<void>(resolve => {
        unlockNext = resolve;
      });

      const willUnlock = this.mutex.then(() => unlockNext);
      this.mutex = willLock;

      return willUnlock;
    }

    async dispatch<T>(fn: (() => T) | (() => PromiseLike<T>)): Promise<T> {
      const unlock = await this.lock();
      try {
        return await Promise.resolve(fn());
      } finally {
        unlock();
      }
    }
  }

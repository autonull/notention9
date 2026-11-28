/**
 * Singleton Utility
 * 
 * Standardized singleton pattern used across core systems.
 * Eliminates duplicated getInstance/resetForTesting boilerplate.
 * 
 * @example
 * ```typescript
 * class MyService {
 *     private static instance: MyService | null = null;
 *     
 *     static getInstance(): MyService {
 *         return getSingleton(this, () => new MyService());
 *     }
 *     
 *     static resetForTesting(): void {
 *         resetSingleton(this);
 *     }
 * }
 * ```
 */

/** Singleton holder for a class */
interface SingletonHolder<T> {
    instance: T | null;
    factory: () => T;
}

/** Map of class constructors to their singleton holders */
const singletonMap = new WeakMap<Function, SingletonHolder<any>>();

/**
 * Get or create a singleton instance.
 * 
 * @param ctor - The class constructor (used as key)
 * @param factory - Factory function to create the instance
 * @returns The singleton instance
 */
export function getSingleton<T>(ctor: new (...args: any[]) => T, factory: () => T): T {
    let holder = singletonMap.get(ctor);
    if (!holder) {
        holder = { instance: null, factory };
        singletonMap.set(ctor, holder);
    }
    if (!holder.instance) {
        holder.instance = factory();
    }
    return holder.instance;
}

/**
 * Reset a singleton instance (for testing).
 * 
 * @param ctor - The class constructor (used as key)
 */
export function resetSingleton<T>(ctor: new (...args: any[]) => T): void {
    const holder = singletonMap.get(ctor);
    if (holder) {
        holder.instance = null;
    }
}

/**
 * Create a singleton getter/resetter pair for a class.
 * 
 * @example
 * ```typescript
 * const { getInstance, resetForTesting } = createSingleton(() => new MyService());
 * ```
 */
export function createSingleton<T>(factory: () => T): { getInstance: () => T; resetForTesting: () => void } {
    let instance: T | null = null;
    return {
        getInstance: () => { if (!instance) instance = factory(); return instance; },
        resetForTesting: () => { instance = null; },
    };
}

/**
 * Decorator for singleton classes.
 * Usage: @singleton class MyService {}
 */
export function singleton<T extends new (...args: any[]) => any>(ctor: T): T {
    const originalNew = ctor;
    const holder: SingletonHolder<InstanceType<T>> = { instance: null, factory: () => new originalNew() };
    
    const wrapped = function (...args: any[]) {
        if (!holder.instance) {
            holder.instance = holder.factory();
        }
        return holder.instance;
    } as any;
    
    wrapped.prototype = ctor.prototype;
    Object.setPrototypeOf(wrapped, ctor);
    
    return wrapped;
}

/**
 * Mixin to add singleton pattern to a class.
 * 
 * @example
 * ```typescript
 * class MyService {
 *     static getInstance = createSingletonAccessor(() => new MyService());
 *     static resetForTesting = createSingletonReset();
 * }
 * ```
 */
export function createSingletonAccessor<T>(factory: () => T): () => T {
    let instance: T | null = null;
    return () => { if (!instance) instance = factory(); return instance; };
}

export function createSingletonReset(): () => void {
    let instance: any = null;
    return () => { instance = null; };
}
/**
 * Generic cache utilities for memoization and caching patterns.
 * Replaces ad-hoc Map-based caches throughout the codebase.
 */

/**
 * Simple key-value cache with optional TTL.
 */
export class Cache<K, V> {
  private readonly map = new Map<K, { value: V; expiresAt: number }>();
  private readonly defaultTtl: number;

  constructor(defaultTtl = 0) {
    this.defaultTtl = defaultTtl;
  }

  get(key: K): V | undefined {
    const entry = this.map.get(key);
    if (!entry) return undefined;
    if (entry.expiresAt && Date.now() > entry.expiresAt) {
      this.map.delete(key);
      return undefined;
    }
    return entry.value;
  }

  set(key: K, value: V, ttl?: number): void {
    const expiresAt = (ttl ?? this.defaultTtl) > 0 ? Date.now() + (ttl ?? this.defaultTtl) : 0;
    this.map.set(key, { value, expiresAt });
  }

  has(key: K): boolean {
    return this.get(key) !== undefined;
  }

  delete(key: K): boolean {
    return this.map.delete(key);
  }

  clear(): void {
    this.map.clear();
  }

  get size(): number {
    return this.map.size;
  }
}

/**
 * Memoize a function with a custom key generator.
 * Returns a cached version of the function.
 */
export function memoize<TArgs extends unknown[], TReturn>(
  fn: (...args: TArgs) => TReturn,
  getKey: (...args: TArgs) => string,
  ttl = 0
): (...args: TArgs) => TReturn {
  const cache = new Cache<string, TReturn>(ttl);
  return (...args: TArgs): TReturn => {
    const key = getKey(...args);
    const cached = cache.get(key);
    if (cached !== undefined) return cached;
    const result = fn(...args);
    cache.set(key, result);
    return result;
  };
}

/**
 * Memoize a function with a single argument.
 */
export function memoize1<T, R>(fn: (arg: T) => R, ttl = 0): (arg: T) => R {
  const cache = new Cache<T, R>(ttl);
  return (arg: T): R => {
    const cached = cache.get(arg);
    if (cached !== undefined) return cached;
    const result = fn(arg);
    cache.set(arg, result);
    return result;
  };
}

/**
 * Memoize a function with two arguments.
 */
export function memoize2<T1, T2, R>(fn: (arg1: T1, arg2: T2) => R, ttl = 0): (arg1: T1, arg2: T2) => R {
  const cache = new Cache<string, R>(ttl);
  return (arg1: T1, arg2: T2): R => {
    const key = `${arg1}:${arg2}`;
    const cached = cache.get(key);
    if (cached !== undefined) return cached;
    const result = fn(arg1, arg2);
    cache.set(key, result);
    return result;
  };
}
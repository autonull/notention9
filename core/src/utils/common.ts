/**
 * Common utilities for Notention system
 */

// Generic ID generator
export function generateId(prefix: string = ''): string {
  return `${prefix}${crypto.randomUUID()}`;
}

// Safe division helper
export function safeDivide(numerator: number, denominator: number): number {
  return denominator !== 0 ? numerator / denominator : 0;
}

// Clamp value between min and max
export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

// Check if value is within range
export function inRange(value: number, min: number, max: number): boolean {
  return value >= min && value <= max;
}

// Deep clone utility (shallow for now, can be extended)
export function deepClone<T>(obj: T): T {
  return JSON.parse(JSON.stringify(obj));
}

// Debounce utility
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout;
  return function executedFunction(...args: Parameters<T>): void {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

// Throttle utility
export function throttle<T extends (...args: any[]) => any>(
  func: T,
  limit: number
): (...args: Parameters<T>) => void {
  let inThrottle: boolean;
  return function executedFunction(...args: Parameters<T>): void {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout(() => inThrottle = false, limit);
    }
  };
}

// Memoization utility
export function memoize<T extends (...args: any[]) => any>(func: T): T {
  const cache = new Map<string, ReturnType<T>>();
  return function (this: any, ...args: Parameters<T>): ReturnType<T> {
    const key = JSON.stringify(args);
    if (cache.has(key)) {
      return cache.get(key)!;
    }
    const result = func.apply(this, args);
    cache.set(key, result);
    return result;
  } as T;
}

// Timing utility
export async function timeExecution<T>(fn: () => Promise<T> | T): Promise<[T, number]> {
  const start = performance.now();
  const result = await fn();
  const end = performance.now();
  return [result, end - start];
}

// Retry utility
export async function retryAsync<T>(
  fn: () => Promise<T>,
  retries: number = 3,
  delay: number = 1000
): Promise<T> {
  for (let i = 0; i < retries; i++) {
    try {
      return await fn();
    } catch (error) {
      if (i === retries - 1) throw error;
      await new Promise(resolve => setTimeout(resolve, delay * Math.pow(2, i))); // exponential backoff
    }
  }
  throw new Error('Retry function should not reach here');
}

// Unique by key utility
export function uniqueByKey<T>(arr: T[], keyFn: (item: T) => any): T[] {
  const seen = new Set();
  return arr.filter(item => {
    const key = keyFn(item);
    if (seen.has(key)) {
      return false;
    }
    seen.add(key);
    return true;
  });
}

// Group by utility
export function groupBy<T, K extends keyof any>(list: T[], getKey: (item: T) => K) {
  return list.reduce((previous, currentItem) => {
    const group = getKey(currentItem);
    if (!previous[group]) {
      previous[group] = [];
    }
    previous[group].push(currentItem);
    return previous;
  }, {} as Record<K, T[]>);
}

// Pluck utility
export function pluck<T, K extends keyof T>(list: T[], key: K): T[K][] {
  return list.map(item => item[key]);
}

// Sum utility
export function sum(numbers: number[]): number {
  return numbers.reduce((acc, curr) => acc + curr, 0);
}

// Average utility
export function average(numbers: number[]): number {
  return numbers.length > 0 ? sum(numbers) / numbers.length : 0;
}

// Max utility
export function max(numbers: number[]): number {
  return numbers.length > 0 ? Math.max(...numbers) : 0;
}

// Min utility
export function min(numbers: number[]): number {
  return numbers.length > 0 ? Math.min(...numbers) : 0;
}

// Round utility
export function round(value: number, decimals: number = 2): number {
  const factor = Math.pow(10, decimals);
  return Math.round(value * factor) / factor;
}

// Format percentage utility
export function formatPercentage(value: number, decimals: number = 1): string {
  return `${round(value * 100, decimals)}%`;
}

// Check if object is empty
export function isEmpty(obj: Record<string, any>): boolean {
  return Object.keys(obj).length === 0;
}

// Check if array is empty
export function isArrayEmpty(arr: any[]): boolean {
  return arr.length === 0;
}

// Safe property access
export function safeGet<T, K extends keyof T>(obj: T | null | undefined, key: K): T[K] | undefined {
  return obj?.[key];
}

// Safe array access
export function safeArrayGet<T>(arr: T[] | null | undefined, index: number): T | undefined {
  return arr?.[index];
}

// Check if value is defined
export function isDefined<T>(value: T | null | undefined): value is T {
  return value !== null && value !== undefined;
}

// Check if value is not empty
export function isNotEmpty(value: string | any[] | null | undefined): boolean {
  if (typeof value === 'string') return value.trim().length > 0;
  if (Array.isArray(value)) return value.length > 0;
  return false;
}

// Flatten array utility
export function flatten<T>(arrays: T[][]): T[] {
  return ([] as T[]).concat(...arrays);
}

// Chunk array utility
export function chunk<T>(array: T[], size: number): T[][] {
  const chunks = [];
  for (let i = 0; i < array.length; i += size) {
    chunks.push(array.slice(i, i + size));
  }
  return chunks;
}

// Partition array utility
export function partition<T>(array: T[], predicate: (value: T) => boolean): [T[], T[]] {
  return array.reduce(
    (acc, item) => {
      acc[predicate(item) ? 0 : 1].push(item);
      return acc;
    },
    [[] as T[], [] as T[]]
  );
}

// Sleep utility
export function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}
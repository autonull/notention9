export const generateId = (prefix = ''): string => `${prefix}${crypto.randomUUID()}`;
export const safeDivide = (numerator: number, denominator: number): number => (denominator !== 0 ? numerator / denominator : 0);
export const clamp = (value: number, min: number, max: number): number => Math.min(Math.max(value, min), max);
export const inRange = (value: number, min: number, max: number): boolean => value >= min && value <= max;

export const deepClone = <T>(obj: T): T => (typeof structuredClone === 'function' ? structuredClone(obj) : JSON.parse(JSON.stringify(obj)));

export const debounce = <T extends (...args: unknown[]) => unknown>(func: T, wait: number): ((...args: Parameters<T>) => void) => {
  let timeout: NodeJS.Timeout | undefined;
  return (...args: Parameters<T>) => {
    const later = () => { timeout = undefined; func(...args); };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
};

export const throttle = <T extends (...args: unknown[]) => unknown>(func: T, limit: number): ((...args: Parameters<T>) => void) => {
  let inThrottle: boolean;
  return (...args: Parameters<T>) => {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout(() => { inThrottle = false; }, limit);
    }
  };
};

export const sleep = (ms: number): Promise<void> => new Promise(resolve => setTimeout(resolve, ms));

export const memoize = <T extends (...args: any[]) => any>(func: T): T => {
  const cache = new Map<string, ReturnType<T>>();
  return (function(this: any, ...args: Parameters<T>): ReturnType<T> {
    const key = JSON.stringify(args);
    if (cache.has(key)) return cache.get(key)!;
    const result = func.apply(this, args);
    cache.set(key, result);
    return result;
  }) as unknown as T;
};

export const timeExecution = async <T>(fn: () => T | Promise<T>): Promise<[T, number]> => {
  const start = performance.now();
  const result = await fn();
  return [result, performance.now() - start];
};

export const retryAsync = async <T>(fn: () => Promise<T>, retries = 3, delay = 1000): Promise<T> => {
  for (let i = 0; i < retries; i++) {
    try {
      return await fn();
    } catch (error) {
      if (i === retries - 1) throw error;
      await sleep(delay * 2 ** i);
    }
  }
  throw new Error('Retry failed');
};

export const uniqueByKey = <T>(arr: T[], keyFn: (item: T) => unknown): T[] => {
  const seen = new Set<unknown>();
  return arr.filter(item => {
    const key = keyFn(item);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
};

export const groupBy = <T, K extends string | number | symbol>(list: T[], getKey: (item: T) => K): Record<K, T[]> =>
  list.reduce((prev, curr) => {
    const group = getKey(curr);
    (prev[group] ??= []).push(curr);
    return prev;
  }, {} as Record<K, T[]>);

export const pluck = <T, K extends keyof T>(list: T[], key: K): T[K][] => list.map(item => item[key]);
export const sum = (numbers: number[]): number => numbers.reduce((acc, curr) => acc + curr, 0);
export const average = (numbers: number[]): number => (numbers.length > 0 ? sum(numbers) / numbers.length : 0);
export const max = (numbers: number[]): number => (numbers.length > 0 ? Math.max(...numbers) : 0);
export const min = (numbers: number[]): number => (numbers.length > 0 ? Math.min(...numbers) : 0);

export const round = (value: number, decimals = 2): number => {
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
};

export const formatPercentage = (value: number, decimals = 1): string => `${round(value * 100, decimals)}%`;
export const isEmpty = (obj: Record<string, unknown>): boolean => Object.keys(obj).length === 0;
export const isArrayEmpty = (arr: unknown[]): boolean => arr.length === 0;

export const isDefined = <T>(value: T | null | undefined): value is T => value !== null && value !== undefined;

export const isNotEmpty = (value: string | unknown[] | null | undefined): boolean => {
  if (typeof value === 'string') return value.trim().length > 0;
  if (Array.isArray(value)) return value.length > 0;
  return false;
};

export const flatten = <T>(arrays: T[][]): T[] => arrays.flat();

export const chunk = <T>(array: T[], size: number): T[][] =>
  Array.from({ length: Math.ceil(array.length / size) }, (_, i) => array.slice(i * size, i * size + size));

export const partition = <T>(array: T[], predicate: (value: T) => boolean): [T[], T[]] =>
  array.reduce<[T[], T[]]>((acc, item) => { acc[predicate(item) ? 0 : 1].push(item); return acc; }, [[], []]);


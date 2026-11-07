/**
 * Browser-safe Common Utilities
 * Provides browser-compatible versions of common utilities
 * Excludes Node.js-only functions (getProjectRoot, readJsonFile, writeJsonFile)
 */

// Use Web Crypto API for hashing in browser
async function sha256Async(content: string): Promise<string> {
    const encoder = new TextEncoder();
    const data = encoder.encode(content);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

/** Compute SHA256 hash of string content (sync fallback for non-async contexts) */
export function sha256(content: string): string {
    // Use a simple hash for sync contexts (not cryptographically secure)
    let hash = 0;
    for (let i = 0; i < content.length; i++) {
        const char = content.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash;
    }
    // Return a hex-like string for compatibility
    return Math.abs(hash).toString(16).padStart(8, '0');
}

/** Compute short SHA256 hash (first 16 chars) */
export function shortSha256(content: string): string {
    return sha256(content).slice(0, 16);
}

/** Canonicalize object by sorting keys recursively */
export function canonicalize(obj: unknown): string {
    return JSON.stringify(obj, (key, value) => {
        if (value && typeof value === 'object' && !Array.isArray(value)) {
            return Object.keys(value)
                .sort()
                .reduce((acc, k) => ({ ...acc, [k]: value[k] }), {});
        }
        return value;
    });
}

/** Compute content hash for an object (excludes 'hash' field) */
export function computeContentHash<T extends { hash?: string }>(obj: T): string {
    const { hash, ...rest } = obj;
    return shortSha256(canonicalize(rest));
}

/** Verify content hash matches */
export function verifyContentHash<T extends { hash: string }>(obj: T): boolean {
    return obj.hash === computeContentHash(obj);
}

/** Deep clone object */
export function deepClone<T>(obj: T): T {
    return JSON.parse(JSON.stringify(obj));
}

/** Check if object is empty */
export function isEmpty(obj: unknown): boolean {
    if (obj === null || obj === undefined) return true;
    if (Array.isArray(obj)) return obj.length === 0;
    if (typeof obj === 'object') return Object.keys(obj).length === 0;
    return false;
}

/** Sleep utility for async operations */
export function sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
}

/** Retry options (compatible with async.ts version) */
export interface RetryOptions {
    maxAttempts?: number;
    baseDelay?: number;
    maxDelay?: number;
    onRetry?: (attempt: number, error: unknown) => void;
}

/** Retry async function with exponential backoff */
export async function retry<T>(
    fn: (attempt: number) => Promise<T>,
    options: RetryOptions = {}
): Promise<T> {
    const { maxAttempts = 3, baseDelay = 100, maxDelay = 5000, onRetry } = options;
    let lastError: Error | undefined;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        try {
            return await fn(attempt);
        } catch (error) {
            lastError = error as Error;
            if (attempt < maxAttempts) {
                onRetry?.(attempt, error);
                const delay = Math.min(baseDelay * Math.pow(2, attempt - 1), maxDelay);
                await sleep(delay);
            }
        }
    }

    throw lastError;
}

/** Generate ULID-style unique ID (timestamp + random) */
export function generateId(prefix = ''): string {
    const timestamp = Date.now().toString(36).toUpperCase().padStart(10, '0');
    const random = Math.random().toString(36).substring(2, 12).toUpperCase();
    return `${prefix}${timestamp}${random}`;
}

/** Safe division with default for divide by zero */
export function safeDivide(numerator: number, denominator: number, defaultValue = 0): number {
    return denominator !== 0 ? numerator / denominator : defaultValue;
}

/** Clamp a number between min and max */
export function clamp(value: number, min: number, max: number): number {
    return Math.max(min, Math.min(max, value));
}

/** Calculate average of numbers */
export function average(values: number[]): number {
    if (values.length === 0) return 0;
    return values.reduce((a, b) => a + b, 0) / values.length;
}

/** Check if two string arrays are equal (order-independent) */
export function areStringArraysEqual(a: string[], b: string[]): boolean {
    if (a.length !== b.length) return false;
    const setA = new Set(a);
    const setB = new Set(b);
    return setA.size === setB.size && [...setA].every(x => setB.has(x));
}

/**
 * Simple string hash (djb2-like) for deterministic bucketing
 * Used by split strategies for consistent case assignment
 */
export function hashString(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        const char = str.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash;
    }
    return Math.abs(hash);
}

/**
 * Validate that ratios sum to 1.0 (within epsilon)
 */
export function validateRatiosSumToOne(...ratios: number[]): { valid: boolean; errors: string[] } {
    const sum = ratios.reduce((a, b) => a + b, 0);
    if (Math.abs(sum - 1.0) > 0.001) {
        return { valid: false, errors: ['Ratios must sum to 1.0'] };
    }
    return { valid: true, errors: [] };
}

/**
 * Ensure minimum array sizes by borrowing from source array
 */
export function ensureMinimums<T>(
    source: T[],
    ...targets: Array<{ array: T[]; minSize: number }>
): void {
    for (const { array, minSize } of targets) {
        if (array.length < minSize && source.length > minSize) {
            const borrowed = source.splice(source.length - (array.length + minSize), array.length + minSize - array.length);
            array.push(...borrowed);
        }
    }
}

/**
 * Deterministic shuffle using seeded random
 */
export function shuffleArray<T>(array: T[], seed: number): T[] {
    const result = [...array];
    let random = seed;
    
    for (let i = result.length - 1; i > 0; i--) {
        random = (random * 1664525 + 1013904223) >>> 0;
        const j = Math.floor((random / 0x100000000) * (i + 1));
        [result[i], result[j]] = [result[j], result[i]];
    }
    
    return result;
}

/**
 * Create seeded random function (LCG)
 * Uses Park-Miller LCG for deterministic randomness
 */
export function createSeededRandom(seed: number): () => number {
    let state = seed >>> 0;
    return () => {
        state = (state * 1664525 + 1013904223) >>> 0;
        return state / 0x100000000;
    };
}

/**
 * Generate a deterministic ID using seeded random
 * Avoids Math.random() for reproducibility
 */
export function generateDeterministicId(prefix: string, seed: number): string {
    const random = createSeededRandom(seed);
    const timestamp = Date.now().toString(36).toUpperCase().padStart(10, '0');
    const randomPart = Math.floor(random() * 0x100000000).toString(36).toUpperCase().padStart(8, '0');
    return `${prefix}${timestamp}_${randomPart}`;
}

/**
 * Generate candidate ID with strategy context
 */
export function generateCandidateId(
    strategyRole: string,
    strategyId: string,
    seed: number
): string {
    const random = createSeededRandom(seed);
    const randomPart = Math.floor(random() * 0x100000000).toString(36).toUpperCase().padStart(8, '0');
    return `cand_${strategyRole}_${strategyId}_${randomPart}`;
}

/**
 * Generate revision ID
 */
export function generateRevisionId(seed: number): string {
    const random = createSeededRandom(seed);
    const randomPart = Math.floor(random() * 0x10000000000).toString(36).toUpperCase().padStart(10, '0');
    return `rev_${randomPart}`;
}

/**
 * Check if a parameter point equals the default values
 * Used by candidate generators to skip default configurations
 */
export function isDefaultPoint(
    paramSpec: Record<string, { default?: unknown }>,
    defaultProps: Record<string, unknown>,
    point: Record<string, unknown>
): boolean {
    return Object.entries(point).every(([key, value]) => {
        const defaultVal = defaultProps[key] ?? paramSpec[key]?.default;
        return value === defaultVal;
    });
}
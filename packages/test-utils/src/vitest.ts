import { vi, afterEach, afterAll, expect } from 'vitest';
import { setupTestEnvironment, cleanupTestEnvironment, initMemoryGuard } from './testSetup.js';

/**
 * Vitest utilities for Notention testing
 * 
 * Provides:
 * - Auto-setup for test environment
 * - Custom matchers
 * - Async helpers
 */

// Auto-setup for all tests
export function setupNotentionTestEnv(): void {
    setupTestEnvironment();
    initMemoryGuard();

    afterEach(() => {
        cleanupTestEnvironment();
    });

    afterAll(() => {
        vi.clearAllMocks();
    });
}

/**
 * Custom matchers for Notention types
 */
export const notentionMatchers = {
    toBeValidNote(received: unknown) {
        const pass = typeof received === 'object' &&
            received !== null &&
            'id' in received &&
            'title' in received &&
            'properties' in received;
        return {
            pass,
            message: () => pass
                ? 'Expected not to be a valid Note'
                : 'Expected to be a valid Note with id, title, and properties',
        };
    },

    toHaveNoteProperty(received: Array<{ key: string; operator: string; values: string[] }>, key: string, operator?: string, values?: string[]) {
        const prop = received.find(p => p.key === key);
        if (!prop) {
            return {
                pass: false,
                message: () => `Expected to have property "${key}", but it was not found`,
            };
        }
        if (operator !== undefined && prop.operator !== operator) {
            return {
                pass: false,
                message: () => `Expected property "${key}" to have operator "${operator}", got "${prop.operator}"`,
            };
        }
        if (values !== undefined) {
            const valuesMatch = JSON.stringify(prop.values) === JSON.stringify(values);
            if (!valuesMatch) {
                return {
                    pass: false,
                    message: () => `Expected property "${key}" to have values ${JSON.stringify(values)}, got ${JSON.stringify(prop.values)}`,
                };
            }
        }
        return { pass: true, message: () => '' };
    },

    toMatchJourneyStep(received: unknown, expectedKind: string) {
        const pass = typeof received === 'object' && received !== null && 'kind' in received && (received as { kind: string }).kind === expectedKind;
        return {
            pass,
            message: () => pass
                ? `Expected not to be a ${expectedKind} step`
                : `Expected a ${expectedKind} step, got ${typeof received === 'object' && received !== null && 'kind' in received ? (received as { kind: string }).kind : typeof received}`,
        };
    },
};

/**
 * Extend expect with custom matchers
 */
export function extendExpect(): void {
    expect.extend(notentionMatchers);
}

/**
 * Async test helper with timeout
 */
export { withTimeout } from './coreMocks.js';

/**
 * Wait for condition with polling
 */
export async function waitFor(
    condition: () => Promise<boolean>,
    timeoutMs: number = 5000,
    intervalMs: number = 100
): Promise<void> {
    const startTime = Date.now();
    while (Date.now() - startTime < timeoutMs) {
        if (await condition()) return;
        await new Promise(r => setTimeout(r, intervalMs));
    }
    throw new Error(`waitFor timeout after ${timeoutMs}ms`);
}

/**
 * Create a deferred promise
 */
export function createDeferred<T>(): { promise: Promise<T>; resolve: (value: T) => void; reject: (reason?: Error) => void } {
    let resolve: (value: T) => void;
    let reject: (reason?: Error) => void;
    const promise = new Promise<T>((res, rej) => {
        resolve = res;
        reject = rej;
    });
    return { promise, resolve: resolve!, reject: reject! };
}

/**
 * Retry a function until it succeeds or times out
 */
export async function retry<T>(
    fn: () => Promise<T>,
    options: { retries?: number; delayMs?: number; backoff?: number } = {}
): Promise<T> {
    const { retries = 3, delayMs = 100, backoff = 2 } = options;
    let lastError: Error;

    for (let i = 0; i <= retries; i++) {
        try {
            return await fn();
        } catch (e) {
            lastError = e instanceof Error ? e : new Error(String(e));
            if (i < retries) {
                await new Promise(r => setTimeout(r, delayMs * Math.pow(backoff, i)));
            }
        }
    }
    throw lastError!;
}

// Type declarations for custom matchers
// These need to be in a .d.ts file for proper declaration merging
// See vitest.d.ts for the actual declarations
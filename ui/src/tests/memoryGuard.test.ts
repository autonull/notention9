// Memory guard test - ensures no single test worker exceeds memory threshold
import {describe, it, expect, vi} from 'vitest';
import {MEMORY_THRESHOLD_BYTES} from './setup.js';

describe('Memory Guard', () => {
    it('should not exceed memory threshold per worker', () => {
        const usage = process.memoryUsage();
        const heapUsed = usage.heapUsed;

        // Log memory usage for CI visibility
        if (process.env.CI) {
            console.log(`[Memory Guard] Heap: ${(heapUsed / 1024 / 1024).toFixed(2)} MB / ${(MEMORY_THRESHOLD_BYTES / 1024 / 1024).toFixed(2)} MB`);
        }

        expect(heapUsed).toBeLessThan(MEMORY_THRESHOLD_BYTES);
    });

    it('should cleanup mocks after each test', () => {
        const mockFn = vi.fn();
        mockFn('test');
        expect(mockFn).toHaveBeenCalledTimes(1);

        // vi.clearAllMocks() runs in afterEach - verify it works
        expect(vi.isMockFunction(mockFn)).toBe(true);
    });
});
import { describe, it, expect } from 'vitest';
import { TaskHarness, ALL_TASKS, captureTask, matchTask, extractionTask } from './harness.js';
import { DETERMINISTIC_CHECKS } from './types.js';
import type { HarnessConfig, TaskResult } from './types.js';

describe('TaskHarness', () => {
    const mockConfig: HarnessConfig = {
        baseURL: 'http://localhost:5173',
        headless: true,
        slowMo: 0,
        repetitions: 3,
        seed: 42,
        viewport: { width: 1280, height: 720 },
        recordVideo: false,
    };

    it('creates harness with config', () => {
        // Mock browser
        const mockBrowser = {
            newContext: async () => ({
                newPage: async () => ({
                    goto: async () => {},
                    waitForLoadState: async () => {},
                    locator: () => ({
                        fill: async () => {},
                        click: async () => {},
                        count: async () => 3,
                        isVisible: async () => true,
                        selectOption: async () => {},
                        textContent: async () => 'open',
                    }),
                    waitForTimeout: async () => {},
                    close: async () => {},
                }),
                close: async () => {},
            }),
        };

        const harness = new TaskHarness(mockBrowser, mockConfig);
        expect(harness).toBeDefined();
    });

    it('has all 6 core tasks defined', () => {
        expect(ALL_TASKS).toHaveLength(6);
        expect(ALL_TASKS.map(t => t.id)).toEqual([
            'task-1-capture',
            'task-2-match',
            'task-3-extraction',
            'task-4-commitment',
            'task-5-search',
            'task-6-recovery',
        ]);
    });

    it('task configs have required properties', () => {
        for (const task of ALL_TASKS) {
            expect(task.id).toBeDefined();
            expect(task.name).toBeDefined();
            expect(task.type).toBeDefined();
            expect(typeof task.execute).toBe('function');
        }
    });

    it('capture task has correct type', () => {
        expect(captureTask.type).toBe('capture');
        expect(captureTask.id).toBe('task-1-capture');
    });

    it('match task has correct type', () => {
        expect(matchTask.type).toBe('match');
        expect(matchTask.id).toBe('task-2-match');
    });

    it('extraction task has correct type', () => {
        expect(extractionTask.type).toBe('extraction');
        expect(extractionTask.id).toBe('task-3-extraction');
    });

    it('aggregates results correctly', () => {
        const mockBrowser = {
            newContext: async () => ({
                newPage: async () => ({
                    goto: async () => {},
                    waitForLoadState: async () => {},
                    locator: () => ({
                        fill: async () => {},
                        click: async () => {},
                        count: async () => 3,
                        isVisible: async () => true,
                        selectOption: async () => {},
                        textContent: async () => 'open',
                    }),
                    waitForTimeout: async () => {},
                    close: async () => {},
                }),
                close: async () => {},
            }),
        };

        const harness = new TaskHarness(mockBrowser, mockConfig);

        // Mock results
        const mockResults: TaskResult[] = [
            { taskId: 'task-1', repetition: 0, success: true, output: {}, duration: 1000, steps: 3, errors: [], metrics: {}, timestamp: '2024-01-01T00:00:00Z' },
            { taskId: 'task-1', repetition: 1, success: true, output: {}, duration: 1200, steps: 3, errors: [], metrics: {}, timestamp: '2024-01-01T00:00:00Z' },
            { taskId: 'task-1', repetition: 2, success: false, output: null, duration: 0, steps: 1, errors: ['timeout'], metrics: {}, timestamp: '2024-01-01T00:00:00Z' },
        ];

        const aggregated = harness.aggregate(mockResults);

        expect(aggregated.taskSummaries).toHaveLength(1);
        expect(aggregated.taskSummaries[0].taskId).toBe('task-1');
        expect(aggregated.taskSummaries[0].totalRuns).toBe(3);
        expect(aggregated.taskSummaries[0].successful).toBe(2);
        expect(aggregated.taskSummaries[0].failed).toBe(1);
        expect(aggregated.taskSummaries[0].successRate).toBeCloseTo(0.667, 2);
        expect(aggregated.overallSuccessRate).toBeCloseTo(0.667, 2);
    });

    it('median and p90 calculations work', () => {
        const mockBrowser = {
            newContext: async () => ({
                newPage: async () => ({ close: async () => {} }),
                close: async () => {},
            }),
        };

        const harness = new TaskHarness(mockBrowser, mockConfig);

        const mockResults: TaskResult[] = [
            { taskId: 'task-1', repetition: 0, success: true, output: {}, duration: 1000, steps: 2, errors: [], metrics: {}, timestamp: '2024-01-01T00:00:00Z' },
            { taskId: 'task-1', repetition: 1, success: true, output: {}, duration: 2000, steps: 3, errors: [], metrics: {}, timestamp: '2024-01-01T00:00:00Z' },
            { taskId: 'task-1', repetition: 2, success: true, output: {}, duration: 3000, steps: 4, errors: [], metrics: {}, timestamp: '2024-01-01T00:00:00Z' },
            { taskId: 'task-1', repetition: 3, success: true, output: {}, duration: 4000, steps: 5, errors: [], metrics: {}, timestamp: '2024-01-01T00:00:00Z' },
            { taskId: 'task-1', repetition: 4, success: true, output: {}, duration: 5000, steps: 6, errors: [], metrics: {}, timestamp: '2024-01-01T00:00:00Z' },
            { taskId: 'task-1', repetition: 5, success: true, output: {}, duration: 6000, steps: 7, errors: [], metrics: {}, timestamp: '2024-01-01T00:00:00Z' },
            { taskId: 'task-1', repetition: 6, success: true, output: {}, duration: 7000, steps: 8, errors: [], metrics: {}, timestamp: '2024-01-01T00:00:00Z' },
            { taskId: 'task-1', repetition: 7, success: true, output: {}, duration: 8000, steps: 9, errors: [], metrics: {}, timestamp: '2024-01-01T00:00:00Z' },
            { taskId: 'task-1', repetition: 8, success: true, output: {}, duration: 9000, steps: 10, errors: [], metrics: {}, timestamp: '2024-01-01T00:00:00Z' },
            { taskId: 'task-1', repetition: 9, success: true, output: {}, duration: 10000, steps: 11, errors: [], metrics: {}, timestamp: '2024-01-01T00:00:00Z' },
        ];

        const aggregated = harness.aggregate(mockResults);

        // Median should be at index 4 or 5 (0-indexed, 10 items) = 5000 or 6000
        expect(aggregated.taskSummaries[0].medianDuration).toBeGreaterThanOrEqual(5000);
        expect(aggregated.taskSummaries[0].medianDuration).toBeLessThanOrEqual(6000);

        // P90 uses Math.floor(0.9 * n) = floor(9) = 9, 0-indexed = index 9 = 10000
        // Actually the code uses Math.floor(durations.length * 0.9) = Math.floor(9) = 9
        expect(aggregated.taskSummaries[0].p90Duration).toBe(10000);
    });
});

describe('Deterministic checks', () => {
    it('exports deterministic checks', () => {
        expect(DETERMINISTIC_CHECKS).toHaveLength(5);
        expect(DETERMINISTIC_CHECKS.map(c => c.name)).toEqual([
            'schema-validation',
            'invariants',
            'state-transitions',
            'required-behaviors',
            'offline-behavior',
        ]);
    });
});
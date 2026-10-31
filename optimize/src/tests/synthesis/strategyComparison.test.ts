import { describe, it, expect, beforeEach } from 'vitest';
import { generateComparisonReport, runABTestSimulation } from '../../synthesis/strategyComparison.js';
import { computeStats } from '../../synthesis/stats.js';
import type { BaselineResult, CandidateEvaluation } from '../../synthesis/fastEvaluator.js';

describe('Strategy Comparison', () => {
    let baseline: BaselineResult[];

    beforeEach(() => {
        baseline = [
            {
                taskId: 'task-1-capture',
                successRate: 1,
                medianDuration: 100,
                p90Duration: 150,
                medianSteps: 2,
                p90Steps: 3,
                errors: [],
                isCorpusTest: false,
            },
            {
                taskId: 'task-2-match',
                successRate: 1,
                medianDuration: 50,
                p90Duration: 80,
                medianSteps: 1,
                p90Steps: 2,
                errors: [],
                isCorpusTest: false,
            },
            {
                taskId: 'task-3-extraction',
                successRate: 1,
                medianDuration: 30,
                p90Duration: 50,
                medianSteps: 1,
                p90Steps: 1,
                errors: [],
                isCorpusTest: false,
            },
        ];
    });

    it('should generate comparison report from candidates', () => {
        const candidates: CandidateEvaluation[] = [
            {
                candidateId: 'variant-control',
                taskResults: new Map([
                    ['task-1-capture', { ...baseline[0], successRate: 1, medianDuration: 100 }],
                    ['task-2-match', { ...baseline[1], successRate: 1, medianDuration: 50 }],
                    ['task-3-extraction', { ...baseline[2], successRate: 1, medianDuration: 30 }],
                ]),
                overallSuccessRate: 1,
                overallMedianDuration: 60,
                passed: true,
                resourceMetrics: {
                    totalLatencyMs: 0,
                    avgInferenceLatencyMs: 0,
                    peakMemoryMB: 0,
                    modelSizeMB: 0,
                    inferenceCount: 0,
                    tokensUsed: 0,
                },
            },
            {
                candidateId: 'variant-treatment',
                taskResults: new Map([
                    ['task-1-capture', { ...baseline[0], successRate: 1, medianDuration: 90 }],
                    ['task-2-match', { ...baseline[1], successRate: 1, medianDuration: 45 }],
                    ['task-3-extraction', { ...baseline[2], successRate: 1, medianDuration: 25 }],
                ]),
                overallSuccessRate: 1,
                overallMedianDuration: 53,
                passed: true,
                resourceMetrics: {
                    totalLatencyMs: 0,
                    avgInferenceLatencyMs: 0,
                    peakMemoryMB: 0,
                    modelSizeMB: 0,
                    inferenceCount: 0,
                    tokensUsed: 0,
                },
            },
        ];

        const assignments = [
            { experimentId: 'test-exp', userId: 'user-1', variantId: 'variant-control', assignedAt: new Date().toISOString(), exposureCount: 1, lastExposureAt: new Date().toISOString() },
            { experimentId: 'test-exp', userId: 'user-2', variantId: 'variant-treatment', assignedAt: new Date().toISOString(), exposureCount: 1, lastExposureAt: new Date().toISOString() },
        ];

        const report = generateComparisonReport({
            experimentId: 'test-exp',
            baseline,
            candidates,
            assignments,
        });

        expect(report.experimentId).toBe('test-exp');
        expect(report.variants.length).toBe(2);
        expect(report.variants[0].variantId).toBe('variant-control');
        expect(report.variants[1].variantId).toBe('variant-treatment');
        expect(report.statisticalTests.length).toBeGreaterThan(0);
        expect(report.recommendation).toBeDefined();
    });

    it('should run A/B test simulation', async () => {
        const report = await runABTestSimulation(
            'match-display-v1',
            ['variant-detailed', 'variant-compact'],
            baseline,
            50
        );

        expect(report.experimentId).toBe('match-display-v1');
        expect(report.variants.length).toBe(2);
        expect(report.variants.map(v => v.variantId).sort()).toEqual(['variant-compact', 'variant-detailed'].sort());
        expect(report.recommendation).toBeDefined();
    });

    it('should compute statistics correctly', () => {
        const values = [1, 2, 3, 4, 5];
        const stats = computeStats(values);
        
        expect(stats.mean).toBe(3);
        expect(stats.median).toBe(3);
        expect(stats.stdDev).toBeCloseTo(1.58, 1);
        expect(stats.confidenceInterval[0]).toBeLessThan(stats.mean);
        expect(stats.confidenceInterval[1]).toBeGreaterThan(stats.mean);
    });

    it('should handle empty values', () => {
        const stats = computeStats([]);
        expect(stats.mean).toBe(0);
        expect(stats.median).toBe(0);
        expect(stats.stdDev).toBe(0);
    });
});
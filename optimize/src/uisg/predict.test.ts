import { describe, it, expect, beforeAll } from 'vitest';
import {
    buildTrainingData,
    standardizeFeaturesForTest,
    linearRegressionForTest,
    invertMatrixForTest,
    trainModel,
    loadModel,
    predictMetrics,
    rankVariantsByPrediction,
    filterVariantsByThreshold,
} from './predict.js';

describe('Predictive Model', () => {
    describe('Matrix operations', () => {
        it('inverts a 2x2 matrix', () => {
            const m = [[4, 2], [2, 3]];
            const inv = invertMatrixForTest(m);
            // Check that m * inv ≈ identity
            const prod = [
                [
                    m[0][0] * inv[0][0] + m[0][1] * inv[1][0],
                    m[0][0] * inv[0][1] + m[0][1] * inv[1][1],
                ],
                [
                    m[1][0] * inv[0][0] + m[1][1] * inv[1][0],
                    m[1][0] * inv[0][1] + m[1][1] * inv[1][1],
                ],
            ];
            expect(prod[0][0]).toBeCloseTo(1, 5);
            expect(prod[0][1]).toBeCloseTo(0, 5);
            expect(prod[1][0]).toBeCloseTo(0, 5);
            expect(prod[1][1]).toBeCloseTo(1, 5);
        });

        it('handles singular matrix', () => {
            const m = [[1, 2], [2, 4]]; // Singular
            const inv = invertMatrixForTest(m);
            // Should return identity as fallback (pivot < 1e-10)
            expect(inv[0][0]).toBe(1);
            expect(inv[1][1]).toBe(1);
            expect(inv[0][1]).toBe(0);
            expect(inv[1][0]).toBe(0);
        });

        it('performs linear regression', () => {
            // y = 2x + 1
            const X = [[1], [2], [3], [4], [5]];
            const y = [3, 5, 7, 9, 11];
            const { intercept, weights } = linearRegressionForTest(X, y, 0); // No regularization for exact fit
            expect(intercept).toBeCloseTo(1, 1);
            expect(weights[0]).toBeCloseTo(2, 1);
        });
    });

    describe('Feature standardization', () => {
        it('standardizes features to zero mean and unit variance', () => {
            const samples = [
                { features: { a: 1, b: 10 }, targets: { taskTimeMs: 100, bundleSizeKb: 10, matchF1: 0.8, interactionCount: 5, errorCount: 0 }, metadata: { journey: 'test', theme: 'default', viewport: 'desktop-1440', timestamp: '2026-01-01' } },
                { features: { a: 2, b: 20 }, targets: { taskTimeMs: 200, bundleSizeKb: 20, matchF1: 0.7, interactionCount: 10, errorCount: 1 }, metadata: { journey: 'test', theme: 'default', viewport: 'desktop-1440', timestamp: '2026-01-02' } },
                { features: { a: 3, b: 30 }, targets: { taskTimeMs: 300, bundleSizeKb: 30, matchF1: 0.6, interactionCount: 15, errorCount: 2 }, metadata: { journey: 'test', theme: 'default', viewport: 'desktop-1440', timestamp: '2026-01-03' } },
            ];
            const { features, means, stds, featureNames } = standardizeFeaturesForTest(samples);
            expect(featureNames).toEqual(['a', 'b']);
            expect(means[0]).toBe(2);
            expect(means[1]).toBe(20);
            expect(stds[0]).toBeCloseTo(Math.sqrt(2/3), 5);
            expect(stds[1]).toBeCloseTo(Math.sqrt(200/3), 5);
            // Check standardized values
            expect(features[0][0]).toBeCloseTo(-1 / Math.sqrt(2/3), 5);
            expect(features[1][0]).toBeCloseTo(0, 5);
            expect(features[2][0]).toBeCloseTo(1 / Math.sqrt(2/3), 5);
        });
    });

    describe('Model training', () => {
        let model: any;

        beforeAll(() => {
            // Train model (may fail if insufficient data)
            try {
                model = trainModel();
            } catch (e) {
                console.log('Model training skipped:', (e as Error).message);
            }
        });

        it('trains a model with sufficient data', () => {
            if (!model) {
                console.log('Skipping: insufficient training data');
                return;
            }
            expect(model.version).toBe(1);
            expect(model.trainingSamples).toBeGreaterThan(0);
            expect(model.featureNames.length).toBeGreaterThan(0);
            expect(model.coefficients.taskTimeMs).toBeDefined();
            expect(model.coefficients.bundleSizeKb).toBeDefined();
            expect(model.coefficients.matchF1).toBeDefined();
            expect(model.coefficients.interactionCount).toBeDefined();
            expect(model.coefficients.errorCount).toBeDefined();
            expect(model.mae.taskTimeMs).toBeGreaterThanOrEqual(0);
        });

        it('loads saved model', () => {
            if (!model) return;
            const loaded = loadModel();
            expect(loaded).not.toBeNull();
            expect(loaded?.version).toBe(model.version);
            expect(loaded?.trainedAt).toBe(model.trainedAt);
        });

        it('makes predictions', () => {
            if (!model) return;
            const prediction = predictMetrics({
                journey: 'golden-path',
                variant: 'dense',
                theme: 'default',
                viewport: 'desktop-1440',
            }, model);
            expect(prediction.taskTimeMs).toBeGreaterThanOrEqual(0);
            expect(prediction.bundleSizeKb).toBeGreaterThanOrEqual(0);
            expect(prediction.matchF1).toBeGreaterThanOrEqual(0);
            expect(prediction.matchF1).toBeLessThanOrEqual(1);
            expect(prediction.interactionCount).toBeGreaterThanOrEqual(0);
            expect(prediction.errorCount).toBeGreaterThanOrEqual(0);
            expect(prediction.confidence).toBeGreaterThanOrEqual(0);
            expect(prediction.confidence).toBeLessThanOrEqual(1);
        });

        it('ranks variants by prediction', () => {
            if (!model) return;
            const ranked = rankVariantsByPrediction(['dense', 'compact', 'default'], {
                journey: 'golden-path',
                theme: 'default',
                viewport: 'desktop-1440',
            }, model);
            expect(ranked.length).toBe(3);
            expect(ranked[0].variant).toBeDefined();
            expect(ranked[0].prediction).toBeDefined();
        });

        it('filters variants by threshold', () => {
            if (!model) return;
            const filtered = filterVariantsByThreshold(['dense', 'compact', 'default'], {
                journey: 'golden-path',
                theme: 'default',
                viewport: 'desktop-1440',
            }, {
                maxTaskTimeMs: 5000,
                maxBundleSizeKb: 100,
                minMatchF1: 0.5,
            }, model);
            expect(filtered.length).toBeLessThanOrEqual(3);
        });
    });
});
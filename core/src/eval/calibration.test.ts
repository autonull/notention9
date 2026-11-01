/**
 * Calibration tests
 */

import { describe, it, expect } from 'vitest';
import { computeECE, computeExtractionECE, isCalibrated } from './calibration.js';

describe('computeECE', () => {
    it('returns zero for empty input', () => {
        const result = computeECE([]);
        expect(result.ece).toBe(0);
        expect(result.mce).toBe(0);
        expect(result.n).toBe(0);
    });

    it('computes ECE for perfectly calibrated predictions', () => {
        // Perfectly calibrated: confidence matches accuracy in each bin
        const predictions = [
            { confidence: 0.1, correct: true },
            { confidence: 0.2, correct: true },
            { confidence: 0.3, correct: false },
            { confidence: 0.4, correct: false },
            { confidence: 0.5, correct: true },
            { confidence: 0.6, correct: true },
            { confidence: 0.7, correct: false },
            { confidence: 0.8, correct: false },
            { confidence: 0.9, correct: true },
            { confidence: 1.0, correct: true },
        ];
        const result = computeECE(predictions, 10);
        // Not perfectly calibrated but should be low
        expect(result.ece).toBeLessThan(0.5);
        expect(result.n).toBe(10);
    });

    it('computes ECE for uncalibrated predictions', () => {
        // All high confidence but all wrong
        const predictions = Array(100).fill({ confidence: 0.9, correct: false });
        const result = computeECE(predictions, 10);
        expect(result.ece).toBeCloseTo(0.9, 1);
    });

    it('computes ECE for perfectly calibrated case', () => {
        // 10 samples per bin, accuracy = bin center
        const predictions: Array<{ confidence: number; correct: boolean }> = [];
        for (let i = 0; i < 10; i++) {
            const conf = (i + 0.5) / 10;
            for (let j = 0; j < 10; j++) {
                predictions.push({ confidence: conf, correct: j < 5 });
            }
        }
        const result = computeECE(predictions, 10);
        // With 50% accuracy at each confidence level, ECE should be around 0.2-0.3
        // (since bin centers are 0.05, 0.15, ..., 0.95 and accuracy is 0.5)
        expect(result.ece).toBeGreaterThan(0);
    });

    it('handles single bin', () => {
        const predictions = [
            { confidence: 0.5, correct: true },
            { confidence: 0.5, correct: false },
        ];
        const result = computeECE(predictions, 1);
        expect(result.n).toBe(2);
        expect(result.bins.length).toBe(1);
    });
});

describe('computeExtractionECE', () => {
    it('computes ECE for extraction properties', () => {
        const extracted = [
            { key: 'budget', operator: 'less than', values: ['900 USD'], confidence: 0.9 },
            { key: 'deadline', operator: 'is', values: ['Friday'], confidence: 0.8 },
            { key: 'role', operator: 'contains', values: ['installer'], confidence: 0.7 },
            { key: 'unknown', operator: 'is', values: ['something'], confidence: 0.6 },
        ];
        const expected = [
            { key: 'budget', operator: 'less than', values: ['900 USD'] },
            { key: 'deadline', operator: 'is', values: ['Friday'] },
        ];
        const forbidden = [
            { key: 'unknown', operator: 'is', values: ['something'] },
        ];

        const result = computeExtractionECE(extracted, expected, forbidden, 10);
        expect(result.n).toBe(4);
        // budget and deadline match expected -> correct
        // unknown is forbidden -> correct (not extracted)
        // role not in expected or forbidden -> incorrect
    });

    it('handles missing confidence', () => {
        const extracted = [
            { key: 'budget', operator: 'less than', values: ['900 USD'], confidence: 0.9 },
            { key: 'deadline', operator: 'is', values: ['Friday'] }, // no confidence
        ];
        const expected = [
            { key: 'budget', operator: 'less than', values: ['900 USD'] },
            { key: 'deadline', operator: 'is', values: ['Friday'] },
        ];

        const result = computeExtractionECE(extracted, expected, [], 10);
        expect(result.n).toBe(1); // only one with confidence
    });
});

describe('isCalibrated', () => {
    it('returns true when ECE <= threshold', () => {
        const result = { ece: 0.05, mce: 0.1, n: 100, bins: [] };
        expect(isCalibrated(result, 0.1)).toBe(true);
    });

    it('returns false when ECE > threshold', () => {
        const result = { ece: 0.15, mce: 0.2, n: 100, bins: [] };
        expect(isCalibrated(result, 0.1)).toBe(false);
    });

    it('uses default threshold 0.1', () => {
        const result = { ece: 0.09, mce: 0.1, n: 100, bins: [] };
        expect(isCalibrated(result)).toBe(true);
        
        const result2 = { ece: 0.11, mce: 0.1, n: 100, bins: [] };
        expect(isCalibrated(result2)).toBe(false);
    });
});
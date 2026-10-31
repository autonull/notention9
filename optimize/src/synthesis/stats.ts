/**
 * Statistical utilities for evaluation and comparison
 */

export interface StatsResult {
    mean: number;
    median: number;
    stdDev: number;
    confidenceInterval: [number, number];
}

/**
 * Compute basic statistics for an array of numbers
 */
export function computeStats(values: number[]): StatsResult {
    if (values.length === 0) {
        return { mean: 0, median: 0, stdDev: 0, confidenceInterval: [0, 0] };
    }

    const sorted = [...values].sort((a, b) => a - b);
    const mean = values.reduce((a, b) => a + b, 0) / values.length;
    const median = sorted[Math.floor(sorted.length / 2)];
    
    const variance = values.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / (values.length - 1 || 1);
    const stdDev = Math.sqrt(variance);
    
    // 95% CI using t-distribution approximation
    const se = stdDev / Math.sqrt(values.length);
    const t = values.length > 30 ? 1.96 : 2.0; // Approximation
    const margin = t * se;

    return {
        mean,
        median,
        stdDev,
        confidenceInterval: [mean - margin, mean + margin],
    };
}

/**
 * Standard normal cumulative distribution function approximation
 */
export function normalCDF(x: number): number {
    // Approximation of standard normal CDF
    const t = 1 / (1 + 0.2316419 * Math.abs(x));
    const d = 0.3989423 * Math.exp(-x * x / 2);
    const prob = d * t * (0.3193815 + t * (-0.3565638 + t * (1.781478 + t * (-1.821256 + t * 1.330274))));
    return x > 0 ? 1 - prob : prob;
}
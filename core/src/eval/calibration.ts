import {
    DEFAULT_ECE_THRESHOLD,
    DEFAULT_ECE_BINS,
} from '../telemetry/constants.js';

export interface CalibrationPoint {
    /** Predicted confidence (0-1) */
    confidence: number;
    /** Whether the prediction was correct */
    correct: boolean;
}

export interface ECEResult {
    /** Expected Calibration Error */
    ece: number;
    /** Maximum Calibration Error */
    mce: number;
    /** Number of samples */
    n: number;
    /** Per-bin statistics */
    bins: Array<{
        bin: number;
        binCenter: number;
        count: number;
        accuracy: number;
        confidence: number;
        gap: number;
    }>;
}

/**
 * Compute Expected Calibration Error (ECE)
 * ECE = Σ (|bin_acc - bin_conf| * bin_count) / N
 * 
 * @param predictions Array of {confidence, correct} pairs
 * @param nBins Number of bins (default 10)
 * @returns ECE result with per-bin details
 */
export function computeECE(predictions: CalibrationPoint[], nBins = DEFAULT_ECE_BINS): ECEResult {
    if (predictions.length === 0) {
        return { ece: 0, mce: 0, n: 0, bins: [] };
    }

    const bins = Array.from({ length: nBins }, (_, i) => ({
        bin: i,
        binCenter: (i + 0.5) / nBins,
        count: 0,
        correct: 0,
        confidenceSum: 0,
    }));

    // Assign predictions to bins
    for (const { confidence, correct } of predictions) {
        const binIndex = Math.min(Math.floor(confidence * nBins), nBins - 1);
        bins[binIndex].count++;
        bins[binIndex].correct += correct ? 1 : 0;
        bins[binIndex].confidenceSum += confidence;
    }

    // Compute per-bin statistics
    const binResults = bins.map(b => {
        const accuracy = b.count > 0 ? b.correct / b.count : 0;
        const confidence = b.count > 0 ? b.confidenceSum / b.count : 0;
        const gap = Math.abs(accuracy - confidence);
        return {
            bin: b.bin,
            binCenter: b.binCenter,
            count: b.count,
            accuracy,
            confidence,
            gap,
        };
    });

    // ECE = weighted average of gaps
    const total = predictions.length;
    const ece = binResults.reduce((sum, b) => sum + b.gap * (b.count / total), 0);
    const mce = Math.max(...binResults.map(b => b.gap), 0);

    return { ece, mce, n: total, bins: binResults };
}

/**
 * Compute ECE for extraction properties
 * Uses property-level confidence vs. ground truth match
 * 
 * @param extracted Properties with confidence scores
 * @param expected Expected properties from quality cases
 * @param forbidden Forbidden properties from quality cases
 * @param nBins Number of bins
 * @returns ECE result
 */
export function computeExtractionECE(
    extracted: Array<{ key: string; operator: string; values: string[]; confidence?: number }>,
    expected: Array<{ key: string; operator: string; values: string[] }>,
    forbidden: Array<{ key: string; operator: string; values: string[] }> = [],
    nBins = 10
): ECEResult {
    const predictions: CalibrationPoint[] = [];

    // Create lookup for expected properties
    const expectedMap = new Map<string, Set<string>>();
    for (const exp of expected) {
        const id = `${exp.key}::${exp.operator}`;
        const values = new Set(exp.values.map(v => v.toLowerCase().trim()));
        expectedMap.set(id, values);
    }

    // Create lookup for forbidden properties
    const forbiddenMap = new Map<string, Set<string>>();
    for (const forb of forbidden) {
        const id = `${forb.key}::${forb.operator}`;
        const values = new Set(forb.values.map(v => v.toLowerCase().trim()));
        forbiddenMap.set(id, values);
    }

    // Evaluate each extracted property
    for (const prop of extracted) {
        if (prop.confidence === undefined) continue;

        const id = `${prop.key}::${prop.operator}`;
        const extractedValues = prop.values.map(v => v.toLowerCase().trim());

        let correct = false;

        // Check if matches expected
        const expectedValues = expectedMap.get(id);
        if (expectedValues) {
            correct = extractedValues.some(v => expectedValues.has(v));
        } else {
            // Check if forbidden
            const forbiddenValues = forbiddenMap.get(id);
            if (forbiddenValues) {
                correct = !extractedValues.some(v => forbiddenValues.has(v));
            } else {
                // Unexpected extraction - treat as incorrect
                correct = false;
            }
        }

        predictions.push({ confidence: prop.confidence, correct });
    }

    return computeECE(predictions, nBins);
}

/**
 * Reliability diagram data for visualization
 */
export interface ReliabilityDiagram {
    bins: ECEResult['bins'];
    ece: number;
    mce: number;
}

/**
 * Generate reliability diagram data
 */
export function getReliabilityDiagram(result: ECEResult): ReliabilityDiagram {
    return {
        bins: result.bins,
        ece: result.ece,
        mce: result.mce,
    };
}

/**
 * Check if calibration meets threshold
 */
export function isCalibrated(result: ECEResult, threshold = DEFAULT_ECE_THRESHOLD): boolean {
    return result.ece <= threshold;
}
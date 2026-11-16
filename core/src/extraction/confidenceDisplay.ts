/**
 * Confidence Display Utilities (W3.3)
 * Shared UI utilities for displaying calibrated confidence as buckets
 * No Node.js dependencies - safe for browser
 */

export type ConfidenceBucket = 'high' | 'medium' | 'low';

export const CONFIDENCE_BUCKETS = {
    high: { min: 0.8, max: 1.0, label: 'High' },
    medium: { min: 0.5, max: 0.8, label: 'Medium' },
    low: { min: 0.0, max: 0.5, label: 'Low' },
} as const;

/**
 * Get confidence bucket for a calibrated confidence score
 */
export function getConfidenceBucket(confidence: number): ConfidenceBucket {
    if (confidence >= CONFIDENCE_BUCKETS.high.min) return 'high';
    if (confidence >= CONFIDENCE_BUCKETS.medium.min) return 'medium';
    return 'low';
}

/**
 * Get bucket label for display
 */
export function getConfidenceBucketLabel(bucket: ConfidenceBucket): string {
    return CONFIDENCE_BUCKETS[bucket].label;
}

/**
 * Get bucket color class for UI
 */
export function getConfidenceBucketColor(bucket: ConfidenceBucket): string {
    switch (bucket) {
        case 'high': return 'text-green-400 bg-green-900/30 border-green-700/50';
        case 'medium': return 'text-yellow-400 bg-yellow-900/30 border-yellow-700/50';
        case 'low': return 'text-red-400 bg-red-900/30 border-red-700/50';
    }
}

/**
 * Property with calibrated confidence for UI display
 */
export interface PropertyWithCalibration {
    key: string;
    operator: string;
    values: string[];
    unit?: string;
    quantity?: any;
    role?: 'constraint' | 'fact' | 'marker';
    confidence?: number;
    provenance?: 'deterministic' | 'pattern' | 'ai' | 'fuzzy' | 'ontology-key' | 'user' | 'inferred';
    sourceSpan?: [number, number];
    sourceText?: string;
    calibratedConfidence?: number;
    confidenceBucket?: ConfidenceBucket;
}
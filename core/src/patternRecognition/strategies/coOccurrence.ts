import type { Note, Property } from '../../types/index.js';
import type { Pattern } from '../types.js';

/**
 * Co-occurrence Pattern Discovery Strategy
 * 
 * Discovers patterns based on properties that frequently appear together
 * within a temporal window (1 hour by default).
 */
export interface CoOccurrenceConfig {
    minOccurrences: number;
    temporalWindowMs: number;
    minConfidence: number;
}

const DEFAULT_CONFIG: CoOccurrenceConfig = {
    minOccurrences: 2,
    temporalWindowMs: 60 * 60 * 1000, // 1 hour
    minConfidence: 0.3
};

interface PropertyFrequency {
    key: string;
    count: number;
    values: Record<string, number>;
    timestamps: number[];
}

/**
 * Discover co-occurrence patterns from property frequency data
 */
export function discoverCoOccurrencePatterns(
    propertyFrequency: Record<string, { count: number; values: Record<string, number> }>,
    temporalPatterns: Record<string, number[]>,
    config: CoOccurrenceConfig = DEFAULT_CONFIG
): Pattern[] {
    const patterns: Pattern[] = [];

    const frequentProps = Object.entries(propertyFrequency)
        .filter(([_, stats]) => stats.count >= config.minOccurrences)
        .map(([key, stats]) => ({
            key,
            count: stats.count,
            values: stats.values,
            timestamps: temporalPatterns[key] ?? []
        }));

    for (let i = 0; i < frequentProps.length; i++) {
        const propA = frequentProps[i];
        for (const propB of frequentProps.slice(i + 1)) {
            if (propA.timestamps.length === 0 || propB.timestamps.length === 0) continue;

            const closeOccurrences = countCloseOccurrences(
                propA.timestamps,
                propB.timestamps,
                config.temporalWindowMs
            );

            if (closeOccurrences > 0) {
                const confidence = calculateConfidence(
                    closeOccurrences,
                    propA.timestamps.length,
                    propB.timestamps.length
                );

                if (confidence >= config.minConfidence) {
                    const pattern = createCoOccurrencePattern(propA, propB, confidence);
                    patterns.push(pattern);
                }
            }
        }
    }

    return patterns;
}

/**
 * Count occurrences within temporal proximity
 * Optimized: O(n log n + m log m) using two-pointer after sorting
 */
function countCloseOccurrences(
    timesA: number[],
    timesB: number[],
    windowMs: number
): number {
    if (timesA.length === 0 || timesB.length === 0) return 0;
    
    const sortedA = [...timesA].sort((a, b) => a - b);
    const sortedB = [...timesB].sort((a, b) => a - b);
    
    let count = 0;
    let j = 0;
    
    for (let i = 0; i < sortedA.length; i++) {
        const timeA = sortedA[i];
        
        // Move j forward while B[j] is too far before A[i]
        while (j < sortedB.length && sortedB[j] < timeA - windowMs) {
            j++;
        }
        
        // Check if any B within window
        let k = j;
        while (k < sortedB.length && sortedB[k] <= timeA + windowMs) {
            count++;
            k++;
        }
    }
    
    return count;
}

/**
 * Calculate confidence score based on co-occurrence frequency
 */
function calculateConfidence(
    closeOccurrences: number,
    totalA: number,
    totalB: number
): number {
    const maxTotal = Math.max(totalA, totalB);
    return maxTotal > 0 ? closeOccurrences / maxTotal : 0;
}

/**
 * Create a pattern from co-occurring properties
 */
function createCoOccurrencePattern(
    propA: PropertyFrequency,
    propB: PropertyFrequency,
    confidence: number
): Pattern {
    const [keyA, opA] = propA.key.split('_');
    const [keyB, opB] = propB.key.split('_');

    return {
        id: `pattern_co_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        name: `Co-occurrence: ${propA.key} & ${propB.key}`,
        description: `Pattern detected: ${propA.key} often appears with ${propB.key}`,
        conditions: [
            { key: keyA, operator: opA, values: Object.keys(propA.values) },
            { key: keyB, operator: opB, values: Object.keys(propB.values) }
        ],
        predictedActions: [
            `Create note with ${propB.key}`,
            `Update note with ${propB.key}`
        ],
        confidence,
        lastUsed: Date.now(),
        usageCount: 0,
        accuracyRate: 0.3
    };
}

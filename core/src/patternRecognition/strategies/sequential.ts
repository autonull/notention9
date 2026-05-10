import type { Note, Property } from '../../types/index.js';
import type { Pattern } from '../types.js';

/**
 * Sequential Pattern Discovery Strategy
 * 
 * Discovers patterns based on properties that tend to appear in sequence
 * within a time window (24 hours by default).
 */
export interface SequentialPatternConfig {
    maxTimeDiffMs: number;
    defaultConfidence: number;
    minAccuracy: number;
}

const DEFAULT_CONFIG: SequentialPatternConfig = {
    maxTimeDiffMs: 24 * 60 * 60 * 1000, // 24 hours
    defaultConfidence: 0.6,
    minAccuracy: 0.3
};

/**
 * Discover sequential patterns from note history
 */
export function discoverSequentialPatterns(
    notes: Note[],
    config: SequentialPatternConfig = DEFAULT_CONFIG
): Pattern[] {
    const patterns: Pattern[] = [];
    const sortedNotes = [...notes].sort((a, b) =>
        new Date(a.updatedAt).getTime() - new Date(b.updatedAt).getTime()
    );

    for (let i = 0; i < sortedNotes.length - 1; i++) {
        const currentNote = sortedNotes[i];
        const nextNote = sortedNotes[i + 1];

        const timeDiff = new Date(nextNote.updatedAt).getTime() - new Date(currentNote.updatedAt).getTime();

        if (timeDiff <= config.maxTimeDiffMs) {
            const sequencePatterns = extractSequencePatterns(
                currentNote,
                nextNote,
                config.defaultConfidence,
                config.minAccuracy
            );
            patterns.push(...sequencePatterns);
        }
    }

    return patterns;
}

/**
 * Extract patterns from a pair of sequential notes
 */
function extractSequencePatterns(
    currentNote: Note,
    nextNote: Note,
    confidence: number,
    accuracy: number
): Pattern[] {
    const patterns: Pattern[] = [];

    for (const currProp of currentNote.properties) {
        for (const nextProp of nextNote.properties) {
            patterns.push(createSequentialPattern(currProp, nextProp, confidence, accuracy));
        }
    }

    return patterns;
}

/**
 * Create a pattern from sequential properties
 */
function createSequentialPattern(
    currProp: Property,
    nextProp: Property,
    confidence: number,
    accuracy: number
): Pattern {
    return {
        id: `pattern_seq_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        name: `Sequence: ${currProp.key} → ${nextProp.key}`,
        description: `Pattern detected: ${currProp.key} often followed by ${nextProp.key}`,
        conditions: [currProp],
        predictedActions: [
            `Add property [${nextProp.key}:${nextProp.operator}:${nextProp.values.join(',')}]`,
            `Create note with ${nextProp.key}`
        ],
        confidence,
        lastUsed: Date.now(),
        usageCount: 0,
        accuracyRate: accuracy
    };
}

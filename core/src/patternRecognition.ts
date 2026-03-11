import type { Note, Property, OntologyNode } from './types/index.js';
import { generateId, safeDivide, clamp } from './utils/common.js';
import { logInfo } from './utils/logging.js';
import { BaseService } from './baseService.js';
import { DEFAULT_PATTERNS } from './patternRecognition/DefaultPatterns.js';
import { Pattern, UserBehaviorPattern, Prediction, PredictionResult } from './patternRecognition/types.js';
import {
    discoverCoOccurrencePatterns,
    discoverSequentialPatterns,
    matchesPatternConditions,
    calculatePatternMatchScore,
    type CoOccurrenceConfig,
    type SequentialPatternConfig
} from './patternRecognition/strategies/index.js';

export * from './patternRecognition/types.js';

/**
 * Configuration for pattern recognition
 */
export interface PatternRecognitionConfig {
    coOccurrence: CoOccurrenceConfig;
    sequential: SequentialPatternConfig;
}

const DEFAULT_CONFIG: PatternRecognitionConfig = {
    coOccurrence: {
        minOccurrences: 2,
        temporalWindowMs: 60 * 60 * 1000,
        minConfidence: 0.3
    },
    sequential: {
        maxTimeDiffMs: 24 * 60 * 60 * 1000,
        defaultConfidence: 0.6,
        minAccuracy: 0.3
    }
};

/**
 * PatternRecognitionService - Analyzes user behavior and predicts needs
 * 
 * Uses semantic pattern recognition to:
 * - Discover co-occurrence patterns (properties that appear together)
 * - Discover sequential patterns (properties that appear in sequence)
 * - Generate predictions based on matched patterns
 * - Track prediction accuracy over time
 */
export class PatternRecognitionService extends BaseService {
    private patterns: Map<string, UserBehaviorPattern> = new Map();
    private predictions: Prediction[] = [];
    private config: PatternRecognitionConfig;

    constructor(config?: Partial<PatternRecognitionConfig>) {
        super('pattern-recognition');
        this.config = { ...DEFAULT_CONFIG, ...config };
    }

    /**
     * Analyzes user's semantic patterns from their notes
     */
    analyzeUserPatterns(userId: string, notes: Note[]): UserBehaviorPattern {
        return this.safeExecuteSync(() => {
            const existingPattern = this.patterns.get(userId);

            const propertyFrequency: Record<string, { count: number; values: Record<string, number> }> = {};
            const temporalPatterns: Record<string, number[]> = {};

            for (const note of notes) {
                for (const prop of note.properties) {
                    const key = `${prop.key}_${prop.operator}`;

                    const freq = propertyFrequency[key] ??= { count: 0, values: {} };
                    freq.count++;

                    for (const value of prop.values) {
                        freq.values[value] = (freq.values[value] ?? 0) + 1;
                    }

                    (temporalPatterns[key] ||= []).push(new Date(note.updatedAt).getTime());
                }
            }

            const newPatterns: Pattern[] = this.discoverPatterns(propertyFrequency, temporalPatterns, notes);

            const userBehavior: UserBehaviorPattern = {
                userId,
                patterns: existingPattern ? [...existingPattern.patterns, ...newPatterns] : newPatterns,
                lastUpdated: Date.now()
            };

            this.patterns.set(userId, userBehavior);
            logInfo(`Analyzed patterns for user ${userId}`, { patternCount: newPatterns.length, serviceId: this.id });

            return userBehavior;
        }, 'analyzeUserPatterns', { userId, noteCount: notes.length }).result!;
    }

    /**
     * Discovers patterns from property frequencies and temporal data
     */
    private discoverPatterns(
        propertyFrequency: Record<string, { count: number; values: Record<string, number> }>,
        temporalPatterns: Record<string, number[]>,
        notes: Note[]
    ): Pattern[] {
        const coOccurrencePatterns = discoverCoOccurrencePatterns(
            propertyFrequency,
            temporalPatterns,
            this.config.coOccurrence
        );
        const sequentialPatterns = discoverSequentialPatterns(notes, this.config.sequential);

        return [...coOccurrencePatterns, ...sequentialPatterns];
    }

    /**
     * Makes predictions based on user patterns
     */
    predictUserNeeds(userId: string, currentNote: Note, ontology?: OntologyNode[]): Prediction[] {
        return this.safeExecuteSync(() => {
            const allPatterns = this.getAllPatternsForUser(userId);
            const matchOptions = ontology ? { useOntology: true, ontology } : {};

            const predictions: Prediction[] = allPatterns
                .filter(pattern => matchesPatternConditions(currentNote, pattern.conditions, matchOptions))
                .flatMap(pattern =>
                    pattern.predictedActions.map(predictedAction => ({
                        pattern,
                        noteContext: currentNote,
                        predictedAction,
                        confidence: pattern.confidence,
                        timestamp: Date.now()
                    }))
                )
                .sort((a, b) => b.confidence - a.confidence);

            this.predictions.push(...predictions);

            logInfo(`Generated ${predictions.length} predictions for user ${userId}`, {
                userId,
                noteId: currentNote.id,
                highestConfidence: predictions.length > 0 ? predictions[0].confidence : 0,
                serviceId: this.id
            });

            return predictions;
        }, 'predictUserNeeds', { userId, noteId: currentNote.id }).result!;
    }

    /**
     * Records user feedback on a prediction to improve accuracy
     */
    recordPredictionOutcome(predictionId: string, wasAccurate: boolean, feedback?: string): void {
        this.safeExecuteSync(() => {
            const prediction = this.predictions.find(p => p.pattern.id === predictionId);

            if (prediction) {
                const pattern = prediction.pattern;
                pattern.usageCount++;

                const totalPredictions = pattern.usageCount;
                const accuratePredictions = pattern.accuracyRate * (totalPredictions - 1) + (wasAccurate ? 1 : 0);
                pattern.accuracyRate = accuratePredictions / totalPredictions;
                pattern.lastUsed = Date.now();

                logInfo(`Prediction outcome recorded`, {
                    predictionId,
                    wasAccurate,
                    feedback: !!feedback,
                    serviceId: this.id
                });
            }
        }, 'recordPredictionOutcome', { predictionId, wasAccurate, hasFeedback: !!feedback });
    }

    /**
     * Gets prediction accuracy statistics for a user
     */
    getUserPredictionStats(userId: string) {
        return this.safeExecuteSync(() => {
            const userPatterns = this.patterns.get(userId);
            if (!userPatterns) {
                return {
                    totalPredictions: 0,
                    accuracyRate: 0,
                    patternsCount: 0
                };
            }

            const patterns = userPatterns.patterns;
            const totalPredictions = patterns.reduce((sum, pattern) => sum + pattern.usageCount, 0);
            const totalAccuracy = patterns.reduce((sum, pattern) => sum + (pattern.accuracyRate * pattern.usageCount), 0);

            return {
                totalPredictions,
                accuracyRate: safeDivide(totalAccuracy, totalPredictions),
                patternsCount: patterns.length
            };
        }, 'getUserPredictionStats', { userId }).result!;
    }

    /**
     * Gets all patterns for a user
     */
    getUserPatterns(userId: string): Pattern[] {
        return this.getAllPatternsForUser(userId);
    }

    private getAllPatternsForUser(userId: string): Pattern[] {
        const userPatterns = this.patterns.get(userId)?.patterns || [];
        return [...DEFAULT_PATTERNS, ...userPatterns];
    }
}

// Export a singleton instance for default usage
export const patternRecognitionService = new PatternRecognitionService();

import type { Note, Property, OntologyNode } from './types/index.js';
import { generateId, safeDivide, clamp } from './utils/common.js';
import { logInfo } from './utils/logging.js';
import { BaseService } from './baseService.js';
import { DEFAULT_PATTERNS } from './patternRecognition/DefaultPatterns.js';
import { Pattern, UserBehaviorPattern, Prediction, PredictionResult } from './patternRecognition/types.js';
import { MatchEngine } from './matching/MatchEngine.js';

export * from './patternRecognition/types.js';

export class PatternRecognitionService extends BaseService {
  private patterns: Map<string, UserBehaviorPattern> = new Map();
  private predictions: Prediction[] = [];

  constructor() {
    super('pattern-recognition');
  }

  /**
   * Analyzes user's semantic patterns from their notes
   */
  analyzeUserPatterns(userId: string, notes: Note[]): UserBehaviorPattern {
    return this.safeExecuteSync(() => {
      const existingPattern = this.patterns.get(userId);

      // Extract common property patterns from notes
      const propertyFrequency: Record<string, { count: number; values: Record<string, number> }> = {};
      const temporalPatterns: Record<string, number[]> = {}; // Track patterns over time

      for (const note of notes) {
        for (const prop of note.properties) {
          const key = `${prop.key}_${prop.operator}`;

          const freq = propertyFrequency[key] ??= { count: 0, values: {} };
          freq.count++;

          for (const value of prop.values) {
            freq.values[value] = (freq.values[value] ?? 0) + 1;
          }

          // Track temporal patterns (when certain properties appear)
          (temporalPatterns[key] ||= []).push(new Date(note.updatedAt).getTime());
        }
      }

      // Generate potential patterns based on frequency and co-occurrence
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
    const coOccurrencePatterns = this.discoverCoOccurrencePatterns(propertyFrequency, temporalPatterns);
    const sequentialPatterns = this.discoverSequentialPatterns(notes);

    return [...coOccurrencePatterns, ...sequentialPatterns];
  }

  private discoverCoOccurrencePatterns(
    propertyFrequency: Record<string, { count: number; values: Record<string, number> }>,
    temporalPatterns: Record<string, number[]>
  ): Pattern[] {
    const patterns: Pattern[] = [];

    // Look for frequently co-occurring properties
    const frequentProps = Object.entries(propertyFrequency)
      .filter(([_, stats]) => stats.count >= 2) // At least 2 occurrences
      .map(([key, stats]) => ({ key, stats }));

    // Create patterns based on co-occurrences
    for (let i = 0; i < frequentProps.length; i++) {
      for (let j = i + 1; j < frequentProps.length; j++) {
        const propA = frequentProps[i];
        const propB = frequentProps[j];

        // Check if these properties often appear in close temporal proximity
        const timesA = temporalPatterns[propA.key] ?? [];
        const timesB = temporalPatterns[propB.key] ?? [];

        if (timesA.length > 0 && timesB.length > 0) {
          // Calculate temporal proximity (within 1 hour)
          let closeOccurrences = 0;
          for (const timeA of timesA) {
            for (const timeB of timesB) {
              if (Math.abs(timeA - timeB) < 60 * 60 * 1000) { // Within 1 hour
                closeOccurrences++;
                break;
              }
            }
          }

          if (closeOccurrences > 0) {
            // Create a pattern based on this co-occurrence
            const [keyA, opA] = propA.key.split('_');
            const [keyB, opB] = propB.key.split('_');

            const pattern: Pattern = {
              id: generateId('pattern_'),
              name: `Co-occurrence: ${propA.key} & ${propB.key}`,
              description: `Pattern detected: ${propA.key} often appears with ${propB.key}`,
              conditions: [
                { key: keyA, operator: opA, values: Object.keys(propA.stats.values) },
                { key: keyB, operator: opB, values: Object.keys(propB.stats.values) }
              ],
              predictedActions: [`Create note with ${propB.key}`, `Update note with ${propB.key}`],
              confidence: clamp(safeDivide(closeOccurrences, Math.max(timesA.length, timesB.length)), 0, 0.9),
              lastUsed: Date.now(),
              usageCount: 0,
              accuracyRate: 0.3 // Default starting accuracy
            };

            patterns.push(pattern);
          }
        }
      }
    }
    return patterns;
  }

  /**
   * Discovers sequential patterns in note creation/update
   */
  private discoverSequentialPatterns(notes: Note[]): Pattern[] {
    const patterns: Pattern[] = [];
    const sortedNotes = [...notes].sort((a, b) =>
      new Date(a.updatedAt).getTime() - new Date(b.updatedAt).getTime()
    );

    // Look for sequences where certain properties tend to follow others
    for (let i = 0; i < sortedNotes.length - 1; i++) {
      const currentNote = sortedNotes[i];
      const nextNote = sortedNotes[i + 1];

      // Calculate time difference (within 24 hours for it to be considered sequential)
      const timeDiff = new Date(nextNote.updatedAt).getTime() - new Date(currentNote.updatedAt).getTime();

      if (timeDiff <= 24 * 60 * 60 * 1000) { // Within 24 hours
        // Look for property sequences
        for (const currProp of currentNote.properties) {
          for (const nextProp of nextNote.properties) {
            // Create a pattern: when currProp appears, nextProp often follows
            const pattern: Pattern = {
              id: generateId('seq_pattern_'),
              name: `Sequence: ${currProp.key} → ${nextProp.key}`,
              description: `Pattern detected: ${currProp.key} often followed by ${nextProp.key}`,
              conditions: [currProp],
              predictedActions: [`Add property [${nextProp.key}:${nextProp.operator}:${nextProp.values.join(',')}]`, `Create note with ${nextProp.key}`],
              confidence: 0.6, // Default confidence for sequence
              lastUsed: Date.now(),
              usageCount: 0,
              accuracyRate: 0.3 // Default starting accuracy
            };

            patterns.push(pattern);
          }
        }
      }
    }

    return patterns;
  }

  /**
   * Makes predictions based on user patterns
   */
  predictUserNeeds(userId: string, currentNote: Note, ontology?: OntologyNode[]): Prediction[] {
    return this.safeExecuteSync(() => {
      const allPatterns = this.getAllPatternsForUser(userId);
      const predictions: Prediction[] = [];

      const matchEngine = ontology ? new MatchEngine(ontology) : undefined;

      // For each pattern, check if current note matches conditions
      for (const pattern of allPatterns) {
        if (this.matchesPatternConditions(currentNote, pattern.conditions, matchEngine)) {
          // Generate predictions based on this pattern
          for (const predictedAction of pattern.predictedActions) {
            const prediction: Prediction = {
              pattern,
              noteContext: currentNote,
              predictedAction,
              confidence: pattern.confidence,
              timestamp: Date.now()
            };

            predictions.push(prediction);
          }
        }
      }

      // Sort predictions by confidence
      predictions.sort((a, b) => b.confidence - a.confidence);

      // Store predictions for tracking accuracy later
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
   * Checks if a note matches the conditions of a pattern
   */
  private matchesPatternConditions(note: Note, conditions: Property[], engine?: MatchEngine): boolean {
    if (engine) {
        // Treat conditions as a "request" note
        const requestNote: Note = {
            ...note,
            id: 'condition-request',
            properties: conditions
        };

        const result = engine.calculateMatchScore(requestNote, note);
        const matchedKeys = new Set(result.matches.map(m => m.requestProp.key));

        return conditions.every(c => matchedKeys.has(c.key));
    }

    // Fallback to simple equality matching if no ontology provided
    return conditions.every(condition => {
      const matchingProp = note.properties.find(prop =>
        prop.key === condition.key &&
        prop.operator === condition.operator
      );

      if (!matchingProp) return false;

      // Check if values match (at least one value should match)
      // Special case: 'ANY' matches any value
      return condition.values.some(conditionValue =>
        conditionValue === 'ANY' ||
        matchingProp.values.some(propValue =>
          propValue.toLowerCase().includes(conditionValue.toLowerCase()) ||
          conditionValue.toLowerCase().includes(propValue.toLowerCase())
        )
      );
    });
  }

  /**
   * Records user feedback on a prediction to improve accuracy
   */
  recordPredictionOutcome(predictionId: string, wasAccurate: boolean, feedback?: string): void {
    this.safeExecuteSync(() => {
      // Find the prediction in our records
      const prediction = this.predictions.find(p => p.pattern.id === predictionId);

      if (prediction) {
        // Update the pattern's accuracy rate
        const pattern = prediction.pattern;
        pattern.usageCount++;

        // Adjust accuracy rate based on outcome
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

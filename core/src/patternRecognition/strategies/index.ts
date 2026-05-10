/**
 * Pattern Discovery Strategies
 * 
 * Modular strategies for discovering patterns from user behavior:
 * - Co-occurrence: Properties that appear together
 * - Sequential: Properties that appear in sequence
 * - Matching: Pattern matching utilities
 */

export {
    discoverCoOccurrencePatterns,
    type CoOccurrenceConfig
} from './coOccurrence.js';

export {
    discoverSequentialPatterns,
    type SequentialPatternConfig
} from './sequential.js';

export {
    matchesPatternConditions,
    calculatePatternMatchScore,
    type PatternMatchOptions
} from './matching.js';

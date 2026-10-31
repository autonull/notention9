/**
 * Prioritization constants - extracted from prioritize.ts
 * Centralizes magic numbers and default configurations for maintainability
 */

import type { VariationThresholds, DiscoveredProblem } from './prioritize.js';

/**
 * Recoverability weights - lower recoverability = higher impact
 * Key: recoverability level (1-5), Value: weight factor
 */
export const RECOVERABILITY_WEIGHTS = { 1: 5, 2: 4, 3: 3, 4: 2, 5: 1 } as const;

/**
 * Default variation thresholds for distinguishing failure from legitimate variation (O6)
 */
export const DEFAULT_VARIATION_THRESHOLDS: VariationThresholds = {
    failedMatch: 3,
    repeatedCorrection: 3,
    abandonedTask: 2,
} as const;

/**
 * Default minimum evidence required for abstention decision (O7)
 */
export const DEFAULT_MIN_EVIDENCE_FOR_DECISION = 3;

/**
 * Default problem creation values
 */
export const DEFAULT_PROBLEM_VALUES = {
    frequency: 1,
    severity: 2,
    recoverability: 3,
    reach: 2,
    evidence: [] as string[],
} as const;

/**
 * Problem severity defaults by type
 */
export const PROBLEM_SEVERITY_DEFAULTS: Record<DiscoveredProblem['type'], number> = {
    'failed-match': 4,
    'repeated-correction': 3,
    'abandoned-task': 3,
    'opt-in-feedback': 3,
    'duplicate-component': 3,
    'dead-component': 2,
    'inline-candidate': 2,
} as const;

/**
 * Problem recoverability defaults by type
 */
export const PROBLEM_RECOVERABILITY_DEFAULTS: Record<DiscoveredProblem['type'], number> = {
    'failed-match': 2,
    'repeated-correction': 3,
    'abandoned-task': 3,
    'opt-in-feedback': 3,
    'duplicate-component': 4,
    'dead-component': 5,
    'inline-candidate': 3,
} as const;

/**
 * Problem reach defaults by type
 */
export const PROBLEM_REACH_DEFAULTS: Record<DiscoveredProblem['type'], number> = {
    'failed-match': 5,
    'repeated-correction': 3,
    'abandoned-task': 4,
    'opt-in-feedback': 3,
    'duplicate-component': 2,
    'dead-component': 1,
    'inline-candidate': 2,
} as const;

/**
 * Expected seam roles for missing seam detection
 */
export const EXPECTED_SEAM_ROLES = [
    'capture',
    'elicit',
    'match',
    'display',
    'layout',
    'explain',
    'ontology',
    'intent',
] as const;

/**
 * Complexity scoring weights
 */
export const COMPLEXITY_WEIGHTS = {
    linesAdded: 0.1,
    linesRemoved: 0.05,
    newDependency: 5,
    newFile: 10,
    modifiedFile: 1,
} as const;

/**
 * Default problem frequency for missing seams
 */
export const MISSING_SEAM_FREQUENCY = 5;
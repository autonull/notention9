/**
 * Friction kind → seam/parameter hypotheses.
 *
 * One source of truth for three things that used to drift apart:
 *   - which kinds are genuine friction (vs. positive/neutral signals),
 *   - which seam a kind points at,
 *   - which variation threshold a kind must clear before it becomes a problem.
 *
 * Every `FrictionKind` must appear here: the map is typed as a total record so a
 * new kind cannot be added to the journal without deciding what it means.
 */
import type { FrictionKind } from '@notention/core/telemetry/journal';
import type { DiscoveredProblem } from './prioritize.js';

export interface FrictionToSeamMapping {
    seamRole: string;
    paramHypotheses: string[]; // ParamSpec keys to investigate
    problemType: DiscoveredProblem['type'];
}

/**
 * Kinds that are positive or neutral signals. They are recorded (they prove the
 * instrument works) but they never become prioritized problems:
 *   capture_started   — the user began, which is the opposite of friction
 *   need_expressed    — the user stated a need, which is the opposite of friction
 *   match_accepted    — the user acted on the match
 *   match_explained   — the user engaged with the explanation
 *   response_created  — the act step succeeded
 *   response_viewed   — the user read a response
 */
export const NON_PROBLEM_FRICTION_KINDS: ReadonlySet<FrictionKind> = new Set<FrictionKind>([
    'capture_started',
    'match_accepted',
    'match_explained',
    'response_created',
    'response_viewed',
    'need_expressed',
]);

/**
 * Maps friction kind to seam role and parameter hypotheses.
 * - capture_abandoned → capture seam params (debounceMs, minChars, etc.)
 * - correction → extraction params (matchThreshold, etc.)
 * - match_rejected → match seam params (scoreThreshold, etc.)
 * - match_viewed → match seam params (resultLimit, etc.)
 * - match_dismissed → match seam params: read the reason, declined to act
 * - match_accepted → match seam params (positive signal, but low friction)
 * - clarification_requested → elicit seam params
 * - capture_started → capture seam params (baseline)
 */
export const FRICTION_TO_SEAM_MAP: Record<FrictionKind, FrictionToSeamMapping> = {
    capture_abandoned: {
        seamRole: 'capture',
        paramHypotheses: ['debounceMs', 'minChars', 'maxSuggestions', 'showOnFocus'],
        problemType: 'abandoned-task',
    },
    correction: {
        seamRole: 'match',
        paramHypotheses: ['matchThreshold', 'fuzzyThreshold', 'maxResults'],
        problemType: 'repeated-correction',
    },
    match_rejected: {
        seamRole: 'match',
        paramHypotheses: ['scoreThreshold', 'rankingStrategy', 'maxResults'],
        problemType: 'failed-match',
    },
    match_viewed: {
        seamRole: 'match',
        paramHypotheses: ['resultLimit', 'previewEnabled', 'groupByType'],
        problemType: 'failed-match',
    },
    match_dismissed: {
        seamRole: 'match',
        paramHypotheses: ['minScore', 'maxResults', 'showScore'],
        problemType: 'failed-match',
    },
    match_accepted: {
        seamRole: 'match',
        paramHypotheses: ['scoreThreshold', 'rankingStrategy'],
        problemType: 'failed-match',
    },
    match_explained: {
        seamRole: 'match',
        paramHypotheses: ['showDetails', 'showScore'],
        problemType: 'failed-match',
    },
    clarification_requested: {
        seamRole: 'elicit',
        paramHypotheses: ['maxQuestions', 'questionStrategy', 'autoElicit'],
        problemType: 'failed-match',
    },
    capture_started: {
        seamRole: 'capture',
        paramHypotheses: ['debounceMs', 'minChars'],
        problemType: 'abandoned-task',
    },
    need_expressed: {
        seamRole: 'capture',
        paramHypotheses: ['debounceMs', 'minChars', 'maxSuggestions'],
        problemType: 'abandoned-task',
    },
    response_created: {
        seamRole: 'match',
        paramHypotheses: ['showScore', 'compactMode'],
        problemType: 'failed-match',
    },
    response_viewed: {
        seamRole: 'match',
        paramHypotheses: ['showScore', 'compactMode'],
        problemType: 'failed-match',
    },
};

/**
 * Which variation threshold bucket a kind must clear before repeated occurrences
 * count as a failure rather than legitimate variation.
 */
export type VariationThresholdKey = 'failedMatch' | 'repeatedCorrection' | 'abandonedTask';

const THRESHOLD_KEY_BY_KIND: Record<FrictionKind, VariationThresholdKey> = {
    capture_started: 'abandonedTask',
    capture_abandoned: 'abandonedTask',
    need_expressed: 'abandonedTask',
    correction: 'repeatedCorrection',
    match_viewed: 'failedMatch',
    match_rejected: 'failedMatch',
    match_dismissed: 'failedMatch',
    match_accepted: 'failedMatch',
    match_explained: 'failedMatch',
    clarification_requested: 'failedMatch',
    response_created: 'failedMatch',
    response_viewed: 'failedMatch',
};

/**
 * The threshold bucket for a kind, or `undefined` for kinds that are not problems.
 */
export function thresholdKeyFor(kind: FrictionKind): VariationThresholdKey | undefined {
    return NON_PROBLEM_FRICTION_KINDS.has(kind) ? undefined : THRESHOLD_KEY_BY_KIND[kind];
}

/**
 * A zeroed counter per kind. Derived from the map so a new kind cannot be
 * forgotten here (which is how the optimizer build broke).
 */
export function emptyKindCounts(): Record<FrictionKind, number> {
    return Object.fromEntries(
        Object.keys(FRICTION_TO_SEAM_MAP).map(kind => [kind, 0])
    ) as Record<FrictionKind, number>;
}

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
import type { FrictionEntry } from '../uisg/metrics.js';

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

// --- New exports for UISG metrics integration ---

export interface FrictionMapping {
    frictionKind: string;
    seam: string;
    params: Record<string, unknown>;
    weight: number;
}

export const UISG_FRICTION_MAP: FrictionMapping[] = [
    // Capture seam friction
    {
        frictionKind: 'capture-delay',
        seam: 'capture',
        params: { strategy: 'quick-capture' },
        weight: 1.0,
    },
    {
        frictionKind: 'capture-abandon',
        seam: 'capture',
        params: { strategy: 'page-new-note' },
        weight: 1.2,
    },
    {
        frictionKind: 'empty-state-confusion',
        seam: 'capture',
        params: { strategy: 'empty-state-prompt' },
        weight: 0.8,
    },

    // Elicit seam friction
    {
        frictionKind: 'property-entry-abandon',
        seam: 'elicit',
        params: { strategy: 'property-form' },
        weight: 1.0,
    },
    {
        frictionKind: 'inline-syntax-error',
        seam: 'elicit',
        params: { strategy: 'inline-detail' },
        weight: 1.5,
    },
    {
        frictionKind: 'popup-dismiss',
        seam: 'elicit',
        params: { strategy: 'property-form' },
        weight: 0.7,
    },

    // Match seam friction
    {
        frictionKind: 'no-matches-found',
        seam: 'match',
        params: { strategy: 'semantic-match' },
        weight: 1.5,
    },
    {
        frictionKind: 'irrelevant-matches',
        seam: 'match',
        params: { strategy: 'semantic-match' },
        weight: 1.2,
    },
    {
        frictionKind: 'match-score-confusion',
        seam: 'match',
        params: { strategy: 'explain-badge' },
        weight: 0.9,
    },

    // Display seam friction
    {
        frictionKind: 'rail-overcrowded',
        seam: 'display',
        params: { strategy: 'list' },
        weight: 0.8,
    },
    {
        frictionKind: 'board-navigation-confusion',
        seam: 'display',
        params: { strategy: 'board' },
        weight: 1.0,
    },

    // Layout seam friction
    {
        frictionKind: 'density-complaint',
        seam: 'layout',
        params: { strategy: 'compact' },
        weight: 0.6,
    },
    {
        frictionKind: 'rail-width-issue',
        seam: 'layout',
        params: { strategy: 'rail-share' },
        weight: 0.7,
    },

    // Explain seam friction
    {
        frictionKind: 'explanation-not-found',
        seam: 'explain',
        params: { strategy: 'reason-badges' },
        weight: 1.0,
    },
    {
        frictionKind: 'explanation-not-understood',
        seam: 'explain',
        params: { strategy: 'expandable-details' },
        weight: 1.2,
    },

    // Ontology seam friction
    {
        frictionKind: 'conflict-not-noticed',
        seam: 'ontology',
        params: { strategy: 'conflicts-tab' },
        weight: 1.3,
    },
    {
        frictionKind: 'conflict-resolution-abandon',
        seam: 'ontology',
        params: { strategy: 'merge-flow' },
        weight: 1.5,
    },

    // Intent seam friction (currently unsupported)
    {
        frictionKind: 'intent-not-recognized',
        seam: 'intent',
        params: { strategy: 'pattern-recognition' },
        weight: 1.0,
    },
    {
        frictionKind: 'suggestion-irrelevant',
        seam: 'intent',
        params: { strategy: 'predictive-suggestions' },
        weight: 1.2,
    },
];

export function mapFrictionToSeam(friction: FrictionEntry): FrictionMapping[] {
    return UISG_FRICTION_MAP.filter(m => m.frictionKind === friction.kind);
}

export function getSeamFriction(seam: string, frictionEntries: FrictionEntry[]): FrictionEntry[] {
    const mappings = UISG_FRICTION_MAP.filter(m => m.seam === seam);
    const kinds = new Set(mappings.map(m => m.frictionKind));
    return frictionEntries.filter(f => kinds.has(f.kind));
}

export function getTopFrictionKinds(frictionEntries: FrictionEntry[], limit: number = 10): FrictionEntry[] {
    // Filter out positive kinds (those indicating success)
    const negativeKinds = frictionEntries.filter(f =>
        !f.kind.includes('success') &&
        !f.kind.includes('complete') &&
        !f.kind.includes('satisfied')
    );
    return negativeKinds
        .sort((a, b) => {
            const severityWeight = { high: 3, medium: 2, low: 1 };
            const aWeight = (severityWeight[a.severity] ?? 1) * a.count;
            const bWeight = (severityWeight[b.severity] ?? 1) * b.count;
            return bWeight - aWeight;
        })
        .slice(0, limit);
}

export function getFrictionBySeam(frictionEntries: FrictionEntry[]): Map<string, FrictionEntry[]> {
    const bySeam = new Map<string, FrictionEntry[]>();
    for (const entry of frictionEntries) {
        const mappings = mapFrictionToSeam(entry);
        for (const mapping of mappings) {
            const existing = bySeam.get(mapping.seam) ?? [];
            existing.push({ ...entry, seam: mapping.seam, params: mapping.params });
            bySeam.set(mapping.seam, existing);
        }
    }
    return bySeam;
}
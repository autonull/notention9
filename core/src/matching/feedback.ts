/**
 * Match Feedback Loop (W4.2)
 * Tracks accept/reject feedback, learns local preference weights,
 * and applies them to re-rank future matches.
 */

import type { Note, Property } from '../types/index.js';
import type { MatchResult, PropertyMatch } from './types.js';
import type { ScoredMatch } from './bidirectional.js';

/** Feedback event types */
export type FeedbackAction = 'accept' | 'reject';

/** Property-level feedback detail */
export interface PropertyFeedback {
    requestKey: string;
    requestOperator: string;
    requestValues: string[];
    offerKey: string;
    offerOperator: string;
    offerValues: string[];
    matchType: string;
    compatibility: number;
    crossKeyUsed: boolean;
}

/** Single feedback event */
export interface MatchFeedbackEvent {
    id: string;
    timestamp: string;
    action: FeedbackAction;
    requestId: string;
    offerId: string;
    score: number;
    matches: PropertyFeedback[];
    conflicts: PropertyFeedback[];
    missingKeys: string[];
}

/** Learned preference weights */
export interface PreferenceWeights {
    /** Weight per property key (positive = prefer, negative = avoid) */
    keyWeights: Record<string, number>;
    /** Weight per operator */
    operatorWeights: Record<string, number>;
    /** Weight per cross-key mapping (requestKey->offerKey) */
    crossKeyWeights: Record<string, number>;
    /** Weight per match type */
    matchTypeWeights: Record<string, number>;
    /** Minimum events needed before weight is applied */
    minEvents: number;
    /** Decay factor for older events (0-1) */
    decayFactor: number;
    /** Last updated timestamp */
    updatedAt: string;
}

/** Configuration for feedback learning */
export interface FeedbackConfig {
    /** Maximum events to keep in memory */
    maxEvents: number;
    /** Learning rate for weight updates */
    learningRate: number;
    /** Minimum weight magnitude to apply */
    minWeightMagnitude: number;
    /** Maximum weight magnitude */
    maxWeightMagnitude: number;
    /** Decay factor per day */
    dailyDecay: number;
}

/** Default configuration */
export const DEFAULT_FEEDBACK_CONFIG: FeedbackConfig = {
    maxEvents: 1000,
    learningRate: 0.1,
    minWeightMagnitude: 0.01,
    maxWeightMagnitude: 1.0,
    dailyDecay: 0.95,
};

/** Default preference weights */
export const DEFAULT_PREFERENCE_WEIGHTS: PreferenceWeights = {
    keyWeights: {},
    operatorWeights: {},
    crossKeyWeights: {},
    matchTypeWeights: {},
    minEvents: 3,
    decayFactor: 0.95,
    updatedAt: new Date().toISOString(),
};

/** Storage keys */
const FEEDBACK_EVENTS_KEY = 'notention:match-feedback:events';
const PREFERENCE_WEIGHTS_KEY = 'notention:match-feedback:weights';
const FEEDBACK_CONFIG_KEY = 'notention:match-feedback:config';

/**
 * Check if running in browser environment
 */
function isBrowser(): boolean {
    return typeof window !== 'undefined' && typeof localStorage !== 'undefined';
}

/**
 * Load feedback events from storage
 */
function loadFeedbackEvents(): MatchFeedbackEvent[] {
    if (!isBrowser()) return [];
    try {
        const stored = localStorage.getItem(FEEDBACK_EVENTS_KEY);
        return stored ? JSON.parse(stored) : [];
    } catch {
        return [];
    }
}

/**
 * Save feedback events to storage
 */
function saveFeedbackEvents(events: MatchFeedbackEvent[]): void {
    if (!isBrowser()) return;
    try {
        localStorage.setItem(FEEDBACK_EVENTS_KEY, JSON.stringify(events));
    } catch {
        // Ignore storage errors
    }
}

/**
 * Load preference weights from storage
 */
export function loadPreferenceWeights(): PreferenceWeights {
    if (!isBrowser()) return DEFAULT_PREFERENCE_WEIGHTS;
    try {
        const stored = localStorage.getItem(PREFERENCE_WEIGHTS_KEY);
        if (!stored) return DEFAULT_PREFERENCE_WEIGHTS;
        const weights = JSON.parse(stored) as PreferenceWeights;
        // Merge with defaults to handle new fields
        return {
            ...DEFAULT_PREFERENCE_WEIGHTS,
            ...weights,
            keyWeights: { ...DEFAULT_PREFERENCE_WEIGHTS.keyWeights, ...weights.keyWeights },
            operatorWeights: { ...DEFAULT_PREFERENCE_WEIGHTS.operatorWeights, ...weights.operatorWeights },
            crossKeyWeights: { ...DEFAULT_PREFERENCE_WEIGHTS.crossKeyWeights, ...weights.crossKeyWeights },
            matchTypeWeights: { ...DEFAULT_PREFERENCE_WEIGHTS.matchTypeWeights, ...weights.matchTypeWeights },
        };
    } catch {
        return DEFAULT_PREFERENCE_WEIGHTS;
    }
}

/**
 * Save preference weights to storage
 */
function savePreferenceWeights(weights: PreferenceWeights): void {
    if (!isBrowser()) return;
    try {
        localStorage.setItem(PREFERENCE_WEIGHTS_KEY, JSON.stringify(weights));
    } catch {
        // Ignore storage errors
    }
}

/**
 * Load feedback config from storage
 */
function loadFeedbackConfig(): FeedbackConfig {
    if (!isBrowser()) return DEFAULT_FEEDBACK_CONFIG;
    try {
        const stored = localStorage.getItem(FEEDBACK_CONFIG_KEY);
        return stored ? { ...DEFAULT_FEEDBACK_CONFIG, ...JSON.parse(stored) } : DEFAULT_FEEDBACK_CONFIG;
    } catch {
        return DEFAULT_FEEDBACK_CONFIG;
    }
}

/**
 * Save feedback config to storage
 */
function saveFeedbackConfig(config: FeedbackConfig): void {
    if (!isBrowser()) return;
    try {
        localStorage.setItem(FEEDBACK_CONFIG_KEY, JSON.stringify(config));
    } catch {
        // Ignore storage errors
    }
}

/**
 * Convert PropertyMatch to PropertyFeedback
 */
function propertyMatchToFeedback(pm: PropertyMatch, crossKeyMap: Record<string, string[]>): PropertyFeedback {
    const crossKeyUsed = crossKeyMap[pm.requestProp.key]?.includes(pm.offerProp.key) ?? false;
    return {
        requestKey: pm.requestProp.key,
        requestOperator: pm.requestProp.operator,
        requestValues: pm.requestProp.values,
        offerKey: pm.offerProp.key,
        offerOperator: pm.offerProp.operator,
        offerValues: pm.offerProp.values,
        matchType: pm.details?.type ?? 'unknown',
        compatibility: pm.compatibility,
        crossKeyUsed,
    };
}

/**
 * Record a match feedback event (accept/reject)
 */
export function recordMatchFeedback(
    action: FeedbackAction,
    request: Note,
    offer: Note,
    result: MatchResult,
    crossKeyMap: Record<string, string[]> = {}
): MatchFeedbackEvent {
    const event: MatchFeedbackEvent = {
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
        timestamp: new Date().toISOString(),
        action,
        requestId: request.id,
        offerId: offer.id,
        score: result.score,
        matches: result.matches.map(m => propertyMatchToFeedback(m, crossKeyMap)),
        conflicts: result.conflicts.map(m => propertyMatchToFeedback(m, crossKeyMap)),
        missingKeys: result.missing.map(p => p.key),
    };

    const events = loadFeedbackEvents();
    const config = loadFeedbackConfig();

    events.push(event);

    // Trim to max events
    if (events.length > config.maxEvents) {
        events.splice(0, events.length - config.maxEvents);
    }

    saveFeedbackEvents(events);

    // Update preference weights
    updatePreferenceWeights(event);

    return event;
}

/**
 * Update preference weights based on a feedback event
 */
function updatePreferenceWeights(event: MatchFeedbackEvent): void {
    const weights = loadPreferenceWeights();
    const config = loadFeedbackConfig();
    const isAccept = event.action === 'accept';
    const direction = isAccept ? 1 : -1;

    // Count events per key/operator/mapping to enforce minEvents
    const events = loadFeedbackEvents();
    const keyCounts: Record<string, { accept: number; reject: number }> = {};
    const operatorCounts: Record<string, { accept: number; reject: number }> = {};
    const crossKeyCounts: Record<string, { accept: number; reject: number }> = {};
    const matchTypeCounts: Record<string, { accept: number; reject: number }> = {};

    for (const e of events) {
        for (const m of e.matches) {
            const key = m.requestKey;
            if (!keyCounts[key]) keyCounts[key] = { accept: 0, reject: 0 };
            if (e.action === 'accept') keyCounts[key].accept++;
            else keyCounts[key].reject++;

            const op = m.requestOperator;
            if (!operatorCounts[op]) operatorCounts[op] = { accept: 0, reject: 0 };
            if (e.action === 'accept') operatorCounts[op].accept++;
            else operatorCounts[op].reject++;

            if (m.crossKeyUsed) {
                const ck = `${m.requestKey}->${m.offerKey}`;
                if (!crossKeyCounts[ck]) crossKeyCounts[ck] = { accept: 0, reject: 0 };
                if (e.action === 'accept') crossKeyCounts[ck].accept++;
                else crossKeyCounts[ck].reject++;
            }

            const mt = m.matchType;
            if (!matchTypeCounts[mt]) matchTypeCounts[mt] = { accept: 0, reject: 0 };
            if (e.action === 'accept') matchTypeCounts[mt].accept++;
            else matchTypeCounts[mt].reject++;
        }
    }

    // Update key weights
    for (const [key, counts] of Object.entries(keyCounts)) {
        const total = counts.accept + counts.reject;
        if (total >= weights.minEvents) {
            const ratio = counts.accept / total;
            const target = (ratio - 0.5) * 2; // -1 to 1
            const current = weights.keyWeights[key] ?? 0;
            const updated = current + (target - current) * config.learningRate;
            weights.keyWeights[key] = clamp(updated, -config.maxWeightMagnitude, config.maxWeightMagnitude);
        }
    }

    // Update operator weights
    for (const [op, counts] of Object.entries(operatorCounts)) {
        const total = counts.accept + counts.reject;
        if (total >= weights.minEvents) {
            const ratio = counts.accept / total;
            const target = (ratio - 0.5) * 2;
            const current = weights.operatorWeights[op] ?? 0;
            const updated = current + (target - current) * config.learningRate;
            weights.operatorWeights[op] = clamp(updated, -config.maxWeightMagnitude, config.maxWeightMagnitude);
        }
    }

    // Update cross-key weights
    for (const [ck, counts] of Object.entries(crossKeyCounts)) {
        const total = counts.accept + counts.reject;
        if (total >= weights.minEvents) {
            const ratio = counts.accept / total;
            const target = (ratio - 0.5) * 2;
            const current = weights.crossKeyWeights[ck] ?? 0;
            const updated = current + (target - current) * config.learningRate;
            weights.crossKeyWeights[ck] = clamp(updated, -config.maxWeightMagnitude, config.maxWeightMagnitude);
        }
    }

    // Update match type weights
    for (const [mt, counts] of Object.entries(matchTypeCounts)) {
        const total = counts.accept + counts.reject;
        if (total >= weights.minEvents) {
            const ratio = counts.accept / total;
            const target = (ratio - 0.5) * 2;
            const current = weights.matchTypeWeights[mt] ?? 0;
            const updated = current + (target - current) * config.learningRate;
            weights.matchTypeWeights[mt] = clamp(updated, -config.maxWeightMagnitude, config.maxWeightMagnitude);
        }
    }

    // Apply daily decay to all weights
    const now = Date.now();
    const lastUpdated = new Date(weights.updatedAt).getTime();
    const daysSinceUpdate = (now - lastUpdated) / (1000 * 60 * 60 * 24);
    if (daysSinceUpdate >= 1) {
        const decay = Math.pow(config.dailyDecay, daysSinceUpdate);
        for (const key of Object.keys(weights.keyWeights)) {
            weights.keyWeights[key] *= decay;
            if (Math.abs(weights.keyWeights[key]) < config.minWeightMagnitude) {
                delete weights.keyWeights[key];
            }
        }
        for (const key of Object.keys(weights.operatorWeights)) {
            weights.operatorWeights[key] *= decay;
            if (Math.abs(weights.operatorWeights[key]) < config.minWeightMagnitude) {
                delete weights.operatorWeights[key];
            }
        }
        for (const key of Object.keys(weights.crossKeyWeights)) {
            weights.crossKeyWeights[key] *= decay;
            if (Math.abs(weights.crossKeyWeights[key]) < config.minWeightMagnitude) {
                delete weights.crossKeyWeights[key];
            }
        }
        for (const key of Object.keys(weights.matchTypeWeights)) {
            weights.matchTypeWeights[key] *= decay;
            if (Math.abs(weights.matchTypeWeights[key]) < config.minWeightMagnitude) {
                delete weights.matchTypeWeights[key];
            }
        }
    }

    weights.updatedAt = new Date().toISOString();
    savePreferenceWeights(weights);
}

/**
 * Clamp a value between min and max
 */
function clamp(value: number, min: number, max: number): number {
    return Math.max(min, Math.min(max, value));
}

/**
 * Calculate preference boost for a PropertyMatch
 */
export function calculatePreferenceBoost(
    pm: PropertyMatch,
    weights: PreferenceWeights = loadPreferenceWeights(),
    crossKeyMap: Record<string, string[]> = {}
): number {
    let boost = 0;

    // Key weight
    const keyWeight = weights.keyWeights[pm.requestProp.key];
    if (keyWeight !== undefined) boost += keyWeight * pm.compatibility;

    // Operator weight
    const opWeight = weights.operatorWeights[pm.requestProp.operator];
    if (opWeight !== undefined) boost += opWeight * pm.compatibility;

    // Cross-key weight
    const crossKeyUsed = crossKeyMap[pm.requestProp.key]?.includes(pm.offerProp.key) ?? false;
    if (crossKeyUsed) {
        const ckWeight = weights.crossKeyWeights[`${pm.requestProp.key}->${pm.offerProp.key}`];
        if (ckWeight !== undefined) boost += ckWeight * pm.compatibility;
    }

    // Match type weight
    const mtWeight = weights.matchTypeWeights[pm.details?.type ?? 'unknown'];
    if (mtWeight !== undefined) boost += mtWeight * pm.compatibility;

    return boost;
}

/**
 * Apply preference weights to a match result, returning adjusted score
 */
export function applyPreferenceWeights(
    result: MatchResult,
    weights: PreferenceWeights = loadPreferenceWeights(),
    crossKeyMap: Record<string, string[]> = {}
): { adjustedScore: number; boosts: Record<string, number> } {
    const boosts: Record<string, number> = {};
    let totalBoost = 0;
    let totalCompatibility = 0;

    for (const m of result.matches) {
        const boost = calculatePreferenceBoost(m, weights, crossKeyMap);
        if (boost !== 0) {
            const key = m.requestProp.key;
            boosts[key] = (boosts[key] ?? 0) + boost;
            totalBoost += boost;
            totalCompatibility += m.compatibility;
        }
    }

    for (const m of result.conflicts) {
        const boost = calculatePreferenceBoost(m, weights, crossKeyMap);
        if (boost !== 0) {
            const key = m.requestProp.key;
            boosts[key] = (boosts[key] ?? 0) + boost;
            totalBoost += boost;
            totalCompatibility += Math.abs(m.compatibility);
        }
    }

    // Normalize boost by total compatibility to keep it proportional
    const normalizedBoost = totalCompatibility > 0 ? totalBoost / totalCompatibility : 0;
    const adjustedScore = Math.max(0, Math.min(1, result.score + normalizedBoost));

    return { adjustedScore, boosts };
}



/**
 * Export feedback corpus for offline prompt loop
 */
export interface FeedbackCorpusEntry {
    request: Note;
    offer: Note;
    result: MatchResult;
    action: FeedbackAction;
    timestamp: string;
}

export function exportFeedbackCorpus(): FeedbackCorpusEntry[] {
    const events = loadFeedbackEvents();
    // Note: We can't reconstruct full Notes from events alone.
    // This exports the event data for analysis; the offline loop
    // would need access to the actual notes store.
    return events.map(e => ({
        request: { id: e.requestId } as Note,
        offer: { id: e.offerId } as Note,
        result: { score: e.score, matches: [], conflicts: [], missing: [] },
        action: e.action,
        timestamp: e.timestamp,
    }));
}

/**
 * Get feedback statistics for UI display
 */
export interface MatchFeedbackStats {
    totalEvents: number;
    acceptCount: number;
    rejectCount: number;
    keyWeights: Record<string, number>;
    operatorWeights: Record<string, number>;
    crossKeyWeights: Record<string, number>;
    matchTypeWeights: Record<string, number>;
    lastUpdated: string;
}

export function getMatchFeedbackStats(): MatchFeedbackStats {
    const events = loadFeedbackEvents();
    const weights = loadPreferenceWeights();

    return {
        totalEvents: events.length,
        acceptCount: events.filter(e => e.action === 'accept').length,
        rejectCount: events.filter(e => e.action === 'reject').length,
        keyWeights: { ...weights.keyWeights },
        operatorWeights: { ...weights.operatorWeights },
        crossKeyWeights: { ...weights.crossKeyWeights },
        matchTypeWeights: { ...weights.matchTypeWeights },
        lastUpdated: weights.updatedAt,
    };
}

export { getMatchFeedbackStats as getFeedbackStats };

/**
 * Clear all feedback data
 */
export function clearFeedbackData(): void {
    if (!isBrowser()) return;
    localStorage.removeItem(FEEDBACK_EVENTS_KEY);
    localStorage.removeItem(PREFERENCE_WEIGHTS_KEY);
    localStorage.removeItem(FEEDBACK_CONFIG_KEY);
}

/**
 * React hook for using match feedback in UI
 */
export function useMatchFeedback() {
    // This is a placeholder for a React hook implementation
    // The actual hook would be in ui/src/hooks/useMatchFeedback.ts
    return {
        recordAccept: (request: Note, offer: Note, result: MatchResult, crossKeyMap?: Record<string, string[]>) =>
            recordMatchFeedback('accept', request, offer, result, crossKeyMap),
        recordReject: (request: Note, offer: Note, result: MatchResult, crossKeyMap?: Record<string, string[]>) =>
            recordMatchFeedback('reject', request, offer, result, crossKeyMap),
        getStats: getMatchFeedbackStats,
        clear: clearFeedbackData,
    };
}
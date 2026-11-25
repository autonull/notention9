/**
 * Match Ranking & Deduplication (W4.2)
 * Improves ordering (recency, distance, constraint coverage) and collapses near-duplicate offers.
 * Integrates learned preference weights from user feedback.
 */

import type { Note, Property } from '../types/index.js';
import type { ScoredMatch } from './bidirectional.js';
import type { MatchResult, PropertyMatch } from './types.js';
import { loadPreferenceWeights, calculatePreferenceBoost } from './feedback.js';
import { getEffectiveCrossKeyMap } from './crossKeyMap.js';
import type { AppSettings } from '../types/ui.js';

export interface RankingConfig {
    /** Weight for match score (0-1) */
    scoreWeight: number;
    /** Weight for recency (0-1) - newer notes rank higher */
    recencyWeight: number;
    /** Weight for constraint coverage (0-1) */
    coverageWeight: number;
    /** Weight for geographic distance (0-1) - closer ranks higher */
    distanceWeight: number;
    /** Maximum age in days for full recency score */
    maxRecencyDays: number;
    /** Maximum distance in km for full distance score */
    maxDistanceKm: number;
}

export const DEFAULT_RANKING_CONFIG: RankingConfig = {
    scoreWeight: 0.5,
    recencyWeight: 0.2,
    coverageWeight: 0.2,
    distanceWeight: 0.1,
    maxRecencyDays: 30,
    maxDistanceKm: 50,
};

/**
 * Compute recency score (0-1) based on note age
 */
export function computeRecencyScore(note: Note, maxDays: number = 30): number {
    const updatedAt = new Date(note.updatedAt).getTime();
    const now = Date.now();
    const ageDays = (now - updatedAt) / (1000 * 60 * 60 * 24);
    return Math.max(0, 1 - ageDays / maxDays);
}

/**
 * Compute constraint coverage score (0-1)
 * Ratio of satisfied required constraints to total required constraints
 */
export function computeCoverageScore(result: MatchResult): number {
    const requiredConstraints = result.matches.filter((m: PropertyMatch) => m.requestProp.role !== 'marker' && m.requestProp.role !== 'fact');
    const satisfiedRequired = requiredConstraints.filter((m: PropertyMatch) => m.compatibility > 0);
    if (requiredConstraints.length === 0) return 1;
    return satisfiedRequired.length / requiredConstraints.length;
}

/**
 * Compute geographic distance score (0-1) if both notes have location properties
 * Returns null if distance cannot be computed
 */
export function computeDistanceScore(request: Note, offer: Note, maxKm: number = 50): number | null {
    const reqLoc = request.properties.find(p => p.key === 'location');
    const offLoc = offer.properties.find(p => p.key === 'location');
    
    if (!reqLoc || !offLoc) return null;
    
    // Parse "lat,lon" or "lat, lon" format
    const parseCoord = (val: string): { lat: number; lon: number } | null => {
        const parts = val.split(',').map(s => parseFloat(s.trim()));
        if (parts.length === 2 && !isNaN(parts[0]) && !isNaN(parts[1])) {
            return { lat: parts[0], lon: parts[1] };
        }
        return null;
    };
    
    const reqCoord = parseCoord(reqLoc.values[0]);
    const offCoord = parseCoord(offLoc.values[0]);
    
    if (!reqCoord || !offCoord) return null;
    
    // Haversine formula
    const R = 6371; // Earth radius in km
    const dLat = (offCoord.lat - reqCoord.lat) * Math.PI / 180;
    const dLon = (offCoord.lon - reqCoord.lon) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(reqCoord.lat * Math.PI/180) * Math.cos(offCoord.lat * Math.PI/180) *
              Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    const distance = R * c;
    
    return Math.max(0, 1 - distance / maxKm);
}

/**
 * Compute combined ranking score for a match
 */
export function computeRankingScore(
    match: ScoredMatch,
    request: Note,
    config: RankingConfig = DEFAULT_RANKING_CONFIG
): number {
    const { scoreWeight, recencyWeight, coverageWeight, distanceWeight, maxRecencyDays, maxDistanceKm } = config;
    
    const scoreComponent = match.result.score * scoreWeight;
    const recencyComponent = computeRecencyScore(match.note, maxRecencyDays) * recencyWeight;
    const coverageComponent = computeCoverageScore(match.result) * coverageWeight;
    
    let distanceComponent = 0;
    const distanceScore = computeDistanceScore(request, match.note, maxDistanceKm);
    if (distanceScore !== null) {
        distanceComponent = distanceScore * distanceWeight;
    }
    
    return scoreComponent + recencyComponent + coverageComponent + distanceComponent;
}

/**
 * Compute ranking score with preference weights applied
 */
export function computeRankingScoreWithPreferences(
    match: ScoredMatch,
    request: Note,
    config: RankingConfig = DEFAULT_RANKING_CONFIG,
    settings?: Partial<AppSettings>
): number {
    const crossKeyMap = getEffectiveCrossKeyMap(settings);
    const baseScore = computeRankingScore(match, request, config);
    
    // Apply preference boost to the match score component
    const weights = loadPreferenceWeights();
    let preferenceBoost = 0;
    let totalCompatibility = 0;
    
    for (const m of match.result.matches) {
        const boost = calculatePreferenceBoost(m, weights, crossKeyMap);
        if (boost !== 0) {
            preferenceBoost += boost;
            totalCompatibility += m.compatibility;
        }
    }
    for (const m of match.result.conflicts) {
        const boost = calculatePreferenceBoost(m, weights, crossKeyMap);
        if (boost !== 0) {
            preferenceBoost += boost;
            totalCompatibility += Math.abs(m.compatibility);
        }
    }
    
    // Normalize boost by total compatibility
    const normalizedBoost = totalCompatibility > 0 ? preferenceBoost / totalCompatibility : 0;
    
    // Apply boost to the score component (which is already weighted by scoreWeight)
    const boostedScoreComponent = Math.max(0, Math.min(1, match.result.score + normalizedBoost)) * config.scoreWeight;
    const originalScoreComponent = match.result.score * config.scoreWeight;
    
    return baseScore - originalScoreComponent + boostedScoreComponent;
}

/**
 * Rank matches using multi-factor scoring
 */
export function rankMatches(
    matches: ScoredMatch[],
    request: Note,
    config: Partial<RankingConfig> = {}
): ScoredMatch[] {
    const fullConfig = { ...DEFAULT_RANKING_CONFIG, ...config };
    
    return matches
        .map(match => ({
            ...match,
            rankingScore: computeRankingScore(match, request, fullConfig),
        }))
        .sort((a, b) => (b.rankingScore ?? 0) - (a.rankingScore ?? 0));
}

/**
 * Rank matches using multi-factor scoring with preference weights
 */
export function rankMatchesWithPreferences(
    matches: ScoredMatch[],
    request: Note,
    config: Partial<RankingConfig> = {},
    settings?: Partial<AppSettings>
): ScoredMatch[] {
    const fullConfig = { ...DEFAULT_RANKING_CONFIG, ...config };
    
    return matches
        .map(match => ({
            ...match,
            rankingScore: computeRankingScoreWithPreferences(match, request, fullConfig, settings),
        }))
        .sort((a, b) => (b.rankingScore ?? 0) - (a.rankingScore ?? 0));
}

/**
 * Check if two notes are near-duplicates based on title and key properties
 * Optimized to avoid creating intermediate Sets
 */
export function areNearDuplicates(noteA: Note, noteB: Note, similarityThreshold = 0.8): boolean {
    // Title similarity (simple Jaccard on words)
    const titleA = noteA.title.toLowerCase().split(/\s+/).filter(w => w.length > 2);
    const titleB = noteB.title.toLowerCase().split(/\s+/).filter(w => w.length > 2);
    
    const titleSetA = new Set(titleA);
    const titleSetB = new Set(titleB);
    let titleIntersection = 0;
    for (const x of titleSetA) {
        if (titleSetB.has(x)) titleIntersection++;
    }
    const titleUnion = titleSetA.size + titleSetB.size - titleIntersection;
    const titleSimilarity = titleUnion > 0 ? titleIntersection / titleUnion : 0;
    
    // Property key overlap
    const keysA = noteA.properties.map(p => p.key);
    const keysB = noteB.properties.map(p => p.key);
    const keysSetB = new Set(keysB);
    let keyIntersection = 0;
    for (const key of keysA) {
        if (keysSetB.has(key)) keyIntersection++;
    }
    const keyUnion = keysA.length + keysB.length - keyIntersection;
    const keySimilarity = keyUnion > 0 ? keyIntersection / keyUnion : 0;
    
    // Combined similarity
    const combinedSimilarity = (titleSimilarity + keySimilarity) / 2;
    
    return combinedSimilarity >= similarityThreshold;
}

/**
 * Deduplicate matches by collapsing near-duplicate offers
 * Keeps the highest-ranked match from each duplicate cluster
 */
export function deduplicateMatches(
    matches: ScoredMatch[],
    request: Note,
    config: Partial<RankingConfig> & { similarityThreshold?: number } = {}
): ScoredMatch[] {
    const { similarityThreshold = 0.85, ...rankingConfig } = config;
    
    // First rank the matches
    const ranked = rankMatches(matches, request, rankingConfig);
    
    // Then deduplicate
    const clusters: ScoredMatch[][] = [];
    const used = new Set<number>();
    
    for (let i = 0; i < ranked.length; i++) {
        if (used.has(i)) continue;
        
        const cluster: ScoredMatch[] = [ranked[i]];
        used.add(i);
        
        for (let j = i + 1; j < ranked.length; j++) {
            if (used.has(j)) continue;
            
            if (areNearDuplicates(ranked[i].note, ranked[j].note, similarityThreshold)) {
                cluster.push(ranked[j]);
                used.add(j);
            }
        }
        
        clusters.push(cluster);
    }
    
    // Keep only the best (first) from each cluster
    return clusters.map(cluster => cluster[0]);
}

/**
 * Enhanced findLocalMatches with ranking and deduping
 */
export interface EnhancedMatchOptions {
    threshold?: number;
    ranking?: Partial<RankingConfig>;
    deduplicate?: boolean | { similarityThreshold?: number };
    usePreferences?: boolean;
    settings?: Partial<AppSettings>;
}

export function findLocalMatchesEnhanced(
    engine: any, // MatchEngine
    note: Note,
    localNotes: Note[],
    options: EnhancedMatchOptions = {}
): ScoredMatch[] {
    const { 
        threshold = 0.3, 
        ranking, 
        deduplicate = true,
        usePreferences = true,
        settings
    } = options;
    
    // Get base matches
    const matches = localNotes
        .filter(other => other.id !== note.id)
        .map(other => {
            const forward = engine.calculateMatchScore(note, other);
            const reverse = engine.calculateMatchScore(other, note);
            
            if (forward.score >= reverse.score) {
                if (forward.score > threshold) {
                    return { note: other, result: forward, direction: 'outgoing' as const };
                }
            } else {
                if (reverse.score > threshold) {
                    return { note: other, result: reverse, direction: 'incoming' as const };
                }
            }
            return null;
        })
        .filter((m): m is ScoredMatch => m !== null);
    
    // Rank with or without preferences
    const ranked = usePreferences
        ? rankMatchesWithPreferences(matches, note, ranking, settings)
        : rankMatches(matches, note, ranking);
    
    // Deduplicate
    if (deduplicate) {
        const dedupeConfig = typeof deduplicate === 'object' ? deduplicate : {};
        return deduplicateMatches(ranked, note, { ...ranking, ...dedupeConfig });
    }
    
    return ranked;
}
/**
 * Shared string matching utilities
 * Consolidates logic from:
 * - core/src/matching/matchers.ts (evaluateString)
 * - core/src/patternRecognition/strategies/matching.ts (matchSimple, matchValues)
 */

import { levenshteinDistance } from '../utils/string.js';
import type { Property } from '../types/domain.js';

/**
 * Normalize a term for comparison (lowercase, trim, canonical mapping)
 */
export function normalizeTerm(term: string, canonicalMap?: Record<string, string>): string {
    if (!term) return '';
    const normalized = term.toLowerCase().trim();
    return canonicalMap?.[normalized] ?? normalized;
}

/**
 * Check if two normalized strings match exactly
 */
export function exactMatch(normalizedA: string, normalizedB: string): boolean {
    return normalizedA === normalizedB;
}

/**
 * Check if one string contains another (case-insensitive by default)
 */
export function containsMatch(haystack: string, needle: string, caseSensitive = false): boolean {
    const normalizedHaystack = caseSensitive ? haystack : haystack.toLowerCase();
    const normalizedNeedle = caseSensitive ? needle : needle.toLowerCase();
    return normalizedHaystack.includes(normalizedNeedle);
}

/**
 * Check if a comma-separated list contains an exact value (for tags)
 */
export function hasMatch(haystack: string, needle: string, caseSensitive = false): boolean {
    const normalizedHaystack = caseSensitive ? haystack : haystack.toLowerCase();
    const normalizedNeedle = caseSensitive ? needle : needle.toLowerCase();
    // Split by comma and check exact membership
    const tags = normalizedHaystack.split(',').map(t => t.trim());
    return tags.includes(normalizedNeedle);
}

/**
 * Calculate fuzzy match score between two strings using Levenshtein distance
 * Returns score 0-1 where 1 = exact match
 */
export function fuzzyMatchScore(
    a: string,
    b: string,
    options?: { maxAllowedDist?: (maxLen: number) => number }
): { score: number; distance: number; maxLen: number } {
    const dist = levenshteinDistance(a, b);
    const maxLen = Math.max(a.length, b.length);
    const maxAllowed = options?.maxAllowedDist?.(maxLen) ?? (maxLen > 7 ? 2 : maxLen > 3 ? 1 : 0);
    
    if (dist === 0) return { score: 1, distance: 0, maxLen };
    if (dist > maxAllowed) return { score: 0, distance: dist, maxLen };
    
    const score = 1 - (dist / maxLen);
    return { score, distance: dist, maxLen };
}

/**
 * Check if strings fuzzy match within allowed distance
 */
export function fuzzyMatch(a: string, b: string, maxAllowedDist?: (maxLen: number) => number): boolean {
    return fuzzyMatchScore(a, b, { maxAllowedDist }).score > 0;
}

/**
 * Comprehensive string match with multiple strategies
 * Returns match result with type and score
 */
export interface StringMatchResult {
    matched: boolean;
    score: number;
    type: 'exact' | 'fuzzy' | 'partial' | 'substring' | 'none';
    reason: string;
}

/** Split comma-separated values and normalize each */
function splitAndNormalize(value: string, canonicalMap: Record<string, string>): string[] {
    return value.split(',').map(v => normalizeTerm(v.trim(), canonicalMap));
}

export function matchStrings(
    requestValue: string,
    offerValue: string,
    operator: string,
    options?: {
        canonicalMap?: Record<string, string>;
        caseSensitive?: boolean;
    }
): StringMatchResult {
    const canonicalMap = options?.canonicalMap ?? {};
    const caseSensitive = options?.caseSensitive ?? false;
    
    const normalizedRequest = normalizeTerm(requestValue, canonicalMap);
    const normalizedOfferParts = splitAndNormalize(offerValue, canonicalMap);
    const normalizedOffer = normalizedOfferParts.join(',');
    
    // Handle "is not" operator
    if (operator === 'is not') {
        const exact = exactMatch(normalizedOffer, normalizedRequest);
        if (exact) {
            return { matched: false, score: -1, type: 'exact', reason: `Exact match violates 'is not'` };
        }
        
        const fuzzy = fuzzyMatch(normalizedOffer, normalizedRequest);
        const contains = containsMatch(normalizedOffer, normalizedRequest, caseSensitive) ||
                         containsMatch(normalizedRequest, normalizedOffer, caseSensitive);
        
        if (fuzzy || contains) {
            return { matched: false, score: -1, type: 'fuzzy', reason: `Soft match violates 'is not'` };
        }
        
        return { matched: true, score: 1, type: 'exact', reason: `No match - satisfies 'is not'` };
    }
    
    // Handle "has" operator (exact tag membership in comma-separated list)
    if (operator === 'has') {
        const has = hasMatch(normalizedOffer, normalizedRequest, caseSensitive);
        if (has) {
            return { matched: true, score: 1, type: 'exact', reason: `Has tag '${requestValue}'` };
        }
        // Failed "has" is a non-match (0), not a conflict (-1)
        return { matched: false, score: 0, type: 'none', reason: `Does not have tag '${requestValue}'` };
    }
    
    // Handle "not has" operator - this IS a negative constraint, so failed match is conflict
    if (operator === 'not has') {
        const has = hasMatch(normalizedOffer, normalizedRequest, caseSensitive);
        if (has) {
            return { matched: false, score: -1, type: 'exact', reason: `Has tag '${requestValue}' violates 'not has'` };
        }
        return { matched: true, score: 1, type: 'exact', reason: `Does not have tag '${requestValue}' - satisfies 'not has'` };
    }

    // Handle "contains" operator - check each part of comma-separated offer value
    if (operator === 'contains') {
        const contains = normalizedOfferParts.some(part => containsMatch(part, normalizedRequest, caseSensitive));
        if (contains) {
            return { matched: true, score: 1, type: 'partial', reason: `Contains '${requestValue}'` };
        }
        // Failed "contains" is a non-match (0), not a conflict (-1)
        // Note: this changes behavior from original - failed positive constraints are "missing", not conflicts
        return { matched: false, score: 0, type: 'none', reason: `Does not contain '${requestValue}'` };
    }
    
    // Handle "excludes" operator - this IS a negative constraint, so failed match is conflict
    if (operator === 'excludes') {
        const contains = normalizedOfferParts.some(part => containsMatch(part, normalizedRequest, caseSensitive));
        if (contains) {
            return { matched: false, score: -1, type: 'partial', reason: `Should exclude '${requestValue}'` };
        }
        return { matched: true, score: 1, type: 'partial', reason: `Excludes '${requestValue}'` };
    }
    
    // Exact match against any part (case-insensitive by default)
    const exactPart = normalizedOfferParts.some(part => exactMatch(part, normalizedRequest));
    if (exactPart) {
        return { matched: true, score: 1, type: 'exact', reason: 'Exact synonym match' };
    }
    
    // Fuzzy match against any part
    let bestFuzzy = { score: 0, distance: 0, maxLen: 0 };
    for (const part of normalizedOfferParts) {
        const fuzzy = fuzzyMatchScore(part, normalizedRequest);
        if (fuzzy.score > bestFuzzy.score) {
            bestFuzzy = fuzzy;
        }
    }
    if (bestFuzzy.score > 0) {
        return { 
            matched: true, 
            score: bestFuzzy.score, 
            type: 'fuzzy', 
            reason: `Fuzzy match (${Math.round(bestFuzzy.score * 100)}%)` 
        };
    }
    
    // Substring match as fallback - check each part
    const substring = normalizedOfferParts.some(part => 
        containsMatch(part, normalizedRequest, caseSensitive) ||
        containsMatch(normalizedRequest, part, caseSensitive)
    );
    if (substring) {
        return { matched: true, score: 0.8, type: 'substring', reason: 'Partial match' };
    }
    
    return { matched: false, score: 0, type: 'none', reason: 'No match' };
}

/**
 * Simple equality-based property matching (no ontology)
 * Matches condition against note properties by key, operator, and value
 */
export function matchPropertySimple(
    noteProperty: { key: string; operator: string; values: string[] },
    condition: { key: string; operator: string; values: string[] },
    caseSensitive = false
): boolean {
    if (noteProperty.key !== condition.key) return false;
    if (noteProperty.operator !== condition.operator) return false;
    
    return condition.values.some(conditionValue =>
        noteProperty.values.some(propValue =>
            matchValues(propValue, conditionValue, caseSensitive)
        )
    );
}

/**
 * Match a single value against an array of values
 * Supports 'ANY' wildcard and substring matching
 */
export function matchValues(
    propValue: string,
    conditionValue: string,
    caseSensitive = false
): boolean {
    if (conditionValue === 'ANY') return true;
    
    const normalizedProp = caseSensitive ? propValue : propValue.toLowerCase();
    const normalizedCondition = caseSensitive ? conditionValue : conditionValue.toLowerCase();
    
    return normalizedProp.includes(normalizedCondition) ||
           normalizedCondition.includes(normalizedProp);
}

/**
 * Filter note properties into facts (role === 'fact' or operator === 'is') and constraints (role === 'constraint')
 * Markers are excluded from both.
 */
export function partitionProperties(properties: Property[]): {
    facts: Property[];
    constraints: Property[];
} {
    const facts: Property[] = [];
    const constraints: Property[] = [];
    
    for (const prop of properties) {
        if (prop.role === 'marker') continue;
        if (prop.role === 'fact' || prop.operator === 'is') {
            facts.push(prop);
        } else {
            constraints.push(prop);
        }
    }
    
    return { facts, constraints };
}

/**
 * Calculate Jaccard similarity between two sets of property keys
 */
export function jaccardSimilarity<T>(setA: Set<T>, setB: Set<T>): number {
    if (setA.size === 0 || setB.size === 0) return 0;
    
    const intersection = new Set([...setA].filter(x => setB.has(x)));
    const union = new Set([...setA, ...setB]);
    
    return intersection.size / union.size;
}

/**
 * Calculate semantic overlap between two notes based on shared property keys
 * Weighted by note priorities
 */
export function calculateSemanticOverlap(
    noteA: { properties: { key: string }[]; priority?: number },
    noteB: { properties: { key: string }[]; priority?: number }
): number {
    const keysA = new Set(noteA.properties.map(p => p.key));
    const keysB = new Set(noteB.properties.map(p => p.key));
    
    if (keysA.size === 0 || keysB.size === 0) return 0;
    
    const baseScore = jaccardSimilarity(keysA, keysB);
    const priorityA = noteA.priority ?? 1.0;
    const priorityB = noteB.priority ?? 1.0;
    
    return baseScore * ((priorityA + priorityB) / 2);
}
/**
 * Shared string matching utilities
 * Consolidates logic from:
 * - core/src/matching/matchers.ts (evaluateString)
 * - core/src/patternRecognition/strategies/matching.ts (matchSimple, matchValues)
 */

import { levenshteinDistance } from '../utils/string.js';

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
    const normalizedOffer = normalizeTerm(offerValue, canonicalMap);
    
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
    
    // Handle "contains" operator
    if (operator === 'contains') {
        const contains = containsMatch(normalizedOffer, normalizedRequest, caseSensitive);
        if (contains) {
            return { matched: true, score: 1, type: 'partial', reason: `Contains '${requestValue}'` };
        }
        return { matched: false, score: -1, type: 'partial', reason: `Does not contain '${requestValue}'` };
    }
    
    // Handle "excludes" operator
    if (operator === 'excludes') {
        const contains = containsMatch(normalizedOffer, normalizedRequest, caseSensitive);
        if (contains) {
            return { matched: false, score: -1, type: 'partial', reason: `Should exclude '${requestValue}'` };
        }
        return { matched: true, score: 1, type: 'partial', reason: `Excludes '${requestValue}'` };
    }
    
    // Exact match (case-insensitive by default)
    if (exactMatch(normalizedOffer, normalizedRequest)) {
        return { matched: true, score: 1, type: 'exact', reason: 'Exact synonym match' };
    }
    
    // Fuzzy match
    const fuzzy = fuzzyMatchScore(normalizedOffer, normalizedRequest);
    if (fuzzy.score > 0) {
        return { 
            matched: true, 
            score: fuzzy.score, 
            type: 'fuzzy', 
            reason: `Fuzzy match (${Math.round(fuzzy.score * 100)}%)` 
        };
    }
    
    // Substring match as fallback
    const substring = containsMatch(normalizedOffer, normalizedRequest, caseSensitive) ||
                      containsMatch(normalizedRequest, normalizedOffer, caseSensitive);
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
 * Filter note properties into facts (operator === 'is') and constraints (operator !== 'is')
 */
export function partitionProperties(properties: { operator: string }[]): {
    facts: typeof properties;
    constraints: typeof properties;
} {
    const facts: typeof properties = [];
    const constraints: typeof properties = [];
    
    for (const prop of properties) {
        if (prop.operator === 'is') {
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
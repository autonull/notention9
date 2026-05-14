import type { Note, Property, OntologyNode } from '../../types/index.js';
import { MatchEngine } from '../../matching/MatchEngine.js';

/**
 * Pattern Matching Utilities
 * 
 * Provides functions for matching notes against pattern conditions.
 */

export interface PatternMatchOptions {
    useOntology?: boolean;
    ontology?: OntologyNode[];
    caseSensitive?: boolean;
}

const DEFAULT_OPTIONS: PatternMatchOptions = {
    useOntology: false,
    caseSensitive: false
};

/**
 * Check if a note matches pattern conditions
 */
export function matchesPatternConditions(
    note: Note,
    conditions: Property[],
    options: PatternMatchOptions = DEFAULT_OPTIONS
): boolean {
    if (options.useOntology && options.ontology) {
        return matchWithOntology(note, conditions, options.ontology);
    }

    return matchSimple(note, conditions, options.caseSensitive ?? false);
}

/**
 * Match using ontology-based matching engine
 */
function matchWithOntology(
    note: Note,
    conditions: Property[],
    ontology: OntologyNode[]
): boolean {
    const requestNote: Note = {
        ...note,
        id: 'condition-request',
        properties: conditions
    };

    const engine = new MatchEngine(ontology);
    const result = engine.calculateMatchScore(requestNote, note);
    const matchedKeys = new Set(result.matches.map(m => m.requestProp.key));

    return conditions.every(c => matchedKeys.has(c.key));
}

/**
 * Simple equality-based matching (fallback)
 */
function matchSimple(
    note: Note,
    conditions: Property[],
    caseSensitive: boolean
): boolean {
    return conditions.every(condition => {
        const matchingProp = note.properties.find(prop =>
            prop.key === condition.key &&
            prop.operator === condition.operator
        );

        if (!matchingProp) return false;

        return condition.values.some(conditionValue =>
            matchValues(conditionValue, matchingProp.values, caseSensitive)
        );
    });
}

/**
 * Match a condition value against property values
 */
function matchValues(
    conditionValue: string,
    propValues: string[],
    caseSensitive: boolean
): boolean {
    if (conditionValue === 'ANY') return true;

    const normalize = caseSensitive
        ? (s: string) => s
        : (s: string) => s.toLowerCase();

    const normalizedCondition = normalize(conditionValue);

    return propValues.some(propValue => {
        const normalizedProp = normalize(propValue);
        return normalizedProp.includes(normalizedCondition) ||
               normalizedCondition.includes(normalizedProp);
    });
}

/**
 * Calculate match score between note and conditions
 */
export function calculatePatternMatchScore(
    note: Note,
    conditions: Property[],
    options: PatternMatchOptions = DEFAULT_OPTIONS
): number {
    if (conditions.length === 0) return 0;

    const matchedCount = conditions.filter(condition =>
        matchesPatternConditions(note, [condition], options)
    ).length;

    return matchedCount / conditions.length;
}

/**
 * Extraction label policy — the single source of truth for key/operator
 * selection and for scoring extractions against annotations.
 *
 * Policy:
 * - A requested or offered service/provider uses `role` (not `need`).
 * - A physical good uses `item`.
 * - A money ceiling ("budget", "under", "willing to pay") uses `budget` + `less than`.
 * - A fixed price tag ("$50", "price is", "free") uses `price` + `is`.
 * - Time windows use `schedule` + `contains`; hard cutoffs use `deadline`.
 * - Only the ontology operators are valid; `equals` is `is`.
 */

import type { Property } from '@notention/core';

export const VALID_OPERATORS = [
    'is', 'is not', 'contains', 'greater than', 'less than',
    'before', 'after', 'near', 'between', 'has', 'not has',
] as const;

export type ValidOperator = typeof VALID_OPERATORS[number];

export const VALID_OPERATOR_SET: ReadonlySet<string> = new Set(VALID_OPERATORS);

/** Corpus shorthand from older annotations; the ontology spells it `is`. */
export const normalizeOperator = (operator: string): string =>
    operator === 'equals' ? 'is' : operator;

export const normalizeProperty = (property: Property): Property => ({
    ...property,
    operator: normalizeOperator(property.operator),
});

/** Operators that assert or qualify the same value; scoring treats them as one family. */
const ASSERTIVE_OPERATORS = new Set(['is', 'equals', 'contains', 'has', 'before', 'after', 'near']);
const COMPARISON_OPERATORS = new Set(['less than', 'greater than', 'between']);

function sameOperatorFamily(actual: string, expected: string): boolean {
    const a = normalizeOperator(actual);
    const e = normalizeOperator(expected);
    if (a === e) return true;
    if (ASSERTIVE_OPERATORS.has(a) && ASSERTIVE_OPERATORS.has(e)) return true;
    return COMPARISON_OPERATORS.has(a) && COMPARISON_OPERATORS.has(e);
}

const CURRENCY = /\b(?:usd|eur|gbp|dollars?|bucks?)\b/g;

export function normalizeValue(value: string): string {
    return value
        .toLowerCase()
        .replace(CURRENCY, ' ')
        .replace(/[$€£]/g, ' ')
        .replace(/[.,;:]+$/g, '')
        .replace(/\s+/g, ' ')
        .trim();
}

const NUMERIC = /^-?\d+(?:\.\d+)?$/;

/** True when one value contains the other; numbers compare exactly. */
export function valuesMatch(actual: string, expected: string): boolean {
    const a = normalizeValue(actual);
    const e = normalizeValue(expected);
    if (a.length === 0 || e.length === 0) return false;
    if (NUMERIC.test(a) && NUMERIC.test(e)) return Number(a) === Number(e);
    if (a === e) return true;
    return a.includes(e) || e.includes(a);
}

/** An actual property satisfies an annotation when key, operator family, and a value agree. */
export function propertyMatches(actual: Property, expected: Property): boolean {
    return actual.key === expected.key
        && sameOperatorFamily(actual.operator, expected.operator)
        && actual.values.some(value => expected.values.some(target => valuesMatch(value, target)));
}

export interface ExtractionScore {
    precision: number;
    recall: number;
    f1: number;
    matched: string[];
    missing: string[];
    extra: string[];
}

const describe = (property: Property): string =>
    `${property.key} ${property.operator} ${property.values.join(', ')}`;

/**
 * One-to-one match of actual properties against annotations. Unmatched actual
 * properties count as false positives; unmatched annotations as false negatives.
 */
export function scoreExtraction(expected: Property[], actual: Property[]): ExtractionScore {
    const remaining = [...actual];
    const matched: string[] = [];
    const missing: string[] = [];

    for (const target of expected) {
        const index = remaining.findIndex(candidate => propertyMatches(candidate, target));
        if (index === -1) {
            missing.push(describe(target));
        } else {
            matched.push(describe(target));
            remaining.splice(index, 1);
        }
    }

    const truePositives = matched.length;
    const precision = actual.length > 0 ? truePositives / actual.length : (expected.length === 0 ? 1 : 0);
    const recall = expected.length > 0 ? truePositives / expected.length : 1;
    const f1 = precision + recall > 0 ? (2 * precision * recall) / (precision + recall) : 0;

    return { precision, recall, f1, matched, missing, extra: remaining.map(describe) };
}

/** True when every annotation matched and no forbidden property was emitted. */
export function satisfiesAnnotations(expected: Property[], actual: Property[]): boolean {
    return scoreExtraction(expected, actual).missing.length === 0;
}

const UNGROUNDED_VALUES = new Set(['yes', 'no', 'true', 'false', 'none', 'null']);

/** Classifier keys whose values are labels, not quotes from the note. */
const CATEGORICAL_KEYS = new Set(['intent']);

/** True when at least one token of `value` appears in `text`, after unit normalization. */
export function isGrounded(value: string, text: string): boolean {
    const normalizedText = normalizeValue(text).replace(/[-_/]+/g, ' ');
    const normalizedValue = normalizeValue(value).replace(/[-_/]+/g, ' ');
    if (normalizedValue.length === 0 || UNGROUNDED_VALUES.has(normalizedValue)) return false;
    if (NUMERIC.test(normalizedValue)) return normalizedText.split(' ').includes(normalizedValue);
    return normalizedValue
        .split(/[^a-z0-9.@]+/)
        .filter(token => token.length >= 2)
        .some(token => normalizedText.includes(token));
}

/**
 * Drop properties whose values do not occur in the input. A small model copies
 * keys and values from few-shot examples; grounding keeps only what the note states.
 */
export function pruneUngrounded(properties: Property[], text: string): Property[] {
    return properties.filter(property =>
        CATEGORICAL_KEYS.has(property.key)
        || property.values.some(value => isGrounded(value, text))
    );
}

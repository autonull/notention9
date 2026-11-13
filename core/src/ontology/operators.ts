import type { OntologyAttribute } from '../types/index.js';

export interface OperatorPair {
    real: string[];
    imaginary: string[];
}

/**
 * Operator vocabulary per property type (RDFS/OWL-style datatype facets).
 *
 * An attribute inherits these operators from its `type`. Declare `operators`
 * on an attribute only to narrow or override the type's vocabulary.
 */
export const DEFAULT_OPERATORS_BY_TYPE: Record<string, OperatorPair> = {
    string: { real: ['is', 'contains'], imaginary: ['is not'] },
    number: { real: ['is', 'greater than', 'less than', 'between'], imaginary: [] },
    quantity: { real: ['is', 'greater than', 'less than', 'between'], imaginary: [] },
    date: { real: ['is', 'before', 'after'], imaginary: [] },
    datetime: { real: ['is', 'before', 'after'], imaginary: [] },
    geo: { real: ['is', 'near'], imaginary: [] },
    enum: { real: ['is'], imaginary: ['is not'] },
    boolean: { real: ['is'], imaginary: ['is not'] },
    relationship: { real: ['has'], imaginary: ['not has'] },
};

const FALLBACK_OPERATORS: OperatorPair = DEFAULT_OPERATORS_BY_TYPE.string;

/**
 * Resolve an attribute's operators: explicit overrides win; absent fields fall
 * back to the attribute type's vocabulary.
 */
export function getEffectiveOperators(attribute: OntologyAttribute): OperatorPair {
    const defaults = DEFAULT_OPERATORS_BY_TYPE[attribute.type] ?? FALLBACK_OPERATORS;
    return {
        real: attribute.operators?.real ?? defaults.real,
        imaginary: attribute.operators?.imaginary ?? defaults.imaginary,
    };
}

export function getAllOperators(attribute: OntologyAttribute): string[] {
    const { real, imaginary } = getEffectiveOperators(attribute);
    return [...real, ...imaginary];
}

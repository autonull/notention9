import type { Property } from '../types/index.js';

const UNGROUNDED_VALUES = new Set(['yes', 'no', 'true', 'false', 'none', 'null']);
const CATEGORICAL_KEYS = new Set(['intent']);

const NUMERIC = /^[0-9]+(\.[0-9]+)?$/;

function normalizeValue(value: string): string {
    return value.toLowerCase().trim();
}

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
 * Find the source span for a value in the text. Returns [startIndex, endIndex] or null.
 */
function findValueSpan(value: string, text: string): [number, number] | null {
    const normalizedText = normalizeValue(text).replace(/[-_/]+/g, ' ');
    const normalizedValue = normalizeValue(value).replace(/[-_/]+/g, ' ');
    if (normalizedValue.length === 0) return null;
    
    const index = normalizedText.indexOf(normalizedValue);
    if (index === -1) return null;
    
    // Map back to original text positions (approximate)
    // Find the first occurrence in the original text (case-insensitive)
    const originalIndex = text.toLowerCase().indexOf(value.toLowerCase());
    if (originalIndex === -1) return null;
    
    return [originalIndex, originalIndex + value.length];
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

/**
 * Prune ungrounded properties and attach source spans to grounded ones.
 */
export function pruneUngroundedWithSpans(properties: Property[], text: string): Property[] {
    return properties
        .filter(property =>
            CATEGORICAL_KEYS.has(property.key)
            || property.values.some(value => isGrounded(value, text))
        )
        .map(property => {
            if (CATEGORICAL_KEYS.has(property.key)) {
                return { ...property, sourceSpan: undefined, sourceText: undefined };
            }
            
            // Find span for the first grounded value
            for (const value of property.values) {
                const span = findValueSpan(value, text);
                if (span) {
                    return { ...property, sourceSpan: span, sourceText: value };
                }
            }
            return property;
        });
}
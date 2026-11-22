import type {OntologyAttribute} from '@notention/core';

/**
 * Enums guide the vocabulary; they do not own it. A value outside the listed
 * options stays usable as a custom value instead of blocking the edit.
 */
export function isCustomEnumValue(definition: OntologyAttribute | undefined, value: string): boolean {
    if (definition?.type !== 'enum' || !value.trim()) return false;
    const options = definition.options ?? [];
    return options.length > 0 && !options.includes(value.trim());
}

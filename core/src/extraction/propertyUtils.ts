/**
 * Shared property extraction utilities
 * Consolidates addProperty logic used across multiple extraction stages
 */

import type { Property } from '../types/index.js';

/**
 * Unique ID separator for property map keys
 * Uses null character to avoid collisions with user-provided keys
 */
export const PROP_ID_SEPARATOR = '\u0000';

/**
 * Generate a unique ID for a property key+operator combination
 */
export function makePropertyId(key: string, operator: string): string {
    return `${key}${PROP_ID_SEPARATOR}${operator}`;
}

/**
 * Parse a property ID back into key and operator
 */
export function parsePropertyId(id: string): { key: string; operator: string } {
    const idx = id.indexOf(PROP_ID_SEPARATOR);
    if (idx === -1) return { key: id, operator: 'is' };
    return { key: id.slice(0, idx), operator: id.slice(idx + 1) };
}

/**
 * Add a property to a Map with deduplication by key+operator
 * Merges values if the same key+operator already exists
 */
export function addProperty(
    properties: Map<string, Property>,
    key: string,
    operator: string,
    value: string
): void {
    const values = value.split(',').map(part => part.trim()).filter(Boolean);
    if (values.length === 0) return;
    
    const id = makePropertyId(key, operator);
    const existing = properties.get(id);
    if (existing) {
        values.forEach(v => { if (!existing.values.includes(v)) existing.values.push(v); });
        return;
    }
    properties.set(id, { key, operator, values });
}

/**
 * Add multiple values to an existing property or create new
 */
export function addPropertyValues(
    properties: Map<string, Property>,
    key: string,
    operator: string,
    values: string[]
): void {
    if (values.length === 0) return;
    const id = makePropertyId(key, operator);
    const existing = properties.get(id);
    if (existing) {
        values.forEach(v => { if (!existing.values.includes(v)) existing.values.push(v); });
        return;
    }
    properties.set(id, { key, operator, values: [...values] });
}

/**
 * Get all properties from a Map as an array
 */
export function getProperties(properties: Map<string, Property>): Property[] {
    return Array.from(properties.values());
}

/**
 * Check if a property with key+operator exists
 */
export function hasProperty(properties: Map<string, Property>, key: string, operator: string): boolean {
    return properties.has(makePropertyId(key, operator));
}

/**
 * Remove a property by key+operator
 */
export function removeProperty(properties: Map<string, Property>, key: string, operator: string): boolean {
    return properties.delete(makePropertyId(key, operator));
}

/**
 * Get a property by key+operator
 */
export function getProperty(properties: Map<string, Property>, key: string, operator: string): Property | undefined {
    return properties.get(makePropertyId(key, operator));
}

/**
 * Check if a property with key+operator exists in an array
 */
export function hasPropertyArray(properties: Property[], key: string, operator: string): boolean {
    return properties.some(p => p.key === key && p.operator === operator);
}
import type { StrategySpec } from './spec/types.js';
import builtinSpecsJson from './test-data/builtin-specs.json' with { type: 'json' };

/**
 * Built-in strategy specification type
 */
export type BuiltinSpec = StrategySpec;

/**
 * Built-in strategy specifications
 * Single source of truth for strategy specs used by synthesis and gates
 * Specs are loaded from JSON files in test-data/
 */

export const BUILTIN_SPECS: Record<string, StrategySpec> = builtinSpecsJson as Record<string, StrategySpec>;

/**
 * Roles that have built-in specs available
 */
export const ROLES_WITH_BUILTIN_SPECS = new Set([
    'capture',
    'elicit',
    'extraction',
    'template',
]);

/**
 * Get a built-in spec by seam ID
 */
export function getBuiltinSpec(seamId: string): StrategySpec | undefined {
    return BUILTIN_SPECS[seamId];
}

/**
 * Check if a seam role has a built-in spec
 */
export function hasBuiltinSpec(role: string): boolean {
    return ROLES_WITH_BUILTIN_SPECS.has(role);
}

/**
 * Get all built-in specs
 */
export function getAllBuiltinSpecs(): StrategySpec[] {
    return Object.values(BUILTIN_SPECS);
}
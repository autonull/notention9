/**
 * Candidate Validation Utilities
 * Shared validation logic for optimizer candidates
 * Eliminates duplicate validatePatch implementations
 */

import type { ParamSpec } from '../schemas/paramSpec.js';

/**
 * Validate a parameter patch against a ParamSpec
 * Returns validation result with any errors
 */
export function validatePatch(
    paramSpec: ParamSpec,
    patch: Record<string, unknown>
): { valid: boolean; errors: string[] } {
    const errors: string[] = [];
    for (const [key, value] of Object.entries(patch)) {
        const def = paramSpec[key];
        if (!def) {
            errors.push(`Unknown parameter: ${key}`);
            continue;
        }
        switch (def.type) {
            case 'number':
                if (typeof value !== 'number') {
                    errors.push(`${key} must be a number`);
                } else {
                    if (def.min !== undefined && value < def.min) {
                        errors.push(`${key} below minimum ${def.min}`);
                    }
                    if (def.max !== undefined && value > def.max) {
                        errors.push(`${key} above maximum ${def.max}`);
                    }
                }
                break;
            case 'boolean':
                if (typeof value !== 'boolean') {
                    errors.push(`${key} must be a boolean`);
                }
                break;
            case 'enum':
                if (!def.options?.includes(value as string)) {
                    errors.push(`${key} must be one of ${def.options?.join(', ')}`);
                }
                break;
            case 'string':
                if (typeof value !== 'string') {
                    errors.push(`${key} must be a string`);
                }
                break;
        }
    }
    return { valid: errors.length === 0, errors };
}

/**
 * Create a candidate object with standard provenance
 */
export interface CandidateCreationOptions {
    strategyRole: string;
    strategyId: string;
    patch: Record<string, unknown>;
    paramSpec: ParamSpec;
    generator: 'grid' | 'random' | 'model' | 'human' | 'friction';
    seed?: number;
    model?: string;
    extra?: Record<string, unknown>;
}

export function createCandidate({
    strategyRole,
    strategyId,
    patch,
    paramSpec,
    generator,
    seed = 42,
    model,
    extra = {},
}: CandidateCreationOptions): {
    id: string;
    seamRole: string;
    strategyId: string;
    patch: Record<string, unknown>;
    paramSpec: ParamSpec;
    provenance: {
        generator: 'grid' | 'random' | 'model' | 'human' | 'friction';
        model?: string;
        seed: number;
        generatedAt: string;
        [key: string]: unknown;
    };
} {
    return {
        id: `cand_${strategyRole}_${strategyId}_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`,
        seamRole: strategyRole,
        strategyId,
        patch,
        paramSpec,
        provenance: {
            generator,
            seed,
            generatedAt: new Date().toISOString(),
            ...(model && { model }),
            ...extra,
        },
    };
}

import { createHash } from 'node:crypto';

/**
 * Hash a patch object for caching/deduplication (SHA256, first 16 chars)
 */
export function hashPatch(patch: Record<string, unknown>): string {
    return createHash('sha256').update(JSON.stringify(patch, Object.keys(patch).sort())).digest('hex').slice(0, 16);
}
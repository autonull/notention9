import {
    type OptimizerCandidate,
    type CandidateProvenance,
    type StrategyParamConfig,
    type ParamSpec,
} from '../types/index.js';
import { createHash } from 'node:crypto';

/**
 * Enumerate candidates from a strategy's ParamSpec using grid search
 * For each param, use default + boundaries + some intermediate values
 */
export function enumerateCandidatesFromParamSpec(
    strategy: StrategyParamConfig,
    maxCandidates: number
): OptimizerCandidate[] {
    const paramSpec = strategy.paramSpec;
    const defaultProps = strategy.defaultProps;
    const candidates: OptimizerCandidate[] = [];

    // Get all parameter keys and their possible values
    const paramKeys = Object.keys(paramSpec);
    if (paramKeys.length === 0) {
        return candidates; // No tunable parameters
    }

    // Build value grid for each parameter
    const valueGrids: Record<string, unknown[]> = {};
    for (const key of paramKeys) {
        const def = paramSpec[key];
        const defaultValue = defaultProps[key] ?? def.default;
        const values = new Set<unknown>();
        values.add(defaultValue);

        // Add boundary values based on type
        switch (def.type) {
            case 'number':
                if (def.min !== undefined) values.add(def.min);
                if (def.max !== undefined) values.add(def.max);
                // Add midpoint if both bounds exist
                if (def.min !== undefined && def.max !== undefined) {
                    values.add((def.min + def.max) / 2);
                }
                break;
            case 'boolean':
                values.add(true);
                values.add(false);
                break;
            case 'enum':
                if (def.options) {
                    for (const opt of def.options) values.add(opt);
                }
                break;
            case 'string':
                // For strings, only use default unless there are explicit options
                break;
        }
        valueGrids[key] = Array.from(values);
    }

    // Generate Cartesian product (limited by maxCandidates)
    const keys = Object.keys(valueGrids);
    const generateCombinations = (index: number, current: Record<string, unknown>): void => {
        if (candidates.length >= maxCandidates) return;
        if (index === keys.length) {
            // Skip the all-defaults combination (that's the incumbent)
            const isAllDefaults = keys.every(k => {
                const defaultVal = (defaultProps as Record<string, unknown>)[k];
                const paramDefault = paramSpec[k]?.default;
                return current[k] === (defaultVal ?? paramDefault);
            });
            if (!isAllDefaults) {
                candidates.push(createCandidate(strategy, current));
            }
            return;
        }
        const key = keys[index];
        for (const value of valueGrids[key]) {
            current[key] = value;
            generateCombinations(index + 1, { ...current });
            if (candidates.length >= maxCandidates) return;
        }
    };

    generateCombinations(0, {});
    return candidates;
}

function createCandidate(strategy: StrategyParamConfig, patch: Record<string, unknown>): OptimizerCandidate {
    return {
        id: `cand_${strategy.seam.role}_${strategy.id}_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`,
        seamRole: strategy.seam.role,
        strategyId: strategy.id,
        patch,
        paramSpec: strategy.paramSpec,
        provenance: {
            generator: 'grid',
            seed: 42,
            generatedAt: new Date().toISOString(),
        },
    };
}

/**
 * Validate a patch against a ParamSpec
 */
export function validatePatch(paramSpec: ParamSpec, patch: Record<string, unknown>): { valid: boolean; errors: string[] } {
    const errors: string[] = [];
    for (const [key, value] of Object.entries(patch)) {
        const def = paramSpec[key];
        if (!def) {
            errors.push(`Unknown parameter: ${key}`);
            continue;
        }
        switch (def.type) {
            case 'number':
                if (typeof value !== 'number') errors.push(`${key} must be a number`);
                else {
                    if (def.min !== undefined && value < def.min) errors.push(`${key} below minimum ${def.min}`);
                    if (def.max !== undefined && value > def.max) errors.push(`${key} above maximum ${def.max}`);
                }
                break;
            case 'boolean':
                if (typeof value !== 'boolean') errors.push(`${key} must be a boolean`);
                break;
            case 'enum':
                if (!def.options?.includes(value as string)) errors.push(`${key} must be one of ${def.options?.join(', ')}`);
                break;
            case 'string':
                if (typeof value !== 'string') errors.push(`${key} must be a string`);
                break;
        }
    }
    return { valid: errors.length === 0, errors };
}

/**
 * Create a deterministic hash for a patch object
 */
export function hashPatch(patch: Record<string, unknown>): string {
    return createHash('sha256').update(JSON.stringify(patch, Object.keys(patch).sort())).digest('hex').slice(0, 16);
}
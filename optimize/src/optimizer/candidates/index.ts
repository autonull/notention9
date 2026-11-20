import {
    type OptimizerCandidate,
    type CandidateProvenance,
    type StrategyParamConfig,
    type ParamSpec,
} from '../types/index.js';
import { validatePatch, hashPatch, createCandidate as coreCreateCandidate } from '@notention/core/utils';

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
    return coreCreateCandidate({
        strategyRole: strategy.seam.role,
        strategyId: strategy.id,
        patch,
        paramSpec: strategy.paramSpec,
        generator: 'grid',
        seed: 42,
    }) as OptimizerCandidate;
}

/**
 * Validate a patch against a ParamSpec
 * Re-exported from core for single source of truth
 */
export { validatePatch } from '@notention/core/utils';

/**
 * Create a deterministic hash for a patch object
 * Re-exported from core for single source of truth
 */
export { hashPatch } from '@notention/core/utils';
import type {ParamSpec, Seam} from '@notention/core/ui/strategy';
import {STRATEGY_CONFIGS} from '@notention/core/schemas/generated/seam-definitions';
import {componentMap} from './componentMap.js';

/**
 * UI-specific strategy configuration
 *
 * SINGLE SOURCE OF TRUTH: core/src/schemas/generated/seam-definitions.ts
 * Generated configs carry flat seam fields (seamId/seamName/seamRole); the UI
 * registry API expects a nested `seam`, so createStrategyConfigs adapts below.
 */
export interface StrategyConfig {
    id: string;
    seam: Pick<Seam, 'id' | 'name' | 'role'>;
    version: string;
    paramSpec: ParamSpec;
    defaultProps: Record<string, unknown>;
    componentPath: string;
    componentName: string;
}

export const STRATEGY_CONFIGS_UI: StrategyConfig[] = STRATEGY_CONFIGS.map(({seamId, seamName, seamRole, ...generated}) => {
    const componentInfo = componentMap[generated.id] ?? {path: '', name: ''};
    return {
        ...generated,
        seam: {id: seamId, name: seamName, role: seamRole as Seam['role']},
        componentPath: componentInfo.path,
        componentName: componentInfo.name,
        paramSpec: generated.paramSpec as ParamSpec,
    };
});

/**
 * Get a strategy config by ID
 */
export function getStrategyConfig(id: string): StrategyConfig | undefined {
    return STRATEGY_CONFIGS_UI.find(c => c.id === id);
}

/**
 * Get all strategy configs for a given seam role
 */
export function getStrategyConfigsByRole(role: Seam['role']): StrategyConfig[] {
    return STRATEGY_CONFIGS_UI.filter(c => c.seam.role === role);
}

/**
 * Get all strategy configs
 */
export function getAllStrategyConfigs(): StrategyConfig[] {
    return STRATEGY_CONFIGS_UI;
}

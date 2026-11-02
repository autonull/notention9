import type { Seam, StrategyConfig as CoreStrategyConfig } from '@notention/core/ui/strategy';
import { STRATEGY_CONFIGS } from '@notention/core/schemas/generated/seam-definitions';
import { componentMap } from './componentMap.js';

/**
 * UI-specific strategy configuration
 * Extends core ParamSpecs with component paths and names
 * 
 * SINGLE SOURCE OF TRUTH: core/src/schemas/generated/seam-definitions.ts
 * This file adds component paths/names for UI registration.
 */
export interface StrategyConfig extends CoreStrategyConfig {
    componentPath: string;
    componentName: string;
}

function createStrategyConfig(
    coreConfig: CoreStrategyConfig,
    componentPath: string,
    componentName: string
): StrategyConfig {
    return {
        ...coreConfig,
        componentPath,
        componentName,
    };
}

export const STRATEGY_CONFIGS_UI: StrategyConfig[] = STRATEGY_CONFIGS.map(coreConfig => {
    const componentInfo = componentMap[coreConfig.id];
    return createStrategyConfig(
        coreConfig,
        componentInfo?.path ?? '',
        componentInfo?.name ?? ''
    );
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
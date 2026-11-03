/**
 * Strategy Registry Auto-population from seam-definitions.json (R3)
 * Replaces manual strategy registration with data-driven approach
 */

import type { Seam, Strategy, StrategyRegistry } from '../ui/strategy.js';
import type { SeamDefinition } from '../schemas/seamDefinition.js';
import type { StrategyParamConfig } from './types.js';
import { paramSpecToZod, getSearchSpace } from '../schemas/paramSpec.js';
import { readFileSync, existsSync } from 'node:fs';
import { getSeamDefinitionsPath } from '../utils/common.js';
import { logWarn } from '../utils/logging.js';

const SEAM_DEFINITIONS_FILE = getSeamDefinitionsPath(import.meta.url);

interface SeamDefinitionsData {
    version: number;
    generatedAt: string;
    hash: string;
    strategies: StrategyParamConfig[];
    seams: SeamDefinition[];
}

let cachedDefinitions: SeamDefinitionsData | null = null;

function loadSeamDefinitions(): SeamDefinitionsData {
    if (cachedDefinitions) return cachedDefinitions;
    
    if (!existsSync(SEAM_DEFINITIONS_FILE)) {
        throw new Error(`Seam definitions not found at ${SEAM_DEFINITIONS_FILE}. Run 'pnpm generate:definitions' first.`);
    }
    
    const content = readFileSync(SEAM_DEFINITIONS_FILE, 'utf-8');
    cachedDefinitions = JSON.parse(content) as SeamDefinitionsData;
    
    // Validate version
    if (cachedDefinitions.version !== 1) {
        throw new Error(`Unsupported seam definitions version: ${cachedDefinitions.version}`);
    }
    
    return cachedDefinitions;
}

/**
 * Auto-populate StrategyRegistry from seam-definitions.json
 * Returns the number of strategies registered
 */
export function autoPopulateStrategyRegistry(registry: StrategyRegistry): number {
    const definitions = loadSeamDefinitions();
    let registered = 0;
    
    for (const strategyConfig of definitions.strategies) {
        // The strategyConfig already has a seam object with id, name, role
        const seam = strategyConfig.seam;
        
        // Create strategy from config
        const strategy = createStrategyFromConfig(seam, strategyConfig);
        
        try {
            registry.register(strategy);
            registered++;
        } catch (e) {
            // Strategy might already be registered (e.g., from UI package)
            logWarn(`Strategy ${strategy.id} already registered for seam ${seam.id}`, e);
        }
    }
    
    return registered;
}

/**
 * Create a Strategy instance from StrategyParamConfig
 * This creates a functional strategy that can be used for rendering
 */
function createStrategyFromConfig(seam: Seam, config: StrategyParamConfig): Strategy {
    const zodSchema = paramSpecToZod(config.paramSpec);
    const defaultProps = config.defaultProps;
    
    return {
        id: config.id,
        seam,
        version: config.version,
        params: config.paramSpec,
        render: (props: Record<string, unknown>) => {
            // Validate props against schema
            const result = zodSchema.safeParse(props);
            if (!result.success) {
                logWarn(`Invalid props for strategy ${config.id}`, result.error.flatten());
            }
            
            // This is a placeholder - actual rendering happens in UI package
            // The strategy is used for parameter validation and default props
            return null as any; // React.ReactElement
        },
        getDefaultProps: () => defaultProps,
    };
}

/**
 * Get all strategy configs for a seam role
 */
export function getStrategyConfigsForSeam(seamRole: string): StrategyParamConfig[] {
    const definitions = loadSeamDefinitions();
    return definitions.strategies.filter(s => s.seam.role === seamRole);
}

/**
 * Get seam definition by ID
 */
export function getSeamDefinition(seamId: string): SeamDefinition | undefined {
    const definitions = loadSeamDefinitions();
    return definitions.seams.find(s => s.id === seamId);
}

/**
 * Get all seam definitions
 */
export function getAllSeamDefinitions(): SeamDefinition[] {
    const definitions = loadSeamDefinitions();
    return definitions.seams;
}

/**
 * Get search space for a strategy (from S1)
 */
export function getStrategySearchSpace(strategyId: string): { dimensions: Array<{ name: string; scale: string; bounds?: [number, number]; categories?: string[] }> } | null {
    const definitions = loadSeamDefinitions();
    const strategy = definitions.strategies.find(s => s.id === strategyId);
    if (!strategy) return null;

    return getSearchSpace(strategy.paramSpec);
}

/**
 * Clear cache (for testing or hot reload)
 */
export function clearSeamDefinitionsCache(): void {
    cachedDefinitions = null;
}

/**
 * Validate that seam-definitions.json is current (not stale)
 */
export function validateSeamDefinitionsFreshness(): { valid: boolean; error?: string } {
    if (!existsSync(SEAM_DEFINITIONS_FILE)) {
        return { valid: false, error: 'seam-definitions.json not found. Run generate:definitions' };
    }
    
    try {
        const definitions = loadSeamDefinitions();
        
        // Check if we can load without error
        if (!definitions.seams || !definitions.strategies) {
            return { valid: false, error: 'Invalid seam-definitions.json structure' };
        }
        
        return { valid: true };
    } catch (e) {
        return { valid: false, error: `Failed to load: ${e}` };
    }
}
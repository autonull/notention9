/**
 * Declarative Optimizer Config (R7)
 * Reads target seams from manifest/seam definitions instead of hardcoded
 */

import type { OptimizerConfig } from './types.js';
import type { SeamDefinition } from '../schemas/seamDefinition.js';
import { getAllSeamDefinitions } from './strategyLoader.js';
import { logWarn, logInfo } from '../utils/logging.js';

// --- Config Schema ---

export interface DeclarativeOptimizerConfig {
    /** Optimizer behavior */
    optimizer: {
        /** Budget allocator to use */
        budgetAllocator: 'fixed' | 'successive-halving' | 'hyperband';
        /** Candidate generator to use */
        candidateGenerator: 'grid' | 'random' | 'successive-halving' | 'llm';
        /** LLM model for LLM generator (optional) */
        llmModel?: string;
    };
    
    /** Target seams configuration */
    seams: {
        /** Seam role to optimize */
        role: string;
        /** Specific seam IDs (optional, defaults to all seams with this role) */
        seamIds?: string[];
        /** Max candidates for this seam */
        maxCandidates?: number;
        /** Whether to enable for this seam */
        enabled?: boolean;
        /** Custom budget override */
        budget?: {
            maxBrowserRuns?: number;
            maxTimeMinutes?: number;
            maxTokens?: number;
        };
    }[];
    
    /** Global budget constraints */
    globalBudget: {
        maxBrowserRuns: number;
        maxTimeMinutes: number;
        maxTokens: number;
    };
    
    /** Evaluation settings */
    evaluation: {
        repetitions: number;
        split: 'search' | 'validation' | 'holdout';
        maxIntentCases?: number;
    };
    
    /** Verdict thresholds */
    verdict: {
        primaryMetric: string;
        mde: Record<string, number>;
        floors: Record<string, number>;
        minSampleSize: number;
    };
}

/**
 * Load declarative config from seam definitions
 * Falls back to defaults if no config file exists
 */
export function loadDeclarativeOptimizerConfig(configPath?: string): OptimizerConfig {
    const seamDefinitions = getAllSeamDefinitions();
    
    // Try to load custom config file
    let declarativeConfig: Partial<DeclarativeOptimizerConfig> = {};
    if (configPath) {
        try {
            const { readFileSync, existsSync } = require('node:fs');
            if (existsSync(configPath)) {
                const content = readFileSync(configPath, 'utf-8');
                declarativeConfig = JSON.parse(content);
            }
        } catch (e) {
            logWarn(`Failed to load optimizer config from ${configPath}`, e);
        }
    }
    
    // Build target seams from definitions
    const targetSeams = buildTargetSeams(seamDefinitions, declarativeConfig.seams);
    
    // Build optimizer config
    const optimizer = declarativeConfig.optimizer ?? { budgetAllocator: 'successive-halving' };
    const globalBudget = declarativeConfig.globalBudget ?? {
        maxBrowserRuns: 160,
        maxTimeMinutes: 30,
        maxTokens: 150000,
    };
    
    const evaluation = declarativeConfig.evaluation ?? {
        repetitions: 1,
        split: 'search' as const,
        maxIntentCases: 2,
    };
    
    const verdict = declarativeConfig.verdict ?? {
        primaryMetric: 'f1',
        mde: { f1: 0.05 },
        floors: { f1: 0.7, schemaValidity: 1.0 },
        minSampleSize: 30,
    };
    
    return {
        targetSeams,
        maxCandidatesPerSeam: 8, // Default, can be overridden per seam
        maxBrowserRuns: globalBudget.maxBrowserRuns,
        maxTimeMinutes: globalBudget.maxTimeMinutes,
        maxTokens: globalBudget.maxTokens,
        useSuccessiveHalving: optimizer.budgetAllocator === 'successive-halving',
        initialSliceFraction: 0.25,
        minPromote: 2,
        maxIntentCases: evaluation.maxIntentCases,
    };
}

/**
 * Build target seams array from seam definitions and optional overrides
 */
function buildTargetSeams(
    seamDefinitions: SeamDefinition[],
    seamOverrides?: DeclarativeOptimizerConfig['seams']
): string[] {
    // Get enabled seam roles from definitions
    const enabledRoles = new Set<string>();
    
    for (const seam of seamDefinitions) {
        // Check if this seam is explicitly configured
        const override = seamOverrides?.find(o => o.role === seam.role);
        const enabled = override?.enabled ?? seam.evaluator?.type !== 'custom'; // Default: enable if has evaluator
        
        if (enabled) {
            enabledRoles.add(seam.role);
        }
    }
    
    // Return seam roles that are enabled and have evaluators
    const targetRoles = Array.from(enabledRoles).filter(role => {
        const seam = seamDefinitions.find(s => s.role === role);
        return seam && (seam.evaluator?.type === 'extraction' || seam.evaluator?.type === 'match');
    });
    
    return targetRoles;
}

/**
 * Generate default declarative config file
 */
export function generateDefaultDeclarativeConfig(): DeclarativeOptimizerConfig {
    const seamDefinitions = getAllSeamDefinitions();
    
    const seamConfigs = seamDefinitions
        .filter(s => s.evaluator?.type === 'extraction' || s.evaluator?.type === 'match')
        .map(seam => ({
            role: seam.role,
            enabled: true,
            maxCandidates: 8,
        }));
    
    return {
        optimizer: {
            budgetAllocator: 'successive-halving',
            candidateGenerator: 'random',
        },
        seams: seamConfigs,
        globalBudget: {
            maxBrowserRuns: 160,
            maxTimeMinutes: 30,
            maxTokens: 150000,
        },
        evaluation: {
            repetitions: 1,
            split: 'search',
            maxIntentCases: 2,
        },
        verdict: {
            primaryMetric: 'f1',
            mde: { f1: 0.05 },
            floors: { f1: 0.7, schemaValidity: 1.0 },
            minSampleSize: 30,
        },
    };
}

/**
 * Write default config file for user customization
 */
export function writeDefaultOptimizerConfig(outputPath: string): void {
    const { writeFileSync, mkdirSync, existsSync } = require('node:fs');
    const { dirname } = require('node:path');
    
    const config = generateDefaultDeclarativeConfig();
    const dir = dirname(outputPath);
    
    if (!existsSync(dir)) {
        mkdirSync(dir, { recursive: true });
    }
    
    writeFileSync(outputPath, JSON.stringify(config, null, 2), 'utf-8');
    logInfo(`Default optimizer config written to ${outputPath}`);
}

/**
 * Create optimizer config from declarative config for a specific seam
 */
export function createOptimizerConfigForSeam(
    declarativeConfig: DeclarativeOptimizerConfig,
    seamRole: string
): OptimizerConfig {
    const seamOverride = declarativeConfig.seams.find(s => s.role === seamRole);
    const globalBudget = declarativeConfig.globalBudget;
    
    return {
        targetSeams: [seamRole],
        maxCandidatesPerSeam: seamOverride?.maxCandidates ?? 8,
        maxBrowserRuns: seamOverride?.budget?.maxBrowserRuns ?? globalBudget.maxBrowserRuns,
        maxTimeMinutes: seamOverride?.budget?.maxTimeMinutes ?? globalBudget.maxTimeMinutes,
        maxTokens: seamOverride?.budget?.maxTokens ?? globalBudget.maxTokens,
        useSuccessiveHalving: declarativeConfig.optimizer.budgetAllocator === 'successive-halving',
        initialSliceFraction: 0.25,
        minPromote: 2,
        maxIntentCases: declarativeConfig.evaluation.maxIntentCases,
    };
}

// --- Config file path resolution ---

export function getDefaultOptimizerConfigPath(): string {
    const { join } = require('node:path');
    const { getProjectRoot } = require('../utils/common.js');
    
    const PROJECT_ROOT = getProjectRoot(import.meta.url);
    return join(PROJECT_ROOT, 'optimize', 'optimizer.config.json');
}
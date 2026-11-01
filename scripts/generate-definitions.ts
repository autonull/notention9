/**
 * Static analysis pass: scan ui/src/strategies/*.ts → emit seam-definitions.json
 * Content-addressed, hash-verified (S3)
 * 
 * Run with: pnpm generate:definitions
 * This script imports the strategy configs at runtime instead of AST parsing
 */

import { createHash } from 'node:crypto';
import { writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

// Import the strategy configs directly
// We need to use dynamic import since this is an ESM script

const __dirname = dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = join(__dirname, '..');
const OUTPUT_DIR = join(PROJECT_ROOT, 'core', 'src', 'schemas', 'generated');
const OUTPUT_FILE = join(OUTPUT_DIR, 'seam-definitions.json');

interface StrategyInfo {
    id: string;
    seamId: string;
    seamName: string;
    seamRole: string;
    version: string;
    componentPath: string;
    componentName: string;
    paramSpec: Record<string, ParamDef>;
    defaultProps: Record<string, unknown>;
}

interface ParamDef {
    type: 'string' | 'number' | 'boolean' | 'enum' | 'object' | 'array';
    description?: string;
    required?: boolean;
    default?: unknown;
    options?: string[];
    min?: number;
    max?: number;
}

interface SeamDefinition {
    id: string;
    name: string;
    description: string;
    role: string;
    propsShape: Record<string, string>;
    components: string[];
    paramSpec: Record<string, ParamDef>;
    evaluator: {
        type: 'extraction' | 'match' | 'custom';
        qualityFamily?: 'extraction' | 'match';
        customEvaluator?: string;
        metrics: string[];
        primaryMetric: string;
        mde?: Record<string, number>;
        floors?: Record<string, number>;
    };
    governanceLevel: 'config' | 'structure' | 'interface';
    evidenceClasses: ('measured' | 'observed' | 'hypothesized' | 'asserted')[];
    version: string;
    createdAt: string;
    updatedAt: string;
    tags?: string[];
}

interface SeamDefinitionsOutput {
    version: 1;
    generatedAt: string;
    hash: string;
    strategies: StrategyInfo[];
    seams: SeamDefinition[];
}

// --- Helpers ---

function sha256(content: string): string {
    return createHash('sha256').update(content).digest('hex');
}

function canonicalize(obj: unknown): string {
    return JSON.stringify(obj, Object.keys(obj as object).sort(), 2);
}

function inferParamDefFromDefault(key: string, value: unknown): ParamDef {
    if (Array.isArray(value)) {
        return { type: 'array', default: value };
    }
    if (value === null) {
        return { type: 'object', default: null };
    }
    switch (typeof value) {
        case 'string':
            return { type: 'string', default: value };
        case 'number':
            return { type: 'number', default: value };
        case 'boolean':
            return { type: 'boolean', default: value };
        case 'object':
            return { type: 'object', default: value };
        default:
            return { type: 'string', default: String(value) };
    }
}

function paramSpecToZodShape(paramSpec: Record<string, ParamDef>): Record<string, ParamDef> {
    // Just return as-is, already in the right format
    return paramSpec;
}

// --- Main ---

async function main() {
    console.log('🔍 Loading strategy configs...');
    
    // Dynamic import of the strategy configs
    const strategyConfigsPath = join(PROJECT_ROOT, 'ui', 'src', 'strategies', 'strategyConfigs.ts');
    
    // We can't directly import .ts files in Node, so let's use the compiled version
    // or use tsx to run this. Since we're already running with tsx, we can import.
    
    // Actually, let's use a different approach: require the compiled JS or use tsx's ability
    // For now, let's read the strategyParams.ts which has the ParamSpecs directly
    
    const { STRATEGY_PARAM_CONFIGS } = await import('../core/src/constants/strategyParams.js');
    const { BUILTIN_SEAM_SPECS, toCoreSeam, getAllBuiltinSeamSpecs } = await import('../core/src/constants/seams.js');
    
    console.log(`Found ${STRATEGY_PARAM_CONFIGS.length} strategy configs`);
    console.log(`Found ${Object.keys(BUILTIN_SEAM_SPECS).length} builtin seam specs`);
    
    const strategies: StrategyInfo[] = [];
    
    for (const config of STRATEGY_PARAM_CONFIGS) {
        const paramSpec: Record<string, ParamDef> = {};
        
        for (const [key, def] of Object.entries(config.paramSpec)) {
            paramSpec[key] = {
                type: def.type,
                description: def.description,
                required: def.required,
                default: def.default,
                options: def.options,
                min: def.min,
                max: def.max,
            };
        }
        
        strategies.push({
            id: config.id,
            seamId: config.seam.id,
            seamName: config.seam.name,
            seamRole: config.seam.role,
            version: config.version,
            componentPath: '', // Not in core config
            componentName: '', // Not in core config
            paramSpec,
            defaultProps: config.defaultProps,
        });
    }
    
    // Now get component info from UI package
    // We'll need to parse the UI strategyConfigs for component paths
    // For now, let's build a map from the core configs
    
    const seams = buildSeamDefinitions(strategies, BUILTIN_SEAM_SPECS);
    console.log(`Built ${seams.length} seam definitions`);
    
    const output: SeamDefinitionsOutput = {
        version: 1,
        generatedAt: new Date().toISOString(),
        hash: '',
        strategies,
        seams,
    };
    
    // Compute content hash
    const { hash, ...rest } = output;
    const canonical = canonicalize(rest);
    output.hash = sha256(canonical).slice(0, 16);
    
    // Ensure output directory exists
    if (!existsSync(OUTPUT_DIR)) {
        mkdirSync(OUTPUT_DIR, { recursive: true });
    }
    
    // Write output
    writeFileSync(OUTPUT_FILE, JSON.stringify(output, null, 2), 'utf-8');
    console.log(`✅ Written to ${OUTPUT_FILE}`);
    console.log(`   Hash: ${output.hash}`);
    console.log(`   Strategies: ${output.strategies.length}`);
    console.log(`   Seams: ${output.seams.length}`);
    
    // Also write a TypeScript version for type safety
    const tsOutputFile = join(OUTPUT_DIR, 'seam-definitions.ts');
    const tsContent = `// Auto-generated by scripts/generate-definitions.ts
// DO NOT EDIT MANUALLY

import type { SeamDefinition } from '@notention/core/schemas';

export const SEAM_DEFINITIONS: SeamDefinition[] = ${JSON.stringify(seams, null, 4)};

export const STRATEGY_CONFIGS = ${JSON.stringify(strategies, null, 4)};
`;
    writeFileSync(tsOutputFile, tsContent, 'utf-8');
    console.log(`✅ TypeScript definitions written to ${tsOutputFile}`);
}

function buildSeamDefinitions(
    strategies: StrategyInfo[], 
    builtinSeamSpecs: Record<string, any>
): SeamDefinition[] {
    const seamMap = new Map<string, {
        id: string;
        name: string;
        description: string;
        role: string;
        propsShape: Record<string, string>;
        components: Set<string>;
        paramSpecs: Map<string, Record<string, ParamDef>>;
        evaluator: SeamDefinition['evaluator'];
        governanceLevel: 'config' | 'structure' | 'interface';
        evidenceClasses: ('measured' | 'observed' | 'hypothesized' | 'asserted')[];
    }>();
    
    for (const strat of strategies) {
        let seam = seamMap.get(strat.seamId);
        if (!seam) {
            // Get description from builtin specs
            const builtin = builtinSeamSpecs[strat.seamId];
            const description = builtin?.description || `${strat.seamRole} seam`;
            
            // Default evaluator based on role
            let evaluator: SeamDefinition['evaluator'] = {
                type: 'custom',
                metrics: [],
                primaryMetric: '',
            };
            
            if (strat.seamRole === 'capture' || strat.seamRole === 'elicit') {
                evaluator = {
                    type: 'extraction',
                    qualityFamily: 'extraction',
                    metrics: ['precision', 'recall', 'f1'],
                    primaryMetric: 'f1',
                    mde: { f1: 0.05 },
                    floors: { f1: 0.7 },
                };
            } else if (strat.seamRole === 'match') {
                evaluator = {
                    type: 'match',
                    qualityFamily: 'match',
                    metrics: ['recall', 'precision', 'f1'],
                    primaryMetric: 'f1',
                    mde: { f1: 0.05 },
                    floors: { f1: 0.6 },
                };
            }
            
            seam = {
                id: strat.seamId,
                name: strat.seamName,
                description,
                role: strat.seamRole,
                propsShape: {},
                components: new Set(),
                paramSpecs: new Map(),
                evaluator,
                governanceLevel: 'config',
                evidenceClasses: ['measured', 'observed'],
            };
            seamMap.set(strat.seamId, seam);
        }
        
        // Merge paramSpecs for this strategy
        seam.paramSpecs.set(strat.id, strat.paramSpec);
        
        // Add component name if available
        if (strat.componentName) {
            seam.components.add(strat.componentName);
        }
    }
    
    const now = new Date().toISOString();
    
    return Array.from(seamMap.values()).map(seam => {
        // Merge all paramSpecs for this seam
        const mergedParamSpec: Record<string, ParamDef> = {};
        for (const [_, ps] of seam.paramSpecs) {
            Object.assign(mergedParamSpec, ps);
        }
        
        // Get propsShape from builtin
        const builtin = builtinSeamSpecs[seam.id];
        const propsShape = builtin?.propsShape || {};
        
        return {
            id: seam.id,
            name: seam.name,
            description: seam.description,
            role: seam.role,
            propsShape,
            components: Array.from(seam.components),
            paramSpec: mergedParamSpec,
            evaluator: seam.evaluator,
            governanceLevel: seam.governanceLevel,
            evidenceClasses: seam.evidenceClasses,
            version: '1.0.0',
            createdAt: now,
            updatedAt: now,
        };
    });
}

main().catch(err => {
    console.error('❌ Generation failed:', err);
    process.exit(1);
});
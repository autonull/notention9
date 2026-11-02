/**
 * ParamSpec → ZodSchema compiler
 * Single source of truth for parameter schema conversion
 * Used by all tracks (S1, S4, S5, R2, E1 validation)
 */

import { z } from 'zod';
import type { ParamSpec, ParamDef } from '../ui/strategy.js';

// --- Zod type mapping from ParamDef.type ---

function paramDefToZod(def: ParamDef): z.ZodTypeAny {
    switch (def.type) {
        case 'string':
            return z.string().describe(def.description ?? '');
        case 'number': {
            let schema = z.number().describe(def.description ?? '');
            if (def.min !== undefined) schema = schema.min(def.min);
            if (def.max !== undefined) schema = schema.max(def.max);
            return schema;
        }
        case 'boolean':
            return z.boolean().describe(def.description ?? '');
        case 'enum': {
            const options = def.options ?? [];
            return z.enum(options as [string, ...string[]]).describe(def.description ?? '');
        }
        case 'object':
            return z.record(z.unknown()).describe(def.description ?? '');
        case 'array':
            return z.array(z.unknown()).describe(def.description ?? '');
    }
    
    // Exhaustiveness check - ParamDef.type should never reach here
    const _exhaustive: never = def.type;
    return z.unknown();
}

// --- ParamSpec → ZodSchema compiler ---

/**
 * Convert a ParamSpec to a Zod object schema
 * @param paramSpec - Parameter specification from strategy
 * @returns Zod object schema with all parameters
 */
export function paramSpecToZod(paramSpec: ParamSpec): z.ZodObject<Record<string, z.ZodTypeAny>> {
    const shape: Record<string, z.ZodTypeAny> = {};
    
    for (const [key, def] of Object.entries(paramSpec)) {
        let zodType = paramDefToZod(def);
        
        // Apply default if specified
        if (def.default !== undefined) {
            zodType = zodType.default(def.default);
        }
        
        // Mark required vs optional
        if (!def.required) {
            zodType = zodType.optional();
        }
        
        shape[key] = zodType;
    }
    
    return z.object(shape);
}

/**
 * Infer TypeScript type from ParamSpec via Zod
 */
export type ParamSpecToType<T extends ParamSpec> = z.infer<ReturnType<typeof paramSpecToZod>>;

// --- SearchSpace derivation (R2) ---

export type ParamScale = 'linear' | 'log' | 'categorical' | 'boolean';

export interface SearchSpaceDimension {
    name: string;
    scale: ParamScale;
    bounds?: [number, number];      // for linear/log
    categories?: string[];           // for categorical
    default?: unknown;
}

export interface SearchSpace {
    dimensions: SearchSpaceDimension[];
}

/**
 * Derive SearchSpace from ParamSpec for optimization
 * Replaces manual grid construction (R2)
 */
export function getSearchSpace(paramSpec: ParamSpec): SearchSpace {
    const dimensions: SearchSpaceDimension[] = [];
    
    for (const [name, def] of Object.entries(paramSpec)) {
        let dimension: SearchSpaceDimension = { name, scale: 'categorical', default: def.default };
        
        switch (def.type) {
            case 'number': {
                const min = def.min ?? 0;
                const max = def.max ?? 1;
                if (max / min > 100 && min > 0) {
                    dimension = { name, scale: 'log', bounds: [min, max], default: def.default };
                } else {
                    dimension = { name, scale: 'linear', bounds: [min, max], default: def.default };
                }
                break;
            }
            case 'enum':
                dimension = { name, scale: 'categorical', categories: def.options ?? [], default: def.default };
                break;
            case 'boolean':
                dimension = { name, scale: 'boolean', default: def.default ?? false };
                break;
            case 'string':
                dimension = { name, scale: 'categorical', categories: [], default: def.default };
                break;
            default:
                dimension = { name, scale: 'categorical', default: def.default };
        }
        
        dimensions.push(dimension);
    }
    
    return { dimensions };
}

/**
 * Sample random point from search space
 * @param space - Search space definition
 * @param random - Optional custom random function (for reproducibility)
 */
export function sampleSearchSpace(space: SearchSpace, random = Math.random): Record<string, unknown> {
    const params: Record<string, unknown> = {};
    
    for (const dim of space.dimensions) {
        switch (dim.scale) {
            case 'linear': {
                const [min, max] = dim.bounds ?? [0, 1];
                params[dim.name] = random() * (max - min) + min;
                break;
            }
            case 'log': {
                const [min, max] = dim.bounds ?? [0.001, 1];
                const logMin = Math.log(min);
                const logMax = Math.log(max);
                params[dim.name] = Math.exp(random() * (logMax - logMin) + logMin);
                break;
            }
            case 'categorical': {
                const cats = dim.categories ?? [];
                params[dim.name] = cats.length > 0 ? cats[Math.floor(random() * cats.length)] : dim.default;
                break;
            }
            case 'boolean':
                params[dim.name] = random() < 0.5;
                break;
        }
    }
    
    return params;
}

/**
 * Generate grid points from search space (for grid search)
 */
export function gridSearchSpace(space: SearchSpace, stepsPerDim = 5): Record<string, unknown>[] {
    if (space.dimensions.length === 0) return [{}];
    
    const dim = space.dimensions[0];
    const rest = { dimensions: space.dimensions.slice(1) };
    const restGrid = gridSearchSpace(rest, stepsPerDim);
    const results: Record<string, unknown>[] = [];
    
    let values: unknown[];
    switch (dim.scale) {
        case 'linear': {
            const [min, max] = dim.bounds ?? [0, 1];
            values = Array.from({ length: stepsPerDim }, (_, i) => min + (i / (stepsPerDim - 1)) * (max - min));
            break;
        }
        case 'log': {
            const [min, max] = dim.bounds ?? [0.001, 1];
            const logMin = Math.log(min);
            const logMax = Math.log(max);
            values = Array.from({ length: stepsPerDim }, (_, i) => Math.exp(logMin + (i / (stepsPerDim - 1)) * (logMax - logMin)));
            break;
        }
        case 'categorical':
            values = dim.categories ?? [dim.default].filter(Boolean) as unknown[];
            break;
        case 'boolean':
            values = [false, true];
            break;
        default:
            values = [dim.default].filter(Boolean) as unknown[];
    }
    
    for (const v of values) {
        for (const r of restGrid) {
            results.push({ [dim.name]: v, ...r });
        }
    }
    
    return results;
}
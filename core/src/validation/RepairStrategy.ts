/**
 * Repair Strategies for Validation
 * 
 * Consolidates repair logic from:
 * - ui/src/services/ai/schema.ts (heuristic repairs)
 * - core/src/ontology/schema.ts (LLM-based repair loop)
 */

import type {
    ValidationResult,
    ValidationIssue,
    RepairStrategy,
    RepairContext,
    Schema,
    JsonSchemaObject,
} from './types.js';
import { createValidator } from './Validator.js';

/**
 * Heuristic repair for common JSON formatting issues
 */
export class JsonFenceRepairStrategy<T> implements RepairStrategy<T> {
    readonly name = 'json-fence-repair';

    canRepair(context: RepairContext<T>): boolean {
        // Can repair if input is a string that might have code fences
        return typeof context.rawInput === 'string';
    }

    repair(context: RepairContext<T>): unknown {
        const text = String(context.rawInput).trim();
        
        // Remove markdown code fences
        if (text.startsWith('```json')) {
            return text.slice(7, -3).trim();
        }
        if (text.startsWith('```')) {
            return text.slice(3, -3).trim();
        }
        // Already looks like JSON
        if (text.startsWith('[') || text.startsWith('{')) {
            return text;
        }
        // Try to extract JSON from text
        const jsonMatch = text.match(/(\[[\s\S]*\]|\{[\s\S]*\})/);
        return jsonMatch ? jsonMatch[1] : '[]';
    }
}

/**
 * Heuristic repair for property arrays (from ui/services/ai/schema.ts)
 */
export interface PropertyItem {
    key: string;
    operator: string;
    values: string[];
}

export class PropertyArrayRepairStrategy implements RepairStrategy<PropertyItem[]> {
    readonly name = 'property-array-repair';

    canRepair(context: RepairContext<PropertyItem[]>): boolean {
        return true; // Can attempt repair on any input
    }

    repair(context: RepairContext<PropertyItem[]>): PropertyItem[] {
        const text = typeof context.rawInput === 'string' 
            ? context.rawInput 
            : JSON.stringify(context.rawInput);
        const cleaned = new JsonFenceRepairStrategy().repair({ ...context, rawInput: text });

        try {
            const parsed = JSON.parse(cleaned as string);
            if (!Array.isArray(parsed)) return [];

            const validOperators = ['is', 'is not', 'contains', 'greater than', 'less than'];

            return parsed
                .filter((item): item is Record<string, unknown> => item && typeof item === 'object')
                .map(item => ({
                    key: String(item.key || '').trim(),
                    operator: validOperators.includes(item.operator as string) ? (item.operator as string) : 'is',
                    values: Array.isArray(item.values)
                        ? item.values.map((v: unknown) => String(v).trim()).filter(Boolean)
                        : [String(item.value || item.values || '').trim()].filter(Boolean),
                }))
                .filter(p => p.key && p.values.length > 0);
        } catch {
            return [];
        }
    }
}

/**
 * Heuristic repair for tag arrays
 */
export class TagArrayRepairStrategy implements RepairStrategy<string[]> {
    readonly name = 'tag-array-repair';

    canRepair(context: RepairContext<string[]>): boolean {
        return true;
    }

    repair(context: RepairContext<string[]>): string[] {
        const text = typeof context.rawInput === 'string' 
            ? context.rawInput 
            : JSON.stringify(context.rawInput);
        const cleaned = new JsonFenceRepairStrategy().repair({ ...context, rawInput: text });

        try {
            const parsed = JSON.parse(cleaned as string);
            if (!Array.isArray(parsed)) return [];
            return parsed
                .map((t: unknown) => String(t).trim().toLowerCase())
                .filter((t: string) => t.length > 0 && t.length <= 50)
                .slice(0, 20);
        } catch {
            return [];
        }
    }
}

/**
 * Heuristic repair for inferred attributes
 */
export interface InferredAttribute {
    key: string;
    type: 'string' | 'number' | 'date' | 'enum' | 'geo';
    description?: string;
    usageCount: number;
    sampleValues: string[];
}

export class InferredAttributesRepairStrategy implements RepairStrategy<InferredAttribute[]> {
    readonly name = 'inferred-attributes-repair';

    canRepair(context: RepairContext<InferredAttribute[]>): boolean {
        return true;
    }

    repair(context: RepairContext<InferredAttribute[]>): InferredAttribute[] {
        const text = typeof context.rawInput === 'string' 
            ? context.rawInput 
            : JSON.stringify(context.rawInput);
        const cleaned = new JsonFenceRepairStrategy().repair({ ...context, rawInput: text });

        try {
            const parsed = JSON.parse(cleaned as string);
            if (!Array.isArray(parsed)) return [];

            const validTypes = ['string', 'number', 'date', 'enum', 'geo'] as const;

            return parsed
                .filter((item): item is Record<string, unknown> => item && typeof item === 'object' && 'key' in item)
                .map(item => ({
                    key: String(item.key).trim(),
                    type: (validTypes.includes(item.type as typeof validTypes[number]) ? item.type : 'string') as InferredAttribute['type'],
                    description: item.description ? String(item.description).trim() : undefined,
                    usageCount: typeof item.usageCount === 'number' && !isNaN(item.usageCount)
                        ? Math.max(0, Math.floor(item.usageCount))
                        : 0,
                    sampleValues: Array.isArray(item.sampleValues)
                        ? item.sampleValues.map((v: unknown) => String(v).trim()).filter(Boolean).slice(0, 5)
                        : [],
                }))
                .filter(a => a.key);
        } catch {
            return [];
        }
    }
}

/**
 * Heuristic repair for ontology optimization
 */
export interface OntologyOptimization {
    merged: Array<{ source: string; target: string }>;
    pruned: string[];
}

export class OntologyOptimizationRepairStrategy implements RepairStrategy<OntologyOptimization> {
    readonly name = 'ontology-optimization-repair';

    canRepair(context: RepairContext<OntologyOptimization>): boolean {
        return true;
    }

    repair(context: RepairContext<OntologyOptimization>): OntologyOptimization {
        const text = typeof context.rawInput === 'string' 
            ? context.rawInput 
            : JSON.stringify(context.rawInput);
        const cleaned = new JsonFenceRepairStrategy().repair({ ...context, rawInput: text });

        try {
            const parsed = JSON.parse(cleaned as string);
            return {
                merged: Array.isArray(parsed.merged)
                    ? parsed.merged
                        .filter((m: unknown): m is Record<string, unknown> => 
                            typeof m === 'object' && m !== null && 'source' in m && 'target' in m)
                        .map((m: Record<string, unknown>) => ({ source: String(m.source).trim(), target: String(m.target).trim() }))
                    : [],
                pruned: Array.isArray(parsed.pruned)
                    ? parsed.pruned.map((p: unknown) => String(p).trim()).filter(Boolean)
                    : [],
            };
        } catch {
            return { merged: [], pruned: [] };
        }
    }
}

/**
 * LLM-based repair strategy (from core/ontology/schema.ts)
 */
export interface LLMGenerateFn {
    (prompt: string): Promise<string>;
}

export class LLMBasedRepairStrategy<T> implements RepairStrategy<T> {
    readonly name = 'llm-based-repair';

    constructor(
        private readonly llmGenerate: LLMGenerateFn,
        private readonly buildRepairPrompt: (invalidOutput: string, schema: Schema<T>, errors: readonly ValidationIssue[]) => string
    ) {}

    canRepair(context: RepairContext<T>): boolean {
        // Only attempt LLM repair if we have attempts remaining and previous attempts failed
        return context.previousAttempts.length > 0 && 
               context.previousAttempts.length < context.maxAttempts &&
               !context.previousAttempts[context.previousAttempts.length - 1].success;
    }

    async repair(context: RepairContext<T>): Promise<T | null> {
        const lastAttempt = context.previousAttempts[context.previousAttempts.length - 1];
        const invalidOutput = typeof context.rawInput === 'string' 
            ? context.rawInput 
            : JSON.stringify(context.rawInput);

        const repairPrompt = this.buildRepairPrompt(invalidOutput, context.schema, lastAttempt.issues);
        const repairedOutput = await this.llmGenerate(repairPrompt);

        // Validate the repaired output
        const validator = createValidator(context.schema);
        const result = validator.validate(JSON.parse(repairedOutput));
        
        if (result.success) {
            return result.data;
        }
        return null;
    }
}

/**
 * Composite repair strategy that tries multiple strategies in order
 */
export class CompositeRepairStrategy<T> implements RepairStrategy<T> {
    readonly name = 'composite-repair';

    constructor(private readonly strategies: RepairStrategy<T>[]) {}

    canRepair(context: RepairContext<T>): boolean {
        return this.strategies.some(s => s.canRepair(context));
    }

    async repair(context: RepairContext<T>): Promise<unknown> {
        for (const strategy of this.strategies) {
            if (strategy.canRepair(context)) {
                const result = strategy.repair(context);
                if (result instanceof Promise) {
                    const resolved = await result;
                    if (resolved !== null && resolved !== undefined) {
                        return resolved;
                    }
                } else if (result !== null && result !== undefined) {
                    return result;
                }
            }
        }
        return null;
    }
}

/**
 * Default repair strategies for common types
 */
export const defaultRepairStrategies = {
    properties: new CompositeRepairStrategy<PropertyItem[]>([
        new JsonFenceRepairStrategy(),
        new PropertyArrayRepairStrategy(),
    ]),
    tags: new CompositeRepairStrategy<string[]>([
        new JsonFenceRepairStrategy(),
        new TagArrayRepairStrategy(),
    ]),
    inferredAttributes: new CompositeRepairStrategy<InferredAttribute[]>([
        new JsonFenceRepairStrategy(),
        new InferredAttributesRepairStrategy(),
    ]),
    ontologyOptimization: new CompositeRepairStrategy<OntologyOptimization>([
        new JsonFenceRepairStrategy(),
        new OntologyOptimizationRepairStrategy(),
    ]),
};

/**
 * Create LLM-based repair strategy with standard prompt building
 */
export function createLLMRepairStrategy<T>(
    llmGenerate: LLMGenerateFn,
    schema: Schema<T>
): LLMBasedRepairStrategy<T> {
    return new LLMBasedRepairStrategy<T>(llmGenerate, buildStandardRepairPrompt);
}

export function buildStandardRepairPrompt<T>(
    invalidOutput: string,
    schema: Schema<T>,
    errors: readonly ValidationIssue[]
): string {
    let schemaDescription = '';
    
    if (schema.kind === 'json') {
        schemaDescription = jsonSchemaToPrompt(schema.schema);
    } else if (schema.kind === 'zod') {
        schemaDescription = 'Zod schema (see validation errors below)';
    } else {
        schemaDescription = 'Custom schema';
    }

    return `The previous output was invalid. Please fix it.

SCHEMA:
${schemaDescription}

INVALID OUTPUT:
${invalidOutput}

ERRORS:
${errors.map(e => `- ${e.path}: ${e.message}`).join('\n')}

RULES FOR FIXING:
1. Output ONLY valid JSON matching the schema exactly
2. Use exact property keys from the schema
3. For enum properties, use ONLY values from the enum list
4. For numeric properties, output numbers (not strings)
5. Omit properties not mentioned in the text (do not output null)
6. Fix all errors listed above

CORRECTED OUTPUT:`;
}

function jsonSchemaToPrompt(schema: JsonSchemaObject, indent = 0): string {
    const prefix = '  '.repeat(indent);
    if (schema.type === 'object' && schema.properties) {
        const lines = ['{'];
        for (const [key, prop] of Object.entries(schema.properties)) {
            const required = (schema.required || []).includes(key) ? ' (required)' : '';
            let desc = `${prefix}  ${key}: ${prop.type}${required}`;
            if (prop.description) desc += ` - ${prop.description}`;
            if (prop.enum) desc += ` [enum: ${prop.enum.join(', ')}]`;
            if (prop.minimum !== undefined || prop.maximum !== undefined) {
                desc += ` [range: ${prop.minimum ?? '-∞'} to ${prop.maximum ?? '∞'}]`;
            }
            lines.push(desc);
        }
        lines.push(`${prefix}}`);
        return lines.join('\n');
    }
    return `${prefix}${JSON.stringify(schema)}`;
}
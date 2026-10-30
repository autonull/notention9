import { describe, it, expect } from 'vitest';
import {
    JsonFenceRepairStrategy,
    PropertyArrayRepairStrategy,
    TagArrayRepairStrategy,
    InferredAttributesRepairStrategy,
    OntologyOptimizationRepairStrategy,
    CompositeRepairStrategy,
    defaultRepairStrategies,
    buildStandardRepairPrompt,
    type PropertyItem,
    type InferredAttribute,
    type OntologyOptimization,
} from './RepairStrategy.js';
import type { RepairContext, Schema } from './types.js';

describe('Repair Strategies', () => {
    function createContext<T>(rawInput: unknown, schema: Schema<T>, previousAttempts: any[] = []): RepairContext<T> {
        return {
            rawInput,
            schema,
            previousAttempts,
            maxAttempts: 3,
        };
    }

    const dummyJsonSchema: Schema<any> = {
        kind: 'json',
        schema: { type: 'object', properties: {} },
    };

    describe('JsonFenceRepairStrategy', () => {
        const strategy = new JsonFenceRepairStrategy();

        it('removes ```json fences', () => {
            const context = createContext('```json\n{"a": 1}\n```', dummyJsonSchema);
            const result = strategy.repair(context);
            expect(result).toBe('{"a": 1}');
        });

        it('removes ``` fences', () => {
            const context = createContext('```\n{"a": 1}\n```', dummyJsonSchema);
            const result = strategy.repair(context);
            expect(result).toBe('{"a": 1}');
        });

        it('passes through raw JSON', () => {
            const context = createContext('{"a": 1}', dummyJsonSchema);
            const result = strategy.repair(context);
            expect(result).toBe('{"a": 1}');
        });

        it('extracts JSON from text', () => {
            const context = createContext('Here is the result: {"a": 1} and done', dummyJsonSchema);
            const result = strategy.repair(context);
            expect(result).toBe('{"a": 1}');
        });

        it('returns [] for non-JSON text', () => {
            const context = createContext('no json here', dummyJsonSchema);
            const result = strategy.repair(context);
            expect(result).toBe('[]');
        });

        it('canRepair returns true for string input', () => {
            const context = createContext('test', dummyJsonSchema);
            expect(strategy.canRepair(context)).toBe(true);
        });
    });

    describe('PropertyArrayRepairStrategy', () => {
        const strategy = new PropertyArrayRepairStrategy();

        it('repairs valid property array', () => {
            const input = [{ key: 'name', operator: 'is', values: ['John'] }];
            const context = createContext(input, dummyJsonSchema);
            const result = strategy.repair(context) as PropertyItem[];
            expect(result).toHaveLength(1);
            expect(result[0]).toEqual({ key: 'name', operator: 'is', values: ['John'] });
        });

        it('normalizes operator to valid values', () => {
            const input = [{ key: 'name', operator: 'invalid', values: ['John'] }];
            const context = createContext(input, dummyJsonSchema);
            const result = strategy.repair(context) as PropertyItem[];
            expect(result[0].operator).toBe('is');
        });

        it('handles string values array', () => {
            const input = [{ key: 'name', operator: 'is', values: 'John' }];
            const context = createContext(input, dummyJsonSchema);
            const result = strategy.repair(context) as PropertyItem[];
            expect(result[0].values).toEqual(['John']);
        });

        it('filters out invalid items', () => {
            const input = [
                { key: 'name', operator: 'is', values: ['John'] },
                { key: '', operator: 'is', values: ['invalid'] },
                { operator: 'is', values: ['no key'] },
                null,
            ];
            const context = createContext(input, dummyJsonSchema);
            const result = strategy.repair(context) as PropertyItem[];
            expect(result).toHaveLength(1);
            expect(result[0].key).toBe('name');
        });

        it('handles JSON string input', () => {
            const input = '[{"key": "name", "operator": "is", "values": ["John"]}]';
            const context = createContext(input, dummyJsonSchema);
            const result = strategy.repair(context) as PropertyItem[];
            expect(result).toHaveLength(1);
            expect(result[0].key).toBe('name');
        });

        it('handles JSON with code fences', () => {
            const input = '```json\n[{"key": "name", "operator": "is", "values": ["John"]}]\n```';
            const context = createContext(input, dummyJsonSchema);
            const result = strategy.repair(context) as PropertyItem[];
            expect(result).toHaveLength(1);
        });

        it('returns empty array for invalid JSON', () => {
            const input = 'not json';
            const context = createContext(input, dummyJsonSchema);
            const result = strategy.repair(context) as PropertyItem[];
            expect(result).toEqual([]);
        });

        it('canRepair always returns true', () => {
            expect(strategy.canRepair(createContext({}, dummyJsonSchema))).toBe(true);
        });
    });

    describe('TagArrayRepairStrategy', () => {
        const strategy = new TagArrayRepairStrategy();

        it('repairs valid tag array', () => {
            const input = ['tag1', 'tag2', 'tag3'];
            const context = createContext(input, dummyJsonSchema);
            const result = strategy.repair(context);
            expect(result).toEqual(['tag1', 'tag2', 'tag3']);
        });

        it('normalizes to lowercase and trims', () => {
            const input = ['  Tag1  ', 'TAG2', 'tag3'];
            const context = createContext(input, dummyJsonSchema);
            const result = strategy.repair(context);
            expect(result).toEqual(['tag1', 'tag2', 'tag3']);
        });

        it('filters empty and long tags', () => {
            const input = ['', 'a', 'b'.repeat(60), 'valid'];
            const context = createContext(input, dummyJsonSchema);
            const result = strategy.repair(context);
            expect(result).toEqual(['a', 'valid']);
        });

        it('limits to 20 tags', () => {
            const input = Array(25).fill('tag');
            const context = createContext(input, dummyJsonSchema);
            const result = strategy.repair(context);
            expect(result).toHaveLength(20);
        });

        it('handles JSON string with code fences', () => {
            const input = '```json\n["tag1", "tag2"]\n```';
            const context = createContext(input, dummyJsonSchema);
            const result = strategy.repair(context);
            expect(result).toEqual(['tag1', 'tag2']);
        });

        it('returns empty array for invalid input', () => {
            const input = 'not json';
            const context = createContext(input, dummyJsonSchema);
            const result = strategy.repair(context);
            expect(result).toEqual([]);
        });
    });

    describe('InferredAttributesRepairStrategy', () => {
        const strategy = new InferredAttributesRepairStrategy();

        it('repairs valid inferred attributes', () => {
            const input = [{ key: 'age', type: 'number', description: 'Age', usageCount: 5, sampleValues: ['25', '30'] }];
            const context = createContext(input, dummyJsonSchema);
            const result = strategy.repair(context) as InferredAttribute[];
            expect(result).toHaveLength(1);
            expect(result[0]).toMatchObject({
                key: 'age',
                type: 'number',
                description: 'Age',
                usageCount: 5,
                sampleValues: ['25', '30'],
            });
        });

        it('defaults type to string', () => {
            const input = [{ key: 'name', type: 'invalid', usageCount: 1 }];
            const context = createContext(input, dummyJsonSchema);
            const result = strategy.repair(context) as InferredAttribute[];
            expect(result[0].type).toBe('string');
        });

        it('clamps usageCount to non-negative integer', () => {
            const input = [{ key: 'test', usageCount: -5 }, { key: 'test2', usageCount: 3.7 }];
            const context = createContext(input, dummyJsonSchema);
            const result = strategy.repair(context) as InferredAttribute[];
            expect(result[0].usageCount).toBe(0);
            expect(result[1].usageCount).toBe(3);
        });

        it('limits sampleValues to 5', () => {
            const input = [{ key: 'test', sampleValues: Array(10).fill('val') }];
            const context = createContext(input, dummyJsonSchema);
            const result = strategy.repair(context) as InferredAttribute[];
            expect(result[0].sampleValues).toHaveLength(5);
        });

        it('handles JSON string with code fences', () => {
            const input = '```json\n[{"key": "name", "type": "string"}]\n```';
            const context = createContext(input, dummyJsonSchema);
            const result = strategy.repair(context) as InferredAttribute[];
            expect(result).toHaveLength(1);
            expect(result[0].key).toBe('name');
        });
    });

    describe('OntologyOptimizationRepairStrategy', () => {
        const strategy = new OntologyOptimizationRepairStrategy();

        it('repairs valid ontology optimization', () => {
            const input = { merged: [{ source: 'a', target: 'b' }], pruned: ['c'] };
            const context = createContext(input, dummyJsonSchema);
            const result = strategy.repair(context) as OntologyOptimization;
            expect(result).toEqual({ merged: [{ source: 'a', target: 'b' }], pruned: ['c'] });
        });

        it('filters invalid merged entries', () => {
            const input = { merged: [{ source: 'a', target: 'b' }, { source: '' }, null], pruned: ['c'] };
            const context = createContext(input, dummyJsonSchema);
            const result = strategy.repair(context) as OntologyOptimization;
            expect(result.merged).toHaveLength(1);
            expect(result.merged[0]).toEqual({ source: 'a', target: 'b' });
        });

        it('handles JSON string with code fences', () => {
            const input = '```json\n{"merged": [], "pruned": ["a"]}\n```';
            const context = createContext(input, dummyJsonSchema);
            const result = strategy.repair(context) as OntologyOptimization;
            expect(result).toEqual({ merged: [], pruned: ['a'] });
        });

        it('returns empty for invalid input', () => {
            const input = 'not json';
            const context = createContext(input, dummyJsonSchema);
            const result = strategy.repair(context) as OntologyOptimization;
            expect(result).toEqual({ merged: [], pruned: [] });
        });
    });

    describe('CompositeRepairStrategy', () => {
        it('tries strategies in order', async () => {
            // Use strategies that return complete repairs
            const strategy = new CompositeRepairStrategy<PropertyItem[]>([
                new PropertyArrayRepairStrategy(),
                new PropertyArrayRepairStrategy(),
            ]);

            const input = '```json\n[{"key": "name", "operator": "is", "values": ["John"]}]\n```';
            const context = createContext(input, dummyJsonSchema);
            const result = await strategy.repair(context) as PropertyItem[];
            expect(result).toHaveLength(1);
            expect(result[0].key).toBe('name');
        });

        it('returns first successful repair', async () => {
            const firstStrategy = {
                name: 'first',
                canRepair: () => true,
                repair: () => 'first-result',
            };
            const secondStrategy = {
                name: 'second',
                canRepair: () => true,
                repair: () => 'second-result',
            };
            const strategy = new CompositeRepairStrategy([firstStrategy, secondStrategy]);

            const result = await strategy.repair(createContext('input', dummyJsonSchema));
            expect(result).toBe('first-result');
        });

        it('skips strategies that cannot repair', async () => {
            const firstStrategy = {
                name: 'first',
                canRepair: () => false,
                repair: () => 'first-result',
            };
            const secondStrategy = {
                name: 'second',
                canRepair: () => true,
                repair: () => 'second-result',
            };
            const strategy = new CompositeRepairStrategy([firstStrategy, secondStrategy]);

            const result = await strategy.repair(createContext('input', dummyJsonSchema));
            expect(result).toBe('second-result');
        });
    });

    describe('defaultRepairStrategies', () => {
        it('has properties strategy', () => {
            const input = '```json\n[{"key": "name", "operator": "is", "values": ["John"]}]\n```';
            const context = createContext(input, dummyJsonSchema);
            const result = defaultRepairStrategies.properties.repair(context) as PropertyItem[];
            expect(result).toHaveLength(1);
            expect(result[0].key).toBe('name');
        });

        it('has tags strategy', () => {
            const input = '```json\n["tag1", "tag2"]\n```';
            const context = createContext(input, dummyJsonSchema);
            const result = defaultRepairStrategies.tags.repair(context);
            expect(result).toEqual(['tag1', 'tag2']);
        });

        it('has inferredAttributes strategy', () => {
            const input = '```json\n[{"key": "name", "type": "string"}]\n```';
            const context = createContext(input, dummyJsonSchema);
            const result = defaultRepairStrategies.inferredAttributes.repair(context) as InferredAttribute[];
            expect(result).toHaveLength(1);
            expect(result[0].key).toBe('name');
        });

        it('has ontologyOptimization strategy', () => {
            const input = '```json\n{"merged": [], "pruned": ["a"]}\n```';
            const context = createContext(input, dummyJsonSchema);
            const result = defaultRepairStrategies.ontologyOptimization.repair(context) as OntologyOptimization;
            expect(result).toEqual({ merged: [], pruned: ['a'] });
        });
    });

    describe('buildStandardRepairPrompt', () => {
        it('generates prompt for json schema', () => {
            const schema: Schema<any> = {
                kind: 'json',
                schema: {
                    type: 'object',
                    properties: {
                        name: { type: 'string', description: 'Name' },
                        age: { type: 'number', minimum: 0 },
                    },
                    required: ['name'],
                },
            };
            const errors = [
                { path: 'age', message: 'Must be >= 0', severity: 'error' as const, code: 'MINIMUM' },
            ];
            const prompt = buildStandardRepairPrompt('{"age": -1}', schema, errors);
            
            expect(prompt).toContain('SCHEMA:');
            expect(prompt).toContain('name: string (required) - Name');
            expect(prompt).toContain('age: number [range: 0 to ∞]');
            expect(prompt).toContain('INVALID OUTPUT:');
            expect(prompt).toContain('{"age": -1}');
            expect(prompt).toContain('ERRORS:');
            expect(prompt).toContain('- age: Must be >= 0');
            expect(prompt).toContain('CORRECTED OUTPUT:');
        });

        it('generates prompt for zod schema', () => {
            const schema: Schema<any> = { kind: 'zod', schema: {} as any };
            const errors = [{ path: 'x', message: 'Error', severity: 'error' as const, code: 'ZOD' }];
            const prompt = buildStandardRepairPrompt('{}', schema, errors);
            expect(prompt).toContain('Zod schema (see validation errors below)');
        });

        it('generates prompt for custom schema', () => {
            const schema: Schema<any> = { kind: 'custom', validate: () => ({ success: true, data: null, issues: [], repaired: false, repairAttempts: 0 }) };
            const errors = [{ path: 'x', message: 'Error', severity: 'error' as const, code: 'CUSTOM' }];
            const prompt = buildStandardRepairPrompt('{}', schema, errors);
            expect(prompt).toContain('Custom schema');
        });
    });
});
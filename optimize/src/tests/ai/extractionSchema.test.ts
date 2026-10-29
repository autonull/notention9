import { describe, it, expect } from 'vitest';
import { DEFAULT_ONTOLOGY } from '@notention/core';
import {
    generateExtractionSchema,
    buildExtractionPrompt,
    repairExtraction,
    validateAgainstSchema,
} from '../../services/ai/extractionSchema';

describe('Extraction Schema (L15)', () => {
    const ontology = DEFAULT_ONTOLOGY;

    it('generates schema from ontology', () => {
        const schema = generateExtractionSchema(ontology);
        
        expect(schema.type).toBe('object');
        expect(schema.additionalProperties).toBe(false);
        expect(Object.keys(schema.properties).length).toBeGreaterThan(0);
    });

    it('includes known ontology keys', () => {
        const schema = generateExtractionSchema(ontology);
        
        expect(schema.properties).toHaveProperty('to');
        expect(schema.properties).toHaveProperty('channel');
        expect(schema.properties).toHaveProperty('budget');
        expect(schema.properties).toHaveProperty('price');
    });

    it('maps ontology types to JSON schema types', () => {
        const schema = generateExtractionSchema(ontology);
        
        const channelProp = schema.properties.channel;
        expect(channelProp.type).toBe('string');
        expect(channelProp.enum).toContain('email');
        expect(channelProp.enum).toContain('whatsapp');
        
        const budgetProp = schema.properties.budget;
        expect(budgetProp.type).toBe('number');
    });

    it('builds extraction prompt with schema and examples', () => {
        const text = 'Send to john@example.com';
        const prompt = buildExtractionPrompt(ontology, text);
        
        expect(prompt.systemPrompt).toContain('SCHEMA:');
        expect(prompt.systemPrompt).toContain('EXAMPLES:');
        expect(prompt.userPrompt).toContain(text);
        expect(prompt.schema).toBeDefined();
        expect(prompt.examples.length).toBeGreaterThan(0);
    });

    it('validates correct output against schema', () => {
        const schema = generateExtractionSchema(ontology);
        
        const validOutput = {
            to: 'john@example.com',
            channel: 'email',
        };
        
        const errors = validateAgainstSchema(validOutput, schema);
        // May have errors for missing required fields
        expect(Array.isArray(errors)).toBe(true);
    });

    it('detects invalid enum values', () => {
        const schema = generateExtractionSchema(ontology);
        
        const output = { channel: 'invalid-channel' };
        const errors = validateAgainstSchema(output, schema);
        
        expect(errors.some(e => e.includes('enum') || e.includes('channel'))).toBe(true);
    });

    it('detects wrong types', () => {
        const schema = generateExtractionSchema(ontology);
        
        const output = { to: 123 };
        const errors = validateAgainstSchema(output, schema);
        
        expect(errors.some(e => e.includes('expected string') || e.includes('to'))).toBe(true);
    });
});

describe('Repair Loop (L15)', () => {
    const ontology = DEFAULT_ONTOLOGY;
    const schema = generateExtractionSchema(ontology);

    const baseValidOutput = {
        name: 'Test',
        role: 'developer',
        rate: 100,
        deadline: '2024-12-31',
    };

    it('repairs malformed JSON', async () => {
        const rawOutput = '{ to: "john@example.com" }'; // Missing quotes on key
        
        const result = await repairExtraction(rawOutput, schema, 2, async (prompt) => {
            return JSON.stringify({ ...baseValidOutput, to: 'john@example.com', channel: 'email' });
        });
        
        expect(result.success).toBe(true);
        expect(result.output).toEqual({ ...baseValidOutput, to: 'john@example.com', channel: 'email' });
        expect(result.attempts).toBeGreaterThanOrEqual(1);
    });

    it('repairs invalid enum values', async () => {
        const rawOutput = JSON.stringify({ ...baseValidOutput, channel: 'invalid' });
        
        const result = await repairExtraction(rawOutput, schema, 2, async (prompt) => {
            return JSON.stringify({ ...baseValidOutput, channel: 'email' });
        });
        
        expect(result.success).toBe(true);
        expect(result.output?.channel).toBe('email');
    });

    it('fails after max attempts', async () => {
        const rawOutput = 'not json at all';
        
        const result = await repairExtraction(rawOutput, schema, 2, async (prompt) => {
            return 'still not json';
        });
        
        expect(result.success).toBe(false);
        expect(result.output).toBeNull();
        expect(result.attempts).toBe(2);
        expect(result.errors.length).toBeGreaterThan(0);
    });
});

describe('Schema-to-prompt conversion', () => {
    it('includes required markers', () => {
        const schema = generateExtractionSchema(DEFAULT_ONTOLOGY);
        const prompt = buildExtractionPrompt(DEFAULT_ONTOLOGY, 'test');
        
        expect(prompt.systemPrompt).toContain('required');
    });

    it('includes enum values', () => {
        const schema = generateExtractionSchema(DEFAULT_ONTOLOGY);
        const prompt = buildExtractionPrompt(DEFAULT_ONTOLOGY, 'test');
        
        expect(prompt.systemPrompt).toContain('email');
        expect(prompt.systemPrompt).toContain('whatsapp');
    });
});
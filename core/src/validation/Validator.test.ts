import { describe, it, expect } from 'vitest';
import { z } from 'zod';
import { 
    createValidator, 
    ZodValidator, 
    JsonSchemaValidator, 
    CustomValidator,
    composeValidators,
    fallbackValidators 
} from './Validator.js';
import type { Schema } from './types.js';

describe('Validation Library', () => {
    describe('ZodValidator', () => {
        const schema = z.object({
            name: z.string().min(1),
            age: z.number().int().min(0),
            email: z.string().email().optional(),
        });

        const validator = new ZodValidator(schema);

        it('validates correct data', () => {
            const result = validator.validate({ name: 'John', age: 30, email: 'john@example.com' });
            expect(result.success).toBe(true);
            expect(result.data).toEqual({ name: 'John', age: 30, email: 'john@example.com' });
            expect(result.issues).toHaveLength(0);
        });

        it('rejects missing required field', () => {
            const result = validator.validate({ age: 30 });
            expect(result.success).toBe(false);
            expect(result.issues.some(i => i.code === 'ZOD_VALIDATION_ERROR' && i.path.includes('name'))).toBe(true);
        });

        it('rejects wrong type', () => {
            const result = validator.validate({ name: 'John', age: 'thirty' });
            expect(result.success).toBe(false);
            expect(result.issues.some(i => i.path.includes('age'))).toBe(true);
        });

        it('rejects invalid email format', () => {
            const result = validator.validate({ name: 'John', age: 30, email: 'not-email' });
            expect(result.success).toBe(false);
            expect(result.issues.some(i => i.path.includes('email'))).toBe(true);
        });

        it('accepts optional field omitted', () => {
            const result = validator.validate({ name: 'John', age: 30 });
            expect(result.success).toBe(true);
        });
    });

    describe('JsonSchemaValidator', () => {
        const jsonSchema = {
            type: 'object' as const,
            properties: {
                name: { type: 'string' as const, minLength: 1 },
                age: { type: 'number' as const, minimum: 0 },
                tags: { 
                    type: 'array' as const, 
                    items: { type: 'string' as const },
                    maxLength: 10 
                },
                status: { 
                    type: 'string' as const, 
                    enum: ['active', 'inactive'] 
                },
            },
            required: ['name', 'age'],
            additionalProperties: false,
        };

        const validator = new JsonSchemaValidator(jsonSchema);

        it('validates correct data', () => {
            const result = validator.validate({ 
                name: 'John', 
                age: 30, 
                tags: ['a', 'b'],
                status: 'active'
            });
            expect(result.success).toBe(true);
            expect(result.data).toEqual({ name: 'John', age: 30, tags: ['a', 'b'], status: 'active' });
        });

        it('rejects missing required field', () => {
            const result = validator.validate({ age: 30 });
            expect(result.success).toBe(false);
            expect(result.issues.some(i => i.code === 'MISSING_REQUIRED' && i.path.includes('name'))).toBe(true);
        });

        it('rejects wrong type for string', () => {
            const result = validator.validate({ name: 123, age: 30 });
            expect(result.success).toBe(false);
            expect(result.issues.some(i => i.code === 'TYPE_MISMATCH' && i.path.includes('name'))).toBe(true);
        });

        it('rejects wrong type for number', () => {
            const result = validator.validate({ name: 'John', age: 'thirty' });
            expect(result.success).toBe(false);
            expect(result.issues.some(i => i.code === 'TYPE_MISMATCH' && i.path.includes('age'))).toBe(true);
        });

        it('rejects enum mismatch', () => {
            const result = validator.validate({ name: 'John', age: 30, status: 'unknown' });
            expect(result.success).toBe(false);
            expect(result.issues.some(i => i.code === 'ENUM_MISMATCH')).toBe(true);
        });

        it('rejects array with wrong item type', () => {
            const result = validator.validate({ name: 'John', age: 30, tags: ['a', 123] });
            expect(result.success).toBe(false);
            expect(result.issues.some(i => i.path.includes('tags[1]'))).toBe(true);
        });

        it('rejects array exceeding maxLength', () => {
            const result = validator.validate({ name: 'John', age: 30, tags: Array(15).fill('a') });
            expect(result.success).toBe(false);
        });

        it('rejects additional properties when false', () => {
            const result = validator.validate({ name: 'John', age: 30, extra: 'not allowed' });
            expect(result.success).toBe(false);
            expect(result.issues.some(i => i.code === 'UNEXPECTED_PROPERTY')).toBe(true);
        });

        it('validates nested objects', () => {
            const nestedSchema = {
                type: 'object' as const,
                properties: {
                    user: {
                        type: 'object' as const,
                        properties: {
                            name: { type: 'string' as const },
                        },
                        required: ['name'],
                    },
                },
                required: ['user'],
            };
            const nestedValidator = new JsonSchemaValidator(nestedSchema);
            
            const result = nestedValidator.validate({ user: { name: 'John' } });
            expect(result.success).toBe(true);
            
            const failResult = nestedValidator.validate({ user: {} });
            expect(failResult.success).toBe(false);
            expect(failResult.issues.some(i => i.path.includes('user.name'))).toBe(true);
        });
    });

    describe('CustomValidator', () => {
        it('uses custom validation function', () => {
            const validator = new CustomValidator<{ value: number }>((data) => {
                if (typeof data === 'object' && data !== null && 'value' in data) {
                    const v = (data as Record<string, unknown>).value;
                    if (typeof v === 'number' && v > 10) {
                        return { success: true, data: { value: v }, issues: [], repaired: false, repairAttempts: 0 };
                    }
                }
                return { success: false, data: null, issues: [{ path: 'value', message: 'Must be > 10', severity: 'error' as const, code: 'CUSTOM' }], repaired: false, repairAttempts: 0 };
            });

            const result = validator.validate({ value: 15 });
            expect(result.success).toBe(true);
            expect(result.data).toEqual({ value: 15 });

            const failResult = validator.validate({ value: 5 });
            expect(failResult.success).toBe(false);
        });
    });

    describe('createValidator factory', () => {
        it('creates ZodValidator for zod schema', () => {
            const schema = z.object({ a: z.string() });
            const validator = createValidator({ kind: 'zod', schema });
            expect(validator).toBeInstanceOf(ZodValidator);
        });

        it('creates JsonSchemaValidator for json schema', () => {
            const schema = { type: 'object' as const, properties: {} };
            const validator = createValidator({ kind: 'json', schema });
            expect(validator).toBeInstanceOf(JsonSchemaValidator);
        });

        it('creates CustomValidator for custom schema', () => {
            const validator = createValidator({ kind: 'custom', validate: () => ({ success: true, data: null, issues: [], repaired: false, repairAttempts: 0 }) });
            expect(validator).toBeInstanceOf(CustomValidator);
        });
    });

    describe('composeValidators', () => {
        const schema1 = z.object({ a: z.string() });
        const schema2 = z.object({ b: z.number() });
        const validator = composeValidators<any>(new ZodValidator(schema1), new ZodValidator(schema2));

        it('passes when all validators pass', () => {
            const result = validator.validate({ a: 'hello', b: 42 });
            expect(result.success).toBe(true);
        });

        it('fails when any validator fails', () => {
            const result = validator.validate({ a: 'hello' });
            expect(result.success).toBe(false);
            expect(result.issues.some(i => i.path.includes('b'))).toBe(true);
        });

        it('aggregates issues from all validators', () => {
            const result = validator.validate({ a: 123, b: 'not a number' });
            expect(result.success).toBe(false);
            expect(result.issues.length).toBeGreaterThanOrEqual(2);
        });
    });

    describe('fallbackValidators', () => {
        const schema1 = z.object({ a: z.string() });
        const schema2 = z.object({ b: z.number() });
        const validator = fallbackValidators<any>(new ZodValidator(schema1), new ZodValidator(schema2));

        it('passes with first matching schema', () => {
            const result = validator.validate({ a: 'hello' });
            expect(result.success).toBe(true);
        });

        it('falls back to second schema', () => {
            const result = validator.validate({ b: 42 });
            expect(result.success).toBe(true);
        });

        it('fails when no schema matches', () => {
            const result = validator.validate({ c: true });
            expect(result.success).toBe(false);
        });
    });
});
/**
 * Unified Validator Interface
 * 
 * Abstracts over Zod, JSON Schema, and custom validators
 */

import type {
    Schema,
    ValidationResult,
    ValidationIssue,
    ZodSchema,
    JsonSchema,
    CustomSchema,
    ZodSchemaLike,
} from './types.js';

export interface Validator<T> {
    readonly schema: Schema<T>;
    validate(data: unknown): ValidationResult<T>;
}

/**
 * Zod-based validator implementation
 */
export class ZodValidator<T> implements Validator<T> {
    readonly schema: ZodSchema<T>;

    constructor(zodSchema: ZodSchemaLike<T>) {
        this.schema = { kind: 'zod', schema: zodSchema };
    }

    validate(data: unknown): ValidationResult<T> {
        const result = this.schema.schema.safeParse(data);

        if (result.success) {
            return {
                success: true,
                data: result.data,
                issues: [],
                repaired: false,
                repairAttempts: 0,
            };
        }

        const issues: ValidationIssue[] = result.error.errors.map(e => ({
            path: e.path.join('.'),
            message: e.message,
            severity: 'error' as const,
            code: 'ZOD_VALIDATION_ERROR',
            expected: undefined,
            received: undefined,
        }));

        return {
            success: false,
            data: null,
            issues,
            repaired: false,
            repairAttempts: 0,
        };
    }
}

/**
 * JSON Schema-based validator implementation
 */
export class JsonSchemaValidator<T> implements Validator<T> {
    readonly schema: JsonSchema<T>;

    constructor(jsonSchema: JsonSchema<T>['schema']) {
        this.schema = { kind: 'json', schema: jsonSchema };
    }

    validate(data: unknown): ValidationResult<T> {
        const issues = this.validateJsonSchema(data, this.schema.schema, '');
        
        return {
            success: issues.length === 0,
            data: issues.length === 0 ? data as T : null,
            issues,
            repaired: false,
            repairAttempts: 0,
        };
    }

    private validateJsonSchema(
        value: unknown, 
        schema: JsonSchema<T>['schema'], 
        path: string
    ): ValidationIssue[] {
        const issues: ValidationIssue[] = [];
        const currentPath = path || 'root';

        // Type check
        if (schema.type === 'object') {
            if (typeof value !== 'object' || value === null || Array.isArray(value)) {
                issues.push({
                    path: currentPath,
                    message: `Expected object, got ${Array.isArray(value) ? 'array' : typeof value}`,
                    severity: 'error',
                    code: 'TYPE_MISMATCH',
                    expected: 'object',
                    received: typeof value,
                });
                return issues;
            }

            const obj = value as Record<string, unknown>;

            // Check required properties
            if (schema.required) {
                for (const requiredKey of schema.required) {
                    if (!(requiredKey in obj)) {
                        issues.push({
                            path: `${currentPath}.${requiredKey}`,
                            message: `Missing required property: ${requiredKey}`,
                            severity: 'error',
                            code: 'MISSING_REQUIRED',
                            expected: requiredKey,
                            received: undefined,
                        });
                    }
                }
            }

            // Check each property
            if (schema.properties) {
                for (const [key, propSchema] of Object.entries(schema.properties)) {
                    if (key in obj) {
                        issues.push(...this.validateJsonSchema(
                            obj[key], 
                            propSchema, 
                            `${currentPath}.${key}`
                        ));
                    }
                }
            }

            // Check additional properties
            if (schema.additionalProperties === false && schema.properties) {
                const allowedKeys = new Set(Object.keys(schema.properties));
                for (const key of Object.keys(obj)) {
                    if (!allowedKeys.has(key)) {
                        issues.push({
                            path: `${currentPath}.${key}`,
                            message: `Unexpected property: ${key}`,
                            severity: 'error',
                            code: 'UNEXPECTED_PROPERTY',
                            expected: Array.from(allowedKeys),
                            received: key,
                        });
                    }
                }
            }

        } else if (schema.type === 'array') {
            if (!Array.isArray(value)) {
                issues.push({
                    path: currentPath,
                    message: `Expected array, got ${typeof value}`,
                    severity: 'error',
                    code: 'TYPE_MISMATCH',
                    expected: 'array',
                    received: typeof value,
                });
            } else {
                if (schema.maxLength !== undefined && value.length > schema.maxLength) {
                    issues.push({
                        path: currentPath,
                        message: `Array too long (max ${schema.maxLength})`,
                        severity: 'error',
                        code: 'MAX_LENGTH',
                        expected: schema.maxLength,
                        received: value.length,
                    });
                }
                if (schema.items) {
                    for (let i = 0; i < value.length; i++) {
                        issues.push(...this.validateJsonSchema(
                            value[i], 
                            schema.items, 
                            `${currentPath}[${i}]`
                        ));
                    }
                }
            }

        } else if (schema.type === 'string') {
            if (typeof value !== 'string') {
                issues.push({
                    path: currentPath,
                    message: `Expected string, got ${typeof value}`,
                    severity: 'error',
                    code: 'TYPE_MISMATCH',
                    expected: 'string',
                    received: typeof value,
                });
            } else {
                if (schema.enum && !schema.enum.includes(value)) {
                    issues.push({
                        path: currentPath,
                        message: `Value "${value}" not in enum [${schema.enum.join(', ')}]`,
                        severity: 'error',
                        code: 'ENUM_MISMATCH',
                        expected: schema.enum,
                        received: value,
                    });
                }
                if (schema.pattern && !new RegExp(schema.pattern).test(value)) {
                    issues.push({
                        path: currentPath,
                        message: `Value does not match pattern ${schema.pattern}`,
                        severity: 'error',
                        code: 'PATTERN_MISMATCH',
                        expected: schema.pattern,
                        received: value,
                    });
                }
                if (schema.minLength !== undefined && value.length < schema.minLength) {
                    issues.push({
                        path: currentPath,
                        message: `String too short (min ${schema.minLength})`,
                        severity: 'error',
                        code: 'MIN_LENGTH',
                        expected: schema.minLength,
                        received: value.length,
                    });
                }
                if (schema.maxLength !== undefined && value.length > schema.maxLength) {
                    issues.push({
                        path: currentPath,
                        message: `String too long (max ${schema.maxLength})`,
                        severity: 'error',
                        code: 'MAX_LENGTH',
                        expected: schema.maxLength,
                        received: value.length,
                    });
                }
            }

        } else if (schema.type === 'number') {
            if (typeof value !== 'number') {
                issues.push({
                    path: currentPath,
                    message: `Expected number, got ${typeof value}`,
                    severity: 'error',
                    code: 'TYPE_MISMATCH',
                    expected: 'number',
                    received: typeof value,
                });
            } else {
                if (schema.minimum !== undefined && value < schema.minimum) {
                    issues.push({
                        path: currentPath,
                        message: `Value ${value} below minimum ${schema.minimum}`,
                        severity: 'error',
                        code: 'MINIMUM',
                        expected: schema.minimum,
                        received: value,
                    });
                }
                if (schema.maximum !== undefined && value > schema.maximum) {
                    issues.push({
                        path: currentPath,
                        message: `Value ${value} above maximum ${schema.maximum}`,
                        severity: 'error',
                        code: 'MAXIMUM',
                        expected: schema.maximum,
                        received: value,
                    });
                }
            }

        } else if (schema.type === 'boolean') {
            if (typeof value !== 'boolean') {
                issues.push({
                    path: currentPath,
                    message: `Expected boolean, got ${typeof value}`,
                    severity: 'error',
                    code: 'TYPE_MISMATCH',
                    expected: 'boolean',
                    received: typeof value,
                });
            }
        }

        return issues;
    }
}

/**
 * Custom validator implementation
 */
export class CustomValidator<T> implements Validator<T> {
    readonly schema: CustomSchema<T>;

    constructor(validateFn: (data: unknown) => ValidationResult<T>) {
        this.schema = { kind: 'custom', validate: validateFn };
    }

    validate(data: unknown): ValidationResult<T> {
        return this.schema.validate(data);
    }
}

/**
 * Factory function to create validator from any schema type
 */
export function createValidator<T>(schema: Schema<T>): Validator<T> {
    if (schema.kind === 'zod') {
        return new ZodValidator(schema.schema);
    }
    if (schema.kind === 'json') {
        return new JsonSchemaValidator(schema.schema);
    }
    if (schema.kind === 'custom') {
        return new CustomValidator(schema.validate);
    }
    throw new Error(`Unknown schema kind: ${(schema as Schema<T>).kind}`);
}

/**
 * Compose multiple validators (all must pass)
 */
export function composeValidators<T>(...validators: Validator<T>[]): Validator<T> {
    return {
        schema: validators[0].schema, // Use first schema as reference
        validate(data: unknown): ValidationResult<T> {
            let allIssues: ValidationIssue[] = [];
            let repaired = false;
            let repairAttempts = 0;

            for (const validator of validators) {
                const result = validator.validate(data);
                allIssues = [...allIssues, ...result.issues];
                if (!result.success) {
                    repaired = repaired || result.repaired;
                    repairAttempts = Math.max(repairAttempts, result.repairAttempts);
                }
            }

            return {
                success: allIssues.length === 0,
                data: allIssues.length === 0 ? data as T : null,
                issues: allIssues,
                repaired,
                repairAttempts,
            };
        },
    };
}

/**
 * Create a validator that tries multiple schemas in order (first success wins)
 */
export function fallbackValidators<T>(...validators: Validator<T>[]): Validator<T> {
    return {
        schema: validators[0].schema,
        validate(data: unknown): ValidationResult<T> {
            for (const validator of validators) {
                const result = validator.validate(data);
                if (result.success) {
                    return result;
                }
            }
            // Return last failure
            return validators[validators.length - 1].validate(data);
        },
    };
}
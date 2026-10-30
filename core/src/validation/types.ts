/**
 * Unified Validation Library - Core Types
 * 
 * Consolidates validation/repair from:
 * - ui/src/services/ai/schema.ts (Zod-based)
 * - core/src/ontology/schema.ts (JSON Schema-based)
 */

export type ValidationSeverity = 'error' | 'warning' | 'info';

export interface ValidationIssue {
    readonly path: string;
    readonly message: string;
    readonly severity: ValidationSeverity;
    readonly code: string;
    readonly expected?: unknown;
    readonly received?: unknown;
}

export interface ValidationResult<T> {
    readonly success: boolean;
    readonly data: T | null;
    readonly issues: readonly ValidationIssue[];
    readonly repaired: boolean;
    readonly repairAttempts: number;
}

export interface RepairContext<T> {
    readonly rawInput: unknown;
    readonly schema: Schema<T>;
    readonly previousAttempts: readonly ValidationResult<T>[];
    readonly maxAttempts: number;
}

export interface RepairStrategy<T> {
    readonly name: string;
    readonly canRepair: (context: RepairContext<T>) => boolean;
    readonly repair: (context: RepairContext<T>) => Promise<unknown> | unknown;
}

export type Schema<T> = 
    | ZodSchema<T> 
    | JsonSchema<T> 
    | CustomSchema<T>;

export interface ZodSchema<T> {
    readonly kind: 'zod';
    readonly schema: ZodSchemaLike<T>;
}

export interface ZodSchemaLike<T> {
    readonly safeParse: (data: unknown) => { success: true; data: T; error?: never } | { success: false; data?: never; error: ZodErrorLike };
}

export interface ZodErrorLike {
    readonly errors: readonly { readonly path: readonly (string | number)[]; readonly message: string }[];
}

export interface JsonSchema<T> {
    readonly kind: 'json';
    readonly schema: JsonSchemaObject;
}

export interface JsonSchemaObject {
    readonly type: 'object' | 'array' | 'string' | 'number' | 'boolean';
    readonly properties?: Record<string, JsonSchemaObject>;
    readonly items?: JsonSchemaObject;
    readonly required?: readonly string[];
    readonly additionalProperties?: boolean;
    readonly enum?: readonly unknown[];
    readonly minimum?: number;
    readonly maximum?: number;
    readonly pattern?: string;
    readonly minLength?: number;
    readonly maxLength?: number;
    readonly description?: string;
}

export interface CustomSchema<T> {
    readonly kind: 'custom';
    readonly validate: (data: unknown) => ValidationResult<T>;
}

export function isZodSchema<T>(schema: Schema<T>): schema is ZodSchema<T> {
    return schema.kind === 'zod';
}

export function isJsonSchema<T>(schema: Schema<T>): schema is JsonSchema<T> {
    return schema.kind === 'json';
}

export function isCustomSchema<T>(schema: Schema<T>): schema is CustomSchema<T> {
    return schema.kind === 'custom';
}
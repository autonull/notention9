import type { OntologyNode, OntologyAttribute } from '../types/index.js';
import { collectOntologyKeys, findAttributeDef } from './ontologyCore.js';
import { z } from 'zod';
import {
    ValidationPipeline,
    type Schema,
    type ValidationResult,
    LLMBasedRepairStrategy,
    buildStandardRepairPrompt,
    JsonSchemaValidator,
} from '../validation/index.js';

/**
 * JSON Schema derived from ontology for structured extraction
 */
export interface ExtractionSchema {
    type: 'object';
    properties: Record<string, PropertySchema>;
    required: string[];
    additionalProperties: false;
}

export interface PropertySchema {
    type: 'string' | 'number' | 'boolean' | 'array' | 'object';
    description?: string;
    enum?: string[];
    items?: PropertySchema;
    properties?: Record<string, PropertySchema>;
    minimum?: number;
    maximum?: number;
    pattern?: string;
    minLength?: number;
    maxLength?: number;
}

/**
 * Generate JSON Schema from ontology for extraction validation
 */
export function generateExtractionSchema(ontology: OntologyNode[]): ExtractionSchema {
    const properties: Record<string, PropertySchema> = {};
    const required: string[] = [];

    const keys = collectOntologyKeys(ontology);

    for (const key of keys) {
        const attr = findAttributeInOntology(ontology, key);
        if (!attr) continue;

        const propSchema = attributeToSchema(attr, ontology);
        properties[key] = propSchema;

        // Check if required via requiredAttributes on parent nodes
        if (isRequiredInOntology(ontology, key)) {
            required.push(key);
        }
    }

    return {
        type: 'object',
        properties,
        required,
        additionalProperties: false,
    };
}

function findAttributeInOntology(ontology: OntologyNode[], key: string): OntologyAttribute | undefined {
    for (const node of ontology) {
        if (node.attributes?.[key]) {
            return node.attributes[key];
        }
        if (node.children) {
            const found = findAttributeInOntology(node.children, key);
            if (found) return found;
        }
    }
    return undefined;
}

function isRequiredInOntology(ontology: OntologyNode[], key: string): boolean {
    for (const node of ontology) {
        if (node.requiredAttributes?.includes(key)) {
            return true;
        }
        if (node.children) {
            if (isRequiredInOntology(node.children, key)) return true;
        }
    }
    return false;
}

function attributeToSchema(attr: OntologyAttribute, _ontology: OntologyNode[]): PropertySchema {
    const base: PropertySchema = {
        type: mapType(attr.type),
        description: attr.description,
    };

    if (attr.type === 'enum' && attr.options && attr.options.length > 0) {
        base.enum = attr.options;
    }

    if (attr.type === 'quantity') {
        base.type = 'object';
        base.properties = {
            value: { type: 'number' },
            unit: { type: 'string' },
        };
    }

    // Use numericOptions from ontology attribute
    if (attr.numericOptions) {
        if (attr.numericOptions.min !== undefined) {
            base.minimum = attr.numericOptions.min;
        }
        if (attr.numericOptions.max !== undefined) {
            base.maximum = attr.numericOptions.max;
        }
    }

    if (attr.description) {
        base.description = attr.description;
    }

    return base;
}

function mapType(ontologyType: string): PropertySchema['type'] {
    switch (ontologyType) {
        case 'number':
        case 'quantity':
            return 'number';
        case 'boolean':
            return 'boolean';
        case 'enum':
            return 'string';
        case 'array':
            return 'array';
        case 'string':
        default:
            return 'string';
    }
}

/**
 * Prompt template for structured extraction
 */
export interface ExtractionPrompt {
    systemPrompt: string;
    userPrompt: string;
    schema: ExtractionSchema;
    examples: ExtractionExample[];
}

export interface ExtractionExample {
    input: string;
    output: Record<string, unknown>;
}

/**
 * Build extraction prompt from ontology
 */
export function buildExtractionPrompt(
    ontology: OntologyNode[],
    text: string,
    options: { examples?: ExtractionExample[]; language?: string } = {}
): ExtractionPrompt {
    const schema = generateExtractionSchema(ontology);
    const examples = options.examples || getDefaultExamples(ontology);

    const schemaDescription = schemaToPrompt(schema);

    const systemPrompt = `You are an expert information extractor. Your task is to extract structured properties from natural language text according to the provided JSON schema.

SCHEMA:
${schemaDescription}

RULES:
1. Output ONLY valid JSON matching the schema exactly
2. Use the exact property keys from the schema
3. For enum properties, use ONLY values from the enum list
4. For numeric properties, output numbers (not strings)
5. If a property is not mentioned in the text, omit it (do not output null)
6. For quantities, output as { value: number, unit: string }
7. Be precise and conservative - only extract what is clearly stated

EXAMPLES:
${examples.map((ex, i) => `Example ${i + 1}:
Input: "${ex.input}"
Output: ${JSON.stringify(ex.output, null, 2)}`).join('\n\n')}`;

    const userPrompt = `Extract properties from this text:
"${text}"`;

    return {
        systemPrompt,
        userPrompt,
        schema,
        examples,
    };
}

function schemaToPrompt(schema: ExtractionSchema): string {
    const lines = ['{'];
    for (const [key, prop] of Object.entries(schema.properties)) {
        const required = schema.required.includes(key) ? ' (required)' : '';
        let desc = `${key}: ${prop.type}${required}`;
        if (prop.description) desc += ` - ${prop.description}`;
        if (prop.enum) desc += ` [enum: ${prop.enum.join(', ')}]`;
        if (prop.pattern) desc += ` [pattern: ${prop.pattern}]`;
        if (prop.minimum !== undefined || prop.maximum !== undefined) {
            desc += ` [range: ${prop.minimum ?? '-∞'} to ${prop.maximum ?? '∞'}]`;
        }
        lines.push(`  ${desc}`);
    }
    lines.push('}');
    return lines.join('\n');
}

function getDefaultExamples(ontology: OntologyNode[]): ExtractionExample[] {
    return [
        {
            input: 'Send to john@example.com via email',
            output: { to: 'john@example.com', channel: 'email' },
        },
        {
            input: 'Budget under $5000',
            output: { budget: { value: 5000, unit: 'USD' } },
        },
        {
            input: 'Meeting with John tomorrow at 2pm',
            output: { who: 'John', when: 'tomorrow 2pm' },
        },
    ];
}

/**
 * Repair loop for malformed extraction output - uses unified ValidationPipeline
 */
export interface RepairResult {
    success: boolean;
    output: Record<string, unknown> | null;
    attempts: number;
    errors: string[];
}

/**
 * Convert ExtractionSchema to Validation Library JSON Schema
 */
function extractionSchemaToJsonSchema(schema: ExtractionSchema): { kind: 'json'; schema: Record<string, unknown> } {
    const properties: Record<string, unknown> = {};
    
    for (const [key, prop] of Object.entries(schema.properties)) {
        properties[key] = propertySchemaToJsonSchema(prop);
    }

    return {
        kind: 'json',
        schema: {
            type: 'object',
            properties,
            required: schema.required,
            additionalProperties: schema.additionalProperties,
        },
    };
}

function propertySchemaToJsonSchema(prop: PropertySchema): Record<string, unknown> {
    const result: Record<string, unknown> = { type: prop.type };
    
    if (prop.description) result.description = prop.description;
    if (prop.enum) result.enum = prop.enum;
    if (prop.minimum !== undefined) result.minimum = prop.minimum;
    if (prop.maximum !== undefined) result.maximum = prop.maximum;
    if (prop.pattern) result.pattern = prop.pattern;
    if (prop.minLength !== undefined) result.minLength = prop.minLength;
    if (prop.maxLength !== undefined) result.maxLength = prop.maxLength;
    if (prop.items) result.items = propertySchemaToJsonSchema(prop.items);
    if (prop.properties) {
        const nestedProps: Record<string, unknown> = {};
        for (const [k, v] of Object.entries(prop.properties)) {
            nestedProps[k] = propertySchemaToJsonSchema(v);
        }
        result.properties = nestedProps;
    }
    
    return result;
}

/**
 * Validate extraction output against schema using unified validation library
 */
export function validateAgainstSchema(obj: unknown, schema: ExtractionSchema): string[] {
    const jsonSchema = extractionSchemaToJsonSchema(schema);
    const validator = new JsonSchemaValidator(jsonSchema.schema as any);
    const result = validator.validate(obj);
    
    return result.issues.map(issue => `${issue.path}: ${issue.message}`);
}

/**
 * Repair extraction output using unified ValidationPipeline with LLM repair
 */
export async function repairExtraction(
    rawOutput: string,
    schema: ExtractionSchema,
    maxAttempts: number = 3,
    llmGenerate: (prompt: string) => Promise<string>
): Promise<RepairResult> {
    const jsonSchema = extractionSchemaToJsonSchema(schema);
    
    // Import repair strategies dynamically to avoid circular deps
    const { JsonFenceRepairStrategy, CompositeRepairStrategy } = await import('../validation/RepairStrategy.js');
    
    const pipeline = new ValidationPipeline<Record<string, unknown>>({
        schema: jsonSchema as any,
        maxRepairAttempts: maxAttempts,
        enableHeuristicRepair: true,
        enableLLMRepair: true,
        llmGenerate,
        repairStrategies: [
            // Generic JSON fence removal works for any JSON type
            new JsonFenceRepairStrategy(),
        ],
    });

    // First try to parse and validate
    let parsed: unknown;
    try {
        parsed = JSON.parse(rawOutput);
    } catch {
        // If not valid JSON, try to extract JSON from text
        const jsonMatch = rawOutput.match(/(\[[\s\S]*\]|\{[\s\S]*\})/);
        if (jsonMatch) {
            try {
                parsed = JSON.parse(jsonMatch[1]);
            } catch {
                parsed = rawOutput;
            }
        } else {
            parsed = rawOutput;
        }
    }

    const result = await pipeline.validate(parsed);
    
    return {
        success: result.success,
        output: result.data,
        attempts: result.totalAttempts,
        errors: result.issues.map(i => `${i.path}: ${i.message}`),
    };
}

/**
 * Legacy repair function - kept for backward compatibility
 * Uses the new ValidationPipeline internally
 */
export async function repairExtractionLegacy(
    rawOutput: string,
    schema: ExtractionSchema,
    maxAttempts: number = 3,
    llmGenerate: (prompt: string) => Promise<string>
): Promise<RepairResult> {
    let currentOutput = rawOutput;
    const errors: string[] = [];

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
        try {
            const parsed = JSON.parse(currentOutput);
            const validationErrors = validateAgainstSchema(parsed, schema);
            if (validationErrors.length === 0) {
                return {
                    success: true,
                    output: parsed,
                    attempts: attempt + 1,
                    errors,
                };
            }
            errors.push(...validationErrors);
        } catch (e) {
            errors.push(`JSON parse error: ${e instanceof Error ? e.message : String(e)}`);
        }

        if (attempt < maxAttempts - 1) {
            const repairPrompt = buildRepairPrompt(currentOutput, schema, errors);
            currentOutput = await llmGenerate(repairPrompt);
        }
    }

    return {
        success: false,
        output: null,
        attempts: maxAttempts,
        errors,
    };
}

function buildRepairPrompt(
    invalidOutput: string,
    schema: ExtractionSchema,
    errors: string[]
): string {
    const schemaDescription = schemaToPrompt(schema);
    return `The previous extraction output was invalid. Please fix it.

SCHEMA:
${schemaDescription}

INVALID OUTPUT:
${invalidOutput}

ERRORS:
${errors.map(e => `- ${e}`).join('\n')}

RULES FOR FIXING:
1. Output ONLY valid JSON matching the schema exactly
2. Use exact property keys from the schema
3. For enum properties, use ONLY values from the enum list
4. For numeric properties, output numbers (not strings)
5. Omit properties not mentioned in the text (do not output null)
6. Fix all errors listed above

CORRECTED OUTPUT:`;
}
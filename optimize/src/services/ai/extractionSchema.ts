import type { OntologyNode, Property, OntologyAttribute } from '@notention/core';
import { collectOntologyKeys } from '@notention/core';

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

function attributeToSchema(attr: OntologyAttribute, ontology: OntologyNode[]): PropertySchema {
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
        // Note: required is handled at schema level, not property level
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

    // Add description
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
    // These would ideally come from golden cases
    return [
        {
            input: "Send to john@example.com via email",
            output: { to: "john@example.com", channel: "email" },
        },
        {
            input: "Budget under $5000",
            output: { budget: { value: 5000, unit: "USD" } },
        },
        {
            input: "Meeting with John tomorrow at 2pm",
            output: { who: "John", when: "tomorrow 2pm" },
        },
    ];
}

/**
 * Repair loop for malformed extraction output
 */
export interface RepairResult {
    success: boolean;
    output: Record<string, unknown> | null;
    attempts: number;
    errors: string[];
}

export async function repairExtraction(
    rawOutput: string,
    schema: ExtractionSchema,
    maxAttempts: number = 3,
    llmGenerate: (prompt: string) => Promise<string>
): Promise<RepairResult> {
    let currentOutput = rawOutput;
    const errors: string[] = [];

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
        try {
            // Try to parse as JSON
            const parsed = JSON.parse(currentOutput);
            
            // Validate against schema
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

        // If not last attempt, ask LLM to fix
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

export function validateAgainstSchema(obj: any, schema: ExtractionSchema): string[] {
    const errors: string[] = [];

    if (typeof obj !== 'object' || obj === null) {
        errors.push('Output must be an object');
        return errors;
    }

    // Check required properties
    for (const requiredKey of schema.required) {
        if (!(requiredKey in obj)) {
            errors.push(`Missing required property: ${requiredKey}`);
        }
    }

    // Check each property
    for (const [key, value] of Object.entries(obj)) {
        const propSchema = schema.properties[key];
        if (!propSchema) {
            if (!schema.additionalProperties) {
                errors.push(`Unexpected property: ${key}`);
            }
            continue;
        }

        const propErrors = validateProperty(value, propSchema, key);
        errors.push(...propErrors);
    }

    return errors;
}

function validateProperty(value: any, schema: PropertySchema, path: string): string[] {
    const errors: string[] = [];

    if (value === null || value === undefined) {
        errors.push(`${path}: value is null/undefined`);
        return errors;
    }

    switch (schema.type) {
        case 'string':
            if (typeof value !== 'string') {
                errors.push(`${path}: expected string, got ${typeof value}`);
            } else {
                if (schema.enum && !schema.enum.includes(value)) {
                    errors.push(`${path}: value "${value}" not in enum [${schema.enum.join(', ')}]`);
                }
                if (schema.pattern && !new RegExp(schema.pattern).test(value)) {
                    errors.push(`${path}: value "${value}" does not match pattern ${schema.pattern}`);
                }
                if (schema.minLength !== undefined && value.length < schema.minLength) {
                    errors.push(`${path}: string too short (min ${schema.minLength})`);
                }
                if (schema.maxLength !== undefined && value.length > schema.maxLength) {
                    errors.push(`${path}: string too long (max ${schema.maxLength})`);
                }
            }
            break;

        case 'number':
            if (typeof value !== 'number') {
                errors.push(`${path}: expected number, got ${typeof value}`);
            } else {
                if (schema.minimum !== undefined && value < schema.minimum) {
                    errors.push(`${path}: value ${value} below minimum ${schema.minimum}`);
                }
                if (schema.maximum !== undefined && value > schema.maximum) {
                    errors.push(`${path}: value ${value} above maximum ${schema.maximum}`);
                }
            }
            break;

        case 'boolean':
            if (typeof value !== 'boolean') {
                errors.push(`${path}: expected boolean, got ${typeof value}`);
            }
            break;

        case 'object':
            if (typeof value !== 'object' || value === null || Array.isArray(value)) {
                errors.push(`${path}: expected object, got ${typeof value}`);
            } else if (schema.properties) {
                for (const [subKey, subSchema] of Object.entries(schema.properties)) {
                    if (subKey in value) {
                        errors.push(...validateProperty(value[subKey], subSchema, `${path}.${subKey}`));
                    }
                }
            }
            break;

        case 'array':
            if (!Array.isArray(value)) {
                errors.push(`${path}: expected array, got ${typeof value}`);
            } else if (schema.items) {
                for (let i = 0; i < value.length; i++) {
                    errors.push(...validateProperty(value[i], schema.items, `${path}[${i}]`));
                }
            }
            break;
    }

    return errors;
}
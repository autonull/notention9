/**
 * Built-in strategy specifications
 * Extracted from StrategySpecGenerator for maintainability and configurability
 * Uses a local type definition to avoid circular dependency with StrategySpec.ts
 */

interface StrategySpecLocal {
    seam: string;
    intent: string;
    must: string[];
    may: string[];
    mustNot: string[];
    accepts: Record<string, unknown>;
    emits: Record<string, unknown>;
    examples: string[];
}

export const BUILTIN_SPECS: Record<string, StrategySpecLocal> = {
    'capture-0': {
        seam: 'capture-0',
        intent: 'Capture structured properties from user input with real-time validation',
        must: [
            'Keyboard navigable',
            'ARIA labels on all inputs',
            'Works offline',
            'Validates against ontology schema',
            'Shows validation errors inline',
        ],
        may: [
            'react',
            '@notention/ui/*',
            '@notention/core/*',
            'zod',
            'date-fns',
        ],
        mustNot: [
            'fs',
            'fs/promises',
            'node:*',
            'eval',
            'fetch',
            'localStorage',
            'sessionStorage',
            'indexedDB',
            'crypto.randomUUID',
        ],
        accepts: {
            type: 'object',
            properties: {
                initialKey: { type: 'string' },
                initialOp: { type: 'string' },
                initialValue: { type: 'string' },
                isAdding: { type: 'boolean' },
                onSave: { type: 'function' },
                onCancel: { type: 'function' },
                ontology: { type: 'array' },
            },
            required: ['onSave', 'onCancel', 'ontology'],
        },
        emits: {
            type: 'object',
            properties: {
                propertySaved: {
                    type: 'object',
                    properties: {
                        key: { type: 'string' },
                        operator: { type: 'string' },
                        value: { type: 'string' },
                    },
                    required: ['key', 'operator', 'value'],
                },
            },
        },
        examples: [
            'User types "send to john@example.com" → extracts {key: "to", operator: "send to", value: "john@example.com"}',
            'User selects "client" from dropdown, enters "Acme Corp" → saves property',
        ],
    },
    'elicit-0': {
        seam: 'elicit-0',
        intent: 'Elicit additional details from user with auto-complete and tag suggestions',
        must: [
            'Keyboard navigable',
            'ARIA labels on all inputs',
            'Works offline',
            'Shows suggestions from ontology',
        ],
        may: [
            'react',
            '@notention/ui/*',
            '@notention/core/*',
            'zod',
        ],
        mustNot: [
            'fs',
            'fs/promises',
            'node:*',
            'eval',
            'fetch',
            'localStorage',
            'sessionStorage',
            'indexedDB',
        ],
        accepts: {
            type: 'object',
            properties: {
                tags: { type: 'array', items: { type: 'string' } },
                onChange: { type: 'function' },
                onAutoTag: { type: 'function' },
                isAutoTagging: { type: 'boolean' },
                autoFocus: { type: 'boolean' },
                className: { type: 'string' },
            },
        },
        emits: {
            type: 'object',
            properties: {
                tagsChanged: {
                    type: 'object',
                    properties: {
                        tags: { type: 'array', items: { type: 'string' } },
                    },
                    required: ['tags'],
                },
            },
        },
        examples: [
            'User adds "urgent" tag → emits tagsChanged with ["urgent"]',
            'Auto-tag suggests "follow-up" based on content',
        ],
    },
    'extraction-0': {
        seam: 'extraction-0',
        intent: 'Extract structured properties from natural language text using LLM with schema validation',
        must: [
            'Keyboard navigable',
            'ARIA labels on all inputs',
            'Shows extraction preview before applying',
            'Allows user to edit extracted properties',
            'Repairs malformed LLM output',
        ],
        may: [
            'react',
            '@notention/ui/*',
            '@notention/core/*',
            'zod',
            '@notention/ai',
        ],
        mustNot: [
            'fs',
            'fs/promises',
            'node:*',
            'eval',
            'fetch',
            'localStorage',
            'sessionStorage',
            'indexedDB',
        ],
        accepts: {
            type: 'object',
            properties: {
                isOpen: { type: 'boolean' },
                onClose: { type: 'function' },
                onApply: { type: 'function' },
                ontology: { type: 'array' },
            },
            required: ['isOpen', 'onClose', 'onApply', 'ontology'],
        },
        emits: {
            type: 'object',
            properties: {
                extractionComplete: {
                    type: 'object',
                    properties: {
                        properties: { type: 'array' },
                    },
                    required: ['properties'],
                },
            },
        },
        examples: [
            'Input: "Meeting with John tomorrow at 2pm" → extracts [{"key":"who","op":"is","value":"John"},{"key":"when","op":"is","value":"tomorrow 2pm"}]',
            'Input: "Need to buy milk" → extracts [{"key":"task","op":"is","value":"buy milk"}]',
        ],
    },
    'template-0': {
        seam: 'template-0',
        intent: 'Select a template for note creation with preview',
        must: [
            'Keyboard navigable',
            'ARIA labels on all inputs',
            'Works offline',
            'Shows template preview',
        ],
        may: [
            'react',
            '@notention/ui/*',
            '@notention/core/*',
        ],
        mustNot: [
            'fs',
            'fs/promises',
            'node:*',
            'eval',
            'fetch',
            'localStorage',
            'sessionStorage',
            'indexedDB',
        ],
        accepts: {
            type: 'object',
            properties: {
                ontology: { type: 'array' },
                onSelect: { type: 'function' },
                onClose: { type: 'function' },
            },
            required: ['ontology', 'onSelect', 'onClose'],
        },
        emits: {
            type: 'object',
            properties: {
                templateSelected: {
                    type: 'object',
                    properties: {
                        templateId: { type: 'string' },
                    },
                    required: ['templateId'],
                },
            },
        },
        examples: [
            'User selects "Meeting" template → pre-fills who, when, where properties',
            'User selects "Task" template → pre-fills task, deadline, priority',
        ],
    },
};

/**
 * Roles that have built-in specs available
 */
export const ROLES_WITH_BUILTIN_SPECS = new Set([
    'capture',
    'elicit',
    'extraction',
    'template',
]);

/**
 * Get a built-in spec by seam ID
 */
export function getBuiltinSpec(seamId: string): StrategySpecLocal | undefined {
    return BUILTIN_SPECS[seamId];
}

/**
 * Check if a seam role has a built-in spec
 */
export function hasBuiltinSpec(role: string): boolean {
    return ROLES_WITH_BUILTIN_SPECS.has(role);
}

/**
 * Get all built-in specs
 */
export function getAllBuiltinSpecs(): StrategySpecLocal[] {
    return Object.values(BUILTIN_SPECS);
}
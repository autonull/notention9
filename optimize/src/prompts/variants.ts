/**
 * Prompt variants for E13 ablation study
 * Generates 6 variants of property-extraction prompt
 */

import { DEFAULT_ONTOLOGY } from '@notention/core/ontology/domains.js';
import type { OntologyNode } from '@notention/core/types/index.js';

function collectAllKeys(ontology: OntologyNode[]): string[] {
    const keys: string[] = [];
    function traverse(nodes: OntologyNode[]) {
        for (const node of nodes) {
            if (node.attributes) {
                keys.push(...Object.keys(node.attributes));
            }
            if (node.children) {
                traverse(node.children);
            }
        }
    }
    traverse(ontology);
    return [...new Set(keys)];
}

function formatOntologyForPrompt(ontology: OntologyNode[]): string {
    const keys = collectAllKeys(ontology);
    return keys.sort().join(', ');
}

function formatOntologyDetailed(ontology: OntologyNode[]): string {
    const lines: string[] = [];
    function traverse(nodes: OntologyNode[], prefix = '') {
        for (const node of nodes) {
            if (node.attributes) {
                for (const [key, attr] of Object.entries(node.attributes)) {
                    const typeInfo = attr.type === 'enum' ? ` (enum: ${attr.options?.join(', ')})` : ` (${attr.type})`;
                    const ops = attr.operators?.real?.join('|') ?? 'is';
                    lines.push(`  ${prefix}${key}: ${ops}${typeInfo}`);
                }
            }
            if (node.children) {
                traverse(node.children, prefix + '  ');
            }
        }
    }
    traverse(ontology);
    return lines.join('\n');
}

const ONTOLOGY_KEYS = formatOntologyForPrompt(DEFAULT_ONTOLOGY);
const ONTOLOGY_DETAILED = formatOntologyDetailed(DEFAULT_ONTOLOGY);

// Few-shot examples
const FEW_SHOT_EXAMPLES = [
    {
        input: 'Need a wheelchair ramp installed before Friday, budget 900',
        output: [
            { key: 'role', operator: 'contains', values: ['wheelchair ramp'] },
            { key: 'budget', operator: 'less than', values: ['900 USD'] },
        ],
    },
    {
        input: 'Buy groceries tomorrow - milk, eggs, bread under $50',
        output: [
            { key: 'item', operator: 'contains', values: ['milk, eggs, bread'] },
            { key: 'schedule', operator: 'contains', values: ['tomorrow'] },
            { key: 'budget', operator: 'less than', values: ['50 USD'] },
        ],
    },
];

function formatExamples(examples: typeof FEW_SHOT_EXAMPLES): string {
    return examples
        .map(
            (ex, i) =>
                `Example ${i + 1}:\nInput: "${ex.input}"\nOutput: ${JSON.stringify(ex.output)}`
        )
        .join('\n\n');
}

// Variant 1: Current v1 (baseline - static, no ontology, no shots)
export const PROMPT_V1_BASELINE = {
    id: 'property-extraction',
    version: '1',
    template: `You are a 'Gardener' AI for a semantic note-taking app.
Your goal is to extract structured properties from the user's raw text note.

The ontology keys usually include:
- intent (task, reminder, purchase, etc.)
- status (pending, done)
- priority (high, medium, low)
- topic (tech, philosophy, etc.)
- people (mentions of names)
- location
- date/time

Extract semantic properties from the following text:
"{{text}}"

Return the result as a list of properties.`,
};

// Variant 2: Ontology-embedded, no shots
export const PROMPT_V2_ONTOLOGY_EMBEDDED = {
    id: 'property-extraction',
    version: '2-ontology-embedded',
    template: `You are a 'Gardener' AI for a semantic note-taking app.
Your goal is to extract structured properties from the user's raw text note.

The ontology defines the following keys and their allowed operators:
{{ontology}}

Extract semantic properties from the following text:
"{{text}}"

Return the result as a JSON array of properties, each with: key, operator, values.
Only use keys and operators from the ontology above.`,
};

// Variant 3: Ontology-embedded + 2-shot
export const PROMPT_V3_ONTOLOGY_FEWSHOT = {
    id: 'property-extraction',
    version: '3-ontology-fewshot',
    template: `You are a 'Gardener' AI for a semantic note-taking app.
Your goal is to extract structured properties from the user's raw text note.

The ontology defines the following keys and their allowed operators:
{{ontology}}

Examples:
{{examples}}

Extract semantic properties from the following text:
"{{text}}"

Return the result as a JSON array of properties, each with: key, operator, values.
Only use keys and operators from the ontology above.`,
};

// Variant 4: Two-step (extract then normalize) with ontology
export const PROMPT_V4_TWO_STEP = {
    id: 'property-extraction',
    version: '4-two-step',
    template: `You are a 'Gardener' AI for a semantic note-taking app.

STEP 1 - Extract: Identify all semantic entities and relations in the text.
STEP 2 - Normalize: Map each entity to the closest ontology key with the appropriate operator.

The ontology defines the following keys and their allowed operators:
{{ontology}}

Extract and normalize properties from the following text:
"{{text}}"

Return the result as a JSON array of properties, each with: key, operator, values.
Only use keys and operators from the ontology above.`,
};

// Variant 5: Schema-constrained (Zod-style) with ontology
export const PROMPT_V5_SCHEMA_CONSTRAINED = {
    id: 'property-extraction',
    version: '5-schema-constrained',
    template: `You are a 'Gardener' AI for a semantic note-taking app.
Your goal is to extract structured properties from the user's raw text note.

The ontology defines the following keys and their allowed operators:
{{ontology}}

Schema constraints:
- Each property MUST have: key (string), operator (string), values (string[])
- key MUST be one of the ontology keys listed above
- operator MUST be one of the allowed operators for that key
- values MUST be non-empty arrays of strings
- Output MUST be valid JSON matching the schema

Extract semantic properties from the following text:
"{{text}}"

Return ONLY a JSON array of properties. No markdown, no explanation.`,
};

// Variant 6: Schema-constrained + 2-shot (best of both)
export const PROMPT_V6_BEST = {
    id: 'property-extraction',
    version: '6-best-combined',
    template: `You are a 'Gardener' AI for a semantic note-taking app.
Your goal is to extract structured properties from the user's raw text note.

The ontology defines the following keys and their allowed operators:
{{ontology}}

Examples:
{{examples}}

Schema constraints:
- Each property MUST have: key (string), operator (string), values (string[])
- key MUST be one of the ontology keys listed above
- operator MUST be one of the allowed operators for that key
- values MUST be non-empty arrays of strings
- Output MUST be valid JSON matching the schema

Extract semantic properties from the following text:
"{{text}}"

Return ONLY a JSON array of properties. No markdown, no explanation.`,
};

export const PROMPT_VARIANTS = [
    PROMPT_V1_BASELINE,
    PROMPT_V2_ONTOLOGY_EMBEDDED,
    PROMPT_V3_ONTOLOGY_FEWSHOT,
    PROMPT_V4_TWO_STEP,
    PROMPT_V5_SCHEMA_CONSTRAINED,
    PROMPT_V6_BEST,
];

export function renderPrompt(template: string, text: string): string {
    return template
        .replace('{{text}}', text)
        .replace('{{ontology}}', ONTOLOGY_DETAILED)
        .replace('{{examples}}', formatExamples(FEW_SHOT_EXAMPLES));
}
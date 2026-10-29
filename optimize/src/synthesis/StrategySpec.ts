import { z } from 'zod';

/**
 * Seam definition - shared between discovery and synthesis
 */
export interface Seam {
    id: string;
    name: string;
    description: string;
    propsShape: Record<string, string>;
    components: string[];
    role: 'capture' | 'elicit' | 'match' | 'display' | 'layout' | 'explain' | 'ontology' | 'intent';
}

/**
 * StrategySpec - defines what a synthesized strategy must implement
 * Used by the LLM generator to produce valid strategies
 */
export const StrategySpecSchema = z.object({
    seam: z.string().describe('Seam ID this strategy implements (e.g., "capture-0")'),
    intent: z.string().describe('Human-readable description of what this strategy does'),
    must: z.array(z.string()).describe('Hard requirements: a11y, keyboard, offline, etc.'),
    may: z.array(z.string()).describe('Allowed dependencies: react, tokens, ui/*, etc.'),
    mustNot: z.array(z.string()).describe('Forbidden: core/security|storage|network, eval, remote URLs'),
    accepts: z.record(z.unknown()).describe('JSON Schema for input props'),
    emits: z.record(z.unknown()).describe('JSON Schema for output events'),
    examples: z.array(z.string()).describe('Example use cases'),
});

export type StrategySpec = z.infer<typeof StrategySpecSchema>;

/**
 * Candidate strategy - a generated strategy with provenance
 */
export interface CandidateStrategy {
    id: string;
    spec: StrategySpec;
    code: string;
    provenance: CandidateProvenance;
    createdAt: string;
}

export interface CandidateProvenance {
    generatorModel: string;
    generatorVersion: string;
    promptHash: string;
    seed: number;
    parentCommit: string;
}

/**
 * Generated candidate directory structure
 */
export interface CandidateDir {
    root: string;
    candidates: Map<string, CandidateStrategy>;
}

/**
 * StrategySpec generator - creates StrategySpec from seam + requirements
 */
export class StrategySpecGenerator {
    private specs = new Map<string, StrategySpec>();

    // Built-in specs for known seams
    private builtinSpecs: Record<string, StrategySpec> = {
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

    getSpec(seamId: string): StrategySpec | undefined {
        return this.builtinSpecs[seamId];
    }

    getAllSpecs(): StrategySpec[] {
        return Object.values(this.builtinSpecs);
    }

    /**
     * Generate a StrategySpec from a discovered seam and requirements
     */
    generateSpec(seam: { id: string; name: string; role: string; propsShape: Record<string, string> }, requirements: string[]): StrategySpec {
        const baseSpec = this.builtinSpecs[seam.id];
        if (baseSpec) return baseSpec;

        // Generate a basic spec from the seam
        return {
            seam: seam.id,
            intent: `Implement ${seam.role} seam: ${seam.name}`,
            must: [
                'Keyboard navigable',
                'ARIA labels on all inputs',
                'Works offline',
                ...requirements,
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
                properties: seam.propsShape,
            },
            emits: {
                type: 'object',
                properties: {},
            },
            examples: [],
        };
    }
}

/**
 * Validate a StrategySpec against the schema
 */
export function validateStrategySpec(spec: unknown): StrategySpec {
    return StrategySpecSchema.parse(spec);
}

/**
 * Create a candidate directory for generated strategies
 */
export function createCandidateDir(root: string): CandidateDir {
    return {
        root,
        candidates: new Map(),
    };
}

/**
 * Save a candidate to the candidate directory
 */
export async function saveCandidate(dir: CandidateDir, candidate: CandidateStrategy): Promise<void> {
    const fs = await import('fs/promises');
    const path = await import('path');
    
    const candidateDir = path.join(dir.root, candidate.id);
    await fs.mkdir(candidateDir, { recursive: true });
    
    await fs.writeFile(
        path.join(candidateDir, 'spec.json'),
        JSON.stringify(candidate.spec, null, 2)
    );
    
    await fs.writeFile(
        path.join(candidateDir, 'strategy.tsx'),
        candidate.code
    );
    
    await fs.writeFile(
        path.join(candidateDir, 'provenance.json'),
        JSON.stringify(candidate.provenance, null, 2)
    );
    
    dir.candidates.set(candidate.id, candidate);
}

/**
 * Load all candidates from a directory
 */
export async function loadCandidates(root: string): Promise<CandidateDir> {
    const fs = await import('fs/promises');
    const path = await import('path');
    
    const dir = createCandidateDir(root);
    
    try {
        const entries = await fs.readdir(root, { withFileTypes: true });
        
        for (const entry of entries) {
            if (!entry.isDirectory()) continue;
            
            const candidateDir = path.join(root, entry.name);
            const specFile = path.join(candidateDir, 'spec.json');
            const codeFile = path.join(candidateDir, 'strategy.tsx');
            const provFile = path.join(candidateDir, 'provenance.json');
            
            try {
                const [specContent, codeContent, provContent] = await Promise.all([
                    fs.readFile(specFile, 'utf-8'),
                    fs.readFile(codeFile, 'utf-8'),
                    fs.readFile(provFile, 'utf-8'),
                ]);
                
                const candidate: CandidateStrategy = {
                    id: entry.name,
                    spec: JSON.parse(specContent),
                    code: codeContent,
                    provenance: JSON.parse(provContent),
                    createdAt: new Date().toISOString(),
                };
                
                dir.candidates.set(candidate.id, candidate);
            } catch {
                // Skip invalid candidates
            }
        }
    } catch {
        // Directory doesn't exist
    }
    
    return dir;
}
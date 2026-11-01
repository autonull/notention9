import { getBuiltinSpec, getAllBuiltinSpecs } from './builtinSpecs.js';
import type { StrategySpec, CandidateStrategy, CandidateProvenance } from './types.js';

/**
 * StrategySpec generator - creates StrategySpec from seam + requirements
 */
export class StrategySpecGenerator {
    private specs = new Map<string, StrategySpec>();

    getSpec(seamId: string): StrategySpec | undefined {
        return getBuiltinSpec(seamId);
    }

    getAllSpecs(): StrategySpec[] {
        return getAllBuiltinSpecs();
    }

    /**
     * Generate a StrategySpec from a discovered seam and requirements
     */
    generateSpec(
        seam: { id: string; name: string; role: string; propsShape: Record<string, string> },
        requirements: string[]
    ): StrategySpec {
        const baseSpec = getBuiltinSpec(seam.id);
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
    const { StrategySpecSchema } = await import('./types.js');
    return StrategySpecSchema.parse(spec);
}

/**
 * LLM Strategy Generator - generates T2 strategies (LLM writes strategy behind existing seam)
 */
export class StrategyGenerator {
    readonly specGenerator = new StrategySpecGenerator();

    /**
     * Generate a candidate strategy for a given seam using an LLM
     */
    async generateForSeam(
        seamId: string,
        requirements: string[],
        options: { model?: string; seed?: number; parentCommit?: string; spec?: StrategySpec } = {}
    ): Promise<CandidateStrategy> {
        const spec = options.spec ?? this.specGenerator.getSpec(seamId)
            ?? this.specGenerator.generateSpec(
                { id: seamId, name: seamId, role: 'capture', propsShape: {} },
                requirements
            );

        const prompt = this.buildPrompt(spec, requirements);

        // In production, this would call the LLM
        // For now, return a template-based implementation
        const { generateStrategyCode, hashPrompt } = await import('../templateGenerator.js');
        const code = generateStrategyCode(spec);

        return {
            id: `${seamId}-candidate-${Date.now()}`,
            spec,
            code,
            provenance: {
                generatorModel: options.model || 'template-generator-v1',
                generatorVersion: '1.0.0',
                promptHash: hashPrompt(prompt),
                seed: options.seed || 0,
                parentCommit: options.parentCommit || 'unknown',
            },
            createdAt: new Date().toISOString(),
        };
    }

    /**
     * Build prompt for LLM generation
     */
    private buildPrompt(spec: StrategySpec, requirements: string[]): string {
        return `
You are a React component generator for Notention. Generate a strategy component that implements the following seam specification.

SEAM SPECIFICATION:
${JSON.stringify(spec, null, 2)}

ADDITIONAL REQUIREMENTS:
${requirements.map(r => `- ${r}`).join('\n')}

CONSTRAINTS:
- Must be a valid React functional component
- Must use only imports from the "may" list
- Must NOT use any imports from the "mustNot" list
- Must satisfy all "must" requirements (a11y, keyboard, offline, etc.)
- Must conform to the "accepts" input schema and "emits" output schema
- Must be TypeScript with proper types
- Export as default component named "Strategy"

Return ONLY the TypeScript/TSX code, no markdown formatting.
`;
    }
}

/**
 * Generate candidates for all discovered seams
 */
export async function generateAllCandidates(
    seams: { id: string; name: string; role: string; propsShape: Record<string, string> }[],
    outputDir: string,
    options: { model?: string; seed?: number; parentCommit?: string } = {}
): Promise<CandidateDir> {
    const generator = new StrategyGenerator();
    const dir = createCandidateDir(outputDir);

    // Generate one candidate per discovered seam that has a built-in spec for its exact ID
    for (const seam of seams) {
        const spec = getBuiltinSpec(seam.id);
        if (!spec) continue;

        // Generate a spec from the discovered seam (uses built-in as base if available)
        const generatedSpec = generator.specGenerator.generateSpec(seam, []);

        // Generate candidate using the discovered seam's ID
        const candidate = await generator.generateForSeam(seam.id, [], options);
        // Override the spec with the discovered seam's spec
        candidate.spec = generatedSpec;
        await saveCandidate(dir, candidate);
    }

    return dir;
}

// Re-export CandidateDir from types
import type { CandidateDir } from './types.js';
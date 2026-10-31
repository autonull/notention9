import { StrategySpecGenerator, type StrategySpec, type CandidateStrategy, type CandidateDir, createCandidateDir, saveCandidate, loadCandidates } from './StrategySpec.js';
import { generateStrategyCode, hashPrompt } from './templateGenerator.js';

/**
 * Options for strategy generation
 */
export interface GenerateOptions {
    model?: string;
    seed?: number;
    parentCommit?: string;
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
        options: GenerateOptions & { spec?: StrategySpec } = {}
    ): Promise<CandidateStrategy> {
        const spec = options.spec ?? this.specGenerator.getSpec(seamId) 
            ?? this.specGenerator.generateSpec(
                { id: seamId, name: seamId, role: 'capture', propsShape: {} },
                requirements
            );

        const prompt = this.buildPrompt(spec, requirements);
        
        // In production, this would call the LLM
        // For now, return a template-based implementation
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
    options: GenerateOptions = {}
): Promise<CandidateDir> {
    const generator = new StrategyGenerator();
    const dir = createCandidateDir(outputDir);
    
    // Generate one candidate per discovered seam that has a built-in spec for its role
    const rolesWithBuiltinSpecs = new Set(['capture', 'elicit', 'extraction', 'template']);
    
    for (const seam of seams) {
        if (!rolesWithBuiltinSpecs.has(seam.role)) continue;
        
        // Generate a spec from the discovered seam (uses built-in as base if available)
        const spec = generator.specGenerator.generateSpec(seam, []);
        
        // Generate candidate using the discovered seam's ID
        const candidate = await generator.generateForSeam(seam.id, [], options);
        // Override the spec with the discovered seam's spec
        candidate.spec = spec;
        await saveCandidate(dir, candidate);
    }
    
    return dir;
}
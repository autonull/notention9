import { z } from 'zod';
import type { Seam, StrategyArtifact, Capability, Provenance } from '@notention/core/ui';
import { BUILTIN_SPECS, ROLES_WITH_BUILTIN_SPECS, getBuiltinSpec, hasBuiltinSpec } from './builtinSpecs.js';

/**
 * Seam definition - re-exported from core for consistency
 */
export type { Seam };

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

// Re-export core types
export type { StrategyArtifact, Capability, Provenance };

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

    getSpec(seamId: string): StrategySpec | undefined {
        return getBuiltinSpec(seamId);
    }

    getAllSpecs(): StrategySpec[] {
        return getAllBuiltinSpecs();
    }

    /**
     * Generate a StrategySpec from a discovered seam and requirements
     */
    generateSpec(seam: { id: string; name: string; role: string; propsShape: Record<string, string> }, requirements: string[]): StrategySpec {
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
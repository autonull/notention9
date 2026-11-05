import { z } from 'zod';
import type { Seam, StrategyArtifact, Capability, Provenance } from '@notention/core/ui';

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
 * Builtin spec types for re-export
 */
export type { BuiltinSpec } from '../builtinSpecs.js';
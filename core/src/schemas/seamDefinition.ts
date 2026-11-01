/**
 * SeamDefinition schema (S2)
 * Unified definition for seams with governance, evidence classes, and evaluator config
 */

import { z } from 'zod';
import type { Seam, SeamRole } from '../ui/strategy.js';
import type { ParamSpec } from '../ui/strategy.js';

// --- Evidence Class (S6) ---

export const EVIDENCE_CLASSES = [
    'measured',    // Empirical: A/B test, controlled experiment, statistical verdict
    'observed',    // Human-verified: expert review, human judge, audit
    'hypothesized', // LLM-judged: LLM-as-judge, model prediction, proxy metric
    'asserted',    // Declared: untested assumption, design intent, configuration default
] as const;

export type EvidenceClass = typeof EVIDENCE_CLASSES[number];

export const evidenceClassSchema = z.enum(EVIDENCE_CLASSES);

// --- Governance Level ---

export const GOVERNANCE_LEVELS = [
    'config',      // Param changes only, no code change
    'structure',   // New component/seam, requires review
    'interface',   // Cross-seam contract change, requires architecture review
] as const;

export type GovernanceLevel = typeof GOVERNANCE_LEVELS[number];

export const governanceLevelSchema = z.enum(GOVERNANCE_LEVELS);

// --- Judge Provenance ---

export interface JudgeProvenance {
    judgeId: string;           // 'human:alice', 'model:gpt-4o', 'mcnemar:v1', 'bayesian:v2'
    judgeType: 'human' | 'model' | 'statistical';
    timestamp: string;
    confidence?: number;       // 0-1, when applicable
    metadata?: Record<string, unknown>;
}

export const judgeProvenanceSchema = z.object({
    judgeId: z.string(),
    judgeType: z.enum(['human', 'model', 'statistical']),
    timestamp: z.string().datetime(),
    confidence: z.number().min(0).max(1).optional(),
    metadata: z.record(z.unknown()).optional(),
});

// --- Evaluator Config ---

export interface EvaluatorConfig {
    type: 'extraction' | 'match' | 'custom';
    qualityFamily?: 'extraction' | 'match';
    customEvaluator?: string;  // Import path for custom evaluator
    metrics: string[];         // Metric names this evaluator produces
    primaryMetric: string;     // Primary metric for verdict
    mde?: Record<string, number>;
    floors?: Record<string, number>;
}

export const evaluatorConfigSchema = z.object({
    type: z.enum(['extraction', 'match', 'custom']),
    qualityFamily: z.enum(['extraction', 'match']).optional(),
    customEvaluator: z.string().optional(),
    metrics: z.array(z.string()),
    primaryMetric: z.string(),
    mde: z.record(z.number()).optional(),
    floors: z.record(z.number()).optional(),
});

// --- SeamDefinition ---

export interface SeamDefinition {
    // Identity
    id: string;                    // Dynamic: 'capture-0', 'match-1', etc.
    name: string;
    description: string;
    role: SeamRole;
    
    // Component interface
    propsShape: Record<string, string>;
    components: string[];
    
    // Parameter schema
    paramSpec: ParamSpec;
    
    // Evaluation
    evaluator: EvaluatorConfig;
    
    // Governance
    governanceLevel: GovernanceLevel;
    evidenceClasses: EvidenceClass[];  // Allowed evidence classes for verdicts on this seam
    
    // Metadata
    version: string;
    createdAt: string;
    updatedAt: string;
    tags?: string[];
}

export const seamDefinitionSchema = z.object({
    id: z.string(),
    name: z.string(),
    description: z.string(),
    role: z.enum(['capture', 'elicit', 'match', 'display', 'layout', 'explain', 'ontology', 'intent']),
    propsShape: z.record(z.string()),
    components: z.array(z.string()),
    paramSpec: z.record(z.object({
        type: z.enum(['string', 'number', 'boolean', 'enum', 'object', 'array']),
        description: z.string().optional(),
        required: z.boolean().optional(),
        default: z.unknown().optional(),
        options: z.array(z.string()).optional(),
        min: z.number().optional(),
        max: z.number().optional(),
    })),
    evaluator: evaluatorConfigSchema,
    governanceLevel: governanceLevelSchema,
    evidenceClasses: z.array(evidenceClassSchema),
    version: z.string(),
    createdAt: z.string().datetime(),
    updatedAt: z.string().datetime(),
    tags: z.array(z.string()).optional(),
});

// --- Conversion from existing Seam + ParamSpec ---

export function createSeamDefinition(
    seam: Seam,
    paramSpec: ParamSpec,
    evaluator: EvaluatorConfig,
    governanceLevel: GovernanceLevel = 'config',
    evidenceClasses: EvidenceClass[] = ['measured', 'observed']
): SeamDefinition {
    const now = new Date().toISOString();
    return {
        id: seam.id,
        name: seam.name,
        description: seam.description,
        role: seam.role,
        propsShape: seam.propsShape,
        components: seam.components,
        paramSpec,
        evaluator,
        governanceLevel,
        evidenceClasses,
        version: '1.0.0',
        createdAt: now,
        updatedAt: now,
    };
}

// --- Type inference ---

export type SeamDefinitionSchema = z.infer<typeof seamDefinitionSchema>;
/**
 * EventSchema registry (S5)
 * Replaces hardcoded LedgerEventType/LedgerPayload with Zod + versioning
 */

import { z } from 'zod';

// --- Base event schema ---

export const baseEventSchema = z.object({
    id: z.string(),
    type: z.string(),
    runId: z.string().optional(),
    caseId: z.string().optional(),
    revisionId: z.string().optional(),
    evaluationId: z.string().optional(),
    actor: z.enum(['system', 'human', 'model']),
    userId: z.string().optional(),
    modelId: z.string().optional(),
    payload: z.unknown(),
    timestamp: z.string().datetime(),
    durationMs: z.number().optional(),
    hash: z.string(),
    version: z.number().int().positive().default(1),
});

// --- Payload schemas by event type ---

const runConfigSchema = z.object({
    manifestHash: z.string(),
    revisionId: z.string(),
    baselineRevisionId: z.string(),
    caseFilter: z.array(z.string()).optional(),
    repetitions: z.number(),
});

const runSummarySchema = z.object({
    totalCases: z.number(),
    completed: z.number(),
    failed: z.number(),
    overallVerdict: z.string(),
});

const caseStartedSchema = z.object({
    caseId: z.string(),
    strategyId: z.string(),
});

const caseCompletedSchema = z.object({
    caseId: z.string(),
    verdict: z.unknown(), // CaseVerdict - complex, keep flexible
    durationMs: z.number(),
});

const caseFailedSchema = z.object({
    caseId: z.string(),
    error: z.string(),
});

const caseSkippedSchema = z.object({
    caseId: z.string(),
    reason: z.string(),
});

const strategyResolvedSchema = z.object({
    seamRole: z.string(),
    strategyId: z.string(),
    reason: z.unknown(), // ResolutionReason
    params: z.record(z.unknown()),
});

const strategyRenderedSchema = z.object({
    seamRole: z.string(),
    strategyId: z.string(),
    outputHash: z.string(),
});

const verdictComputedSchema = z.object({
    caseId: z.string(),
    verdict: z.unknown(), // CaseVerdict
    details: z.array(z.unknown()), // VerdictDetail
});

const gateEvaluatedSchema = z.object({
    gate: z.enum(['must-win', 'schema', 'floors']),
    passed: z.boolean(),
    details: z.string(),
});

const revisionSchema = z.object({
    id: z.string(),
    seamRole: z.string(),
    strategy: z.unknown(),
    author: z.enum(['human', 'model']),
    model: z.string().optional(),
    promptHash: z.string().optional(),
    parentRevisionId: z.string().optional(),
    evaluationId: z.string().optional(),
    verdict: z.enum(['pass', 'fail', 'inconclusive']).optional(),
    status: z.string(),
    consentedBy: z.string().optional(),
    consentedAt: z.string().optional(),
    activatedAt: z.string().optional(),
    rolledBackAt: z.string().optional(),
    rollbackReason: z.string().optional(),
    createdAt: z.string().datetime(),
    updatedAt: z.string().datetime(),
    tags: z.array(z.string()).optional(),
});

const revisionCreatedSchema = z.object({
    revision: revisionSchema,
});

const revisionEvaluatedSchema = z.object({
    revisionId: z.string(),
    evaluationId: z.string(),
    verdict: z.enum(['pass', 'fail', 'inconclusive']),
});

const revisionConsentedSchema = z.object({
    revisionId: z.string(),
    userId: z.string(),
});

const revisionActivatedSchema = z.object({
    revisionId: z.string(),
    previousRevisionId: z.string().optional(),
});

const revisionRolledBackSchema = z.object({
    revisionId: z.string(),
    reason: z.string(),
    rolledBackToRevisionId: z.string().optional(),
});

const revisionSupersededSchema = z.object({
    revisionId: z.string(),
    supersededByRevisionId: z.string(),
});

const revisionRejectedSchema = z.object({
    revisionId: z.string(),
    reason: z.string(),
});

const consentRequestedSchema = z.object({
    revisionId: z.string(),
    userId: z.string(),
});

const consentGrantedSchema = z.object({
    revisionId: z.string(),
    userId: z.string(),
});

const consentDeniedSchema = z.object({
    revisionId: z.string(),
    userId: z.string(),
    reason: z.string(),
});

const optimizerConfigSchema = z.object({
    targetSeams: z.array(z.string()),
    maxCandidatesPerSeam: z.number(),
    maxBrowserRuns: z.number(),
    maxTimeMinutes: z.number(),
    maxTokens: z.number(),
    useSuccessiveHalving: z.boolean(),
    initialSliceFraction: z.number(),
    minPromote: z.number(),
});

const optimizerCostSchema = z.object({
    browserRuns: z.number(),
    tokensUsed: z.number(),
    durationMs: z.number(),
});

const optimizerCycleStartedSchema = z.object({
    config: optimizerConfigSchema,
    manifestHash: z.string(),
});

const optimizerCycleCompletedSchema = z.object({
    candidatesEvaluated: z.number(),
    winners: z.number(),
    losers: z.number(),
    inconclusive: z.number(),
    totalCost: optimizerCostSchema,
});

const optimizerCandidateEvaluatedSchema = z.object({
    candidateId: z.string(),
    seamRole: z.string(),
    strategyId: z.string(),
    verdict: z.string(),
    primaryDelta: z.number(),
});

// --- Event schema registry ---

export const EVENT_SCHEMAS = {
    'run:started': baseEventSchema.extend({ type: z.literal('run:started'), payload: runConfigSchema }),
    'run:completed': baseEventSchema.extend({ type: z.literal('run:completed'), payload: runSummarySchema }),
    'run:failed': baseEventSchema.extend({ type: z.literal('run:failed'), payload: z.object({ error: z.string() }) }),
    
    'case:started': baseEventSchema.extend({ type: z.literal('case:started'), payload: caseStartedSchema }),
    'case:completed': baseEventSchema.extend({ type: z.literal('case:completed'), payload: caseCompletedSchema }),
    'case:failed': baseEventSchema.extend({ type: z.literal('case:failed'), payload: caseFailedSchema }),
    'case:skipped': baseEventSchema.extend({ type: z.literal('case:skipped'), payload: caseSkippedSchema }),
    
    'strategy:resolved': baseEventSchema.extend({ type: z.literal('strategy:resolved'), payload: strategyResolvedSchema }),
    'strategy:rendered': baseEventSchema.extend({ type: z.literal('strategy:rendered'), payload: strategyRenderedSchema }),
    
    'verdict:computed': baseEventSchema.extend({ type: z.literal('verdict:computed'), payload: verdictComputedSchema }),
    
    'gate:evaluated': baseEventSchema.extend({ type: z.literal('gate:evaluated'), payload: gateEvaluatedSchema }),
    
    'revision:created': baseEventSchema.extend({ type: z.literal('revision:created'), payload: revisionCreatedSchema }),
    'revision:evaluated': baseEventSchema.extend({ type: z.literal('revision:evaluated'), payload: revisionEvaluatedSchema }),
    'revision:consented': baseEventSchema.extend({ type: z.literal('revision:consented'), payload: revisionConsentedSchema }),
    'revision:activated': baseEventSchema.extend({ type: z.literal('revision:activated'), payload: revisionActivatedSchema }),
    'revision:rolled-back': baseEventSchema.extend({ type: z.literal('revision:rolled-back'), payload: revisionRolledBackSchema }),
    'revision:superseded': baseEventSchema.extend({ type: z.literal('revision:superseded'), payload: revisionSupersededSchema }),
    'revision:rejected': baseEventSchema.extend({ type: z.literal('revision:rejected'), payload: revisionRejectedSchema }),
    
    'consent:requested': baseEventSchema.extend({ type: z.literal('consent:requested'), payload: consentRequestedSchema }),
    'consent:granted': baseEventSchema.extend({ type: z.literal('consent:granted'), payload: consentGrantedSchema }),
    'consent:denied': baseEventSchema.extend({ type: z.literal('consent:denied'), payload: consentDeniedSchema }),
    
    'optimizer:cycle:started': baseEventSchema.extend({ type: z.literal('optimizer:cycle:started'), payload: optimizerCycleStartedSchema }),
    'optimizer:cycle:completed': baseEventSchema.extend({ type: z.literal('optimizer:cycle:completed'), payload: optimizerCycleCompletedSchema }),
    'optimizer:candidate:evaluated': baseEventSchema.extend({ type: z.literal('optimizer:candidate:evaluated'), payload: optimizerCandidateEvaluatedSchema }),
} as const;

export type EventType = keyof typeof EVENT_SCHEMAS;
export type EventSchema = typeof EVENT_SCHEMAS[EventType];

// --- Schema registry class ---

export class EventSchemaRegistry {
    private schemas: Map<string, z.ZodSchema> = new Map();
    private versions: Map<string, number> = new Map();
    
    constructor() {
        // Register built-in schemas
        for (const [type, schema] of Object.entries(EVENT_SCHEMAS)) {
            this.register(type, schema);
        }
    }
    
    /**
     * Register an event schema
     */
    register(type: string, schema: z.ZodSchema, version = 1): void {
        if (this.schemas.has(type)) {
            const existingVersion = this.versions.get(type) ?? 1;
            if (version <= existingVersion) {
                throw new Error(`Schema version ${version} for '${type}' not greater than existing ${existingVersion}`);
            }
        }
        this.schemas.set(type, schema);
        this.versions.set(type, version);
    }
    
    /**
     * Get schema for event type
     */
    getSchema(type: string): z.ZodSchema | undefined {
        return this.schemas.get(type);
    }
    
    /**
     * Get schema version
     */
    getVersion(type: string): number | undefined {
        return this.versions.get(type);
    }
    
    /**
     * Validate an event against its schema
     */
    validate(event: unknown): { success: true; data: z.infer<typeof baseEventSchema> } | { success: false; error: z.ZodError } {
        const baseResult = baseEventSchema.safeParse(event);
        if (!baseResult.success) {
            return { success: false, error: baseResult.error };
        }
        
        const eventType = baseResult.data.type;
        const schema = this.schemas.get(eventType);
        
        if (!schema) {
            return { success: false, error: new z.ZodError([{ code: 'custom', message: `Unknown event type: ${eventType}`, path: ['type'] }]) };
        }
        
        const result = schema.safeParse(event);
        if (!result.success) {
            return { success: false, error: result.error };
        }
        
        return { success: true, data: result.data };
    }
    
    /**
     * Parse event with validation (throws on failure)
     */
    parse(event: unknown): z.infer<typeof baseEventSchema> {
        const result = this.validate(event);
        if (!result.success) {
            throw result.error;
        }
        return result.data;
    }
    
    /**
     * List all registered event types
     */
    listTypes(): string[] {
        return Array.from(this.schemas.keys());
    }
    
    /**
     * Check if event type is registered
     */
    hasType(type: string): boolean {
        return this.schemas.has(type);
    }
}

// --- Singleton instance ---

let registryInstance: EventSchemaRegistry | null = null;

export function getEventSchemaRegistry(): EventSchemaRegistry {
    if (!registryInstance) {
        registryInstance = new EventSchemaRegistry();
    }
    return registryInstance;
}

export function resetEventSchemaRegistry(): void {
    registryInstance = null;
}

// --- Type inference helpers ---

export type LedgerEvent = z.infer<typeof baseEventSchema>;
export type RunConfigPayload = z.infer<typeof runConfigSchema>;
export type RunSummaryPayload = z.infer<typeof runSummarySchema>;
export type CaseStartedPayload = z.infer<typeof caseStartedSchema>;
export type CaseCompletedPayload = z.infer<typeof caseCompletedSchema>;
export type CaseFailedPayload = z.infer<typeof caseFailedSchema>;
export type CaseSkippedPayload = z.infer<typeof caseSkippedSchema>;
export type StrategyResolvedPayload = z.infer<typeof strategyResolvedSchema>;
export type StrategyRenderedPayload = z.infer<typeof strategyRenderedSchema>;
export type VerdictComputedPayload = z.infer<typeof verdictComputedSchema>;
export type GateEvaluatedPayload = z.infer<typeof gateEvaluatedSchema>;
export type RevisionCreatedPayload = z.infer<typeof revisionCreatedSchema>;
export type RevisionEvaluatedPayload = z.infer<typeof revisionEvaluatedSchema>;
export type RevisionConsentedPayload = z.infer<typeof revisionConsentedSchema>;
export type RevisionActivatedPayload = z.infer<typeof revisionActivatedSchema>;
export type RevisionRolledBackPayload = z.infer<typeof revisionRolledBackSchema>;
export type RevisionSupersededPayload = z.infer<typeof revisionSupersededSchema>;
export type RevisionRejectedPayload = z.infer<typeof revisionRejectedSchema>;
export type ConsentRequestedPayload = z.infer<typeof consentRequestedSchema>;
export type ConsentGrantedPayload = z.infer<typeof consentGrantedSchema>;
export type ConsentDeniedPayload = z.infer<typeof consentDeniedSchema>;
export type OptimizerCycleStartedPayload = z.infer<typeof optimizerCycleStartedSchema>;
export type OptimizerCycleCompletedPayload = z.infer<typeof optimizerCycleCompletedSchema>;
export type OptimizerCandidateEvaluatedPayload = z.infer<typeof optimizerCandidateEvaluatedSchema>;
/**
 * Shared telemetry types
 * Single source of truth for types used across ledger, revisionStore, revisionDriver
 */

import type { CalibrationRecord } from '../eval/calibrationTracker.js';

// --- Revision Types ---

export interface StrategyArtifact {
    id: string;
    seamId: string;
    version: string;
    params: Record<string, unknown>;
    code?: string;                 // Source code if model-generated
    componentType?: string;        // Component identifier for UI
}

export interface Revision {
    // Identity
    id: string;                    // rev_<timestamp>_<random>
    seamRole: string;              // 'capture' | 'elicit' | 'match' | 'layout' | ...
    
    // Strategy definition (inline, self-contained)
    strategy: StrategyArtifact;
    
    // Provenance
    author: 'human' | 'model';
    model?: string;
    promptHash?: string;
    parentRevisionId?: string;
    
    // Evaluation linkage
    evaluationId?: string;
    verdict?: 'pass' | 'fail' | 'inconclusive';
    
    // Consent & activation
    status: RevisionStatus;
    consentedBy?: string;
    consentedAt?: string;
    activatedAt?: string;
    rolledBackAt?: string;
    rollbackReason?: string;
    
    // Metadata
    createdAt: string;
    updatedAt: string;
    tags?: string[];
}

export type RevisionStatus =
    | 'draft'
    | 'evaluating'
    | 'evaluated'
    | 'awaiting-consent'
    | 'consented'
    | 'active'
    | 'rolled-back'
    | 'superseded'
    | 'rejected';

// --- Ledger Types ---

export interface LedgerEvent {
    id: string;                    // ULID
    type: LedgerEventType;
    runId?: string;
    caseId?: string;
    revisionId?: string;
    evaluationId?: string;
    actor: 'system' | 'human' | 'model';
    userId?: string;
    modelId?: string;
    payload: LedgerPayload;
    timestamp: string;
    durationMs?: number;
    hash: string;                  // Content hash for tamper evidence
}

export type LedgerEventType =
    | 'run:started'
    | 'run:completed'
    | 'run:failed'
    | 'case:started'
    | 'case:completed'
    | 'case:failed'
    | 'case:skipped'
    | 'strategy:resolved'
    | 'strategy:rendered'
    | 'verdict:computed'
    | 'gate:evaluated'
    | 'revision:created'
    | 'revision:evaluated'
    | 'revision:consented'
    | 'revision:activated'
    | 'revision:rolled-back'
    | 'revision:superseded'
    | 'revision:rejected'
    | 'consent:requested'
    | 'consent:granted'
    | 'consent:denied'
    | 'optimizer:cycle:started'
    | 'optimizer:cycle:completed'
    | 'optimizer:candidate:evaluated'
    | 'calibration:recorded';

export type LedgerPayload =
    | { type: 'run:started'; config: RunConfig; caseIds: string[] }
    | { type: 'run:completed'; summary: RunSummary }
    | { type: 'run:failed'; error: string }
    | { type: 'case:started'; caseId: string; strategyId: string }
    | { type: 'case:completed'; caseId: string; verdict: CaseVerdict; durationMs: number }
    | { type: 'case:failed'; caseId: string; error: string }
    | { type: 'case:skipped'; caseId: string; reason: string }
    | { type: 'strategy:resolved'; seamRole: string; strategyId: string; reason: ResolutionReason; params: Record<string, unknown> }
    | { type: 'strategy:rendered'; seamRole: string; strategyId: string; outputHash: string }
    | { type: 'verdict:computed'; caseId: string; verdict: CaseVerdict; details: VerdictDetail[] }
    | { type: 'gate:evaluated'; gate: 'must-win' | 'schema' | 'floors'; passed: boolean; details: string }
    | { type: 'revision:created'; revision: Revision }
    | { type: 'revision:evaluated'; revisionId: string; evaluationId: string; verdict: 'pass' | 'fail' | 'inconclusive' }
    | { type: 'revision:consented'; revisionId: string; userId: string }
    | { type: 'revision:activated'; revisionId: string; previousRevisionId?: string }
    | { type: 'revision:rolled-back'; revisionId: string; reason: string; rolledBackToRevisionId?: string }
    | { type: 'revision:superseded'; revisionId: string; supersededByRevisionId: string }
    | { type: 'revision:rejected'; revisionId: string; reason: string }
    | { type: 'consent:requested'; revisionId: string; userId: string }
    | { type: 'consent:granted'; revisionId: string; userId: string }
    | { type: 'consent:denied'; revisionId: string; userId: string; reason: string }
    | { type: 'optimizer:cycle:started'; config: OptimizerConfig; manifestHash: string }
    | { type: 'optimizer:cycle:completed'; candidatesEvaluated: number; winners: number; losers: number; inconclusive: number; totalCost: OptimizerCost }
    | { type: 'optimizer:candidate:evaluated'; candidateId: string; seamRole: string; strategyId: string; verdict: string; primaryDelta: number }
    | { type: 'calibration:recorded'; record: CalibrationRecord };

export interface RunConfig {
    manifestHash: string;
    revisionId: string;
    baselineRevisionId: string;
    caseFilter?: string[];
    repetitions: number;
}

export interface RunSummary {
    totalCases: number;
    completed: number;
    failed: number;
    overallVerdict: string;
}

export interface CaseVerdict {
    caseId: string;
    verdict: string;
    primaryMetric: string;
    delta: number;
    pValue: number;
}

export interface VerdictDetail {
    metric: string;
    baseline: number;
    candidate: number;
    delta: number;
}

export interface ResolutionReason {
    kind: string;
    [key: string]: any;
}

export interface OptimizerConfig {
    targetSeams: string[];
    maxCandidatesPerSeam: number;
    maxBrowserRuns: number;
    maxTimeMinutes: number;
    maxTokens: number;
    useSuccessiveHalving: boolean;
    initialSliceFraction: number;
    minPromote: number;
}

export interface OptimizerCost {
    browserRuns: number;
    tokensUsed: number;
    durationMs: number;
}

// --- Revision Store Types ---

export interface RevisionStoreConfig {
    maxRevisionsPerSeam?: number;  // Soft limit for cleanup
}

export interface RevisionSearchQuery {
    seamRole?: string;
    status?: RevisionStatus;
    author?: string;
    tags?: string[];
    since?: string;
    until?: string;
    offset?: number;
    limit?: number;
}

// --- Revision Driver Types ---

export interface RevisionDriverConfig {
    // Common config
    [key: string]: unknown;
}

export interface RevisionDriver {
    readonly name: string;
    readonly description: string;
    readonly configSchema?: any; // ZodSchema
    
    init(config: RevisionDriverConfig): Promise<void>;
    create(revision: Omit<Revision, 'id' | 'createdAt' | 'updatedAt' | 'status'>): Promise<Revision>;
    get(id: string): Promise<Revision | undefined>;
    getActive(seamRole: string): Promise<Revision | undefined>;
    updateStatus(id: string, status: RevisionStatus, metadata: Partial<Revision>): Promise<Revision | undefined>;
    activate(id: string, userId: string): Promise<Revision | undefined>;
    search(query: RevisionSearchQuery): Promise<Revision[]>;
    count(): Promise<number>;
    close(): Promise<void>;
    
    // Optional registration metadata
    getDefaultConfig?(): RevisionDriverConfig;
    validateConfig?(config: RevisionDriverConfig): { valid: boolean; errors: string[] };
}

// --- Registrable Revision Driver ---
export interface RegistrableRevisionDriver extends RevisionDriver {
    getDefaultConfig(): RevisionDriverConfig;
    validateConfig(config: RevisionDriverConfig): { valid: boolean; errors: string[] };
}

// --- Friction/Journal Types ---

export type FrictionKind =
    | 'cognitive'
    | 'workflow'
    | 'technical'
    | 'ambiguity'
    | 'context-switch'
    | 'repetition'
    | 'delay'
    | 'error-recovery';

export type DurationBucket = '<5s' | '5-15s' | '15-60s' | '>60s';

export interface FrictionEvent {
    id: string;
    kind: FrictionKind;
    seamRole: string;
    strategyId?: string;
    durationBucket: DurationBucket;
    context: Record<string, unknown>;
    timestamp: string;
    sessionId: string;
    userId?: string;
}

export interface FrictionAggregate {
    kind: FrictionKind;
    count: number;
    avgDurationMs: number;
    p50DurationMs: number;
    p90DurationMs: number;
    topContexts: Array<{ context: string; count: number }>;
}

export interface JournalConfig {
    enabled: boolean;
    sampleRate: number;        // 0-1, fraction of events to record
    maxEvents: number;         // Soft cap per session
    flushIntervalMs: number;   // Batch flush interval
}

// EvidenceClass is defined in schemas/evidence.ts as single source of truth
import type { EvidenceClass } from '../schemas/evidence.js';

export interface FrictionSignal {
    kind: FrictionKind;
    evidenceClass: EvidenceClass;
    value: number;
    confidence: number;        // 0-1
    source: string;            // 'telemetry' | 'survey' | 'heuristic' | 'expert'
    metadata: Record<string, unknown>;
}
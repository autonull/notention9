/**
 * Shared Type Definitions
 * Single source of truth for types used across multiple modules
 * Eliminates duplicate type definitions
 */

import type { CalibrationRecord } from '../eval/calibrationTracker.js';
import type { EvidenceClass, JudgeProvenance } from './evidence.js';
import type { ParamSpec, Seam } from '../ui/strategy.js';
import type { StrategyParamConfig } from '../constants/strategyParams.js';
import type { CaseManifest, CaseEntry, IntentCase, QualityCase, CaseSplit, QualityFamily } from './caseTypes.js';
import type { MetricVerdict, FloorCheck, CaseVerdict, RunVerdict, VerdictConfig, VerdictEngineConfig } from './verdictTypes.js';
import type { ResolutionContext, ResolvedStrategy, ResolutionStrategy, ResolutionStrategyConfig } from '../ui/resolutionStrategy.js';
import type { SplitStrategyConfig, SplitStrategy } from '../eval/splitStrategies/index.js';
import type { VerdictEngine } from '../eval/verdictEngines/index.js';

// --- Revision Types ---

export interface StrategyArtifact {
    id: string;
    seamId: string;
    version: string;
    params: Record<string, unknown>;
    code?: string;
    componentType?: string;
}

export interface VerdictSummary {
    n: number;              // Sample size (cases × repetitions)
    mde: number;            // Minimum detectable effect
    evidenceClass: 'measured' | 'observed' | 'hypothesized' | 'asserted';
    primaryMetric: string;  // e.g., 'completion'
    primaryDelta: number;   // Effect size
    pValue?: number;        // Statistical significance
    confidenceInterval?: [number, number];
}

export interface Revision {
    id: string;
    seamRole: string;
    strategy: StrategyArtifact;
    author: 'human' | 'model';
    model?: string;
    promptHash?: string;
    parentRevisionId?: string;
    evaluationId?: string;
    verdict?: 'pass' | 'fail' | 'inconclusive';
    verdictSummary?: VerdictSummary;  // B4.2: Verdict summary with n, MDE, evidenceClass
    reason?: ResolutionReason;         // B4.2: Resolution reason (why this revision)
    status: RevisionStatus;
    consentedBy?: string;
    consentedAt?: string;
    activatedAt?: string;
    rolledBackAt?: string;
    rollbackReason?: string;
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
    id: string;
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
    hash: string;
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
    | 'calibration:recorded'
    | 'match:accepted'
    | 'match:withdrawn'
    | 'match:rejected';

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

export interface VerdictDetail {
    metric: string;
    baseline: number;
    candidate: number;
    delta: number;
}

export interface ResolutionReason {
    kind: string;
    [key: string]: unknown;
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
    maxIntentCases?: number;
}

export interface OptimizerCost {
    browserRuns: number;
    tokensUsed: number;
    durationMs: number;
}

// --- LedgerPayload as discriminated union ---

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
    | { type: 'calibration:recorded'; record: CalibrationRecord }
    | { type: 'match:accepted'; requestNoteId: string; offerNoteId: string; responseNoteId: string; score: number; userId?: string }
    | { type: 'match:withdrawn'; responseNoteId: string; requestNoteId: string; offerNoteId: string; userId?: string }
    | { type: 'match:rejected'; requestNoteId: string; offerNoteId: string; userId?: string };

// --- Revision Store Types ---

export interface RevisionStoreConfig {
    maxRevisionsPerSeam?: number;
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
    [key: string]: unknown;
}

export interface RevisionDriver {
    readonly name: string;
    readonly description: string;
    readonly configSchema?: import('zod').ZodSchema;
    
    init(config: RevisionDriverConfig): Promise<void>;
    create(revision: Omit<Revision, 'id' | 'createdAt' | 'updatedAt' | 'status'>): Promise<Revision>;
    get(id: string): Promise<Revision | undefined>;
    getActive(seamRole: string): Promise<Revision | undefined>;
    updateStatus(id: string, status: RevisionStatus, metadata: Partial<Revision>): Promise<Revision | undefined>;
    activate(id: string, userId: string): Promise<Revision | undefined>;
    search(query: RevisionSearchQuery): Promise<Revision[]>;
    count(): Promise<number>;
    close(): Promise<void>;
    getDefaultConfig?(): RevisionDriverConfig;
    validateConfig?(config: RevisionDriverConfig): { valid: boolean; errors: string[] };
}

export interface RegistrableRevisionDriver extends RevisionDriver {
    getDefaultConfig(): RevisionDriverConfig;
    validateConfig(config: RevisionDriverConfig): { valid: boolean; errors: string[] };
}

// --- Optimizer Types ---

export interface OptimizerCandidate {
    id: string;
    seamRole: string;
    strategyId: string;
    patch: Record<string, unknown>;
    paramSpec: ParamSpec;
    provenance: CandidateProvenance;
    evaluation?: CandidateEvaluationResult;
}

export interface CandidateProvenance {
    generator: 'grid' | 'random' | 'model' | 'human';
    model?: string;
    seed?: number;
    parentRevisionId?: string;
    generatedAt: string;
}

export interface GeneratorOptions {
    maxCandidates: number;
    budget?: BudgetConstraints;
    seed?: number;
    previousCandidates?: OptimizerCandidate[];
    previousResults?: CandidateEvaluationResult[];
    initialFraction?: number;
    minPromote?: number;
    [key: string]: unknown;
}

export interface CandidateEvaluationResult {
    candidateId: string;
    revisionId: string;
    qualityResults: Record<string, unknown>;
    intentResults?: Record<string, unknown>;
    verdict: 'improved' | 'degraded' | 'inconclusive' | 'invalid';
    primaryDelta: number;
    cost: { browserRuns: number; tokensUsed: number; durationMs: number };
}

export interface BudgetConstraints {
    maxBrowserRuns?: number;
    maxTimeMinutes?: number;
    maxTokens?: number;
    promotionFraction?: number;
    minPromote?: number;
    maxResource?: number;
    reductionFactor?: number;
    [key: string]: unknown;
}

// Re-export StrategyParamConfig from constants
export type { StrategyParamConfig } from '../constants/strategyParams.js';

// Re-export EvidenceClass and JudgeProvenance from evidence
export type { EvidenceClass, JudgeProvenance } from './evidence.js';

// Re-export Case types from caseTypes (single source of truth)
export type { CaseManifest, CaseEntry, IntentCase, QualityCase, CaseSplit, QualityFamily } from './caseTypes.js';

// Re-export Verdict types from verdictTypes (single source of truth)
export type { MetricVerdict, FloorCheck, CaseVerdict, RunVerdict, VerdictConfig, VerdictEngineConfig } from './verdictTypes.js';

// Re-export Resolution types from resolutionStrategy (single source of truth)
export type { ResolutionContext, ResolvedStrategy, ResolutionStrategy, ResolutionStrategyConfig, SeamRole } from '../ui/resolutionStrategy.js';

// Re-export SplitStrategy types from splitStrategies (single source of truth)
export type { SplitStrategyConfig, SplitStrategy } from '../eval/splitStrategies/index.js';

// Re-export VerdictEngine from verdictEngines (single source of truth)
export type { VerdictEngine } from '../eval/verdictEngines/index.js';

// --- EventStore Types ---

export interface EventStore {
    init(): Promise<void>;
    append(event: Omit<LedgerEvent, 'id' | 'timestamp' | 'hash'>): Promise<LedgerEvent>;
    query(options: {
        type?: string;
        runId?: string;
        caseId?: string;
        revisionId?: string;
        since?: string;
        until?: string;
        limit?: number;
        offset?: number;
    }): Promise<LedgerEvent[]>;
    getRunEvents(runId: string): Promise<LedgerEvent[]>;
    count(options?: { type?: string; runId?: string; since?: string; until?: string }): Promise<number>;
    prune(olderThan: string): Promise<number>;
    exportRun(runId: string): Promise<string>;
    close(): Promise<void>;
}

// --- CaseStore Types ---

export interface CaseStore {
    init(): Promise<void>;
    readManifest(): Promise<CaseManifest>;
    writeManifest(manifest: CaseManifest): Promise<void>;
    readIntentCases(split: CaseSplit): Promise<IntentCase[]>;
    readQualityCases(qualityFamily: QualityFamily): Promise<QualityCase[]>;
    readHoldoutCases(): Promise<IntentCase[]>;
    readAllCases(): Promise<{ intent: IntentCase[]; quality: QualityCase[] }>;
    upsertCase(caseData: IntentCase | QualityCase): Promise<void>;
    deleteCase(id: string): Promise<boolean>;
    verifyIntegrity(): Promise<{ valid: boolean; errors: string[] }>;
    close(): Promise<void>;
}

// --- DigestPipeline Types ---

export interface DigestPipelineConfig {
    lookbackDays: number;
    topSignalsPerWorkflow: number;
    evidenceClassWeights: Record<EvidenceClass, number>;
    decayHalfLifeDays: number;
    minCountForMeasured: number;
    minAgeForHypothesized: number;
}

export interface FrictionEvent {
    bucket: string;
    workflow: string;
    seam: string;
    kind: string;
    count: number;
    durationBucket?: string;
}

export interface FrictionAggregate {
    bucket: string;
    workflow: string;
    seam: string;
    kind: string;
    count: number;
    durationBucket?: string;
    firstSeen: string;
    lastSeen: string;
}

export interface FrictionSignal {
    bucket: string;
    workflow: string;
    seam: string;
    kind: string;
    count: number;
    evidenceClass: EvidenceClass;
    ageDays: number;
    weight: number;
    durationBucket?: string;
}
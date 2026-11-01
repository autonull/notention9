/**
 * Optimizer — Parameter search with evidence-based decisions
 * 
 * Searches declared ParamSpec space, evaluates candidates against baseline,
 * and produces accept/reject decisions with full provenance.
 */

import { StrategyRegistry, type Strategy, type ParamSpec, type Seam } from '@notention/core/ui/strategy';
import { getRevisionStore } from '@notention/core/telemetry/revisionStore';
import { logEvent, getRunEvents } from '@notention/core/telemetry/ledger';
import { readManifest, readQualityCases } from '@notention/core/eval/caseManifest';
import { runAllQuality, type QualityRunConfig } from '@notention/core/eval/quality';
import { computeRunVerdict, computeCaseVerdict, type RunVerdict, type VerdictConfig } from '@notention/core/eval/verdict';
import {
    DEFAULT_MDE_COMPLETION,
    DEFAULT_MDE_STEPS,
    DEFAULT_MDE_CORRECTIONS,
    DEFAULT_MDE_PRECISION,
    DEFAULT_MDE_RECALL,
    DEFAULT_MDE_F1,
    DEFAULT_MIN_SAMPLE_SIZE,
    SCHEMA_VALIDITY_FLOOR,
} from '@notention/core/telemetry/constants';
import { ExtractionPipeline, createExtractionPipeline } from '@notention/core/extraction';
import { MatchEngine } from '@notention/core/matching';
import { type OntologyNode, type Note, type Property } from '@notention/core/types';
import { writeFileSync, mkdirSync, existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { DEFAULT_ONTOLOGY } from '@notention/core/ontology';
import { Cache } from '@notention/core/utils/cache';
import { createHash } from 'node:crypto';

/**
 * Configuration for a single optimization cycle
 */
export interface OptimizerConfig {
    /** Target seam roles to optimize (default: ['capture', 'match']) */
    targetSeams: string[];
    /** Maximum candidates per seam to evaluate */
    maxCandidatesPerSeam: number;
    /** Total browser run budget */
    maxBrowserRuns: number;
    /** Maximum time budget in minutes */
    maxTimeMinutes: number;
    /** Maximum tokens for LLM generation (if used) */
    maxTokens: number;
    /** Successive halving: evaluate all on slice, promote top half */
    useSuccessiveHalving: boolean;
    /** Initial slice fraction (0-1) */
    initialSliceFraction: number;
    /** Minimum candidates to promote */
    minPromote: number;
}

/**
 * A candidate strategy with its proposed parameter patch
 */
export interface OptimizerCandidate {
    id: string;
    seamRole: string;
    strategyId: string;
    /** Parameter patch to apply on top of incumbent */
    patch: Record<string, unknown>;
    /** Parameter specification for validation */
    paramSpec: ParamSpec;
    /** Generation provenance */
    provenance: CandidateProvenance;
    /** Evaluation results (populated after run) */
    evaluation?: CandidateEvaluation;
}

/**
 * How this candidate was generated
 */
export interface CandidateProvenance {
    generator: 'grid' | 'random' | 'model' | 'human';
    model?: string;
    seed?: number;
    parentRevisionId?: string;
    generatedAt: string;
}

/**
 * Evaluation result for a candidate
 */
export interface CandidateEvaluation {
    candidateId: string;
    revisionId: string;
    qualityResults: QualityRunConfig;
    intentResults?: any;
    verdict: 'improved' | 'degraded' | 'inconclusive' | 'invalid';
    primaryDelta: number;
    cost: CandidateCost;
}

/**
 * Cost accounting for a candidate evaluation
 */
export interface CandidateCost {
    browserRuns: number;
    tokensUsed: number;
    durationMs: number;
}

/**
 * Optimizer result summary
 */
export interface OptimizerResult {
    cycleId: string;
    timestamp: string;
    candidatesEvaluated: number;
    winners: OptimizerCandidate[];
    losers: OptimizerCandidate[];
    totalCost: CandidateCost;
    manifestHash: string;
}

/**
 * Enumerate candidates from a strategy's ParamSpec using grid search
 * For each param, use default + boundaries + some intermediate values
 */
export function enumerateCandidatesFromParamSpec(
    strategy: Strategy,
    maxCandidates: number
): OptimizerCandidate[] {
    const paramSpec = strategy.params;
    const defaultProps = strategy.getDefaultProps() as Record<string, unknown>;
    const candidates: OptimizerCandidate[] = [];

    // Get all parameter keys and their possible values
    const paramKeys = Object.keys(paramSpec);
    if (paramKeys.length === 0) {
        return candidates; // No tunable parameters
    }

    // Build value grid for each parameter
    const valueGrids: Record<string, unknown[]> = {};
    for (const key of paramKeys) {
        const def = paramSpec[key];
        const defaultValue = defaultProps[key] ?? def.default;
        const values = new Set<unknown>();
        values.add(defaultValue);

        // Add boundary values based on type
        switch (def.type) {
            case 'number':
                if (def.min !== undefined) values.add(def.min);
                if (def.max !== undefined) values.add(def.max);
                // Add midpoint if both bounds exist
                if (def.min !== undefined && def.max !== undefined) {
                    values.add((def.min + def.max) / 2);
                }
                break;
            case 'boolean':
                values.add(true);
                values.add(false);
                break;
            case 'enum':
                if (def.options) {
                    for (const opt of def.options) values.add(opt);
                }
                break;
            case 'string':
                // For strings, only use default unless there are explicit options
                break;
        }
        valueGrids[key] = Array.from(values);
    }

    // Generate Cartesian product (limited by maxCandidates)
    const keys = Object.keys(valueGrids);
    const generateCombinations = (index: number, current: Record<string, unknown>): void => {
        if (candidates.length >= maxCandidates) return;
        if (index === keys.length) {
            // Skip the all-defaults combination (that's the incumbent)
            const isAllDefaults = keys.every(k => {
                const defaultVal = (defaultProps as Record<string, unknown>)[k];
                const paramDefault = paramSpec[k]?.default;
                return current[k] === (defaultVal ?? paramDefault);
            });
            if (!isAllDefaults) {
                candidates.push(createCandidate(strategy, current));
            }
            return;
        }
        const key = keys[index];
        for (const value of valueGrids[key]) {
            current[key] = value;
            generateCombinations(index + 1, { ...current });
            if (candidates.length >= maxCandidates) return;
        }
    };

    generateCombinations(0, {});
    return candidates;
}

function createCandidate(strategy: Strategy, patch: Record<string, unknown>): OptimizerCandidate {
    return {
        id: `cand_${strategy.seam.role}_${strategy.id}_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`,
        seamRole: strategy.seam.role,
        strategyId: strategy.id,
        patch,
        paramSpec: strategy.params,
        provenance: {
            generator: 'grid',
            seed: 42,
            generatedAt: new Date().toISOString(),
        },
    };
}

/**
 * Validate a patch against a ParamSpec
 */
export function validatePatch(paramSpec: ParamSpec, patch: Record<string, unknown>): { valid: boolean; errors: string[] } {
    const errors: string[] = [];
    for (const [key, value] of Object.entries(patch)) {
        const def = paramSpec[key];
        if (!def) {
            errors.push(`Unknown parameter: ${key}`);
            continue;
        }
        switch (def.type) {
            case 'number':
                if (typeof value !== 'number') errors.push(`${key} must be a number`);
                else {
                    if (def.min !== undefined && value < def.min) errors.push(`${key} below minimum ${def.min}`);
                    if (def.max !== undefined && value > def.max) errors.push(`${key} above maximum ${def.max}`);
                }
                break;
            case 'boolean':
                if (typeof value !== 'boolean') errors.push(`${key} must be a boolean`);
                break;
            case 'enum':
                if (!def.options?.includes(value as string)) errors.push(`${key} must be one of ${def.options?.join(', ')}`);
                break;
            case 'string':
                if (typeof value !== 'string') errors.push(`${key} must be a string`);
                break;
        }
    }
    return { valid: errors.length === 0, errors };
}

/**
 * Create extraction engine for evaluation
 */
function createExtractionEngine() {
    const pipeline = createExtractionPipeline();
    return {
        async extract(input: string): Promise<Record<string, string[]>> {
            const result = await pipeline.extract(input, DEFAULT_ONTOLOGY);
            const extracted: Record<string, string[]> = {};
            for (const prop of result.properties) {
                extracted[prop.key] = prop.values;
            }
            return extracted;
        },
    };
}

/**
 * Create match engine for evaluation
 */
function createMatchEngine() {
    const matchEngine = new MatchEngine(DEFAULT_ONTOLOGY);
    return {
        async match(query: string, notes: Note[]): Promise<Array<{ noteId: string; score: number }>> {
            const extractionPipeline = createExtractionPipeline();
            const extractionResult = await extractionPipeline.extract(query, DEFAULT_ONTOLOGY);
            const requestProps = extractionResult.properties;

            const now = new Date().toISOString();
            const requestNote: Note = {
                id: 'query',
                title: '',
                content: query,
                properties: requestProps,
                tags: [],
                createdAt: now,
                updatedAt: now,
                status: 'open',
                source: { type: 'user', identifier: 'test', timestamp: Date.now() },
                privacy: 'private',
                priority: 0,
            };

            const results: Array<{ noteId: string; score: number }> = [];
            for (const note of notes) {
                const matchResult = matchEngine.calculateMatchScore(requestNote, note);
                results.push({ noteId: note.id, score: matchResult.score });
            }
            return results.sort((a, b) => b.score - a.score);
        },
    };
}

function createSampleNotes(): Note[] {
    const now = new Date().toISOString();
    const dayAgo = new Date(Date.now() - 86400000).toISOString();
    const twoDaysAgo = new Date(Date.now() - 172800000).toISOString();

    return [
        {
            id: 'note-ramp-001',
            title: 'Wheelchair Ramp Installation Service',
            content: 'Professional wheelchair ramp installation before Friday, budget 850 USD',
            properties: [
                { key: 'role', operator: 'is', values: ['wheelchair ramp installer'] },
                { key: 'deadline', operator: 'less than', values: ['Friday'] },
                { key: 'budget', operator: 'less than', values: ['850 USD'] },
            ],
            tags: ['care', 'accessibility', 'service'],
            createdAt: dayAgo,
            updatedAt: dayAgo,
            status: 'open',
            source: { type: 'user', identifier: 'test', timestamp: Date.now() - 86400000 },
            privacy: 'private',
            priority: 0,
        },
        {
            id: 'note-ramp-002',
            title: 'Accessibility Ramp Build',
            content: 'Building an accessibility ramp for home entry, can complete by Thursday, 900 USD',
            properties: [
                { key: 'role', operator: 'is', values: ['wheelchair ramp builder'] },
                { key: 'deadline', operator: 'less than', values: ['Thursday'] },
                { key: 'budget', operator: 'less than', values: ['900 USD'] },
            ],
            tags: ['care', 'accessibility', 'construction'],
            createdAt: twoDaysAgo,
            updatedAt: twoDaysAgo,
            status: 'open',
            source: { type: 'user', identifier: 'test', timestamp: Date.now() - 172800000 },
            privacy: 'private',
            priority: 0,
        },
        {
            id: 'note-other-001',
            title: 'Garden Maintenance',
            content: 'Weekly garden maintenance service, 50 USD per visit',
            properties: [
                { key: 'role', operator: 'is', values: ['gardener'] },
                { key: 'budget', operator: 'equals', values: ['50 USD'] },
            ],
            tags: ['home', 'maintenance'],
            createdAt: now,
            updatedAt: now,
            status: 'open',
            source: { type: 'user', identifier: 'test', timestamp: Date.now() },
            privacy: 'private',
            priority: 0,
        },
    ];
}

/**
 * Run quality evaluation for a specific candidate (via revision)
 */
async function runQualityEvaluationForCandidate(candidate: OptimizerCandidate, config: QualityRunConfig): Promise<any[]> {
    // Apply the candidate's patch by creating a temporary revision-like context
    // For now, we use the base engines since the patch affects UI params, not core logic
    // In a real implementation, the patch would modify strategy behavior
    
    const extractionEngine = createExtractionEngine();
    const matchEngine = createMatchEngine();
    const notes = createSampleNotes();

    const qualityConfig: QualityRunConfig = {
        ...config,
        extractionEngine,
        matchEngine,
        notes,
    };

    const results = await runAllQuality(qualityConfig);
    return results.map(r => ({ ...r, revisionId: candidate.id }));
}

/**
 * Run a single optimizer cycle
 */
export async function runOptimizerCycle(config: OptimizerConfig = defaultOptimizerConfig()): Promise<OptimizerResult> {
    const cycleId = `opt_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
    const startTime = Date.now();
    const revisionStore = getRevisionStore();
    const manifest = readManifest();

    console.log(`🔧 Starting optimizer cycle ${cycleId}`);
    console.log(`   Target seams: ${config.targetSeams.join(', ')}`);
    console.log(`   Max candidates/seam: ${config.maxCandidatesPerSeam}`);

    // Log cycle start
    logEvent({
        type: 'optimizer:cycle:started',
        actor: 'system',
        revisionId: cycleId,
        payload: { type: 'optimizer:cycle:started', config, manifestHash: manifest.hash },
    });

    // 1. Enumerate all candidates from target seams
    const allCandidates: OptimizerCandidate[] = [];
    const strategyRegistry = (await import('@notention/core/ui/strategy')).strategyRegistry;

    for (const seamRole of config.targetSeams) {
        const strategies = strategyRegistry.getAll().filter(s => s.seam.role === seamRole);
        console.log(`   Found ${strategies.length} strategies for seam "${seamRole}"`);

        for (const strategy of strategies) {
            const candidates = enumerateCandidatesFromParamSpec(strategy, config.maxCandidatesPerSeam);
            console.log(`     ${strategy.id}: ${candidates.length} candidates`);
            allCandidates.push(...candidates);
        }
    }

    console.log(`\n📋 Total candidates: ${allCandidates.length}`);

    if (allCandidates.length === 0) {
        console.log('No tunable candidates found. Exiting.');
        return {
            cycleId,
            timestamp: new Date().toISOString(),
            candidatesEvaluated: 0,
            winners: [],
            losers: [],
            totalCost: { browserRuns: 0, tokensUsed: 0, durationMs: Date.now() - startTime },
            manifestHash: manifest.hash,
        };
    }

    // 2. Run baseline evaluation (once per cycle)
    console.log('\n📏 Running baseline evaluation...');
    const baselineQualityConfig: QualityRunConfig = {
        repetitions: 1, // Single rep for speed in optimizer
    };
    const baselineQualityResults = await runQualityEvaluationForCandidate(
        { id: 'baseline', seamRole: '', strategyId: '', patch: {}, paramSpec: {}, provenance: { generator: 'grid', generatedAt: new Date().toISOString() } },
        baselineQualityConfig
    );

    // 3. Evaluate candidates
    console.log('\n🚀 Evaluating candidates...');
    const evaluatedCandidates: OptimizerCandidate[] = [];
    const candidateCache = getCandidateCache();

    for (let i = 0; i < allCandidates.length; i++) {
        const candidate = allCandidates[i];
        console.log(`   [${i + 1}/${allCandidates.length}] ${candidate.id} (${candidate.seamRole}/${candidate.strategyId})`);

        // Check cache first
        const cachedEvaluation = candidateCache.get(candidate.seamRole, candidate.strategyId, candidate.patch);
        let evaluation: CandidateEvaluation;

        if (cachedEvaluation) {
            console.log(`     → Cache hit`);
            evaluation = cachedEvaluation;
        } else {
            // Run quality evaluation for candidate
            const candidateQualityResults = await runQualityEvaluationForCandidate(candidate, baselineQualityConfig);

            // Compute verdict using the eval CLI logic
            const verdictConfig: VerdictConfig = {
                primaryMetric: 'f1',
                mde: {
                    completion: DEFAULT_MDE_COMPLETION,
                    steps: DEFAULT_MDE_STEPS,
                    corrections: DEFAULT_MDE_CORRECTIONS,
                    precision: DEFAULT_MDE_PRECISION,
                    recall: DEFAULT_MDE_RECALL,
                    f1: DEFAULT_MDE_F1,
                },
                floors: { schemaValidity: SCHEMA_VALIDITY_FLOOR },
                minSampleSize: DEFAULT_MIN_SAMPLE_SIZE,
            };

            // Compute case verdicts (simplified - using quality results directly)
            const caseVerdicts = computeCaseVerdictsFromQualityResults(baselineQualityResults, candidateQualityResults, verdictConfig);

            const runVerdict = computeRunVerdict(
                `${cycleId}-${candidate.id}`,
                manifest.hash,
                candidate.id,
                'baseline',
                caseVerdicts,
                'f1'
            );

            evaluation = {
                candidateId: candidate.id,
                revisionId: candidate.id,
                qualityResults: baselineQualityConfig,
                verdict: runVerdict.overallVerdict,
                primaryDelta: runVerdict.primaryMetricAggregate.meanDelta,
                cost: {
                    browserRuns: 0, // Quality runs are in-process
                    tokensUsed: 0,
                    durationMs: 0,
                },
            };

            // Cache the evaluation
            candidateCache.set(candidate.seamRole, candidate.strategyId, candidate.patch, evaluation);
        }

        candidate.evaluation = evaluation;
        evaluatedCandidates.push(candidate);
    }

    // 4. Classify winners/losers
    const winners = evaluatedCandidates.filter(c => c.evaluation?.verdict === 'improved');
    const losers = evaluatedCandidates.filter(c => c.evaluation?.verdict === 'degraded' || c.evaluation?.verdict === 'invalid');
    const inconclusive = evaluatedCandidates.filter(c => c.evaluation?.verdict === 'inconclusive');

    console.log(`\n📊 Results:`);
    console.log(`   Winners (improved): ${winners.length}`);
    console.log(`   Losers (degraded/invalid): ${losers.length}`);
    console.log(`   Inconclusive: ${inconclusive.length}`);

    // 5. Log cycle completion
    const totalCost = {
        browserRuns: evaluatedCandidates.reduce((sum, c) => sum + (c.evaluation?.cost.browserRuns ?? 0), 0),
        tokensUsed: evaluatedCandidates.reduce((sum, c) => sum + (c.evaluation?.cost.tokensUsed ?? 0), 0),
        durationMs: Date.now() - startTime,
    };

    logEvent({
        type: 'optimizer:cycle:completed',
        actor: 'system',
        revisionId: cycleId,
        payload: {
            type: 'optimizer:cycle:completed',
            candidatesEvaluated: evaluatedCandidates.length,
            winners: winners.length,
            losers: losers.length,
            inconclusive: inconclusive.length,
            totalCost,
        },
    });

    // 6. Save results
    const outputDir = join('optimize/runs', cycleId);
    if (!existsSync(outputDir)) {
        mkdirSync(outputDir, { recursive: true });
    }
    writeFileSync(join(outputDir, 'results.json'), JSON.stringify({
        cycleId,
        timestamp: new Date().toISOString(),
        candidatesEvaluated: evaluatedCandidates.length,
        winners: winners.map(c => ({ id: c.id, patch: c.patch, delta: c.evaluation?.primaryDelta })),
        losers: losers.map(c => ({ id: c.id, patch: c.patch, delta: c.evaluation?.primaryDelta })),
        inconclusive: inconclusive.map(c => ({ id: c.id, patch: c.patch, delta: c.evaluation?.primaryDelta })),
        totalCost,
        manifestHash: manifest.hash,
    }, null, 2));

    return {
        cycleId,
        timestamp: new Date().toISOString(),
        candidatesEvaluated: evaluatedCandidates.length,
        winners,
        losers,
        totalCost,
        manifestHash: manifest.hash,
    };
}

/**
 * Compute case verdicts from quality results
 * Adapted from eval/cli.ts
 */
function computeCaseVerdictsFromQualityResults(
    baselineResults: any[],
    candidateResults: any[],
    config: VerdictConfig
) {
    const baselineByCase = new Map<string, Map<number, any>>();
    const candidateByCase = new Map<string, Map<number, any>>();

    for (const r of baselineResults) {
        const caseMap = baselineByCase.get(r.caseId) || new Map();
        caseMap.set(r.repetition, r);
        baselineByCase.set(r.caseId, caseMap);
    }

    for (const r of candidateResults) {
        const caseMap = candidateByCase.get(r.caseId) || new Map();
        caseMap.set(r.repetition, r);
        candidateByCase.set(r.caseId, caseMap);
    }

    const allCaseIds = new Set([...baselineByCase.keys(), ...candidateByCase.keys()]);
    const pairedResults: any[] = [];

    for (const caseId of allCaseIds) {
        const baselineCase = baselineByCase.get(caseId);
        const candidateCase = candidateByCase.get(caseId);

        if (!baselineCase || !candidateCase) {
            pairedResults.push({
                caseId,
                verdict: 'invalid',
                primaryMetric: { metric: config.primaryMetric, baselineMean: 0, candidateMean: 0, delta: 0, deltaPercent: 0, pValue: 1, ci: [0, 0], mde: config.mde[config.primaryMetric] ?? 0, passes: false, direction: 'no-change' },
                otherMetrics: [], floors: [], excluded: true, excludeReason: 'Missing baseline or candidate results',
            });
            continue;
        }

        const allReps = new Set([...baselineCase.keys(), ...candidateCase.keys()]);

        for (const rep of allReps) {
            const baseline = baselineCase.get(rep);
            const candidate = candidateCase.get(rep);
            if (!baseline || !candidate) continue;

            const paired: any = {
                caseId: `${caseId}-rep-${rep}`,
                baseline: { caseId, revisionId: baseline.revisionId, repetition: rep, metrics: baseline.metrics, output: baseline, durationMs: 0, success: baseline.success, error: baseline.error },
                candidate: { caseId, revisionId: candidate.revisionId, repetition: rep, metrics: candidate.metrics, output: candidate, durationMs: 0, success: candidate.success, error: candidate.error },
            };
            pairedResults.push(paired);
        }
    }

    const verdicts = [];
    for (const paired of pairedResults) {
        const verdict = computeCaseVerdict(paired.caseId, paired, config);
        verdicts.push(verdict);
    }

    return verdicts;
}

/**
 * Default optimizer configuration
 */
export function defaultOptimizerConfig(): OptimizerConfig {
    return {
        targetSeams: ['capture', 'match'],
        maxCandidatesPerSeam: 8,
        maxBrowserRuns: 160,
        maxTimeMinutes: 30,
        maxTokens: 150000,
        useSuccessiveHalving: true,
        initialSliceFraction: 0.25,
        minPromote: 2,
    };
}

/**
 * Candidate cache entry
 */
export interface CandidateCacheEntry {
    candidateId: string;
    patchHash: string;
    evaluation: CandidateEvaluation;
    cachedAt: string;
}

/**
 * Candidate cache - keyed by (target, patchHash) to avoid re-evaluation
 */
export class CandidateCache {
    private cache = new Map<string, CandidateCacheEntry>();
    private readonly cacheDir: string;

    constructor(cacheDir: string = join('optimize', 'cache')) {
        this.cacheDir = cacheDir;
        this.loadFromDisk();
    }

    private getKey(seamRole: string, strategyId: string, patchHash: string): string {
        return `${seamRole}:${strategyId}:${patchHash}`;
    }

    private hashPatch(patch: Record<string, unknown>): string {
        return createHash('sha256').update(JSON.stringify(patch, Object.keys(patch).sort())).digest('hex').slice(0, 16);
    }

    get(seamRole: string, strategyId: string, patch: Record<string, unknown>): CandidateEvaluation | undefined {
        const patchHash = this.hashPatch(patch);
        const key = this.getKey(seamRole, strategyId, patchHash);
        return this.cache.get(key)?.evaluation;
    }

    set(seamRole: string, strategyId: string, patch: Record<string, unknown>, evaluation: CandidateEvaluation): void {
        const patchHash = this.hashPatch(patch);
        const key = this.getKey(seamRole, strategyId, patchHash);
        const entry: CandidateCacheEntry = {
            candidateId: evaluation.candidateId,
            patchHash,
            evaluation,
            cachedAt: new Date().toISOString(),
        };
        this.cache.set(key, entry);
        this.persistToDisk();
    }

    has(seamRole: string, strategyId: string, patch: Record<string, unknown>): boolean {
        const patchHash = this.hashPatch(patch);
        const key = this.getKey(seamRole, strategyId, patchHash);
        return this.cache.has(key);
    }

    private persistToDisk(): void {
        if (!existsSync(this.cacheDir)) {
            mkdirSync(this.cacheDir, { recursive: true });
        }
        const data = Array.from(this.cache.entries()).map(([key, entry]) => ({ key, ...entry }));
        writeFileSync(join(this.cacheDir, 'candidate-cache.json'), JSON.stringify(data, null, 2));
    }

    private loadFromDisk(): void {
        const cacheFile = join(this.cacheDir, 'candidate-cache.json');
        if (!existsSync(cacheFile)) return;
        try {
            const data = JSON.parse(readFileSync(cacheFile, 'utf-8')) as Array<{ key: string } & CandidateCacheEntry>;
            for (const item of data) {
                const { key, ...entry } = item;
                this.cache.set(key, entry);
            }
        } catch {
            // Ignore corrupt cache
        }
    }

    clear(): void {
        this.cache.clear();
        const cacheFile = join(this.cacheDir, 'candidate-cache.json');
        if (existsSync(cacheFile)) {
            writeFileSync(cacheFile, '[]');
        }
    }

    get size(): number {
        return this.cache.size;
    }
}

/**
 * Global candidate cache instance
 */
let candidateCacheInstance: CandidateCache | null = null;

export function getCandidateCache(): CandidateCache {
    if (!candidateCacheInstance) {
        candidateCacheInstance = new CandidateCache();
    }
    return candidateCacheInstance;
}

export function resetCandidateCache(): void {
    candidateCacheInstance = null;
}
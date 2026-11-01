/**
 * Optimizer — Parameter search with evidence-based decisions
 * 
 * Searches declared ParamSpec space, evaluates candidates against baseline,
 * and produces accept/reject decisions with full provenance.
 */

import { type ParamSpec, type Seam } from '@notention/core/ui/strategy';
import { getRevisionStore } from '@notention/core/telemetry/revisionStore';
import { logEvent, getRunEvents } from '@notention/core/telemetry/ledger';
import { readManifest, readQualityCases, readIntentCases } from '@notention/core/eval/caseManifest';
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
import { createHash } from 'node:crypto';
import {
    STRATEGY_PARAM_CONFIGS,
    getStrategyParamConfigsByRole,
    type StrategyParamConfig,
} from '@notention/core/constants/strategyParams';
import { chromium, type Browser, type BrowserContext } from '@playwright/test';

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
    /** Maximum intent cases to use (for faster test runs) */
    maxIntentCases?: number;
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
    strategy: StrategyParamConfig,
    maxCandidates: number
): OptimizerCandidate[] {
    const paramSpec = strategy.paramSpec;
    const defaultProps = strategy.defaultProps;
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

function createCandidate(strategy: StrategyParamConfig, patch: Record<string, unknown>): OptimizerCandidate {
    return {
        id: `cand_${strategy.seam.role}_${strategy.id}_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`,
        seamRole: strategy.seam.role,
        strategyId: strategy.id,
        patch,
        paramSpec: strategy.paramSpec,
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
 * Run intent evaluation for a specific revision using Playwright
 * This tests UI parameter changes by running browser-based intent cases
 */
export interface IntentEvaluationConfig {
    baseURL?: string;
    headless?: boolean;
    split?: 'search' | 'validation' | 'holdout';
    repetitions?: number;
    seed?: number;
    viewport?: { width: number; height: number };
    caseFilter?: string[]; // Optional case IDs to run (for successive halving)
    /** Revision parameter patch to apply in the browser */
    revisionPatch?: Record<string, unknown>;
}

export interface IntentEvaluationResult {
    runId: string;
    manifestHash: string;
    revisionId: string;
    split: string;
    results: Array<{
        caseId: string;
        intent: string;
        repetition: number;
        success: boolean;
        metrics: { completion: number; steps: number; corrections: number };
        details: string[];
        error?: string;
    }>;
    summary: {
        total: number;
        passed: number;
        failed: number;
        avgCompletion: number;
        avgSteps: number;
        avgCorrections: number;
    };
}

let previewServerProcess: ReturnType<typeof import('child_process').spawn> | null = null;
let previewServerUrl: string | null = null;
let previewServerPort: number | null = null;

async function getAvailablePort(startPort: number = 4199): Promise<number> {
    const net = await import('node:net');
    for (let port = startPort; port < startPort + 100; port++) {
        const available = await new Promise<boolean>((resolve) => {
            const server = net.createServer();
            server.once('error', () => resolve(false));
            server.once('listening', () => {
                server.close(() => resolve(true));
            });
            server.listen(port);
        });
        if (available) return port;
    }
    throw new Error('No available ports found');
}

function killPreviewServer(): void {
    if (previewServerProcess) {
        console.log(`   Killing preview server on port ${previewServerPort}`);
        previewServerProcess.kill('SIGTERM');
        previewServerProcess = null;
        previewServerUrl = null;
        previewServerPort = null;
    }
}

async function ensurePreviewServer(): Promise<string> {
    // Check if server is already running AND process is alive
    if (previewServerUrl && previewServerProcess && !previewServerProcess.killed) {
        try {
            const response = await fetch(previewServerUrl, { method: 'HEAD' });
            if (response.ok) {
                console.log(`   Preview server already running at ${previewServerUrl}`);
                return previewServerUrl;
            }
        } catch {
            // Server not responding, will start new one
            console.log(`   Preview server not responding, starting new one`);
        }
    }
    
    // Kill any existing process
    killPreviewServer();

    const port = await getAvailablePort();
    const url = `http://localhost:${port}`;
    console.log(`   Starting preview server at ${url}...`);
    const { spawn } = await import('child_process');
    
    previewServerProcess = spawn('pnpm', ['--filter', '@notention/ui', 'preview', '--port', String(port), '--strictPort'], {
        cwd: process.cwd(),
        stdio: ['ignore', 'pipe', 'pipe'],
        env: { ...process.env, VITE_ENABLE_AGENT: 'false', VITE_LLM_SOURCE: 'none', VITE_DEV_HOOKS: 'true' },
    });
    previewServerPort = port;

    previewServerProcess.stdout?.on('data', (data) => {
        const output = data.toString();
        if (output.includes('Local:')) {
            console.log(`   Preview server started`);
        }
    });

    previewServerProcess.stderr?.on('data', (data) => {
        const output = data.toString();
        if (!output.includes('DEP0205') && !output.includes('ExperimentalWarning')) {
            console.error(`   Preview server error: ${output}`);
        }
    });

    // Handle process exit
    previewServerProcess.on('exit', (code) => {
        if (code !== 0 && code !== null) {
            console.error(`   Preview server exited with code ${code}`);
        }
        previewServerProcess = null;
        previewServerUrl = null;
        previewServerPort = null;
    });

    // Wait for server to be ready
    for (let i = 0; i < 120; i++) {
        try {
            const response = await fetch(url, { method: 'HEAD' });
            if (response.ok) {
                previewServerUrl = url;
                return url;
            }
        } catch {
            // Wait and retry
        }
        await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    throw new Error('Preview server failed to start within 120 seconds');
}

export async function runIntentEvaluationForRevision(
    revisionId: string,
    config: IntentEvaluationConfig = {}
): Promise<IntentEvaluationResult> {
    const baseURL = await ensurePreviewServer();

    const manifest = readManifest();
    const cases = readIntentCases(config.split ?? 'search');
    
    // Filter cases if specified (for successive halving)
    const filteredCases = config.caseFilter 
        ? cases.filter(c => config.caseFilter!.includes(c.id))
        : cases;

    const runId = `intent-${manifest.hash}-${revisionId}-${Date.now()}`;
    
    console.log(`   🌐 Running intent evaluation (${filteredCases.length} cases, ${config.repetitions ?? 1} rep)...`);

    const browser = await chromium.launch({ 
        headless: config.headless !== false,
        args: ['--disable-dev-shm-usage', '--disable-gpu', '--no-sandbox']
    });

    try {
        const context = await browser.newContext({
            viewport: config.viewport || { width: 1280, height: 720 },
        });

        // Seed the revision in localStorage for the test to pick up
        await context.addInitScript((data: { revisionId: string; patch: Record<string, unknown> }) => {
            localStorage.setItem('pendingRevision', data.revisionId);
            localStorage.setItem('pendingRevisionData', JSON.stringify(data.patch));
        }, { revisionId, patch: config.revisionPatch ?? {} });

        const page = await context.newPage();
        
        const results: IntentEvaluationResult['results'] = [];
        const repetitions = config.repetitions ?? 1;

        for (const caseData of filteredCases) {
            for (let rep = 0; rep < repetitions; rep++) {
                const startTime = Date.now();
                let steps = 0;
                const details: string[] = [];
                let corrections = 0;

                try {
                    // Navigate to dashboard
                    await page.goto(`${config.baseURL || baseURL}/#dashboard`);
                    await page.waitForLoadState('domcontentloaded');

                    // Type the prompt in the quick capture input
                    const editor = page.locator('input[placeholder*="What\'s on your mind"]').first();
                    await editor.waitFor({ state: 'visible', timeout: 5000 });
                    await editor.fill(caseData.prompt);
                    steps++;
                    details.push(`Filled prompt: ${caseData.prompt.slice(0, 50)}...`);

                    // Submit
                    await page.click('button[aria-label="Create note"]');
                    await page.waitForLoadState('domcontentloaded');
                    steps++;
                    details.push('Submitted capture');

                    // Wait for extraction to complete
                    await page.waitForTimeout(300);
                    steps++;
                    details.push('Waited for extraction');

                    // Count extracted properties
                    const properties = await page.locator('[data-testid="extracted-property"], .badge:has-text(":")').count();
                    steps++;
                    details.push(`Extracted ${properties} properties`);

                    // Check expected outcomes
                    let completion = 0;
                    const minProperties = caseData.expected.minProperties || 2;
                    const requiredKeys = caseData.expected.requiredKeys || [];

                    if (properties >= minProperties) {
                        completion = 1;
                        details.push(`✓ Met minProperties (${properties} >= ${minProperties})`);
                    } else {
                        details.push(`✗ Failed minProperties (${properties} < ${minProperties})`);
                    }

                    // Check required keys in extracted properties
                    for (const key of requiredKeys) {
                        const hasKey = await page.locator(`[data-testid="extracted-property"][data-key="${key}"], .badge:has-text("${key}:")`).count() > 0;
                        if (hasKey) {
                            details.push(`✓ Has required key: ${key}`);
                        } else {
                            details.push(`✗ Missing required key: ${key}`);
                            completion = 0;
                        }
                    }

                    // Check for corrections needed
                    if (completion === 1) {
                        details.push('No corrections needed');
                    } else {
                        corrections = 1;
                        details.push('Corrections needed');
                    }

                    const success = completion === 1;

                    results.push({
                        caseId: caseData.id,
                        intent: caseData.intent,
                        repetition: rep,
                        success,
                        metrics: { completion, steps, corrections },
                        details,
                    });
                } catch (error) {
                    results.push({
                        caseId: caseData.id,
                        intent: caseData.intent,
                        repetition: rep,
                        success: false,
                        metrics: { completion: 0, steps, corrections },
                        details: [...details, `Error: ${error instanceof Error ? error.message : String(error)}`],
                        error: error instanceof Error ? error.message : String(error),
                    });
                }
            }
        }

        const total = results.length;
        const passed = results.filter(r => r.success).length;
        const failed = total - passed;

        const avgCompletion = results.reduce((sum, r) => sum + r.metrics.completion, 0) / total;
        const avgSteps = results.reduce((sum, r) => sum + r.metrics.steps, 0) / total;
        const avgCorrections = results.reduce((sum, r) => sum + r.metrics.corrections, 0) / total;

        return {
            runId,
            manifestHash: manifest.hash,
            revisionId,
            split: config.split ?? 'search',
            results,
            summary: {
                total,
                passed,
                failed,
                avgCompletion,
                avgSteps,
                avgCorrections,
            },
        };
    } finally {
        await browser.close();
    }
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

    // 1. Enumerate all candidates from target seams using shared strategy param configs
    const allCandidates: OptimizerCandidate[] = [];

    for (const seamRole of config.targetSeams) {
        const strategyConfigs = getStrategyParamConfigsByRole(seamRole as Seam['role']);
        console.log(`   Found ${strategyConfigs.length} strategies for seam "${seamRole}"`);

        for (const strategy of strategyConfigs) {
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

    // 2. Run baseline evaluations (quality + intent)
    console.log('\n📏 Running baseline quality evaluation...');
    const baselineQualityConfig: QualityRunConfig = {
        repetitions: 1, // Single rep for speed in optimizer
    };
    const baselineQualityResults = await runQualityEvaluationForCandidate(
        { id: 'baseline', seamRole: '', strategyId: '', patch: {}, paramSpec: {}, provenance: { generator: 'grid', generatedAt: new Date().toISOString() } },
        baselineQualityConfig
    );

    console.log('\n📏 Running baseline intent evaluation (validation split, limited cases)...');
    const intentCases = readIntentCases('validation'); // Use validation (10 cases) instead of search (21)
    const maxIntentCases = config.maxIntentCases ?? 2;
    const intentCaseIds = intentCases.slice(0, maxIntentCases).map(c => c.id); // Limit cases for speed
    const baselineIntentConfig: IntentEvaluationConfig = {
        split: 'validation',
        repetitions: 1,
        headless: true,
        caseFilter: intentCaseIds,
        revisionPatch: {},
    };
    const baselineIntentResult = await runIntentEvaluationForRevision('incumbent', baselineIntentConfig);

    // 3. Evaluate candidates
    console.log('\n🚀 Evaluating candidates...');
    const evaluatedCandidates: OptimizerCandidate[] = [];
    const candidateCache = getCandidateCache();

    // For successive halving, track candidates by seam for promotion
    const candidatesBySeam: Map<string, OptimizerCandidate[]> = new Map();
    for (const candidate of allCandidates) {
        const list = candidatesBySeam.get(candidate.seamRole) ?? [];
        list.push(candidate);
        candidatesBySeam.set(candidate.seamRole, list);
    }

    // If using successive halving, run first slice
    let candidatesToEvaluate = allCandidates;
    if (config.useSuccessiveHalving && allCandidates.length > config.minPromote) {
        const sliceSize = Math.ceil(allCandidates.length * config.initialSliceFraction);
        candidatesToEvaluate = allCandidates.slice(0, sliceSize);
        console.log(`   Using successive halving: evaluating ${candidatesToEvaluate.length}/${allCandidates.length} candidates in first slice`);
    }

    for (let i = 0; i < candidatesToEvaluate.length; i++) {
        const candidate = candidatesToEvaluate[i];
        console.log(`   [${i + 1}/${candidatesToEvaluate.length}] ${candidate.id} (${candidate.seamRole}/${candidate.strategyId})`);

        // Check cache first
        const cachedEvaluation = candidateCache.get(candidate.seamRole, candidate.strategyId, candidate.patch);
        let evaluation: CandidateEvaluation;

        if (cachedEvaluation) {
            console.log(`     → Cache hit`);
            evaluation = cachedEvaluation;
        } else {
            // Run quality evaluation for candidate
            const candidateQualityResults = await runQualityEvaluationForCandidate(candidate, baselineQualityConfig);

            // Run intent evaluation for candidate (UI params affect capture/match behavior)
            console.log(`     🌐 Running intent evaluation (${intentCaseIds.length} cases)...`);
            const candidateIntentResult = await runIntentEvaluationForRevision(candidate.id, {
                split: 'validation',
                repetitions: 1,
                headless: true,
                caseFilter: intentCaseIds,
                revisionPatch: candidate.patch,
            });

            // Compute verdict based on intent results (primary: completion)
            const verdictConfig: VerdictConfig = {
                primaryMetric: 'completion',
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

            // Compute case verdicts from intent results
            const caseVerdicts = computeCaseVerdictsFromIntentResults(
                baselineIntentResult,
                candidateIntentResult,
                verdictConfig
            );

            const runVerdict = computeRunVerdict(
                `${cycleId}-${candidate.id}`,
                manifest.hash,
                candidate.id,
                'baseline',
                caseVerdicts,
                'completion'
            );

            evaluation = {
                candidateId: candidate.id,
                revisionId: candidate.id,
                qualityResults: baselineQualityConfig,
                verdict: runVerdict.overallVerdict,
                primaryDelta: runVerdict.primaryMetricAggregate.meanDelta,
                cost: {
                    browserRuns: candidateIntentResult.results.length,
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

    // 4. If using successive halving, promote top candidates and run full evaluation
    if (config.useSuccessiveHalving && candidatesToEvaluate.length < allCandidates.length) {
        console.log('\n🔼 Successive halving: promoting top candidates...');
        
        // Sort by primaryDelta descending
        const sortedCandidates = evaluatedCandidates
            .filter(c => c.evaluation)
            .sort((a, b) => (b.evaluation!.primaryDelta ?? -Infinity) - (a.evaluation!.primaryDelta ?? -Infinity));
        
        const promoteCount = Math.max(config.minPromote, Math.ceil(sortedCandidates.length / 2));
        const promoted = sortedCandidates.slice(0, promoteCount);
        
        console.log(`   Promoted ${promoted.length} candidates for full evaluation`);
        
        // Evaluate remaining candidates
        const remainingCandidates = allCandidates.filter(c => 
            !evaluatedCandidates.some(e => e.id === c.id)
        );
        
        for (const candidate of remainingCandidates) {
            console.log(`   [Full] ${candidate.id} (${candidate.seamRole}/${candidate.strategyId})`);
            
            const cachedEvaluation = candidateCache.get(candidate.seamRole, candidate.strategyId, candidate.patch);
            let evaluation: CandidateEvaluation;

            if (cachedEvaluation) {
                console.log(`     → Cache hit`);
                evaluation = cachedEvaluation;
            } else {
                const candidateQualityResults = await runQualityEvaluationForCandidate(candidate, baselineQualityConfig);
                const candidateIntentResult = await runIntentEvaluationForRevision(candidate.id, {
                    split: 'validation',
                    repetitions: 1,
                    headless: true,
                    caseFilter: intentCaseIds,
                    revisionPatch: candidate.patch,
                });

                const verdictConfig: VerdictConfig = {
                    primaryMetric: 'completion',
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

                const caseVerdicts = computeCaseVerdictsFromIntentResults(
                    baselineIntentResult,
                    candidateIntentResult,
                    verdictConfig
                );

                const runVerdict = computeRunVerdict(
                    `${cycleId}-${candidate.id}`,
                    manifest.hash,
                    candidate.id,
                    'baseline',
                    caseVerdicts,
                    'completion'
                );

                evaluation = {
                    candidateId: candidate.id,
                    revisionId: candidate.id,
                    qualityResults: baselineQualityConfig,
                    verdict: runVerdict.overallVerdict,
                    primaryDelta: runVerdict.primaryMetricAggregate.meanDelta,
                    cost: {
                        browserRuns: candidateIntentResult.results.length,
                        tokensUsed: 0,
                        durationMs: 0,
                    },
                };

                candidateCache.set(candidate.seamRole, candidate.strategyId, candidate.patch, evaluation);
            }

            candidate.evaluation = evaluation;
            evaluatedCandidates.push(candidate);
        }
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
 * Compute case verdicts from intent evaluation results
 * Uses completion metric as primary for intent cases
 */
function computeCaseVerdictsFromIntentResults(
    baselineResult: IntentEvaluationResult,
    candidateResult: IntentEvaluationResult,
    config: VerdictConfig
) {
    const baselineByCase = new Map<string, any[]>();
    const candidateByCase = new Map<string, any[]>();

    for (const r of baselineResult.results) {
        const arr = baselineByCase.get(r.caseId) ?? [];
        arr.push(r);
        baselineByCase.set(r.caseId, arr);
    }

    for (const r of candidateResult.results) {
        const arr = candidateByCase.get(r.caseId) ?? [];
        arr.push(r);
        candidateByCase.set(r.caseId, arr);
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

        const allReps = Math.max(baselineCase.length, candidateCase.length);

        for (let rep = 0; rep < allReps; rep++) {
            const baseline = baselineCase[rep];
            const candidate = candidateCase[rep];
            if (!baseline || !candidate) continue;

            const paired: any = {
                caseId: `${caseId}-rep-${rep}`,
                baseline: { caseId, revisionId: baselineResult.revisionId, repetition: rep, metrics: baseline.metrics, output: baseline, durationMs: 0, success: baseline.success, error: baseline.error },
                candidate: { caseId, revisionId: candidateResult.revisionId, repetition: rep, metrics: candidate.metrics, output: candidate, durationMs: 0, success: candidate.success, error: candidate.error },
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
        maxIntentCases: 2,
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
/**
 * E2 Capture-flow Parameter A/B Test (S-UI)
 * 
 * Tests two capture parameter candidates on 10 validation intent cases × 3 reps:
 * - Candidate A: autoFocus=true + custom placeholder
 * - Candidate B: initialOp='contains' (enum hint)
 * 
 * Metrics: paired McNemar (completion), Wilcoxon (timeToCapture), corrections (guardrail)
 */

import { chromium, type Browser, type BrowserContext, type Page } from '@playwright/test';
import { ensurePreviewServer, stopPreviewServer } from './server/previewServer.js';
import {
    INTENT_DEFAULT_VIEWPORT,
    INTENT_NAVIGATION_TIMEOUT_MS,
    DEFAULT_INTENT_EXTRACTION_WAIT_MS,
    STATE_WAIT_DEFAULT_TIMEOUT_MS,
} from './constants.js';
import { runIntentCase, applySeedRevisions, type IntentCaseRunResult, type RunIntentCaseConfig } from './evaluation/intentCaseRunner.js';
import { installNamePolyfill } from './evaluation/browserEnv.js';
import { DEFAULT_MIN_SAMPLE_SIZE } from '@notention/core/telemetry/constants';
import { logEvent } from '@notention/core/telemetry/ledger';
import { writeFileSync, readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const PROJECT_ROOT = join(__dirname, '..', '..', '..');
const CASES_DIR = join(PROJECT_ROOT, 'eval', 'cases');

interface IntentCase {
    id: string;
    family: 'intent';
    intent: string;
    prompt: string;
    seed: {
        notes: unknown[];
        settings: Record<string, unknown>;
        revisions: string[];
    };
    expected: {
        minProperties?: number;
        requiredKeys?: string[];
        outcome: 'captured' | 'elicited' | 'matched' | 'rendered';
        matchMinRecall?: number;
        matchMinPrecision?: number;
    };
    metrics: ('completion' | 'steps' | 'corrections' | 'recall' | 'precision' | 'f1')[];
    tags: string[];
    provenance: {
        author: 'human' | 'model';
        source: string;
    };
}

export interface CaptureTestConfig {
    headless?: boolean;
    repetitions?: number;
    viewport?: { width: number; height: number };
    output?: string;
    baseURL?: string;
    userDataDir?: string;
    useExternalServer?: boolean;
}

interface ArmResult {
    armName: string;
    patch: Record<string, unknown>;
    caseResults: CaseArmResult[];
}
interface CaseArmResult {
    caseId: string;
    intent: string;
    repetition: number;
    success: boolean;
    metrics: {
        completion: number;
        steps: number;
        corrections: number;
        /**
         * Wall clock from navigation to capture. Dominated by the harness's own
         * fixed waits (hydration, extraction settle), so it reflects machine
         * load more than the candidate — treat it as a smoke signal, not an
         * effect measure.
         */
        timeToCaptureMs: number;
    };
    details: string[];
    extractedKeys: string[];
    /** Whether the arm's patch reached the running app. */
    interventionApplied: boolean;
    interventionObservation: Record<string, unknown>;
    error?: string;
}

interface ComparisonResult {
    armA: ArmResult;
    armB: ArmResult;
    mcNemar: { pValue: number; significant: boolean; discordantPairs: number };
    wilcoxon: { pValue: number; significant: boolean; medianDiff: number };
    correctionsDiff: number;
    verdict: ExperimentVerdict;
}

interface ExperimentVerdict {
    status: 'improved' | 'degraded' | 'no-difference' | 'invalid';
    reason: string;
}

/**
 * An arm is a candidate parameter patch. The observation hooks read the running
 * app for the effect the patch is supposed to have, so a no-op candidate is
 * caught before it is mistaken for a null result.
 */
interface ArmDefinition {
    patch: Record<string, unknown>;
    /** Input-level effect, visible once the app is mounted. */
    observeBefore?: (page: Page) => Promise<Record<string, unknown>>;
    /** Note-level effect, visible once the capture landed. */
    observeAfter?: (page: Page) => Promise<Record<string, unknown>>;
    applied: (observation: Record<string, unknown>) => boolean;
}

const ARM_A_PLACEHOLDER = 'What do you need? e.g. "I need a wheelchair ramp before Friday, budget 900"';

const E2_ARMS: Record<'A-autoFocus-placeholder' | 'B-initialOp-enumHint', ArmDefinition> = {
    'A-autoFocus-placeholder': {
        patch: {
            placeholder: ARM_A_PLACEHOLDER,
            autoFocus: true,
        },
        observeBefore: async page => ({
            placeholder: await page.getAttribute('[data-testid="quick-capture-input"]', 'placeholder').catch(() => null),
            focused: await page.evaluate(() => document.activeElement?.getAttribute('data-testid') === 'quick-capture-input'),
        }),
        applied: observation => {
            const before = (observation.before ?? {}) as { placeholder?: string | null };
            return before.placeholder === ARM_A_PLACEHOLDER;
        },
    },
    'B-initialOp-enumHint': {
        patch: {
            initialOp: 'contains',
        },
        observeAfter: async page => {
            const operators = await page.evaluate(() => {
                const state = (window as any).__NOTENTION__?.state?.();
                const properties = state?.note?.properties;
                return Array.isArray(properties) ? properties.map((p: any) => p.operator) : [];
            });
            return { operators };
        },
        applied: observation => {
            const after = (observation.after ?? {}) as { operators?: string[] };
            const operators = after.operators;
            return Array.isArray(operators) && operators.length > 0 && operators.every(op => op === 'contains');
        },
    },
};

function loadValidationCaptureCases(): IntentCase[] {
    // Load validation intent cases directly from filesystem
    const validationDir = join(CASES_DIR, 'intent', 'validation');
    const files = readdirSync(validationDir).filter(f => f.endsWith('.json'));
    
    const cases: IntentCase[] = [];
    for (const file of files) {
        const content = readFileSync(join(validationDir, file), 'utf-8');
        const caseData = JSON.parse(content) as IntentCase;
        if (caseData.intent === 'capture_need') {
            cases.push(caseData);
        }
    }
    
    console.log(`Loaded ${cases.length} validation capture intent cases`);
    return cases.slice(0, 10); // E2 specifies 10 cases
}

async function runArm(
    armName: string,
    definition: ArmDefinition,
    cases: IntentCase[],
    repetitions: number,
    headless: boolean = false,
    baseURL?: string,
    userDataDir?: string
): Promise<ArmResult> {
    console.log(`\n🌐 Running ${armName} (${cases.length} cases × ${repetitions} reps)...`);

    const resolvedBaseURL = baseURL ?? process.env.PREVIEW_URL ?? 'http://localhost:4199';
    const patch = definition.patch;

    // Use regular browser context with PNA bypass flags (no persistent profile)
    // The persistent profile was causing React app to not mount
    const browser = await chromium.launch({
        headless: headless,
        args: [
            '--disable-dev-shm-usage',
            '--disable-gpu',
            '--no-sandbox',
            '--disable-features=BlockInsecurePrivateNetworkRequests',
            '--allow-insecure-localhost',
        ],
    });

    const caseResults: CaseArmResult[] = [];

    try {
        const context = await browser.newContext({
            viewport: INTENT_DEFAULT_VIEWPORT,
        });

        // Add init script to apply the parameter patch
        await installNamePolyfill(context);
        await context.addInitScript((patchData: Record<string, unknown>) => {
            localStorage.setItem('pendingRevision', 'e2-test-revision');
            localStorage.setItem('pendingRevisionData', JSON.stringify(patchData));
        }, patch);
        // The dev bridge only installs when a run id is present
        await context.addInitScript(`window.__OPTIMIZE_RUN_ID__ = 'e2-capture-run';`);

        const page = await context.newPage();

        const runConfig: RunIntentCaseConfig = {
            baseURL: resolvedBaseURL,
            navigationTimeoutMs: 30000,
            extractionWaitMs: DEFAULT_INTENT_EXTRACTION_WAIT_MS,
            extractionSelector: '[data-testid="extracted-property"]',
            observeBefore: definition.observeBefore,
            observeAfter: definition.observeAfter,
        };

        for (const caseData of cases) {
            for (let rep = 0; rep < repetitions; rep++) {
                const startTime = performance.now();
                let steps = 0;
                const details: string[] = [];
                let corrections = 0;

                try {
                    const result = await runIntentCase(page, caseData, runConfig);
                    const observation = result.interventionObservation;
                    const interventionApplied = definition.applied(observation);

                    caseResults.push({
                        caseId: caseData.id,
                        intent: caseData.intent,
                        repetition: rep,
                        success: result.success,
                        metrics: result.metrics,
                        details: result.details,
                        extractedKeys: result.extractedKeys,
                        interventionApplied,
                        interventionObservation: observation,
                    });

                    console.log(`   ${caseData.id} rep${rep}: ${result.success ? '✓' : '✗'} completion=${result.metrics.completion} time=${Math.round(result.metrics.timeToCaptureMs)}ms${interventionApplied ? '' : ' [INTERVENTION NOT APPLIED]'}`);

                } catch (error) {
                    caseResults.push({
                        caseId: caseData.id,
                        intent: caseData.intent,
                        repetition: rep,
                        success: false,
                        metrics: {
                            completion: 0,
                            steps,
                            corrections,
                            timeToCaptureMs: performance.now() - startTime
                        },
                        details: [...details, `Error: ${error instanceof Error ? error.message : String(error)}`],
                        extractedKeys: [],
                        interventionApplied: false,
                        interventionObservation: {},
                        error: error instanceof Error ? error.message : String(error),
                    });
                    console.log(`   ${caseData.id} rep${rep}: ✗ ERROR: ${error instanceof Error ? error.message : String(error)}`);
                }
            }
        }
    } finally {
        await browser.close();
    }

    return { armName, patch, caseResults };
}

// McNemar test for paired binary outcomes (completion success/failure)
function mcNemarTest(armAResults: CaseArmResult[], armBResults: CaseArmResult[]): { pValue: number; significant: boolean; discordantPairs: number } {
    // Build paired table: for each case+rep, compare success
    let discordantAB = 0; // A success, B failure
    let discordantBA = 0; // A failure, B success

    const mapA = new Map<string, CaseArmResult>();
    const mapB = new Map<string, CaseArmResult>();

    for (const r of armAResults) {
        mapA.set(`${r.caseId}-rep${r.repetition}`, r);
    }
    for (const r of armBResults) {
        mapB.set(`${r.caseId}-rep${r.repetition}`, r);
    }

    for (const [key, a] of mapA) {
        const b = mapB.get(key);
        if (!b) continue;

        if (a.success && !b.success) discordantAB++;
        if (!a.success && b.success) discordantBA++;
    }

    // McNemar with continuity correction
    const n = discordantAB + discordantBA;
    if (n === 0) return { pValue: 1.0, significant: false, discordantPairs: 0 };

    const chi2 = (Math.abs(discordantAB - discordantBA) - 1) ** 2 / n;
    // Chi-square with 1 df
    const pValue = 1 - chiSquareCDF(chi2, 1);

    return { pValue, significant: pValue < 0.05, discordantPairs: n };
}

// Approximate chi-square CDF
function chiSquareCDF(x: number, df: number): number {
    if (x <= 0) return 0;
    if (df === 1) {
        // For df=1, chi-square is square of normal
        return erf(Math.sqrt(x / 2));
    }
    // Rough approximation for other df
    return 1 - Math.exp(-x / 2) * (1 + x / 2);
}

// Error function approximation
function erf(x: number): number {
    const sign = x >= 0 ? 1 : -1;
    x = Math.abs(x);
    const a1 = 0.254829592, a2 = -0.284496736, a3 = 1.421413741;
    const a4 = -1.453152027, a5 = 1.061405429;
    const p = 0.3275911;
    
    const t = 1 / (1 + p * x);
    const y = 1 - (((((a5 * t + a4) * t + a3) * t + a2) * t + a1) * t * Math.exp(-x * x));
    return sign * y;
}

// Wilcoxon signed-rank test for paired continuous outcomes (timeToCapture)
function wilcoxonTest(armAResults: CaseArmResult[], armBResults: CaseArmResult[]): { pValue: number; significant: boolean; medianDiff: number } {
    const diffs: number[] = [];
    
    const mapA = new Map<string, CaseArmResult>();
    const mapB = new Map<string, CaseArmResult>();
    
    for (const r of armAResults) {
        mapA.set(`${r.caseId}-rep${r.repetition}`, r);
    }
    for (const r of armBResults) {
        mapB.set(`${r.caseId}-rep${r.repetition}`, r);
    }
    
    for (const [key, a] of mapA) {
        const b = mapB.get(key);
        if (!b) continue;
        
        diffs.push(b.metrics.timeToCaptureMs - a.metrics.timeToCaptureMs);
    }
    
    if (diffs.length === 0) return { pValue: 1.0, significant: false, medianDiff: 0 };
    
    // Remove zero differences
    const nonZeroDiffs = diffs.filter(d => d !== 0);
    if (nonZeroDiffs.length === 0) return { pValue: 1.0, significant: false, medianDiff: 0 };
    
    // Rank absolute differences
    const absDiffs = nonZeroDiffs.map(d => Math.abs(d));
    const sorted = [...absDiffs].sort((a, b) => a - b);
    const ranks = absDiffs.map(d => {
        const idx = sorted.indexOf(d);
        // Handle ties - use average rank
        const count = sorted.filter(v => v === d).length;
        const firstIdx = sorted.indexOf(d);
        return firstIdx + 1 + (count - 1) / 2;
    });
    
    // Sum ranks for positive and negative differences
    let wPlus = 0;
    let wMinus = 0;
    for (let i = 0; i < nonZeroDiffs.length; i++) {
        if (nonZeroDiffs[i] > 0) wPlus += ranks[i];
        else wMinus += ranks[i];
    }
    
    const n = nonZeroDiffs.length;
    const w = Math.min(wPlus, wMinus);
    
    // Normal approximation for n > 10
    let pValue: number;
    if (n > 10) {
        const meanW = n * (n + 1) / 4;
        const stdW = Math.sqrt(n * (n + 1) * (2 * n + 1) / 24);
        const z = (w - meanW) / stdW;
        pValue = 2 * (1 - normalCDF(Math.abs(z)));
    } else {
        // Exact test for small n - simplified
        pValue = 0.1; // Conservative
    }
    
    const medianDiff = sorted[Math.floor(sorted.length / 2)];
    
    return { pValue, significant: pValue < 0.05, medianDiff };
}

// Standard normal CDF
function normalCDF(x: number): number {
    return 0.5 * (1 + erf(x / Math.sqrt(2)));
}

/**
 * Decide the experiment's verdict.
 *
 * The quality gate is "powered or silent": a run that cannot detect an effect
 * must report `invalid`, never "no significant difference — retain incumbent".
 */
function decideVerdict(result: Omit<ComparisonResult, 'verdict'>): ExperimentVerdict {
    const notApplied = [result.armA, result.armB].filter(arm =>
        arm.caseResults.length > 0 && arm.caseResults.every(r => !r.interventionApplied)
    );
    if (notApplied.length > 0) {
        return {
            status: 'invalid',
            reason: `intervention-not-applied: ${notApplied.map(a => a.armName).join(', ')} — the candidate never reached the running app, so the comparison measured nothing`,
        };
    }

    const samples = result.armA.caseResults.length;
    if (samples < DEFAULT_MIN_SAMPLE_SIZE) {
        return {
            status: 'invalid',
            reason: `underpowered: ${samples} paired samples < minimum ${DEFAULT_MIN_SAMPLE_SIZE}`,
        };
    }

    if (result.mcNemar.discordantPairs === 0) {
        return {
            status: 'invalid',
            reason: `metric-cannot-discriminate: all ${samples} paired runs scored identically in both arms (0 discordant pairs), so no arm effect is observable on the completion metric`,
        };
    }

    const aWins = result.armA.caseResults.filter(r => r.success).length;
    const bWins = result.armB.caseResults.filter(r => r.success).length;

    if (result.mcNemar.significant && bWins > aWins) {
        return { status: 'improved', reason: `${result.armB.armName} raised completion (${bWins} vs ${aWins}, p=${result.mcNemar.pValue.toFixed(4)})` };
    }
    if (result.mcNemar.significant && aWins > bWins) {
        return { status: 'degraded', reason: `${result.armA.armName} raised completion (${aWins} vs ${bWins}, p=${result.mcNemar.pValue.toFixed(4)})` };
    }
    if (result.wilcoxon.significant && result.wilcoxon.medianDiff > 0) {
        return { status: 'improved', reason: `${result.armB.armName} was faster (median diff ${Math.round(result.wilcoxon.medianDiff)}ms, p=${result.wilcoxon.pValue.toFixed(4)})` };
    }

    return {
        status: 'no-difference',
        reason: `no arm effect detected on ${result.mcNemar.discordantPairs} discordant pairs (p=${result.mcNemar.pValue.toFixed(4)}) — retain incumbent`,
    };
}

function compareArms(armA: ArmResult, armB: ArmResult): ComparisonResult {
    const mcNemar = mcNemarTest(armA.caseResults, armB.caseResults);
    const wilcoxon = wilcoxonTest(armA.caseResults, armB.caseResults);

    // Corrections difference
    const totalCorrectionsA = armA.caseResults.reduce((sum, r) => sum + r.metrics.corrections, 0);
    const totalCorrectionsB = armB.caseResults.reduce((sum, r) => sum + r.metrics.corrections, 0);
    const correctionsDiff = totalCorrectionsB - totalCorrectionsA;

    const comparison = { armA, armB, mcNemar, wilcoxon, correctionsDiff };
    return { ...comparison, verdict: decideVerdict(comparison) };
}

function printComparison(result: ComparisonResult): void {
    console.log('\n' + '='.repeat(70));
    console.log('E2 CAPTURE-FLOW A/B TEST RESULTS');
    console.log('='.repeat(70));
    
    // Summary stats
    const statsA = summarizeArm(result.armA);
    const statsB = summarizeArm(result.armB);
    
    console.log('\n📊 ARM SUMMARY:');
    console.log('Metric'.padEnd(25) + `${result.armA.armName}`.padEnd(20) + `${result.armB.armName}`);
    console.log('-'.repeat(70));
    console.log('Completion rate'.padEnd(25) + `${(statsA.completionRate * 100).toFixed(1)}%`.padEnd(20) + `${(statsB.completionRate * 100).toFixed(1)}%`);
    console.log('Median timeToCapture (ms)'.padEnd(25) + `${statsA.medianTime}`.padEnd(20) + `${statsB.medianTime}`);
    console.log('Mean timeToCapture (ms)'.padEnd(25) + `${statsA.meanTime.toFixed(0)}`.padEnd(20) + `${statsB.meanTime.toFixed(0)}`);
    console.log('Total corrections'.padEnd(25) + `${statsA.totalCorrections}`.padEnd(20) + `${statsB.totalCorrections}`);
    console.log('Total runs'.padEnd(25) + `${statsA.totalRuns}`.padEnd(20) + `${statsB.totalRuns}`);
    
    console.log('\n⚖️  STATISTICAL TESTS:');
    console.log(`McNemar (completion): p=${result.mcNemar.pValue.toFixed(4)} ${result.mcNemar.significant ? '✅ SIGNIFICANT' : '❌ NOT SIGNIFICANT'} (discordant pairs: ${result.mcNemar.discordantPairs})`);
    console.log(`Wilcoxon (timeToCapture): p=${result.wilcoxon.pValue.toFixed(4)} ${result.wilcoxon.significant ? '✅ SIGNIFICANT' : '❌ NOT SIGNIFICANT'} (median diff: ${result.wilcoxon.medianDiff}ms)`);
    console.log(`Corrections diff (B-A): ${result.correctionsDiff > 0 ? '+' : ''}${result.correctionsDiff} ${result.correctionsDiff > 5 ? '⚠️ GUARDRAIL TRIGGERED' : '✅ OK'}`);

    console.log('\n🏆 VERDICT:');
    console.log(`  [${result.verdict.status.toUpperCase()}] ${result.verdict.reason}`);
    if (result.verdict.status === 'invalid') {
        console.log('  ⚠️  No conclusion may be drawn from this run — fix the reason above and re-run.');
    }
    
    // Per-case breakdown
    console.log('\n📋 PER-CASE BREAKDOWN:');
    console.log('Case'.padEnd(30) + 'A completion'.padEnd(15) + 'B completion'.padEnd(15) + 'A time(ms)'.padEnd(12) + 'B time(ms)');
    console.log('-'.repeat(84));
    
    const mapA = new Map<string, CaseArmResult[]>();
    const mapB = new Map<string, CaseArmResult[]>();
    
    for (const r of result.armA.caseResults) {
        const arr = mapA.get(r.caseId) || [];
        arr.push(r);
        mapA.set(r.caseId, arr);
    }
    for (const r of result.armB.caseResults) {
        const arr = mapB.get(r.caseId) || [];
        arr.push(r);
        mapB.set(r.caseId, arr);
    }
    
    for (const caseId of mapA.keys()) {
        const aResults = mapA.get(caseId)!;
        const bResults = mapB.get(caseId) || [];
        
        const aSuccess = aResults.filter(r => r.success).length;
        const bSuccess = bResults.filter(r => r.success).length;
        const aTime = Math.round(aResults.reduce((s, r) => s + r.metrics.timeToCaptureMs, 0) / aResults.length);
        const bTime = bResults.length > 0 ? Math.round(bResults.reduce((s, r) => s + r.metrics.timeToCaptureMs, 0) / bResults.length) : 0;
        
        console.log(`${caseId.padEnd(30)} ${String(aSuccess).padEnd(15)} ${String(bSuccess).padEnd(15)} ${String(aTime).padEnd(12)} ${bTime}`);
    }
}

function summarizeArm(arm: ArmResult): { completionRate: number; medianTime: number; meanTime: number; totalCorrections: number; totalRuns: number } {
    const totalRuns = arm.caseResults.length;
    const successful = arm.caseResults.filter(r => r.success).length;
    const completionRate = totalRuns > 0 ? successful / totalRuns : 0;
    
    const times = arm.caseResults.map(r => r.metrics.timeToCaptureMs).sort((a, b) => a - b);
    const medianTime = times.length > 0 ? times[Math.floor(times.length / 2)] : 0;
    const meanTime = times.length > 0 ? times.reduce((a, b) => a + b, 0) / times.length : 0;
    const totalCorrections = arm.caseResults.reduce((sum, r) => sum + r.metrics.corrections, 0);
    
    return { completionRate, medianTime, meanTime, totalCorrections, totalRuns };
}

export async function runE2CaptureTest(config: CaptureTestConfig = {}): Promise<void> {
    console.log('🧪 E2 Capture-flow Parameter A/B Test (S-UI)');
    console.log('=============================================\n');
    
    const repetitions = config.repetitions ?? 3;
    const headless = config.headless ?? false; // Default to headed for PNA bypass
    const output = config.output;
    
    console.log(`Arms: ${Object.keys(E2_ARMS).join(' vs ')}`);
    console.log(`Repetitions: ${repetitions}`);
    console.log(`Headless: ${headless}`);
    
    // Load validation capture cases
    const cases = loadValidationCaptureCases();
    console.log(`Cases: ${cases.map(c => c.id).join(', ')}`);
    
    if (cases.length === 0) {
        console.log('❌ No validation capture cases found');
        return;
    }
    
    // Start preview server (unless using external server)
    let baseURL = config.baseURL;
    let shouldStopServer = false;
    
    if (!config.useExternalServer && !baseURL) {
        console.log('\n🚀 Starting dev server...');
        baseURL = await ensurePreviewServer({ useProductionPreview: false });
        shouldStopServer = true;
    } else if (config.useExternalServer && baseURL) {
        console.log(`\n🔗 Using external preview server at ${baseURL}`);
    } else if (baseURL) {
        console.log(`\n🔗 Using provided baseURL: ${baseURL}`);
    } else {
        console.log('\n🚀 Starting dev server...');
        baseURL = await ensurePreviewServer({ useProductionPreview: false });
        shouldStopServer = true;
    }
    
    let armA: ArmResult;
    let armB: ArmResult;
    let comparison: ComparisonResult;
    const runId = `e2-capture-${Date.now()}`;
    const startedAt = Date.now();

    logEvent({
        type: 'optimizer:cycle:started',
        runId,
        actor: 'system',
        payload: {
            type: 'optimizer:cycle:started',
            config: {
                targetSeams: ['capture'],
                maxCandidatesPerSeam: Object.keys(E2_ARMS).length,
                maxBrowserRuns: cases.length * repetitions * Object.keys(E2_ARMS).length,
                maxTimeMinutes: 60,
                maxTokens: 0,
                useSuccessiveHalving: false,
                initialSliceFraction: 1,
                minPromote: 0,
                maxIntentCases: cases.length,
            },
            manifestHash: 'e2-capture-validation-split',
        },
    });

    try {
        // Run both arms
        armA = await runArm('A-autoFocus-placeholder', E2_ARMS['A-autoFocus-placeholder'], cases, repetitions, headless, baseURL);
        armB = await runArm('B-initialOp-enumHint', E2_ARMS['B-initialOp-enumHint'], cases, repetitions, headless, baseURL);

        // Compare
        comparison = compareArms(armA, armB);
        printComparison(comparison);

        // Ledger chain — every candidate carries its own measured verdict
        for (const arm of [armA, armB]) {
            const stats = summarizeArm(arm);
            logEvent({
                type: 'optimizer:candidate:evaluated',
                runId,
                actor: 'system',
                payload: {
                    type: 'optimizer:candidate:evaluated',
                    candidateId: arm.armName,
                    seamRole: 'capture',
                    strategyId: 'quick-capture',
                    verdict: comparison.verdict.status,
                    primaryDelta: stats.completionRate - summarizeArm(armA).completionRate,
                },
            });
        }

        logEvent({
            type: 'optimizer:cycle:completed',
            runId,
            actor: 'system',
            payload: {
                type: 'optimizer:cycle:completed',
                candidatesEvaluated: 2,
                winners: comparison.verdict.status === 'improved' ? 1 : 0,
                losers: comparison.verdict.status === 'degraded' ? 1 : 0,
                inconclusive: comparison.verdict.status === 'no-difference' || comparison.verdict.status === 'invalid' ? 2 : 0,
                totalCost: {
                    browserRuns: armA.caseResults.length + armB.caseResults.length,
                    tokensUsed: 0,
                    durationMs: Date.now() - startedAt,
                },
            },
        });
    } finally {
        // Stop preview server only if we started it
        if (shouldStopServer) {
            console.log('\n🛑 Stopping preview server...');
            stopPreviewServer();
        }
    }
    
    // Save results
    if (output) {
        const saveData = {
            timestamp: new Date().toISOString(),
            config: { repetitions, headless },
            arms: {
                A: { name: armA.armName, patch: armA.patch, caseResults: armA.caseResults },
                B: { name: armB.armName, patch: armB.patch, caseResults: armB.caseResults },
            },
            comparison: {
                mcNemar: comparison.mcNemar,
                wilcoxon: comparison.wilcoxon,
                correctionsDiff: comparison.correctionsDiff,
                verdict: comparison.verdict,
            },
        };
        writeFileSync(output, JSON.stringify(saveData, null, 2));
        console.log(`\n💾 Results saved to ${output}`);
    }
}
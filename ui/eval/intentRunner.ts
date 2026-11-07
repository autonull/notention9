import { test as base, type Page, type BrowserContext, type Browser } from '@playwright/test';
import { readIntentCases, type IntentCase } from '@notention/core/eval/caseManifest';
import { readManifest } from '@notention/core/eval/caseManifest';
import {
    captureSnapshot,
    restoreSnapshot,
    verifySnapshot,
    computeDomHash,
    generateRunId,
    type SeedSnapshot,
} from './seedSnapshot.js';
import { runIntentCase, applySeedRevisions, type IntentCaseRunResult, type RunIntentCaseConfig } from '../../optimize/dist/optimizer/evaluation/intentCaseRunner.js';

export interface IntentRunConfig {
    split: 'search' | 'validation' | 'holdout';
    baseURL?: string;
    headless?: boolean;
    slowMo?: number;
    repetitions?: number;
    seed?: number;
    viewport?: { width: number; height: number };
    recordVideo?: boolean;
    /** Enable SeedSnapshot capture/replay for deterministic runs */
    useSeedSnapshot?: boolean;
}

export interface IntentCaseResult {
    caseId: string;
    intent: string;
    repetition: number;
    success: boolean;
    metrics: {
        completion: number;
        steps: number;
        corrections: number;
    };
    details: string[];
    error?: string;
    /** DOM hash for this repetition (for replay verification) */
    domHash?: string;
    /** SeedSnapshot verification result (for repetitions > 0) */
    snapshotVerification?: {
        match: boolean;
        details: string[];
    };
}

export interface IntentRunResult {
    runId: string;
    manifestHash: string;
    split: string;
    revisionId: string;
    results: IntentCaseResult[];
    summary: {
        total: number;
        passed: number;
        failed: number;
        avgCompletion: number;
        avgSteps: number;
        avgCorrections: number;
        /** Percentage of repetitions where DOM hash matched on replay */
        replayFidelity?: number;
    };
    /** The captured seed snapshot (from first repetition) */
    seedSnapshot?: SeedSnapshot;
}

async function setupContextWithDeterminism(
    browser: Browser,
    config: IntentRunConfig,
    rep: number
): Promise<BrowserContext> {
    const context = await browser.newContext({
        viewport: config.viewport || { width: 1280, height: 720 },
        recordVideo: config.recordVideo ? { dir: `eval/videos/${config.split}/rep-${rep}` } : undefined,
    });

    // Freeze clock, seed RNG, block network
    await context.addInitScript((seed: number) => {
        // Freeze Date.now() and Date constructor
        const fixedTime = Date.now();
        const OriginalDate = Date;
        // @ts-ignore
        const FixedDate = function(this: any) {
            if (arguments.length === 0) {
                return new OriginalDate(fixedTime);
            }
            return OriginalDate.apply(null, arguments as any);
        };
        FixedDate.now = () => fixedTime;
        FixedDate.parse = OriginalDate.parse.bind(OriginalDate);
        FixedDate.UTC = OriginalDate.UTC.bind(OriginalDate);
        FixedDate.prototype = OriginalDate.prototype;
        // @ts-ignore
        window.Date = FixedDate;

        // Seed Math.random
        let seedValue = seed;
        Math.random = () => {
            seedValue = (seedValue * 1664525 + 1013904223) % 4294967296;
            return seedValue / 4294967296;
        };

        // Block fetch/XHR
        window.fetch = async () => {
            throw new Error('Network requests blocked in evaluation');
        };

        // @ts-ignore
        window.XMLHttpRequest = class {
            open() { throw new Error('XHR blocked in evaluation'); }
            send() { throw new Error('XHR blocked in evaluation'); }
        };

        // @ts-ignore
        window.WebSocket = class {
            constructor() { throw new Error('WebSocket blocked in evaluation'); }
        };
    }, (config.seed ?? 42) + rep);

    return context;
}

export async function runIntentEvaluation(
    browser: Browser,
    config: IntentRunConfig
): Promise<IntentRunResult> {
    const manifest = readManifest();
    const cases = readIntentCases(config.split);
    const revisionId = 'incumbent'; // Would be dynamic in real implementation
    const runId = generateRunId(manifest.hash, revisionId, config.split, 0);
    const useSeedSnapshot = config.useSeedSnapshot ?? true;

    const results: IntentCaseResult[] = [];
    const repetitions = config.repetitions || 3;
    let seedSnapshot: SeedSnapshot | undefined;
    let replayMatchCount = 0;
    let replayTotalCount = 0;

    const runConfig: RunIntentCaseConfig = {
        baseURL: config.baseURL || 'http://localhost:5173',
        navigationTimeoutMs: 30000,
        extractionWaitMs: 1000,
    };

    for (const caseData of cases) {
        for (let rep = 0; rep < repetitions; rep++) {
            const context = await setupContextWithDeterminism(browser, config, rep);
            const page = await context.newPage();

            try {
                let domHash: string | undefined;
                let snapshotVerification: IntentCaseResult['snapshotVerification'];

                if (useSeedSnapshot) {
                    if (rep === 0) {
                        // First repetition: run the case, then capture snapshot
                        const result = await runIntentCase(page, caseData, runConfig);
                        domHash = await computeDomHash(page);
                        seedSnapshot = await captureSnapshot(page);

                        results.push({
                            caseId: caseData.id,
                            intent: caseData.intent,
                            repetition: rep,
                            success: result.success,
                            metrics: result.metrics,
                            details: result.details,
                            error: result.error,
                            domHash,
                        });
                    } else {
                        // Subsequent repetitions: restore snapshot, then run
                        if (!seedSnapshot) {
                            throw new Error('SeedSnapshot not captured yet');
                        }

                        // Restore the snapshot
                        await restoreSnapshot(page, seedSnapshot);

                        // Run the case on restored state
                        const result = await runIntentCase(page, caseData, runConfig);
                        domHash = await computeDomHash(page);

                        // Verify snapshot fidelity
                        const verification = await verifySnapshot(page, seedSnapshot);
                        snapshotVerification = {
                            match: verification.match,
                            details: verification.details,
                        };

                        if (verification.match) {
                            replayMatchCount++;
                        }
                        replayTotalCount++;

                        results.push({
                            caseId: caseData.id,
                            intent: caseData.intent,
                            repetition: rep,
                            success: result.success,
                            metrics: result.metrics,
                            details: result.details,
                            error: result.error,
                            domHash,
                            snapshotVerification,
                        });
                    }
                } else {
                    // Without SeedSnapshot: run normally
                    const result = await runIntentCase(page, caseData, runConfig);
                    domHash = await computeDomHash(page);

                    results.push({
                        caseId: caseData.id,
                        intent: caseData.intent,
                        repetition: rep,
                        success: result.success,
                        metrics: result.metrics,
                        details: result.details,
                        error: result.error,
                        domHash,
                    });
                }
            } finally {
                await page.close();
                await context.close();
            }
        }
    }

    const total = results.length;
    const passed = results.filter(r => r.success).length;
    const failed = total - passed;

    const avgCompletion = results.reduce((sum, r) => sum + r.metrics.completion, 0) / total;
    const avgSteps = results.reduce((sum, r) => sum + r.metrics.steps, 0) / total;
    const avgCorrections = results.reduce((sum, r) => sum + r.metrics.corrections, 0) / total;

    const replayFidelity = replayTotalCount > 0
        ? Math.round((replayMatchCount / replayTotalCount) * 100)
        : undefined;

    return {
        runId,
        manifestHash: manifest.hash,
        split: config.split,
        revisionId,
        results,
        summary: {
            total,
            passed,
            failed,
            avgCompletion,
            avgSteps,
            avgCorrections,
            replayFidelity,
        },
        seedSnapshot,
    };
}

export { readManifest, readIntentCases };
export { captureSnapshot, restoreSnapshot, verifySnapshot, computeDomHash, generateRunId, type SeedSnapshot } from './seedSnapshot.js';
export { applySeedRevisions, runIntentCase, type IntentCaseRunResult, type RunIntentCaseConfig } from '../../optimize/dist/optimizer/evaluation/intentCaseRunner.js';
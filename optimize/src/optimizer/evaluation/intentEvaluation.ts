import { chromium, type Browser, type BrowserContext, type Page } from '@playwright/test';
import { readManifest, readIntentCases, type IntentCase } from '@notention/core/eval/caseManifest';
import { ensurePreviewServer, stopPreviewServer } from '../server/previewServer.js';
import type { IntentEvaluationConfig, IntentEvaluationResult } from '../types/index.js';
import {
    INTENT_DEFAULT_VIEWPORT,
    INTENT_NAVIGATION_TIMEOUT_MS,
    INTENT_EXTRACTION_WAIT_MS,
} from '../constants.js';
import { runIntentCase, applySeedRevisions, type IntentCaseRunResult, type RunIntentCaseConfig } from './intentCaseRunner.js';

/**
 * Run intent evaluation for a specific revision using Playwright
 * This tests UI parameter changes by running browser-based intent cases
 */
export async function runIntentEvaluationForRevision(
    revisionId: string,
    config: IntentEvaluationConfig = {}
): Promise<IntentEvaluationResult> {
    const baseURL = await ensurePreviewServer();

    const manifest = readManifest();
    const cases = readIntentCases(config.split ?? 'validation');

    // Filter cases if specified (for successive halving)
    const filteredCases = config.caseFilter
        ? cases.filter(c => config.caseFilter!.includes(c.id))
        : cases;

    const runId = `intent-${manifest.hash}-${revisionId}-${Date.now()}`;

    console.log(`   🌐 Running intent evaluation (${filteredCases.length} cases, ${config.repetitions ?? 1} rep)...`);

    const browser = await chromium.launch({
        headless: config.headless !== false,
        args: ['--disable-dev-shm-usage', '--disable-gpu', '--no-sandbox'],
    });

    try {
        const context = await browser.newContext({
            viewport: config.viewport || INTENT_DEFAULT_VIEWPORT,
        });

        // Seed the revision in localStorage for the test to pick up
        await context.addInitScript((data: { revisionId: string; patch: Record<string, unknown> }) => {
            localStorage.setItem('pendingRevision', data.revisionId);
            localStorage.setItem('pendingRevisionData', JSON.stringify(data.patch));
        }, { revisionId, patch: config.revisionPatch ?? {} });

        const page = await context.newPage();

        const results: IntentEvaluationResult['results'] = [];
        const repetitions = config.repetitions ?? 1;

        const runConfig: RunIntentCaseConfig = {
            baseURL: config.baseURL || baseURL,
            navigationTimeoutMs: INTENT_NAVIGATION_TIMEOUT_MS,
            extractionWaitMs: INTENT_EXTRACTION_WAIT_MS,
        };

        for (const caseData of filteredCases) {
            for (let rep = 0; rep < repetitions; rep++) {
                const startTime = Date.now();
                let steps = 0;
                const details: string[] = [];
                let corrections = 0;

                try {
                    // Run the shared intent case logic
                    const result = await runIntentCase(page, caseData, runConfig);

                    results.push({
                        caseId: caseData.id,
                        intent: caseData.intent,
                        repetition: rep,
                        success: result.success,
                        metrics: result.metrics,
                        details: result.details,
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
        const passed = results.filter((r) => r.success).length;
        const failed = total - passed;

        const avgCompletion = results.reduce((sum: number, r) => sum + r.metrics.completion, 0) / total;
        const avgSteps = results.reduce((sum: number, r) => sum + r.metrics.steps, 0) / total;
        const avgCorrections = results.reduce((sum: number, r) => sum + r.metrics.corrections, 0) / total;

        return {
            runId,
            manifestHash: manifest.hash,
            revisionId,
            split: config.split ?? 'validation',
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
 * Cleanup preview server - call at process exit
 */
export function cleanupPreviewServer(): void {
    stopPreviewServer();
}
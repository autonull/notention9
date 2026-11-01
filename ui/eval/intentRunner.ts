import { test as base, type Page, type BrowserContext, type Browser } from '@playwright/test';
import { readIntentCases, type IntentCase } from '@notention/core/eval/caseManifest';
import { readManifest } from '@notention/core/eval/caseManifest';

export interface IntentRunConfig {
    split: 'search' | 'validation' | 'holdout';
    baseURL?: string;
    headless?: boolean;
    slowMo?: number;
    repetitions?: number;
    seed?: number;
    viewport?: { width: number; height: number };
    recordVideo?: boolean;
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
}

export interface IntentRunResult {
    runId: string;
    manifestHash: string;
    split: string;
    results: IntentCaseResult[];
    summary: {
        total: number;
        passed: number;
        failed: number;
        avgCompletion: number;
        avgSteps: number;
        avgCorrections: number;
    };
}

function generateRunId(manifestHash: string, split: string, revisionId: string): string {
    return `run-${manifestHash}-${revisionId}-${split}-${Date.now()}`;
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

async function runIntentCase(
    page: Page,
    caseData: IntentCase,
    baseURL: string
): Promise<{ success: boolean; metrics: { completion: number; steps: number; corrections: number }; details: string[]; error?: string }> {
    const startTime = Date.now();
    let steps = 0;
    const details: string[] = [];
    let corrections = 0;

    try {
        // Navigate to dashboard
        await page.goto(`${baseURL}/#dashboard`);
        await page.waitForLoadState('networkidle');

        // Apply seed revisions if any
        if (caseData.seed.revisions && caseData.seed.revisions.length > 0) {
            for (const revId of caseData.seed.revisions) {
                if (revId !== 'incumbent') {
                    // Apply revision via settings API
                    await page.evaluate((rev) => {
                        // This would apply the revision in the app
                        console.log('Applying revision:', rev);
                    }, revId);
                }
            }
        }

        // Type the prompt in the quick capture input
        const editor = page.locator('input[placeholder*="What\'s on your mind"]').first();
        await editor.fill(caseData.prompt);
        steps++;
        details.push(`Filled prompt: ${caseData.prompt.slice(0, 50)}...`);

        // Submit
        await page.click('button[aria-label="Create note"]');
        await page.waitForLoadState('networkidle');
        steps++;
        details.push('Submitted capture');

        // Wait for extraction to complete
        await page.waitForTimeout(1000);
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

        // Check for corrections needed (simplified - would need actual correction tracking)
        if (completion === 1) {
            details.push('No corrections needed');
        } else {
            corrections = 1;
            details.push('Corrections needed');
        }

        const success = completion === 1;

        return {
            success,
            metrics: { completion, steps, corrections },
            details,
        };
    } catch (error) {
        return {
            success: false,
            metrics: { completion: 0, steps, corrections },
            details: [...details, `Error: ${error instanceof Error ? error.message : String(error)}`],
            error: error instanceof Error ? error.message : String(error),
        };
    }
}

export async function runIntentEvaluation(
    browser: Browser,
    config: IntentRunConfig
): Promise<IntentRunResult> {
    const manifest = readManifest();
    const cases = readIntentCases(config.split);
    const revisionId = 'incumbent'; // Would be dynamic in real implementation
    const runId = generateRunId(manifest.hash, config.split, revisionId);

    const results: IntentCaseResult[] = [];
    const repetitions = config.repetitions || 3;

    for (const caseData of cases) {
        for (let rep = 0; rep < repetitions; rep++) {
            const context = await setupContextWithDeterminism(browser, config, rep);
            const page = await context.newPage();

            try {
                const result = await runIntentCase(page, caseData, config.baseURL || 'http://localhost:5173');

                results.push({
                    caseId: caseData.id,
                    intent: caseData.intent,
                    repetition: rep,
                    success: result.success,
                    metrics: result.metrics,
                    details: result.details,
                    error: result.error,
                });
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

    return {
        runId,
        manifestHash: manifest.hash,
        split: config.split,
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
}

export { readManifest, readIntentCases };
import { type Page } from '@playwright/test';
import type { IntentCase } from '@notention/core/eval/caseManifest';

/**
 * Shared intent case execution logic
 * Used by both ui/eval/intentRunner.ts and optimize/src/optimizer/evaluation/intentEvaluation.ts
 */

export interface IntentCaseMetrics {
    completion: number;
    steps: number;
    corrections: number;
    timeToCaptureMs: number;
}

export interface IntentCaseRunResult {
    success: boolean;
    metrics: IntentCaseMetrics;
    details: string[];
    error?: string;
}

export interface RunIntentCaseConfig {
    baseURL: string;
    navigationTimeoutMs: number;
    extractionWaitMs: number;
    extractionSelector?: string; // Event-driven wait selector
    seed?: Record<string, unknown>; // For browser context seeding (B1.4)
}

/**
 * Apply seed revisions from case data
 */
export async function applySeedRevisions(page: Page, caseData: IntentCase): Promise<void> {
    if (caseData.seed.revisions && caseData.seed.revisions.length > 0) {
        for (const revId of caseData.seed.revisions) {
            if (revId !== 'incumbent') {
                await page.evaluate((rev) => {
                    localStorage.setItem('pendingRevision', rev);
                }, revId);
            }
        }
    }
}

/**
 * Run a single intent case and return metrics
 */
export async function runIntentCase(
    page: Page,
    caseData: IntentCase,
    config: RunIntentCaseConfig
): Promise<IntentCaseRunResult> {
    // Seed browser context for determinism (B1.4)
    await seedBrowserContext(page, caseData.seed ?? {});

    let steps = 0;
    const details: string[] = [];
    let corrections = 0;
    const startTime = Date.now();

    try {
        // Navigate to dashboard - handle hash routing for SPA
        await page.goto(config.baseURL);
        await page.waitForLoadState('domcontentloaded');
        await page.waitForLoadState('networkidle');
        
        // Wait for React app to mount
        await page.waitForSelector('body', { state: 'attached', timeout: 10000 });
        
        // Set hash to dashboard
        await page.evaluate(() => {
            window.location.hash = 'dashboard';
        });
        await page.waitForTimeout(3000); // Allow React to render
        
        // Apply seed revisions if any
        await applySeedRevisions(page, caseData);

        // Type the prompt in the quick capture input
        const editor = page.locator('input[placeholder*="What\'s on your mind"]').first();
        await editor.waitFor({ state: 'visible', timeout: config.navigationTimeoutMs });
        await editor.fill(caseData.prompt);
        steps++;
        details.push(`Filled prompt: ${caseData.prompt.slice(0, 50)}...`);

        // Submit
        await page.click('button[aria-label="Create note"]');
        await page.waitForLoadState('domcontentloaded');
        steps++;
        details.push('Submitted capture');

        // Wait for extraction to complete - event-driven with timeout fallback
        if (config.extractionSelector) {
            try {
                await page.waitForSelector(config.extractionSelector, { state: 'visible', timeout: config.extractionWaitMs });
                details.push('Extraction completed (event-driven)');
            } catch {
                details.push('Extraction selector timeout, continuing...');
            }
        } else {
            await page.waitForTimeout(config.extractionWaitMs);
            details.push('Waited for extraction (fixed timeout)');
        }
        steps++;
        details.push('Waited for extraction');

        const timeToCaptureMs = Date.now() - startTime;

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

        return {
            success,
            metrics: { completion, steps, corrections, timeToCaptureMs },
            details,
        };
    } catch (error) {
        const timeToCaptureMs = Date.now() - startTime;
        return {
            success: false,
            metrics: { completion: 0, steps, corrections, timeToCaptureMs },
            details: [...details, `Error: ${error instanceof Error ? error.message : String(error)}`],
            error: error instanceof Error ? error.message : String(error),
        };
    }
}

/**
 * Seed browser context for deterministic runs (B1.4)
 * Freezes clock, seeds RNG, blocks network egress except preview origin
 */
async function seedBrowserContext(page: Page, seed: Record<string, unknown>): Promise<void> {
    // Freeze time to a fixed timestamp for deterministic behavior
    const fixedTime = new Date('2026-01-01T00:00:00Z').getTime();
    await page.addInitScript((time) => {
        // Freeze Date.now() - simpler approach that works
        const originalNow = Date.now;
        (Date as any).now = () => time;
        
        // Seed Math.random with a deterministic PRNG
        let seedValue = time;
        const random = (): number => {
            seedValue = (seedValue * 1664525 + 1013904223) % 4294967296;
            return seedValue / 4294967296;
        };
        globalThis.Math.random = random;
    }, fixedTime);

    // Block all network requests except to the preview origin
    const previewOrigin = new URL((seed.baseURL as string) || 'http://localhost:4199').origin;
    await page.route('**/*', async (route) => {
        const url = route.request().url();
        if (url.startsWith(previewOrigin)) {
            await route.continue();
        } else {
            await route.abort('blockedbyclient');
        }
    });
}
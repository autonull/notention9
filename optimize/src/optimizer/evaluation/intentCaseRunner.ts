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
    // Seed browser context for determinism (B1.4) - but don't freeze time for E2 timing
    // Disable network blocking for E2 since we need preview server access
    await seedBrowserContext(page, caseData.seed ?? {}, { freezeTime: false, baseURL: config.baseURL, blockNetwork: false });

    let steps = 0;
    const details: string[] = [];
    let corrections = 0;
    const startTime = performance.now(); // Use performance.now() which isn't frozen

    try {
        console.log(`[DEBUG] Navigating to ${config.baseURL}`);
        // Navigate to dashboard - handle hash routing for SPA
        await page.goto(config.baseURL, { waitUntil: 'domcontentloaded' });
        console.log(`[DEBUG] Page loaded, title: ${await page.title()}`);
        await page.waitForLoadState('networkidle');
        console.log(`[DEBUG] Network idle`);
        
        // Listen for console errors
        page.on('console', msg => {
            if (msg.type() === 'error') {
                console.log(`[BROWSER ERROR] ${msg.text()}`);
            }
        });
        page.on('pageerror', error => {
            console.log(`[BROWSER PAGE ERROR] ${error.message}`);
        });
        
        // Wait for React app to mount and notes to load (default view is 'notes' which shows DashboardView when empty)
        await page.waitForSelector('body', { state: 'attached', timeout: 10000 });
        
        // Wait for app to fully hydrate
        await page.waitForTimeout(5000);
        
        // Debug: log page content
        const pageContent = await page.content();
        console.log(`[DEBUG] Page title: ${await page.title()}`);
        console.log(`[DEBUG] Page has quick-capture-input: ${pageContent.includes('quick-capture-input')}`);
        console.log(`[DEBUG] Page has DashboardView: ${pageContent.includes('Quick Capture')}`);
        console.log(`[DEBUG] Page has EditorManager: ${pageContent.includes('EditorManager') || pageContent.includes('TiptapEditor')}`);
        console.log(`[DEBUG] Page content length: ${pageContent.length}`);
        
        // Apply seed revisions if any
        await applySeedRevisions(page, caseData);

        // Type the prompt in the quick capture input
        const editor = page.locator('[data-testid="quick-capture-input"]').first();
        await editor.waitFor({ state: 'visible', timeout: config.navigationTimeoutMs });
        await editor.fill(caseData.prompt);
        steps++;
        details.push(`Filled prompt: ${caseData.prompt.slice(0, 50)}...`);

        // Submit
        await page.click('button[aria-label="Create note"]');
        await page.waitForLoadState('domcontentloaded');
        await page.waitForLoadState('networkidle');
        steps++;
        details.push('Submitted capture');

        // Wait for note view to load
        await page.waitForTimeout(2000);

        // Open inspector sidebar to see extracted properties
        try {
            await page.click('[data-testid="toggle-inspector"]', { timeout: 10000 });
            await page.waitForTimeout(1000); // Wait for sidebar animation
            details.push('Opened inspector sidebar');
        } catch (e) {
            details.push(`Inspector toggle not found: ${e instanceof Error ? e.message : String(e)}`);
        }

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

        const timeToCaptureMs = performance.now() - startTime;

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
        const timeToCaptureMs = performance.now() - startTime;
        const errorMsg = error instanceof Error ? error.message : String(error);
        console.log(`[DEBUG] runIntentCase caught error: ${errorMsg}`);
        return {
            success: false,
            metrics: { completion: 0, steps, corrections, timeToCaptureMs },
            details: [...details, `Error: ${errorMsg}`],
            error: errorMsg,
        };
    }
}

/**
 * Seed browser context for deterministic runs (B1.4)
 * Freezes clock, seeds RNG, blocks network egress except preview origin
 */
async function seedBrowserContext(page: Page, seed: Record<string, unknown>, options: { freezeTime?: boolean; baseURL?: string; blockNetwork?: boolean } = {}): Promise<void> {
    const { freezeTime = true, baseURL, blockNetwork = true } = options;
    
    if (freezeTime) {
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
    } else {
        // Still seed Math.random but don't freeze time
        const fixedTime = new Date('2026-01-01T00:00:00Z').getTime();
        await page.addInitScript((time) => {
            // Seed Math.random with a deterministic PRNG
            let seedValue = time;
            const random = (): number => {
                seedValue = (seedValue * 1664525 + 1013904223) % 4294967296;
                return seedValue / 4294967296;
            };
            globalThis.Math.random = random;
        }, fixedTime);
    }

    // Block all network requests except to the preview origin (optional)
    if (blockNetwork) {
        const previewOrigin = new URL(baseURL || (seed.baseURL as string) || 'http://localhost:4199').origin;
        await page.route('**/*', async (route) => {
            const url = route.request().url();
            if (url.startsWith(previewOrigin)) {
                await route.continue();
            } else {
                await route.abort('blockedbyclient');
            }
        });
    }
}
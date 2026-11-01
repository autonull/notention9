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
    let steps = 0;
    const details: string[] = [];
    let corrections = 0;

    try {
        // Navigate to dashboard
        await page.goto(`${config.baseURL}/#dashboard`);
        await page.waitForLoadState('domcontentloaded');

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

        // Wait for extraction to complete
        await page.waitForTimeout(config.extractionWaitMs);
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
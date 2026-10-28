import type { Page } from '@playwright/test';
import type { Step } from '../journey.js';
import { StepExecutor, StepExecutionResult } from './index.js';

async function getStateSnapshot(page: Page): Promise<unknown> {
    return page.evaluate(() => (globalThis as any).__NOTENTION__?.state?.());
}

async function getAriaSnapshot(page: Page, label: string): Promise<string | undefined> {
    return page.evaluate(() => (globalThis as any).__NOTENTION__?.ariaSnapshot?.(label));
}

export const captureExecutor: StepExecutor = {
    async execute(page: Page, step: Step): Promise<StepExecutionResult> {
        if (step.kind !== 'capture') throw new Error('Invalid step for captureExecutor');
        const ariaSnapshot = await getAriaSnapshot(page, step.label);
        const screenshotBuffer = await page.screenshot({ fullPage: false });
        const screenshot = screenshotBuffer.toString('base64');
        const stateSnapshot = await getStateSnapshot(page);
        return { ok: true, ariaSnapshot, screenshot, stateSnapshot };
    },
};
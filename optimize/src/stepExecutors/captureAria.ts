import type { Page } from '@playwright/test';
import type { Step } from '../journey.js';
import { StepExecutor, StepExecutionResult } from './index.js';

async function getStateSnapshot(page: Page): Promise<unknown> {
    return page.evaluate(() => (globalThis as any).__NOTENTION__?.state?.());
}

async function getAriaSnapshot(page: Page, label: string): Promise<string | undefined> {
    return page.evaluate(() => (globalThis as any).__NOTENTION__?.ariaSnapshot?.(label));
}

export const captureAriaExecutor: StepExecutor = {
    async execute(page: Page, step: Step): Promise<StepExecutionResult> {
        if (step.kind !== 'captureAria') throw new Error('Invalid step for captureAriaExecutor');
        const snapshot = await (page as any).accessibility.snapshot({ root: page.mainFrame() });
        let ariaSnapshot = JSON.stringify(snapshot, null, 2);
        const devBridgeSnapshot = await getAriaSnapshot(page, step.label);
        if (devBridgeSnapshot) {
            ariaSnapshot = devBridgeSnapshot;
        }
        const stateSnapshot = await getStateSnapshot(page);
        return { ok: true, ariaSnapshot, stateSnapshot };
    },
};
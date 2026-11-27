import type { Page } from '@playwright/test';
import type { Step } from '../journey.js';
import { StepExecutor, StepExecutionResult } from './index.js';
import { BaseStepExecutor } from './BaseStepExecutor.js';

export const captureAriaExecutor: StepExecutor = BaseStepExecutor.create({
    kind: 'captureAria',
    execute: async ({ page, step }) => {
        const label = (step as { label: string }).label;
        // Try Playwright's accessibility snapshot first
        const snapshot = await page.accessibility.snapshot({ root: page.mainFrame() });
        let ariaSnapshot = JSON.stringify(snapshot, null, 2);
        // Fall back to dev bridge snapshot if available
        const devBridgeSnapshot = await BaseStepExecutor.getAriaSnapshot(page, label);
        if (devBridgeSnapshot) {
            ariaSnapshot = devBridgeSnapshot;
        }
        const stateSnapshot = await BaseStepExecutor.getStateSnapshot(page);
        return { ok: true, ariaSnapshot, stateSnapshot };
    },
});
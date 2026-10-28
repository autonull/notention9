import type { Page } from '@playwright/test';
import type { Step } from '../journey.js';
import { StepExecutor, StepExecutionResult } from './index.js';
import { resolveTarget, waitForReady } from '../steps.js';

export const assertAriaSnapshotExecutor: StepExecutor = {
    async execute(page: Page, step: Step): Promise<StepExecutionResult> {
        if (step.kind !== 'assertAriaSnapshot') throw new Error('Invalid step for assertAriaSnapshotExecutor');
        const locator = resolveTarget(page, step.target);
        await waitForReady(locator);
        const actualSnapshot = await locator.ariaSnapshot();
        const actualStr = JSON.stringify(actualSnapshot, null, 2);
        if (!actualStr.includes(step.snapshot)) {
            throw new Error(`assertAriaSnapshot failed: expected snapshot to contain "${step.snapshot}", got: ${actualStr}`);
        }
        return { ok: true, ariaSnapshot: actualStr };
    },
};
import type { Page } from '@playwright/test';
import type { Step } from '../journey.js';
import { StepExecutor, StepExecutionResult } from './index.js';
import { BaseStepExecutor } from './BaseStepExecutor.js';

export const assertAriaSnapshotExecutor: StepExecutor = BaseStepExecutor.create({
    kind: 'assertAriaSnapshot',
    execute: async ({ locator, isModal, step }) => {
        const s = step as Extract<Step, { kind: 'assertAriaSnapshot' }>;
        await BaseStepExecutor.waitForReady(locator!, isModal);
        const actualSnapshot = await locator!.ariaSnapshot();
        const actualStr = JSON.stringify(actualSnapshot, null, 2);
        if (!actualStr.includes(s.snapshot)) {
            throw new Error(`assertAriaSnapshot failed: expected snapshot to contain "${s.snapshot}", got: ${actualStr}`);
        }
        return { ok: true, ariaSnapshot: actualStr };
    },
});
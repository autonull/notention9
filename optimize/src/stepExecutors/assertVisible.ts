import type { Page, Locator } from '@playwright/test';
import type { Step } from '../journey.js';
import { resolveTarget, waitForReady } from '../steps.js';
import type { StepExecutor, StepExecutionResult } from './index.js';

export const assertVisibleExecutor: StepExecutor = {
    async execute(page: Page, step: Step): Promise<StepExecutionResult> {
        if (step.kind !== 'assertVisible') throw new Error('Not an assertVisible step');
        const target = step.target;
        const locator = resolveTarget(page, target);
        await waitForReady(locator, 'modal' in target && !!target.modal);
        return { ok: true };
    },
};
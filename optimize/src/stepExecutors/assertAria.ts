import type { Page } from '@playwright/test';
import type { Step } from '../journey.js';
import { StepExecutor, StepExecutionResult } from './index.js';
import { resolveTarget, waitForReady } from '../steps.js';

export const assertAriaExecutor: StepExecutor = {
    async execute(page: Page, step: Step): Promise<StepExecutionResult> {
        if (step.kind !== 'assertAria') throw new Error('Invalid step for assertAriaExecutor');
        const locator = resolveTarget(page, step.target);
        await waitForReady(locator);
        const ariaSnapshot = await locator.ariaSnapshot();
        return { ok: true, ariaSnapshot };
    },
};
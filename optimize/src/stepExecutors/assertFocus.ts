import type { Page } from '@playwright/test';
import type { Step } from '../journey.js';
import { StepExecutor, StepExecutionResult } from './index.js';
import { resolveTarget, waitForReady } from '../steps.js';

export const assertFocusExecutor: StepExecutor = {
    async execute(page: Page, step: Step): Promise<StepExecutionResult> {
        if (step.kind !== 'assertFocus') throw new Error('Invalid step for assertFocusExecutor');
        const locator = resolveTarget(page, step.target);
        await waitForReady(locator);
        const isFocused = await locator.evaluate((el: HTMLElement) => el === el.ownerDocument.activeElement);
        if (!isFocused) {
            throw new Error(`assertFocus failed: element is not focused`);
        }
        return { ok: true };
    },
};
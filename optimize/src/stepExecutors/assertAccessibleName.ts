import type { Page } from '@playwright/test';
import type { Step } from '../journey.js';
import { StepExecutor, StepExecutionResult } from './index.js';
import { resolveTarget, waitForReady } from '../steps.js';

export const assertAccessibleNameExecutor: StepExecutor = {
    async execute(page: Page, step: Step): Promise<StepExecutionResult> {
        if (step.kind !== 'assertAccessibleName') throw new Error('Invalid step for assertAccessibleNameExecutor');
        const locator = resolveTarget(page, step.target);
        await waitForReady(locator);
        const accessibleName = await locator.getAttribute('aria-label') ||
            await locator.getAttribute('aria-labelledby')?.then(id => page.locator(`#${id}`).textContent()) ||
            await locator.textContent() ||
            '';
        const normalizedName = accessibleName.trim().toLowerCase();
        const expectedNormalized = step.expected.trim().toLowerCase();
        if (!normalizedName.includes(expectedNormalized)) {
            throw new Error(`assertAccessibleName failed: expected name to contain "${step.expected}", got: "${accessibleName}"`);
        }
        return { ok: true };
    },
};
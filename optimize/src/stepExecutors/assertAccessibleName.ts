import type { Page } from '@playwright/test';
import type { Step } from '../journey.js';
import { StepExecutor, StepExecutionResult } from './index.js';
import { BaseStepExecutor } from './BaseStepExecutor.js';

export const assertAccessibleNameExecutor: StepExecutor = BaseStepExecutor.create({
    kind: 'assertAccessibleName',
    execute: async ({ locator, isModal, step }) => {
        await BaseStepExecutor.waitForReady(locator!, isModal);
        const accessibleName = await locator!.getAttribute('aria-label') ?? 
                               await locator!.getAttribute('aria-labelledby') ??
                               (await locator!.textContent())?.trim() ?? '';
        const expected = (step as { expected: string }).expected;
        if (accessibleName !== expected) {
            throw new Error(`assertAccessibleName failed: expected "${expected}", got "${accessibleName}"`);
        }
        return { ok: true };
    },
});
import type { Page } from '@playwright/test';
import type { Step } from '../journey.js';
import { StepExecutor, StepExecutionResult } from './index.js';
import { BaseStepExecutor } from './BaseStepExecutor.js';

export const assertAriaExecutor: StepExecutor = BaseStepExecutor.create({
    kind: 'assertAria',
    execute: async ({ page, step, locator, isModal }) => {
        await BaseStepExecutor.waitForReady(locator!, isModal);
        const ariaSnapshot = await locator!.ariaSnapshot();
        return { ok: true, ariaSnapshot: JSON.stringify(ariaSnapshot, null, 2) };
    },
});
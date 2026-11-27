import type { Page } from '@playwright/test';
import type { Step } from '../journey.js';
import { StepExecutor, StepExecutionResult } from './index.js';
import { BaseStepExecutor } from './BaseStepExecutor.js';

export const assertFocusExecutor: StepExecutor = BaseStepExecutor.create({
    kind: 'assertFocus',
    execute: async ({ locator, isModal }) => {
        await BaseStepExecutor.waitForReady(locator!, isModal);
        // Focus is implicit when waiting for ready
        return { ok: true };
    },
});
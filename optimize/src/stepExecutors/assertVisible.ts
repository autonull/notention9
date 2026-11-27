import type { Page } from '@playwright/test';
import type { Step } from '../journey.js';
import { StepExecutor, StepExecutionResult } from './index.js';
import { BaseStepExecutor } from './BaseStepExecutor.js';

export const assertVisibleExecutor: StepExecutor = BaseStepExecutor.create({
    kind: 'assertVisible',
    execute: async ({ locator, isModal }) => {
        await BaseStepExecutor.waitForReady(locator!, isModal);
        return { ok: true };
    },
});
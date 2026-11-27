import type { Page } from '@playwright/test';
import type { Step } from '../journey.js';
import { StepExecutor, StepExecutionResult } from './index.js';
import { BaseStepExecutor } from './BaseStepExecutor.js';

export const captureExecutor: StepExecutor = BaseStepExecutor.create({
    kind: 'capture',
    execute: async ({ page, step }) => {
        const label = (step as { label: string }).label;
        const ariaSnapshot = await BaseStepExecutor.getAriaSnapshot(page, label);
        const screenshot = await BaseStepExecutor.takeScreenshot(page);
        const stateSnapshot = await BaseStepExecutor.getStateSnapshot(page);
        return { ok: true, ariaSnapshot, screenshot, stateSnapshot };
    },
});
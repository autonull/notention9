import type { Page } from '@playwright/test';
import type { Step } from '../journey.js';
import { StepExecutor, StepExecutionResult } from './index.js';

export const navigateExecutor: StepExecutor = {
    async execute(page: Page, step: Step): Promise<StepExecutionResult> {
        if (step.kind !== 'navigate') throw new Error('Invalid step for navigateExecutor');
        await page.goto(`#${step.hash}`);
        await page.waitForLoadState('domcontentloaded');
        return { ok: true };
    },
};
import type { Page } from '@playwright/test';
import type { Step } from '../journey.js';
import { StepExecutor, StepExecutionResult } from './index.js';

export const scriptExecutor: StepExecutor = {
    async execute(page: Page, step: Step): Promise<StepExecutionResult> {
        if (step.kind !== 'script') throw new Error('Invalid step for scriptExecutor');
        await page.evaluate(step.code);
        return { ok: true };
    },
};
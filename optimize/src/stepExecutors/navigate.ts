import type { Page } from '@playwright/test';
import type { Step } from '../journey.js';
import { StepExecutor, StepExecutionResult } from './index.js';
import { BaseStepExecutor } from './BaseStepExecutor.js';

export const navigateExecutor: StepExecutor = BaseStepExecutor.create({
    kind: 'navigate',
    execute: async ({ page, step }) => {
        const s = step as Extract<Step, { kind: 'navigate' }>;
        await page.goto(`#${s.hash}`);
        await page.waitForLoadState('domcontentloaded');
        return { ok: true };
    },
});
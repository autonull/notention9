import type { Page } from '@playwright/test';
import type { Step } from '../journey.js';
import { StepExecutor, StepExecutionResult } from './index.js';
import { BaseStepExecutor } from './BaseStepExecutor.js';

export const scriptExecutor: StepExecutor = BaseStepExecutor.create({
    kind: 'script',
    execute: async ({ page, step }) => {
        const s = step as Extract<Step, { kind: 'script' }>;
        await page.evaluate(s.code);
        return { ok: true };
    },
});
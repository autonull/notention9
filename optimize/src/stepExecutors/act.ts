import type { Page } from '@playwright/test';
import type { Step } from '../journey.js';
import { StepExecutor, StepExecutionResult } from './index.js';
import { BaseStepExecutor } from './BaseStepExecutor.js';
import { executeAct } from '../steps.js';

export const actExecutor: StepExecutor = BaseStepExecutor.create({
    kind: 'act',
    execute: async ({ page, step }) => {
        await executeAct(page, step);
        return { ok: true };
    },
});
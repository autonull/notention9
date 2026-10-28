import type { Page } from '@playwright/test';
import type { Step } from '../journey.js';
import { StepExecutor, StepExecutionResult } from './index.js';

export const actExecutor: StepExecutor = {
    async execute(page: Page, step: Step): Promise<StepExecutionResult> {
        if (step.kind !== 'act') throw new Error('Invalid step for actExecutor');
        const { executeAct } = await import('../steps.js');
        await executeAct(page, step);
        return { ok: true };
    },
};
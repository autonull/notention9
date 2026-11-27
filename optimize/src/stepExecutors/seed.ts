import type { Page } from '@playwright/test';
import type { Step } from '../journey.js';
import { StepExecutor, StepExecutionResult } from './index.js';
import { BaseStepExecutor } from './BaseStepExecutor.js';

export const seedExecutor: StepExecutor = BaseStepExecutor.create({
    kind: 'seed',
    execute: async () => {
        // Handled before journey execution
        return { ok: true };
    },
});
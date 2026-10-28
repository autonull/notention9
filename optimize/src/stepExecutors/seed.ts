import type { Page } from '@playwright/test';
import type { Step } from '../journey.js';
import { StepExecutor, StepExecutionResult } from './index.js';

export const seedExecutor: StepExecutor = {
    async execute(): Promise<StepExecutionResult> {
        // Handled before journey execution
        return { ok: true };
    },
};
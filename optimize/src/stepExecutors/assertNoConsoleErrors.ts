import type { Page } from '@playwright/test';
import type { Step } from '../journey.js';
import { StepExecutor, StepExecutionResult } from './index.js';
import { BaseStepExecutor } from './BaseStepExecutor.js';

export const assertNoConsoleErrorsExecutor: StepExecutor = BaseStepExecutor.create({
    kind: 'assertNoConsoleErrors',
    execute: async ({ consoleEntries }) => {
        const errors = consoleEntries?.filter(e => e.type === 'error') ?? [];
        if (errors.length > 0) {
            throw new Error(`Console errors found: ${errors.map(e => e.text).join('; ')}`);
        }
        return { ok: true };
    },
});
import type { Page } from '@playwright/test';
import type { Step } from '../journey.js';
import { StepExecutor, StepExecutionResult } from './index.js';

export const assertNoConsoleErrorsExecutor: StepExecutor = {
    async execute(page: Page, step: Step, consoleEntries: Array<{ type: string; text: string; location?: string }>): Promise<StepExecutionResult> {
        if (step.kind !== 'assertNoConsoleErrors') throw new Error('Invalid step');
        const errors = consoleEntries.filter(e => e.type === 'error');
        if (errors.length > 0) {
            throw new Error(`Console errors found: ${errors.map(e => e.text).join('; ')}`);
        }
        return { ok: true };
    },
};
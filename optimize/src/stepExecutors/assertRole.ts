import type { Page } from '@playwright/test';
import type { Step } from '../journey.js';
import { StepExecutor, StepExecutionResult } from './index.js';
import { resolveTarget, waitForReady } from '../steps.js';

export const assertRoleExecutor: StepExecutor = {
    async execute(page: Page, step: Step): Promise<StepExecutionResult> {
        if (step.kind !== 'assertRole') throw new Error('Invalid step for assertRoleExecutor');
        const locator = resolveTarget(page, step.target);
        await waitForReady(locator);
        const actualRole = await locator.getAttribute('role') || 'unknown';
        if (actualRole !== step.expectedRole) {
            throw new Error(`assertRole failed: expected role "${step.expectedRole}", got: "${actualRole}"`);
        }
        return { ok: true };
    },
};
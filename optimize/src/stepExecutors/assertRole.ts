import type { Page } from '@playwright/test';
import type { Step } from '../journey.js';
import { StepExecutor, StepExecutionResult } from './index.js';
import { BaseStepExecutor } from './BaseStepExecutor.js';

export const assertRoleExecutor: StepExecutor = BaseStepExecutor.create({
    kind: 'assertRole',
    execute: async ({ locator, isModal, step }) => {
        await BaseStepExecutor.waitForReady(locator!, isModal);
        const role = await locator!.getAttribute('role');
        const expectedRole = (step as { expectedRole: string }).expectedRole;
        if (role !== expectedRole) {
            throw new Error(`assertRole failed: expected "${expectedRole}", got "${role}"`);
        }
        return { ok: true };
    },
});
import type { Page } from '@playwright/test';
import type { Step } from '../journey.js';
import { StepExecutor, StepExecutionResult } from './index.js';
import { resolvePath, deepEqual } from '../pathUtils.js';

async function getStateSnapshot(page: Page): Promise<unknown> {
    return page.evaluate(() => (globalThis as any).__NOTENTION__?.state?.());
}

export const assertStateExecutor: StepExecutor = {
    async execute(page: Page, step: Step): Promise<StepExecutionResult> {
        if (step.kind !== 'assertState') throw new Error('Invalid step for assertStateExecutor');
        const stateSnapshot = await getStateSnapshot(page);
        const value = resolvePath(stateSnapshot, step.path);
        if (!deepEqual(value, step.equals)) {
            throw new Error(`assertState failed: path="${step.path}", expected=${JSON.stringify(step.equals)}, actual=${JSON.stringify(value)}`);
        }
        return { ok: true, stateSnapshot };
    },
};
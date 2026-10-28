import type { Page } from '@playwright/test';
import type { Step } from '../journey.js';
import { StepExecutor, StepExecutionResult } from './index.js';
import { resolvePath, deepEqual } from '../pathUtils.js';

async function getStateSnapshot(page: Page): Promise<unknown> {
    return page.evaluate(() => (globalThis as any).__NOTENTION__?.state?.());
}

export const waitForStateExecutor: StepExecutor = {
    async execute(page: Page, step: Step): Promise<StepExecutionResult> {
        if (step.kind !== 'waitForState') throw new Error('Invalid step for waitForStateExecutor');
        const timeout = step.timeoutMs ?? 5000;
        const startTime = Date.now();
        let stateSnapshot: unknown;
        let value: unknown;

        while (Date.now() - startTime < timeout) {
            stateSnapshot = await getStateSnapshot(page);
            value = resolvePath(stateSnapshot, step.path);
            if (deepEqual(value, step.equals)) {
                return { ok: true, stateSnapshot };
            }
            await new Promise(r => setTimeout(r, 100));
        }
        // Final check
        stateSnapshot = await getStateSnapshot(page);
        value = resolvePath(stateSnapshot, step.path);
        if (!deepEqual(value, step.equals)) {
            throw new Error(`waitForState timeout: path="${step.path}", expected=${JSON.stringify(step.equals)}, actual=${JSON.stringify(value)}`);
        }
        return { ok: true, stateSnapshot };
    },
};
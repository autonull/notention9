import type { Page } from '@playwright/test';
import type { Step } from '../journey.js';
import { StepExecutor, StepExecutionResult } from './index.js';
import { BaseStepExecutor } from './BaseStepExecutor.js';
import { resolvePath, deepEqual } from '../pathUtils.js';
import { STATE_WAIT_DEFAULT_TIMEOUT_MS } from '../constants.js';

export const waitForStateExecutor: StepExecutor = BaseStepExecutor.create({
    kind: 'waitForState',
    execute: async ({ page, step }) => {
        const timeout = (step as { timeoutMs?: number }).timeoutMs ?? STATE_WAIT_DEFAULT_TIMEOUT_MS;
        const path = (step as { path: string }).path;
        const equals = (step as { equals: unknown }).equals;
        
        await BaseStepExecutor.waitFor(
            async () => {
                const stateSnapshot = await BaseStepExecutor.getStateSnapshot(page);
                const value = resolvePath(stateSnapshot, path);
                return deepEqual(value, equals);
            },
            timeout,
            100
        );
        
        const stateSnapshot = await BaseStepExecutor.getStateSnapshot(page);
        return { ok: true, stateSnapshot };
    },
});
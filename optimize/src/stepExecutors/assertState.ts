import type { Page } from '@playwright/test';
import type { Step } from '../journey.js';
import { StepExecutor, StepExecutionResult } from './index.js';
import { BaseStepExecutor } from './BaseStepExecutor.js';
import { resolvePath, deepEqual } from '../pathUtils.js';

export const assertStateExecutor: StepExecutor = BaseStepExecutor.create({
    kind: 'assertState',
    execute: async ({ page, step }) => {
        const stateSnapshot = await BaseStepExecutor.getStateSnapshot(page);
        const path = (step as { path: string }).path;
        const equals = (step as { equals: unknown }).equals;
        const value = resolvePath(stateSnapshot, path);
        if (!deepEqual(value, equals)) {
            throw new Error(`assertState failed: path="${path}", expected=${JSON.stringify(equals)}, actual=${JSON.stringify(value)}`);
        }
        return { ok: true, stateSnapshot };
    },
});
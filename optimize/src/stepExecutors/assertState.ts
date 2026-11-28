import { createExecutor, typedStep, BaseStepExecutor } from './executorFactory.js';
import { resolvePath, deepEqual } from '../pathUtils.js';

export const assertStateExecutor = createExecutor({
    kind: 'assertState',
    execute: async ({ page, step }) => {
        const s = typedStep(step, 'assertState');
        const stateSnapshot = await BaseStepExecutor.getStateSnapshot(page);
        const value = resolvePath(stateSnapshot, s.path);
        if (!deepEqual(value, s.equals)) {
            throw new Error(`assertState failed: path="${s.path}", expected=${JSON.stringify(s.equals)}, actual=${JSON.stringify(value)}`);
        }
        return { ok: true, stateSnapshot };
    },
});
import { createExecutor, typedStep, BaseStepExecutor, withWaitFor } from './executorFactory.js';
import { resolvePath, deepEqual } from '../pathUtils.js';
import { STATE_WAIT_DEFAULT_TIMEOUT_MS } from '../constants.js';

export const waitForStateExecutor = createExecutor({
    kind: 'waitForState',
    execute: async ({ page, step }) => {
        const s = typedStep(step, 'waitForState');
        
        await withWaitFor.waitFor(
            async () => {
                const stateSnapshot = await BaseStepExecutor.getStateSnapshot(page);
                const value = resolvePath(stateSnapshot, s.path);
                return deepEqual(value, s.equals);
            },
            s.timeoutMs ?? STATE_WAIT_DEFAULT_TIMEOUT_MS,
            100
        );
        
        const stateSnapshot = await BaseStepExecutor.getStateSnapshot(page);
        return { ok: true, stateSnapshot };
    },
});
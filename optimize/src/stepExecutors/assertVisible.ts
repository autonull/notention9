import { createExecutor, withTarget } from './executorFactory.js';

export const assertVisibleExecutor = createExecutor({
    kind: 'assertVisible',
    execute: async ({ locator, isModal }) => {
        await withTarget.waitForReady(locator!, isModal);
        return { ok: true };
    },
});
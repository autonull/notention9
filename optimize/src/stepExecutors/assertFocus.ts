import { createExecutor, withTarget } from './executorFactory.js';

export const assertFocusExecutor = createExecutor({
    kind: 'assertFocus',
    execute: async ({ locator, isModal }) => {
        await withTarget.waitForReady(locator!, isModal);
        return { ok: true };
    },
});
import { createExecutor, withTarget } from './executorFactory.js';

export const assertAriaExecutor = createExecutor({
    kind: 'assertAria',
    execute: async ({ locator, isModal }) => {
        await withTarget.waitForReady(locator!, isModal);
        const ariaSnapshot = await locator!.ariaSnapshot();
        return { ok: true, ariaSnapshot: JSON.stringify(ariaSnapshot, null, 2) };
    },
});
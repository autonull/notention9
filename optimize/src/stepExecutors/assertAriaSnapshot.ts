import { createExecutor, typedStep, withTarget } from './executorFactory.js';

export const assertAriaSnapshotExecutor = createExecutor({
    kind: 'assertAriaSnapshot',
    execute: async ({ locator, isModal, step }) => {
        const s = typedStep(step, 'assertAriaSnapshot');
        await withTarget.waitForReady(locator!, isModal);
        const actualSnapshot = await locator!.ariaSnapshot();
        const actualStr = JSON.stringify(actualSnapshot, null, 2);
        if (!actualStr.includes(s.snapshot)) {
            throw new Error(`assertAriaSnapshot failed: expected snapshot to contain "${s.snapshot}", got: ${actualStr}`);
        }
        return { ok: true, ariaSnapshot: actualStr };
    },
});
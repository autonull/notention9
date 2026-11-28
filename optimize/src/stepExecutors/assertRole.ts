import { createExecutor, typedStep, withTarget } from './executorFactory.js';

export const assertRoleExecutor = createExecutor({
    kind: 'assertRole',
    execute: async ({ locator, isModal, step }) => {
        const s = typedStep(step, 'assertRole');
        await withTarget.waitForReady(locator!, isModal);
        const role = await locator!.getAttribute('role');
        if (role !== s.expectedRole) {
            throw new Error(`assertRole failed: expected "${s.expectedRole}", got "${role}"`);
        }
        return { ok: true };
    },
});
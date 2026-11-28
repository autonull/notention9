import { createExecutor, typedStep, withTarget } from './executorFactory.js';

export const assertAccessibleNameExecutor = createExecutor({
    kind: 'assertAccessibleName',
    execute: async ({ locator, isModal, step }) => {
        const s = typedStep(step, 'assertAccessibleName');
        await withTarget.waitForReady(locator!, isModal);
        const accessibleName = await locator!.getAttribute('aria-label') ?? 
                               await locator!.getAttribute('aria-labelledby') ??
                               (await locator!.textContent())?.trim() ?? '';
        if (accessibleName !== s.expected) {
            throw new Error(`assertAccessibleName failed: expected "${s.expected}", got "${accessibleName}"`);
        }
        return { ok: true };
    },
});
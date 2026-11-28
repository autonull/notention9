import { createExecutor, typedStep, BaseStepExecutor } from './executorFactory.js';

export const captureExecutor = createExecutor({
    kind: 'capture',
    execute: async ({ page, step }) => {
        const s = typedStep(step, 'capture');
        const [ariaSnapshot, screenshot, stateSnapshot] = await Promise.all([
            BaseStepExecutor.getAriaSnapshot(page, s.label),
            BaseStepExecutor.takeScreenshot(page),
            BaseStepExecutor.getStateSnapshot(page),
        ]);
        return { ok: true, ariaSnapshot, screenshot, stateSnapshot };
    },
});
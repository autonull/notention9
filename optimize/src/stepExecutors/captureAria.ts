import { createExecutor, typedStep, BaseStepExecutor } from './executorFactory.js';

export const captureAriaExecutor = createExecutor({
    kind: 'captureAria',
    execute: async ({ page, step }) => {
        const s = typedStep(step, 'captureAria');
        // Try Playwright's accessibility snapshot first
        const snapshot = await (page as any).accessibility?.snapshot?.();
        let ariaSnapshot = snapshot ? JSON.stringify(snapshot, null, 2) : '';
        // Fall back to dev bridge snapshot if available
        const devBridgeSnapshot = await BaseStepExecutor.getAriaSnapshot(page, s.label);
        if (devBridgeSnapshot) {
            ariaSnapshot = devBridgeSnapshot;
        }
        const stateSnapshot = await BaseStepExecutor.getStateSnapshot(page);
        return { ok: true, ariaSnapshot, stateSnapshot };
    },
});
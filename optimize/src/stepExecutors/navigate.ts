import { createExecutor, typedStep } from './executorFactory.js';

export const navigateExecutor = createExecutor({
    kind: 'navigate',
    execute: async ({ page, step }) => {
        const s = typedStep(step, 'navigate');
        await page.goto(`#${s.hash}`);
        await page.waitForLoadState('domcontentloaded');
        return { ok: true };
    },
});
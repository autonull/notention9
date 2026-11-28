import { createExecutor, typedStep } from './executorFactory.js';

export const scriptExecutor = createExecutor({
    kind: 'script',
    execute: async ({ page, step }) => {
        const s = typedStep(step, 'script');
        await page.evaluate(s.code);
        return { ok: true };
    },
});
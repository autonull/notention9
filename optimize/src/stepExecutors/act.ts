import { createExecutor, typedStep, withTarget } from './executorFactory.js';

export const actExecutor = createExecutor({
    kind: 'act',
    execute: async ({ page, step, target, locator, isModal }) => {
        const s = typedStep(step, 'act');
        await withTarget.waitForReady(locator!, isModal);

        switch (s.action) {
            case 'click':
                await locator!.click();
                break;
            case 'fill':
                if (s.value === undefined) throw new Error('fill requires value');
                await locator!.fill(s.value);
                break;
            case 'press':
                if (s.value === undefined) throw new Error('press requires value');
                await locator!.press(s.value);
                break;
            case 'select':
                if (s.value === undefined) throw new Error('select requires value');
                await locator!.selectOption(s.value);
                break;
        }
        return { ok: true };
    },
});
import type { Page } from '@playwright/test';
import type { Step } from '../journey.js';
import { StepExecutor, StepExecutionResult } from './index.js';
import { BaseStepExecutor } from './BaseStepExecutor.js';

export const actExecutor: StepExecutor = BaseStepExecutor.create({
    kind: 'act',
    execute: async ({ page, step }) => {
        const s = step as Extract<Step, { kind: 'act' }>;
        const target = s.target;
        const locator = BaseStepExecutor.resolveTarget(page, target);
        await BaseStepExecutor.waitForReady(locator, BaseStepExecutor.isModalTarget(target));

        switch (s.action) {
            case 'click':
                await locator.click();
                break;
            case 'fill':
                if (s.value === undefined) throw new Error('fill requires value');
                await locator.fill(s.value);
                break;
            case 'press':
                if (s.value === undefined) throw new Error('press requires value');
                await locator.press(s.value);
                break;
            case 'select':
                if (s.value === undefined) throw new Error('select requires value');
                await locator.selectOption(s.value);
                break;
        }
        return { ok: true };
    },
});
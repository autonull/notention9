import type { Page, Locator } from '@playwright/test';
import type { Target, Step } from './journey.js';

export function resolveTarget(page: Page, target: Target): Locator {
    if ('testId' in target) {
        return page.getByTestId(target.testId);
    }
    if ('role' in target) {
        return page.getByRole(target.role, { name: target.name });
    }
    if ('label' in target) {
        return page.getByLabel(target.label);
    }
    throw new Error('Invalid target');
}

export async function waitForReady(locator: Locator): Promise<void> {
    await locator.waitFor({ state: 'visible', timeout: 10000 });
    await locator.waitFor({ state: 'attached', timeout: 5000 });
}

export async function executeAct(page: Page, step: Step): Promise<void> {
    if (step.kind !== 'act') throw new Error('Not an act step');
    const locator = resolveTarget(page, step.target);
    await waitForReady(locator);

    switch (step.action) {
        case 'click':
            await locator.click();
            break;
        case 'fill':
            if (step.value === undefined) throw new Error('fill requires value');
            await locator.fill(step.value);
            break;
        case 'press':
            if (step.value === undefined) throw new Error('press requires value');
            await locator.press(step.value);
            break;
    }
}
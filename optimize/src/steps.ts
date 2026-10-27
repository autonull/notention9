import type { Page, Locator } from '@playwright/test';
import type { Target, Step } from './journey.js';

function isRegexString(value: string): boolean {
    return value.startsWith('/') && value.endsWith('/');
}

function parseRegexString(value: string): RegExp {
    if (!isRegexString(value)) return new RegExp(value);
    const match = value.match(/^\/(.+)\/([gimuy]*)$/);
    if (match) {
        return new RegExp(match[1], match[2]);
    }
    return new RegExp(value.slice(1, -1));
}

function resolveName(name: string | RegExp): string | RegExp {
    if (typeof name === 'string' && isRegexString(name)) {
        return parseRegexString(name);
    }
    return name;
}

function getModalLocator(page: Page, modalName: string): Locator {
    return page.getByRole('dialog', { name: modalName });
}

function isModalTarget(target: Target): boolean {
    return 'modal' in target && !!target.modal;
}

export function resolveTarget(page: Page, target: Target): Locator {
    const scope = isModalTarget(target)
        ? getModalLocator(page, target.modal!)
        : page;

    if ('testId' in target) {
        return scope.getByTestId(target.testId);
    }
    if ('role' in target) {
        const name = resolveName(target.name);
        return scope.getByRole(target.role, { name });
    }
    if ('label' in target) {
        return scope.getByLabel(target.label);
    }
    throw new Error('Invalid target');
}

export async function waitForReady(locator: Locator, isModal: boolean = false): Promise<void> {
    const timeout = isModal ? 15000 : 10000;
    await locator.waitFor({ state: 'visible', timeout });
    await locator.waitFor({ state: 'attached', timeout: isModal ? 10000 : 5000 });
}

export async function executeAct(page: Page, step: Step): Promise<void> {
    if (step.kind !== 'act') throw new Error('Not an act step');
    const target = step.target as Target;
    const locator = resolveTarget(page, target);
    await waitForReady(locator, isModalTarget(target));

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
        case 'select':
            if (step.value === undefined) throw new Error('select requires value');
            await locator.selectOption(step.value);
            break;
    }
}
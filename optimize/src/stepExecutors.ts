import type { Page, Locator } from '@playwright/test';
import type { Step } from './journey.js';
import { resolveTarget, waitForReady } from './steps.js';
import { resolvePath, deepEqual } from './pathUtils.js';

export interface StepExecutor {
    execute(page: Page, step: Step, consoleEntries?: Array<{ type: string; text: string; location?: string }>): Promise<StepExecutionResult>;
}

export interface StepExecutionResult {
    ok: boolean;
    error?: string;
    ariaSnapshot?: string;
    screenshot?: string;
    stateSnapshot?: unknown;
}

async function getStateSnapshot(page: Page): Promise<unknown> {
    return page.evaluate(() => (globalThis as any).__NOTENTION__?.state?.());
}

async function getAriaSnapshot(page: Page, label: string): Promise<string | undefined> {
    return page.evaluate(() => (globalThis as any).__NOTENTION__?.ariaSnapshot?.(label));
}

export const navigateExecutor: StepExecutor = {
    async execute(page: Page, step: Step): Promise<StepExecutionResult> {
        if (step.kind !== 'navigate') throw new Error('Invalid step for navigateExecutor');
        await page.goto(`#${step.hash}`);
        await page.waitForLoadState('domcontentloaded');
        return { ok: true };
    },
};

export const actExecutor: StepExecutor = {
    async execute(page: Page, step: Step): Promise<StepExecutionResult> {
        if (step.kind !== 'act') throw new Error('Invalid step for actExecutor');
        const { executeAct } = await import('./steps.js');
        await executeAct(page, step);
        return { ok: true };
    },
};

export const assertAriaExecutor: StepExecutor = {
    async execute(page: Page, step: Step): Promise<StepExecutionResult> {
        if (step.kind !== 'assertAria') throw new Error('Invalid step for assertAriaExecutor');
        const locator = resolveTarget(page, step.target);
        await waitForReady(locator);
        const ariaSnapshot = await locator.ariaSnapshot();
        return { ok: true, ariaSnapshot };
    },
};

export const assertStateExecutor: StepExecutor = {
    async execute(page: Page, step: Step): Promise<StepExecutionResult> {
        if (step.kind !== 'assertState') throw new Error('Invalid step for assertStateExecutor');
        const stateSnapshot = await getStateSnapshot(page);
        const value = resolvePath(stateSnapshot, step.path);
        if (!deepEqual(value, step.equals)) {
            throw new Error(`assertState failed: path="${step.path}", expected=${JSON.stringify(step.equals)}, actual=${JSON.stringify(value)}`);
        }
        return { ok: true, stateSnapshot };
    },
};

export const assertNoConsoleErrorsExecutor: StepExecutor = {
    async execute(page: Page, step: Step, consoleEntries: Array<{ type: string; text: string; location?: string }>): Promise<StepExecutionResult> {
        if (step.kind !== 'assertNoConsoleErrors') throw new Error('Invalid step');
        const errors = consoleEntries.filter(e => e.type === 'error');
        if (errors.length > 0) {
            throw new Error(`Console errors found: ${errors.map(e => e.text).join('; ')}`);
        }
        return { ok: true };
    },
};

export const captureExecutor: StepExecutor = {
    async execute(page: Page, step: Step): Promise<StepExecutionResult> {
        if (step.kind !== 'capture') throw new Error('Invalid step for captureExecutor');
        const ariaSnapshot = await getAriaSnapshot(page, step.label);
        const screenshotBuffer = await page.screenshot({ fullPage: false });
        const screenshot = screenshotBuffer.toString('base64');
        const stateSnapshot = await getStateSnapshot(page);
        return { ok: true, ariaSnapshot, screenshot, stateSnapshot };
    },
};

export const scriptExecutor: StepExecutor = {
    async execute(page: Page, step: Step): Promise<StepExecutionResult> {
        if (step.kind !== 'script') throw new Error('Invalid step for scriptExecutor');
        await page.evaluate(step.code);
        return { ok: true };
    },
};

export const waitForStateExecutor: StepExecutor = {
    async execute(page: Page, step: Step): Promise<StepExecutionResult> {
        if (step.kind !== 'waitForState') throw new Error('Invalid step for waitForStateExecutor');
        const timeout = step.timeoutMs ?? 5000;
        const startTime = Date.now();
        let stateSnapshot: unknown;
        let value: unknown;

        while (Date.now() - startTime < timeout) {
            stateSnapshot = await getStateSnapshot(page);
            value = resolvePath(stateSnapshot, step.path);
            if (deepEqual(value, step.equals)) {
                return { ok: true, stateSnapshot };
            }
            await new Promise(r => setTimeout(r, 100));
        }
        // Final check
        stateSnapshot = await getStateSnapshot(page);
        value = resolvePath(stateSnapshot, step.path);
        if (!deepEqual(value, step.equals)) {
            throw new Error(`waitForState timeout: path="${step.path}", expected=${JSON.stringify(step.equals)}, actual=${JSON.stringify(value)}`);
        }
        return { ok: true, stateSnapshot };
    },
};

export const captureAriaExecutor: StepExecutor = {
    async execute(page: Page, step: Step): Promise<StepExecutionResult> {
        if (step.kind !== 'captureAria') throw new Error('Invalid step for captureAriaExecutor');
        const snapshot = await (page as any).accessibility.snapshot({ root: page.mainFrame() });
        let ariaSnapshot = JSON.stringify(snapshot, null, 2);
        const devBridgeSnapshot = await getAriaSnapshot(page, step.label);
        if (devBridgeSnapshot) {
            ariaSnapshot = devBridgeSnapshot;
        }
        const stateSnapshot = await getStateSnapshot(page);
        return { ok: true, ariaSnapshot, stateSnapshot };
    },
};

export const assertAriaSnapshotExecutor: StepExecutor = {
    async execute(page: Page, step: Step): Promise<StepExecutionResult> {
        if (step.kind !== 'assertAriaSnapshot') throw new Error('Invalid step for assertAriaSnapshotExecutor');
        const locator = resolveTarget(page, step.target);
        await waitForReady(locator);
        const actualSnapshot = await locator.ariaSnapshot();
        const actualStr = JSON.stringify(actualSnapshot, null, 2);
        if (!actualStr.includes(step.snapshot)) {
            throw new Error(`assertAriaSnapshot failed: expected snapshot to contain "${step.snapshot}", got: ${actualStr}`);
        }
        return { ok: true, ariaSnapshot: actualStr };
    },
};

export const assertFocusExecutor: StepExecutor = {
    async execute(page: Page, step: Step): Promise<StepExecutionResult> {
        if (step.kind !== 'assertFocus') throw new Error('Invalid step for assertFocusExecutor');
        const locator = resolveTarget(page, step.target);
        await waitForReady(locator);
        const isFocused = await locator.evaluate((el: HTMLElement) => el === el.ownerDocument.activeElement);
        if (!isFocused) {
            throw new Error(`assertFocus failed: element is not focused`);
        }
        return { ok: true };
    },
};

export const assertAccessibleNameExecutor: StepExecutor = {
    async execute(page: Page, step: Step): Promise<StepExecutionResult> {
        if (step.kind !== 'assertAccessibleName') throw new Error('Invalid step for assertAccessibleNameExecutor');
        const locator = resolveTarget(page, step.target);
        await waitForReady(locator);
        const accessibleName = await locator.getAttribute('aria-label') ||
            await locator.getAttribute('aria-labelledby')?.then(id => page.locator(`#${id}`).textContent()) ||
            await locator.textContent() ||
            '';
        const normalizedName = accessibleName.trim().toLowerCase();
        const expectedNormalized = step.expected.trim().toLowerCase();
        if (!normalizedName.includes(expectedNormalized)) {
            throw new Error(`assertAccessibleName failed: expected name to contain "${step.expected}", got: "${accessibleName}"`);
        }
        return { ok: true };
    },
};

export const assertRoleExecutor: StepExecutor = {
    async execute(page: Page, step: Step): Promise<StepExecutionResult> {
        if (step.kind !== 'assertRole') throw new Error('Invalid step for assertRoleExecutor');
        const locator = resolveTarget(page, step.target);
        await waitForReady(locator);
        const actualRole = await locator.getAttribute('role') || 'unknown';
        if (actualRole !== step.expectedRole) {
            throw new Error(`assertRole failed: expected role "${step.expectedRole}", got: "${actualRole}"`);
        }
        return { ok: true };
    },
};

export const seedExecutor: StepExecutor = {
    async execute(): Promise<StepExecutionResult> {
        // Handled before journey execution
        return { ok: true };
    },
};

const executors: Record<string, StepExecutor> = {
    navigate: navigateExecutor,
    act: actExecutor,
    assertAria: assertAriaExecutor,
    assertState: assertStateExecutor,
    assertNoConsoleErrors: assertNoConsoleErrorsExecutor,
    capture: captureExecutor,
    script: scriptExecutor,
    waitForState: waitForStateExecutor,
    captureAria: captureAriaExecutor,
    assertAriaSnapshot: assertAriaSnapshotExecutor,
    assertFocus: assertFocusExecutor,
    assertAccessibleName: assertAccessibleNameExecutor,
    assertRole: assertRoleExecutor,
    seed: seedExecutor,
};

export function getExecutor(kind: Step['kind']): StepExecutor {
    const executor = executors[kind];
    if (!executor) {
        throw new Error(`No executor for step kind: ${kind}`);
    }
    return executor;
}

export function hasExecutor(kind: Step['kind']): boolean {
    return kind in executors;
}
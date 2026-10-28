import type { Page } from '@playwright/test';
import type { Step } from '../journey.js';
import { navigateExecutor } from './navigate.js';
import { actExecutor } from './act.js';
import { assertAriaExecutor } from './assertAria.js';
import { assertStateExecutor } from './assertState.js';
import { assertNoConsoleErrorsExecutor } from './assertNoConsoleErrors.js';
import { captureExecutor } from './capture.js';
import { scriptExecutor } from './script.js';
import { waitForStateExecutor } from './waitForState.js';
import { captureAriaExecutor } from './captureAria.js';
import { assertAriaSnapshotExecutor } from './assertAriaSnapshot.js';
import { assertFocusExecutor } from './assertFocus.js';
import { assertAccessibleNameExecutor } from './assertAccessibleName.js';
import { assertRoleExecutor } from './assertRole.js';
import { seedExecutor } from './seed.js';

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

export { navigateExecutor } from './navigate.js';
export { actExecutor } from './act.js';
export { assertAriaExecutor } from './assertAria.js';
export { assertStateExecutor } from './assertState.js';
export { assertNoConsoleErrorsExecutor } from './assertNoConsoleErrors.js';
export { captureExecutor } from './capture.js';
export { scriptExecutor } from './script.js';
export { waitForStateExecutor } from './waitForState.js';
export { captureAriaExecutor } from './captureAria.js';
export { assertAriaSnapshotExecutor } from './assertAriaSnapshot.js';
export { assertFocusExecutor } from './assertFocus.js';
export { assertAccessibleNameExecutor } from './assertAccessibleName.js';
export { assertRoleExecutor } from './assertRole.js';
export { seedExecutor } from './seed.js';

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
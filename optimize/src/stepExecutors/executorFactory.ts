/**
 * Step Executor Factory
 * 
 * Simplified factory for creating step executors with reduced boilerplate.
 * Provides common imports and type helpers in a single import.
 * 
 * @example
 * ```typescript
 * import { createExecutor, withAriaSnapshot, withTarget } from './executorFactory.js';
 * 
 * export const myExecutor = createExecutor({
 *     kind: 'assertVisible',
 *     execute: async ({ page, step, target, locator, isModal }) => {
 *         await withTarget.waitForReady(locator!, isModal);
 *         return { ok: true };
 *     }
 * });
 * ```
 */

import type { Page, Locator } from '@playwright/test';
import type { Step, Target } from '../journey.js';
import { StepExecutor, StepExecutionResult } from './index.js';
import { BaseStepExecutor } from './BaseStepExecutor.js';

// Re-export commonly used types
export type { StepExecutor, StepExecutionResult, Step, Target, Page, Locator };

// Re-export BaseStepExecutor and its mixins for direct access
export { BaseStepExecutor };
export { withStateSnapshot, withAriaSnapshot, withScreenshot, withTarget, withWaitFor } from './BaseStepExecutor.js';

/**
 * Extracts a typed step from the base Step type.
 * Usage: const s = typedStep(step, 'navigate');
 */
export function typedStep<K extends Step['kind']>(step: Step, kind: K): Extract<Step, { kind: K }> {
    return step as Extract<Step, { kind: K }>;
}

/**
 * Creates a step executor with minimal boilerplate.
 * 
 * @param options - Executor configuration
 * @param options.kind - The step kind this executor handles
 * @param options.execute - Async execute function receiving prepared context
 * @param options.validate - Optional custom validator
 * 
 * @example
 * ```typescript
 * export const navigateExecutor = createExecutor({
 *     kind: 'navigate',
 *     execute: async ({ page, step }) => {
 *         const s = typedStep(step, 'navigate');
 *         await page.goto(`#${s.hash}`);
 *         return { ok: true };
 *     }
 * });
 * ```
 */
export function createExecutor<Kind extends Step['kind']>(options: {
    kind: Kind;
    execute: (context: {
        page: Page;
        step: Step;
        target?: Target;
        locator?: Locator;
        isModal: boolean;
        modalName?: string;
        consoleEntries?: Array<{ type: string; text: string; location?: string }>;
    }) => Promise<StepExecutionResult>;
    validate?: (step: Step) => void;
}): StepExecutor {
    return BaseStepExecutor.create({
        kind: options.kind,
        validate: options.validate,
        execute: options.execute,
    });
}

/**
 * Creates an executor for steps that don't need target resolution.
 * 
 * @example
 * ```typescript
 * export const seedExecutor = createSimpleExecutor({
 *     kind: 'seed',
 *     execute: async () => ({ ok: true });
 * });
 * ```
 */
export function createSimpleExecutor<Kind extends Step['kind']>(options: {
    kind: Kind;
    execute: () => Promise<StepExecutionResult> | StepExecutionResult;
}): StepExecutor {
    return BaseStepExecutor.create({
        kind: options.kind,
        execute: async () => options.execute(),
    });
}
/**
 * BaseStepExecutor - Shared functionality for step executors
 * 
 * Eliminates duplication across 15+ executor files by providing:
 * - Target resolution (resolveTarget)
 * - Wait utilities (waitForReady, waitFor)
 * - State snapshot access (getStateSnapshot)
 * - ARIA snapshot access (getAriaSnapshot)
 * - Step kind validation (validateStepKind)
 * - Modal handling (getModalLocator, isModalTarget)
 * - Common error handling
 * 
 * @example
 * ```typescript
 * const executor = BaseStepExecutor.create({
 *     kind: 'assertVisible',
 *     execute: async ({ page, step, target, locator, isModal }) => {
 *         await BaseStepExecutor.waitForReady(locator, isModal);
 *         return { ok: true };
 *     }
 * });
 * ```
 */

import type { Page, Locator } from '@playwright/test';
import type { Step, Target } from '../journey.js';
import { StepExecutor, StepExecutionResult } from './index.js';
import {
    STEP_VISIBLE_TIMEOUT_MS,
    STEP_ATTACHED_TIMEOUT_MS,
    STEP_MODAL_VISIBLE_TIMEOUT_MS,
    STEP_MODAL_ATTACHED_TIMEOUT_MS,
} from '../constants.js';
import { observeBaseStepExecutor, type BaseStepExecutorEventAttributes, EventSeverity } from '@notention/core';
import { createObservabilityWrapper, type ObservabilityWrapper } from '@notention/core/utils/ObservabilityMixin.js';

export interface BaseExecutorContext {
    page: Page;
    step: Step;
    target?: Target;
    locator?: Locator;
    isModal: boolean;
    modalName?: string;
    consoleEntries?: Array<{ type: string; text: string; location?: string }>;
}

export interface BaseExecutorOptions<StepKind extends Step['kind']> {
    /** The step kind this executor handles (for validation) */
    kind: StepKind;
    /** Optional custom validator for the step */
    validate?: (step: Step) => void;
    /** Execute function with prepared context */
    execute: (context: BaseExecutorContext) => Promise<StepExecutionResult>;
}

/**
 * BaseStepExecutor class providing shared utilities
 */
export class BaseStepExecutor {
    private static readonly observe: ObservabilityWrapper<BaseStepExecutorEventAttributes> = 
        createObservabilityWrapper<BaseStepExecutorEventAttributes>({
            observeFn: observeBaseStepExecutor,
            staticAttrs: { 'stepexecutor.stepKind': 'unknown' },
            errorKey: 'stepexecutor.error',
            durationKey: 'stepexecutor.duration.ms',
            operationKey: 'stepexecutor.operation',
        });

    // --- Target Resolution ---

    /**
     * Check if target is a modal target
     */
    static isModalTarget(target: Target): boolean {
        return BaseStepExecutor.observe.wrap('isModalTarget', {}, () => {
            const result = 'modal' in target && !!target.modal;
            return { result, attrs: { 'stepexecutor.target.type': result ? 'modal' : 'standard' } };
        }, ({ result: _result, attrs }) => ({ ...attrs, 'stepexecutor.target.type': attrs['stepexecutor.target.type'] })).result;
    }

    /**
     * Get modal locator
     */
    static getModalLocator(page: Page, modalName: string): Locator {
        return BaseStepExecutor.observe.wrap('getModalLocator', {}, () => {
            const result = page.getByRole('dialog', { name: modalName });
            return { result, attrs: { 'stepexecutor.target.type': 'modal' } };
        }, ({ result: _result, attrs }) => ({ ...attrs, 'stepexecutor.target.type': attrs['stepexecutor.target.type'] })).result;
    }

    /**
     * Resolve target to locator
     * Handles testId, role, label, and modal scoping
     */
    static resolveTarget(page: Page, target: Target): Locator {
        return BaseStepExecutor.observe.wrap('resolveTarget', {}, () => {
            const isModal = BaseStepExecutor.isModalTarget(target);
            const scope = isModal
                ? BaseStepExecutor.getModalLocator(page, target.modal!)
                : page;

            let result: Locator;
            if ('testId' in target) {
                result = scope.getByTestId(target.testId);
            } else if ('role' in target) {
                const name = BaseStepExecutor.resolveName(target.name);
                result = scope.getByRole(target.role, { name, exact: target.exact });
            } else if ('label' in target) {
                result = scope.getByLabel(target.label);
            } else {
                throw new Error('Invalid target');
            }
            
            return { result, attrs: { 'stepexecutor.target.type': 'testId' in target ? 'testId' : 'role' in target ? 'role' : 'label', 'stepexecutor.isModal': isModal } };
        }, ({ result: _result, attrs }) => ({ ...attrs, 'stepexecutor.target.type': attrs['stepexecutor.target.type'], 'stepexecutor.isModal': attrs['stepexecutor.isModal'] })).result;
    }

    /**
     * Resolve name string or regex
     */
    static resolveName(name: string | RegExp): string | RegExp {
        if (typeof name === 'string' && BaseStepExecutor.isRegexString(name)) {
            return BaseStepExecutor.parseRegexString(name);
        }
        return name;
    }

    /**
     * Check if string is regex format
     */
    static isRegexString(value: string): boolean {
        return value.startsWith('/') && value.endsWith('/');
    }

    /**
     * Parse regex string to RegExp
     */
    static parseRegexString(value: string): RegExp {
        if (!BaseStepExecutor.isRegexString(value)) return new RegExp(value);
        const match = value.match(/^\/(.+)\/([gimuy]*)$/);
        if (match) {
            return new RegExp(match[1], match[2]);
        }
        return new RegExp(value.slice(1, -1));
    }

    // --- Wait Utilities ---

    /**
     * Wait for element to be visible and attached
     * Uses different timeouts for modal vs non-modal
     */
    static async waitForReady(locator: Locator, isModal: boolean = false): Promise<void> {
        return BaseStepExecutor.observe.wrapAsync('waitForReady', { 'stepexecutor.isModal': isModal }, async () => {
            const visibleTimeout = isModal ? STEP_MODAL_VISIBLE_TIMEOUT_MS : STEP_VISIBLE_TIMEOUT_MS;
            const attachedTimeout = isModal ? STEP_MODAL_ATTACHED_TIMEOUT_MS : STEP_ATTACHED_TIMEOUT_MS;
            await locator.waitFor({ state: 'visible', timeout: visibleTimeout });
            await locator.waitFor({ state: 'attached', timeout: attachedTimeout });
        });
    }

    /**
     * Wait for custom condition with timeout
     */
    static async waitFor(
        condition: () => Promise<boolean>,
        timeoutMs: number,
        intervalMs: number = 100
    ): Promise<void> {
        return BaseStepExecutor.observe.wrapAsync('waitFor', {}, async () => {
            const startTime = Date.now();
            while (Date.now() - startTime < timeoutMs) {
                if (await condition()) return;
                await new Promise(r => setTimeout(r, intervalMs));
            }
            throw new Error(`waitFor timeout after ${timeoutMs}ms`);
        });
    }

    // --- State Snapshot ---

    /**
     * Get application state snapshot from page
     */
    static async getStateSnapshot(page: Page): Promise<unknown> {
        return BaseStepExecutor.observe.wrapAsync('getStateSnapshot', {}, async () => {
            const result = await page.evaluate(() => 
                (globalThis as any).__NOTENTION__?.state?.() ?? 
                (globalThis as any).__UISG_SKELETON__?.state?.()
            );
            return result;
        });
    }

    // --- ARIA Snapshot ---

    /**
     * Get ARIA snapshot from page
     */
    static async getAriaSnapshot(page: Page, label: string): Promise<string | undefined> {
        return BaseStepExecutor.observe.wrapAsync('getAriaSnapshot', {}, async () => {
            const result = await page.evaluate(() => (globalThis as any).__NOTENTION__?.ariaSnapshot?.(label));
            return result;
        });
    }

    // --- Validation ---

    /**
     * Validate step kind matches expected
     */
    static validateStepKind(step: Step, expectedKind: Step['kind']): void {
        BaseStepExecutor.observe.wrap('validateStepKind', { 'stepexecutor.stepKind': step.kind }, () => {
            if (step.kind !== expectedKind) {
                throw new Error(`Invalid step for ${expectedKind} executor: got ${step.kind}`);
            }
        });
    }

    /**
     * Take screenshot
     */
    static async takeScreenshot(page: Page, fullPage: boolean = false): Promise<string> {
        return BaseStepExecutor.observe.wrapAsync('takeScreenshot', {}, async () => {
            const buffer = await page.screenshot({ fullPage });
            return buffer.toString('base64');
        });
    }

    // --- Factory ---

    /**
     * Create a StepExecutor with shared utilities
     * 
     * @example
     * ```typescript
     * export const myExecutor = BaseStepExecutor.create({
     *     kind: 'assertVisible',
     *     execute: async ({ page, step, target, locator, isModal }) => {
     *         await BaseStepExecutor.waitForReady(locator, isModal);
     *         return { ok: true };
     *     }
     * });
     * ```
     */
    static create<StepKind extends Step['kind']>(options: BaseExecutorOptions<StepKind>): StepExecutor {
        const { kind, validate, execute } = options;

        return {
            async execute(page: Page, step: Step, consoleEntries?: Array<{ type: string; text: string; location?: string }>): Promise<StepExecutionResult> {
                return BaseStepExecutor.observe.wrapAsync('execute', { 'stepexecutor.stepKind': kind }, async () => {
                    // Validate step kind
                    if (validate) {
                        validate(step);
                    } else {
                        BaseStepExecutor.validateStepKind(step, kind);
                    }

                    // Type guard to narrow step type after validation
                    const isActStep = (s: Step): s is Extract<Step, { kind: 'act' }> => s.kind === 'act';
                    const hasTarget = (s: Step): s is Extract<Step, { target: Target }> => 'target' in s;
                    
                    // Prepare context
                    let isModal = false;
                    let target: Target | undefined;
                    
                    if (isActStep(step)) {
                        isModal = BaseStepExecutor.isModalTarget(step.target);
                        target = step.target;
                    } else if (hasTarget(step)) {
                        isModal = BaseStepExecutor.isModalTarget(step.target);
                        target = step.target;
                    }
                    
                    const locator = target ? BaseStepExecutor.resolveTarget(page, target) : undefined;
                    const modalName = target && isModal ? target.modal : undefined;

                    const context: BaseExecutorContext = {
                        page,
                        step,
                        target,
                        locator,
                        isModal,
                        modalName,
                        consoleEntries,
                    };

                    const result = await execute(context);
                    return result;
                }, (_result) => ({
                    'stepexecutor.target.type': 'none',
                    'stepexecutor.isModal': false,
                }));
            },
        };
    }
}

/**
 * Mixin for executors that need state snapshot access
 */
export const withStateSnapshot = {
    async getStateSnapshot(page: Page): Promise<unknown> {
        return BaseStepExecutor.getStateSnapshot(page);
    },
};

/**
 * Mixin for executors that need ARIA snapshot access
 */
export const withAriaSnapshot = {
    async getAriaSnapshot(page: Page, label: string): Promise<string | undefined> {
        return BaseStepExecutor.getAriaSnapshot(page, label);
    },
};

/**
 * Mixin for executors that need screenshot capture
 */
export const withScreenshot = {
    async takeScreenshot(page: Page, fullPage: boolean = false): Promise<string> {
        return BaseStepExecutor.takeScreenshot(page, fullPage);
    },
};

/**
 * Mixin for executors that operate on targets
 */
export const withTarget = {
    resolveTarget(page: Page, target: Target): Locator {
        return BaseStepExecutor.resolveTarget(page, target);
    },
    isModalTarget(target: Target): boolean {
        return BaseStepExecutor.isModalTarget(target);
    },
    waitForReady(locator: Locator, isModal: boolean): Promise<void> {
        return BaseStepExecutor.waitForReady(locator, isModal);
    },
};

/**
 * Mixin for executors that need wait-for-condition logic
 */
export const withWaitFor = {
    async waitFor(
        condition: () => Promise<boolean>,
        timeoutMs: number,
        intervalMs: number = 100
    ): Promise<void> {
        return BaseStepExecutor.waitFor(condition, timeoutMs, intervalMs);
    },
};
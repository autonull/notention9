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
    // --- Target Resolution ---

    /**
     * Check if target is a modal target
     */
    static isModalTarget(target: Target): boolean {
        return 'modal' in target && !!target.modal;
    }

    /**
     * Get modal locator
     */
    static getModalLocator(page: Page, modalName: string): Locator {
        return page.getByRole('dialog', { name: modalName });
    }

    /**
     * Resolve target to locator
     * Handles testId, role, label, and modal scoping
     */
    static resolveTarget(page: Page, target: Target): Locator {
        const isModal = BaseStepExecutor.isModalTarget(target);
        const scope = isModal
            ? BaseStepExecutor.getModalLocator(page, target.modal!)
            : page;

        if ('testId' in target) {
            return scope.getByTestId(target.testId);
        }
        if ('role' in target) {
            const name = BaseStepExecutor.resolveName(target.name);
            return scope.getByRole(target.role, { name, exact: target.exact });
        }
        if ('label' in target) {
            return scope.getByLabel(target.label);
        }
        throw new Error('Invalid target');
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
        const visibleTimeout = isModal ? STEP_MODAL_VISIBLE_TIMEOUT_MS : STEP_VISIBLE_TIMEOUT_MS;
        const attachedTimeout = isModal ? STEP_MODAL_ATTACHED_TIMEOUT_MS : STEP_ATTACHED_TIMEOUT_MS;
        await locator.waitFor({ state: 'visible', timeout: visibleTimeout });
        await locator.waitFor({ state: 'attached', timeout: attachedTimeout });
    }

    /**
     * Wait for custom condition with timeout
     */
    static async waitFor(
        condition: () => Promise<boolean>,
        timeoutMs: number,
        intervalMs: number = 100
    ): Promise<void> {
        const startTime = Date.now();
        while (Date.now() - startTime < timeoutMs) {
            if (await condition()) return;
            await new Promise(r => setTimeout(r, intervalMs));
        }
        throw new Error(`waitFor timeout after ${timeoutMs}ms`);
    }

    // --- State Snapshot ---

    /**
     * Get application state snapshot from page
     */
    static async getStateSnapshot(page: Page): Promise<unknown> {
        return page.evaluate(() => 
            (globalThis as any).__NOTENTION__?.state?.() ?? 
            (globalThis as any).__UISG_SKELETON__?.state?.()
        );
    }

    /**
     * Get ARIA snapshot from page
     */
    static async getAriaSnapshot(page: Page, label: string): Promise<string | undefined> {
        return page.evaluate(() => (globalThis as any).__NOTENTION__?.ariaSnapshot?.(label));
    }

    // --- Validation ---

    /**
     * Validate step kind matches expected
     */
    static validateStepKind(step: Step, expectedKind: Step['kind']): void {
        if (step.kind !== expectedKind) {
            throw new Error(`Invalid step for ${expectedKind} executor: got ${step.kind}`);
        }
    }

    /**
     * Take screenshot
     */
    static async takeScreenshot(page: Page, fullPage: boolean = false): Promise<string> {
        const buffer = await page.screenshot({ fullPage });
        return buffer.toString('base64');
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

                return execute(context);
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
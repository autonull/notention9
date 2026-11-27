import type { Page } from '@playwright/test';
import type { Step } from '../journey.js';
import { StepExecutor, StepExecutionResult } from './index.js';
import { BaseStepExecutor } from './BaseStepExecutor.js';

export const captureAriaExecutor: StepExecutor = BaseStepExecutor.create({
    kind: 'captureAria',
    execute: async ({ page, step }) => {
        const s = step as Extract<Step, { kind: 'captureAria' }>;
        // Try Playwright's accessibility snapshot first
        const snapshot = await (page as any).accessibility?.snapshot?.();
        let ariaSnapshot = snapshot ? JSON.stringify(snapshot, null, 2) : '';
        // Fall back to dev bridge snapshot if available
        const devBridgeSnapshot = await BaseStepExecutor.getAriaSnapshot(page, s.label);
        if (devBridgeSnapshot) {
            ariaSnapshot = devBridgeSnapshot;
        }
        const stateSnapshot = await BaseStepExecutor.getStateSnapshot(page);
        return { ok: true, ariaSnapshot, stateSnapshot };
    },
});
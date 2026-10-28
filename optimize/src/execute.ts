import type { Page } from '@playwright/test';
import type { JourneySpec, Step } from './journey.js';
import { getExecutor, StepExecutionResult } from './stepExecutors/index.js';

export interface StepResult {
    index: number;
    kind: Step['kind'];
    label?: string;
    startedAt: string;
    durationMs: number;
    ok: boolean;
    error?: string;
    ariaSnapshot?: string;
    screenshot?: string;
    stateSnapshot?: unknown;
}

export interface ExecutionContext {
    page: Page;
    runId: string;
    journey: JourneySpec;
    results: StepResult[];
    consoleEntries: Array<{ type: string; text: string; location?: string }>;
    networkEntries: Array<{ method: string; url: string; status?: number; blocked: boolean }>;
    promptTraces: Array<any>;
    actionTraces: Array<any>;
    assertions: Array<{ id: string; ok: boolean; expected?: unknown; actual?: unknown; message?: string }>;
}

function setupListeners(context: ExecutionContext): void {
    const { page, consoleEntries, networkEntries } = context;

    page.on('console', msg => {
        consoleEntries.push({
            type: msg.type(),
            text: msg.text(),
            location: msg.location().url,
        });
    });

    page.on('request', req => {
        networkEntries.push({
            method: req.method(),
            url: req.url(),
            blocked: false,
        });
    });

    page.on('requestfailed', req => {
        const entry = networkEntries.find(e => e.url === req.url() && e.method === req.method());
        if (entry) entry.blocked = true;
    });

    page.on('response', res => {
        const entry = networkEntries.find(e => e.url === res.url() && e.method === res.request().method());
        if (entry) entry.status = res.status();
    });
}

async function executeStep(
    page: Page,
    step: Step,
    consoleEntries: ExecutionContext['consoleEntries']
): Promise<StepExecutionResult> {
    const executor = getExecutor(step.kind);
    return executor.execute(page, step, consoleEntries);
}

export async function executeJourney(context: ExecutionContext): Promise<void> {
    const { page, journey, results, consoleEntries, assertions } = context;

    setupListeners(context);

    for (let i = 0; i < journey.steps.length; i++) {
        const step = journey.steps[i];
        const startedAt = new Date().toISOString();
        const stepStart = Date.now();

        let result: StepExecutionResult;
        try {
            result = await executeStep(page, step, consoleEntries);
        } catch (e) {
            result = { ok: false, error: e instanceof Error ? e.message : String(e) };
        }

        const durationMs = Date.now() - stepStart;
        results.push({
            index: i,
            kind: step.kind,
            label: 'label' in step ? step.label : undefined,
            startedAt,
            durationMs,
            ok: result.ok,
            error: result.error,
            ariaSnapshot: result.ariaSnapshot,
            screenshot: result.screenshot,
            stateSnapshot: result.stateSnapshot,
        });

        assertions.push({
            id: `${journey.id}:${i}`,
            ok: result.ok,
            message: result.error,
        });
    }
}
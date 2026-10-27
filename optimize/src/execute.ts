import type { Page } from '@playwright/test';
import type { JourneySpec, Step } from './journey.js';
import { executeAct, resolveTarget } from './steps.js';

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

export async function executeJourney(context: ExecutionContext): Promise<void> {
    const { page, journey, results, consoleEntries, networkEntries, promptTraces, actionTraces, assertions } = context;

    // Collect console entries
    page.on('console', msg => {
        consoleEntries.push({
            type: msg.type(),
            text: msg.text(),
            location: msg.location().url,
        });
    });

    // Collect network entries
    page.on('request', req => {
        networkEntries.push({
            method: req.method(),
            url: req.url(),
            blocked: false,
        });
    });

    page.on('requestfailed', req => {
        const entry = networkEntries.find(e => e.url === req.url() && e.method === req.method());
        if (entry) {
            entry.blocked = true;
        }
    });

    page.on('response', res => {
        const entry = networkEntries.find(e => e.url === res.url() && e.method === res.request().method());
        if (entry) {
            entry.status = res.status();
        }
    });

    for (let i = 0; i < journey.steps.length; i++) {
        const step = journey.steps[i];
        const startedAt = new Date().toISOString();
        const stepStart = Date.now();

        let ok = true;
        let error: string | undefined;
        let ariaSnapshot: string | undefined;
        let screenshot: string | undefined;
        let stateSnapshot: unknown;

        try {
            switch (step.kind) {
                case 'navigate': {
                    await page.goto(`#${step.hash}`);
                    await page.waitForLoadState('domcontentloaded');
                    break;
                }
                case 'act': {
                    await executeAct(page, step);
                    break;
                }
                case 'assertAria': {
                    const locator = resolveTarget(page, step.target);
                    await waitForReady(locator);
                    ariaSnapshot = await locator.ariaSnapshot();
                    // Note: actual assertion happens in test via expect().toMatchAriaSnapshot()
                    break;
                }
                case 'assertState': {
                    stateSnapshot = await page.evaluate(() => (globalThis as any).__NOTENTION__?.state?.());
                    const value = resolvePath(stateSnapshot, step.path);
                    if (!deepEqual(value, step.equals)) {
                        throw new Error(`assertState failed: path="${step.path}", expected=${JSON.stringify(step.equals)}, actual=${JSON.stringify(value)}`);
                    }
                    break;
                }
                case 'assertNoConsoleErrors': {
                    const errors = consoleEntries.filter(e => e.type === 'error');
                    if (errors.length > 0) {
                        throw new Error(`Console errors found: ${errors.map(e => e.text).join('; ')}`);
                    }
                    break;
                }
                case 'capture': {
                    ariaSnapshot = await page.evaluate(() => (globalThis as any).__NOTENTION__?.ariaSnapshot?.(step.label));
                    const screenshotBuffer = await page.screenshot({ fullPage: false });
                    screenshot = screenshotBuffer.toString('base64');
                    stateSnapshot = await page.evaluate(() => (globalThis as any).__NOTENTION__?.state?.());
                    break;
                }
                case 'script': {
                    await page.evaluate(step.code);
                    break;
                }
                case 'seed':
                    // Handled before journey execution
                    break;
                case 'waitForState': {
                    const timeout = step.timeoutMs ?? 5000;
                    const startTime = Date.now();
                    while (Date.now() - startTime < timeout) {
                        stateSnapshot = await page.evaluate(() => (globalThis as any).__NOTENTION__?.state?.());
                        const value = resolvePath(stateSnapshot, step.path);
                        if (deepEqual(value, step.equals)) {
                            break;
                        }
                        await new Promise(r => setTimeout(r, 100));
                    }
                    // Final check
                    stateSnapshot = await page.evaluate(() => (globalThis as any).__NOTENTION__?.state?.());
                    const value = resolvePath(stateSnapshot, step.path);
                    if (!deepEqual(value, step.equals)) {
                        throw new Error(`waitForState timeout: path="${step.path}", expected=${JSON.stringify(step.equals)}, actual=${JSON.stringify(value)}`);
                    }
                    break;
                }
            }
        } catch (e) {
            ok = false;
            error = e instanceof Error ? e.message : String(e);
        }

        const durationMs = Date.now() - stepStart;
        results.push({
            index: i,
            kind: step.kind,
            label: 'label' in step ? step.label : undefined,
            startedAt,
            durationMs,
            ok,
            error,
            ariaSnapshot,
            screenshot,
            stateSnapshot,
        });

        if (!ok) {
            assertions.push({ id: `${journey.id}:${i}`, ok: false, message: error });
        } else {
            assertions.push({ id: `${journey.id}:${i}`, ok: true });
        }
    }
}

function resolvePath(obj: unknown, path: string): unknown {
    return path.split('.').reduce((acc: any, part) => {
        if (acc === null || acc === undefined) return undefined;
        const match = part.match(/^(.+)\[(\d+)\]$/);
        if (match) {
            return acc[match[1]]?.[parseInt(match[2], 10)];
        }
        return acc[part];
    }, obj);
}

function deepEqual(a: unknown, b: unknown): boolean {
    if (a === b) return true;
    if (a === null || b === null) return false;
    if (typeof a !== 'object' || typeof b !== 'object') return false;
    if (Array.isArray(a) && Array.isArray(b)) {
        if (a.length !== b.length) return false;
        return a.every((val, i) => deepEqual(val, b[i]));
    }
    const keysA = Object.keys(a as object);
    const keysB = Object.keys(b as object);
    if (keysA.length !== keysB.length) return false;
    return keysA.every(key => deepEqual((a as any)[key], (b as any)[key]));
}

async function waitForReady(locator: any): Promise<void> {
    await locator.waitFor({ state: 'visible', timeout: 10000 });
    await locator.waitFor({ state: 'enabled', timeout: 5000 });
}
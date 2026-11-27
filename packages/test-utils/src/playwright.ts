import { test as base } from '@playwright/test';

/**
 * Playwright fixtures for Notention testing
 * 
 * Provides:
 * - Pre-configured page with console/network capture
 * - Journey execution helpers
 * - Accessibility testing fixtures
 * - Profile registry fixtures
 */

// Journey execution result type (independent of optimize package)
interface JourneyExecutionResult {
    results: Array<{
        index: number;
        kind: string;
        label?: string;
        startedAt: string;
        durationMs: number;
        ok: boolean;
        error?: string;
        ariaSnapshot?: string;
        screenshot?: string;
        stateSnapshot?: unknown;
    }>;
    consoleEntries: Array<{ type: string; text: string; location?: string }>;
    networkEntries: Array<{ method: string; url: string; status?: number; blocked: boolean }>;
}

// Journey spec type (minimal, independent of optimize package)
interface JourneySpec {
    id: string;
    version: number;
    intent: string;
    journeysTouched: string[];
    seed: { notes: unknown[]; settings: Record<string, unknown> };
    steps: Array<{ kind: string; [key: string]: unknown }>;
    teardown?: Array<{ kind: string; [key: string]: unknown }>;
    status: 'draft' | 'ready';
    dimensions?: {
        viewport?: string;
        theme?: string;
        profile?: string;
        context?: string;
        conditions?: string[];
    };
}

// Create fixtures using the base test's built-in fixtures
const test = base.extend<{
    consoleEntries: Array<{ type: string; text: string; location?: string }>;
    networkEntries: Array<{ method: string; url: string; status?: number; blocked: boolean }>;
    assertNoConsoleErrors: () => Promise<void>;
    waitForAppReady: () => Promise<void>;
}>({
    consoleEntries: async ({ page }, use) => {
        const entries: Array<{ type: string; text: string; location?: string }> = [];
        page.on('console', (msg) => {
            entries.push({
                type: msg.type(),
                text: msg.text(),
                location: msg.location().url,
            });
        });
        await use(entries);
    },

    networkEntries: async ({ page }, use) => {
        const entries: Array<{ method: string; url: string; status?: number; blocked: boolean }> = [];
        page.on('request', (req) => {
            entries.push({
                method: req.method(),
                url: req.url(),
                blocked: false,
            });
        });
        page.on('requestfailed', (req) => {
            const entry = entries.find(e => e.url === req.url() && e.method === req.method());
            if (entry) entry.blocked = true;
        });
        page.on('response', (res) => {
            const entry = entries.find(e => e.url === res.url() && e.method === res.request().method());
            if (entry) entry.status = res.status();
        });
        await use(entries);
    },

    assertNoConsoleErrors: async ({ consoleEntries }, use) => {
        const assert = async () => {
            const errors = consoleEntries.filter(e => e.type === 'error');
            if (errors.length > 0) {
                throw new Error(`Console errors found: ${errors.map(e => e.text).join('; ')}`);
            }
        };
        await use(assert);
    },

    waitForAppReady: async ({ page }, use) => {
        const wait = async () => {
            await page.waitForSelector('[data-ready]', { timeout: 60000 });
        };
        await use(wait);
    },
});

export { test };
export { expect } from '@playwright/test';

// Re-export types for consumers
export type { JourneySpec, JourneyExecutionResult };
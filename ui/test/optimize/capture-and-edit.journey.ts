import { test, expect } from '@playwright/test';
import { executeJourney, type ExecutionContext } from '@notention/optimize';
import { getJourney } from '@notention/optimize';
import { seed } from '../support/seed';
import { settle } from '../support/settle';

test('optimize: capture-and-edit', async ({ page }) => {
    const journey = getJourney('capture-and-edit');
    if (!journey) {
        throw new Error('Journey capture-and-edit not found in registry');
    }

    // Inject the runId before the app loads so DevBridge can find it
    const runId = `run_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
    await page.addInitScript((runId) => {
        window.__OPTIMIZE_RUN_ID__ = runId;
    }, runId);

    // Seed the database with the journey's seed data
    await seed(page, {
        notes: journey.seed.notes,
        settings: journey.seed.settings as any,
        hash: 'notes/scene-editor-note',
    });
    await settle(page);

    const context: ExecutionContext = {
        page,
        runId,
        journey,
        results: [],
        consoleEntries: [],
        networkEntries: [],
        promptTraces: [],
        actionTraces: [],
        assertions: [],
    };

    await executeJourney(context);

    // Verify all assertions passed
    const failedAssertions = context.assertions.filter(a => !a.ok);
    expect(failedAssertions).toHaveLength(0);

    // Verify no console errors (except WebSocket which is expected in test env)
    const consoleErrors = context.consoleEntries.filter(e => 
        e.type === 'error' && !e.text.includes('WebSocket') && !e.text.includes('ws://')
    );
    expect(consoleErrors).toHaveLength(0);

    // Verify we have results for all steps
    expect(context.results.length).toBeGreaterThan(0);
});
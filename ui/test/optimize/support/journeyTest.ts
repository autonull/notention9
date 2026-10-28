import { executeJourney, type ExecutionContext } from '@notention/optimize';
import { getJourney } from '@notention/optimize';
import { seed } from '../../support/seed';
import { settle } from '../../support/settle';
import { writeBundle, type EvidenceBundle } from '@notention/optimize/evidence';
import { getEvidenceDir } from '@notention/core';

export async function runJourneyTest(journeyId: string, page: any) {
    const journey = getJourney(journeyId);
    if (!journey) {
        throw new Error(`Journey ${journeyId} not found in registry`);
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

    // Build evidence bundle
    const bundle: EvidenceBundle = {
        runId,
        journeyId: journey.id,
        startedAt: new Date().toISOString(),
        completedAt: new Date().toISOString(),
        status: context.assertions.every(a => a.ok) ? 'passed' : 'failed',
        steps: context.results,
        console: context.consoleEntries,
        network: context.networkEntries,
        promptTraces: context.promptTraces,
        actionTraces: context.actionTraces,
        assertions: context.assertions,
        snapshots: context.results
            .filter(r => r.kind === 'capture' || r.kind === 'captureAria')
            .map(r => ({
                label: r.label || `step-${r.index}`,
                state: r.stateSnapshot ?? {},
                aria: r.ariaSnapshot || '',
                screenshot: r.screenshot ? Buffer.from(r.screenshot, 'base64') : undefined,
            })),
    };

    // Write evidence bundle
    await writeBundle(runId, bundle);
    console.log(`[Optimize] Evidence bundle written for run: ${runId}`);

    // Verify all assertions passed
    const failedAssertions = context.assertions.filter(a => !a.ok);
    if (failedAssertions.length > 0) {
        throw new Error(`${failedAssertions.length} assertion(s) failed`);
    }

    // Verify no console errors (except WebSocket which is expected in test env)
    const consoleErrors = context.consoleEntries.filter(e => 
        e.type === 'error' && !e.text.includes('WebSocket') && !e.text.includes('ws://')
    );
    if (consoleErrors.length > 0) {
        throw new Error(`${consoleErrors.length} console error(s)`);
    }

    // Verify we have results for all steps
    if (context.results.length === 0) {
        throw new Error('No step results recorded');
    }
}
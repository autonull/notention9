import { executeJourney, type ExecutionContext } from '@notention/optimize';
import { getJourney } from '@notention/optimize';
import { seed } from '../../support/seed';
import { settle, settlePreview } from '../../support/settle';
import { writeBundle, type EvidenceBundle } from '@notention/optimize/evidence';

const VIEWPORTS: Record<string, { width: number; height: number }> = {
    'desktop-1440': { width: 1440, height: 900 },
    'mobile-390': { width: 390, height: 844 },
};

const previewFlowId = (journeyId: string) =>
    journeyId.startsWith('uisg.skeleton.') ? journeyId.slice('uisg.skeleton.'.length) : undefined;

const appliedViewport = (journey: { dimensions?: { viewport?: string } }) =>
    process.env.NOTENTION_VIEWPORT ?? journey.dimensions?.viewport;

const appliedTheme = (journey: { dimensions?: { theme?: string } }) =>
    process.env.NOTENTION_THEME ?? journey.dimensions?.theme;

export async function runJourneyTest(journeyId: string, page: any) {
    const journey = getJourney(journeyId);
    if (!journey) {
        throw new Error(`Journey ${journeyId} not found in registry`);
    }

    // Reuse the runner's run id so the recorded path resolves to this bundle.
    const runId = process.env.NOTENTION_OPTIMIZE_RUN_ID
        ?? `run_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
    await page.addInitScript((id: string) => {
        window.__OPTIMIZE_RUN_ID__ = id;
    }, runId);

    const viewport = appliedViewport(journey);
    if (viewport && VIEWPORTS[viewport]) await page.setViewportSize(VIEWPORTS[viewport]);

    const theme = appliedTheme(journey);
    if (theme === 'dark' || theme === 'light') await page.emulateMedia({ colorScheme: theme });

    const flowId = previewFlowId(journeyId);
    if (flowId) {
        const params = new URLSearchParams({ uisg: '1', flow: flowId });
        if (theme) params.set('theme', theme);
        await page.goto(`${process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:4199'}/?${params}`);
        await settlePreview(page);
    } else {
        // Determine initial hash: if journey has seed notes, navigate to first note; otherwise inbox (W10.2)
        const initialHash = journey.seed.notes.length > 0
            ? `notes/${journey.seed.notes[0].id}`
            : 'inbox';

        // Seed the database with the journey's seed data
        await seed(page, {
            notes: journey.seed.notes,
            settings: { ...journey.seed.settings, ...(theme ? { theme } : {}) } as any,
            hash: initialHash,
        });
        await settle(page);
    }

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

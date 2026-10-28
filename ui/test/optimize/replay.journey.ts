import { test, expect } from '@playwright/test';
import { executeJourney, type ExecutionContext } from '@notention/optimize';
import { getJourney } from '@notention/optimize';
import { seed } from '../support/seed';
import { settle } from '../support/settle';
import { writeReplayBundle, type EvidenceBundle, loadBundle, updateFindingStatus } from '@notention/optimize/evidence';
import { getEvidenceDir } from '@notention/core';

async function runReplayTest(runId: string, page: any) {
    const bundle = await loadBundle(runId);
    if (!bundle) {
        throw new Error(`Bundle not found for run: ${runId}`);
    }

    const journey = getJourney(bundle.journeyId);
    if (!journey) {
        throw new Error(`Journey ${bundle.journeyId} not found in registry`);
    }
    if (journey.version !== bundle.journeyId.split('-').pop()) {
        console.warn(`Journey version mismatch: bundle has version for ${bundle.journeyId}, registry has ${journey.version}`);
    }

    await page.addInitScript((runId) => {
        window.__OPTIMIZE_RUN_ID__ = runId;
    }, runId);

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

    const replayBundle: EvidenceBundle = {
        runId: `replay_${runId}`,
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

    await writeReplayBundle(replayBundle.runId, replayBundle);
    console.log(`[Replay] Evidence bundle written for replay: ${replayBundle.runId}`);

    const failedAssertions = context.assertions.filter(a => !a.ok);
    const originalFailed = bundle.assertions.filter(a => !a.ok);

    console.log(`[Replay] Original run had ${originalFailed.length} failed assertions`);
    console.log(`[Replay] Replay run has ${failedAssertions.length} failed assertions`);

    if (originalFailed.length > 0 && failedAssertions.length > 0) {
        const matchingFailures = originalFailed.filter(orig =>
            failedAssertions.some(replay => replay.id === orig.id && !replay.ok)
        );
        if (matchingFailures.length > 0) {
            console.log(`✅ REPRODUCED: ${matchingFailures.length} assertion(s) failed as expected`);
            return { reproduced: true, matchingFailures: matchingFailures.length };
        }
    }

    if (originalFailed.length > 0 && failedAssertions.length === 0) {
        console.log(`✅ VERIFIED FIX: Original failures now pass`);
        // Try to find the finding ID from the original run's findings and mark as verified
        const evidenceDir = await getEvidenceDir();
        const { readFileSync, existsSync } = await import('fs');
        const { join } = await import('path');
        const findingsPath = join(evidenceDir, runId, 'findings.json');
        if (existsSync(findingsPath)) {
            const findings = JSON.parse(readFileSync(findingsPath, 'utf-8'));
            for (const finding of findings) {
                // Match finding by journey and assertion (for assertion-based findings)
                const origAssertionIds = originalFailed.map(a => a.id);
                const matchesAssertion = finding.evidence?.assertions?.some((id: string) => origAssertionIds.includes(id));
                // Match finding by journey and location (for a11y findings)
                const matchesA11y = finding.journey === bundle.journeyId && 
                    finding.location && 
                    finding.status === 'fixed';
                if (matchesAssertion || matchesA11y) {
                    const updated = await updateFindingStatus(runId, finding.id, 'verified', replayBundle.runId);
                    if (updated) {
                        console.log(`✅ Finding ${finding.id} marked as verified`);
                    }
                }
            }
        }
        return { reproduced: false, verifiedFix: true };
    }

    if (originalFailed.length === 0 && failedAssertions.length === 0) {
        console.log(`✅ REPLAY PASSED: Journey passes as expected`);
        // Check for fixed a11y findings that should be marked as verified
        const evidenceDir = await getEvidenceDir();
        const { readFileSync, existsSync } = await import('fs');
        const { join } = await import('path');
        const findingsPath = join(evidenceDir, runId, 'findings.json');
        if (existsSync(findingsPath)) {
            const findings = JSON.parse(readFileSync(findingsPath, 'utf-8'));
            for (const finding of findings) {
                // Mark fixed a11y findings as verified when replay passes
                if (finding.status === 'fixed' && finding.journey === bundle.journeyId) {
                    const updated = await updateFindingStatus(runId, finding.id, 'verified', replayBundle.runId);
                    if (updated) {
                        console.log(`✅ Finding ${finding.id} marked as verified`);
                    }
                }
            }
        }
        return { reproduced: false, verifiedFix: false, passed: true };
    }

    console.log(`❓ UNEXPECTED: New failures or different behavior`);
    return { reproduced: false, unexpected: true, failedAssertions };
}

test('optimize: replay', async ({ page }) => {
    const runId = process.env.NOTENTION_REPLAY_RUN_ID;
    if (!runId) {
        throw new Error('NOTENTION_REPLAY_RUN_ID environment variable required');
    }

    page.on('console', msg => console.log('[BROWSER]', msg.type(), msg.text()));
    page.on('pageerror', err => console.log('[BROWSER ERROR]', err.message));

    const result = await runReplayTest(runId, page);

    if (result.reproduced) {
        console.log('REPRODUCED');
    } else if (result.verifiedFix) {
        console.log('VERIFIED');
    } else if (result.passed) {
        console.log('PASSED');
    } else {
        console.log('UNEXPECTED');
        process.exit(1);
    }
});
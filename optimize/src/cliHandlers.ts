import { loadBundle, verifyReplay, updateFindingStatus } from './replay.js';
import { findFindingById, listFindings } from './findingRepository.js';
import { runOptimizeTest, createRunId } from './runner.js';
import { getJourney, getReadyJourneys } from './registry.js';
import { validateFinding, type Finding } from './finding.js';
import { generateTestFile } from './journeyFileGenerator.js';
import { getKnownJourney } from './knownJourneys.js';
import type { JourneySpec } from './journey.js';
import { writeFileSync, mkdirSync, existsSync, readFileSync, readdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { resolvePath } from './pathUtils.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export interface OptimizeIntent {
    action: 'optimize' | 'reproduce' | 'findings' | 'replay' | 'generate-test' | 'mark-fixed';
    journey?: string;
    target?: string;
    runId?: string;
    findingId?: string;
    json?: boolean;
    a11y?: boolean;
    status?: string;
    commitSha?: string;
    constraints: { privacy?: 'private' | 'public'; noisySpeech?: boolean };
    mode: 'report-only';
}

function isA11yFinding(finding: Finding & { wcagCriteria?: string[] }): finding is Finding & { wcagCriteria: string[] } {
    return finding.id?.startsWith('a11y-') && Array.isArray((finding as any).wcagCriteria);
}

function getReproductionJourneyId(finding: Finding): string {
    return typeof finding.reproduction === 'object' ? finding.reproduction.journeyId : finding.journey;
}

export async function handleOptimize(journeyId: string, allowDraft: boolean, json: boolean, a11y: boolean): Promise<number> {
    const journey = getJourney(journeyId);
    if (!journey) {
        console.error(`Journey "${journeyId}" not found`);
        const readyJourneys = getReadyJourneys().map(j => j.id);
        console.error('Available ready journeys:', readyJourneys.join(', '));
        return 1;
    }
    if (journey.status === 'draft' && !allowDraft) {
        console.error(`Journey "${journeyId}" is a draft. Use --allow-draft to run it.`);
        return 1;
    }

    console.log(`🔍 Running optimization journey: ${journeyId}`);
    const runId = createRunId();

    const { status } = runOptimizeTest({ runId, grep: journeyId });

    if (status === 0) {
        console.log(`✅ Journey passed. Run ID: ${runId}`);
    } else {
        console.log(`❌ Journey failed. Run ID: ${runId}`);
    }
    return status ?? 1;
}

export async function handleReplay(runId: string, json: boolean, a11y: boolean): Promise<number> {
    console.log(`🔁 Replaying run: ${runId}`);

    const bundle = await loadBundle(runId);
    if (!bundle) {
        console.error(`Bundle not found for run: ${runId}`);
        return 1;
    }

    const replayRunId = createRunId('replay');
    const { status } = runOptimizeTest({ runId: replayRunId, originalRunId: runId, grep: 'replay' });

    if (status === 0) {
        console.log(`✅ Replay completed. Replay Run ID: ${replayRunId}`);
    } else {
        console.log(`❌ Replay failed. Replay Run ID: ${replayRunId}`);
    }
    return status ?? 1;
}

export async function handleGenerateTest(findingId: string, json: boolean, a11y: boolean): Promise<number> {
    console.log(`🧪 Generating regression test for finding: ${findingId}`);

    const lookup = await findFindingById(findingId);
    if (!lookup) {
        console.error(`Finding not found: ${findingId}`);
        return 1;
    }

    const { finding, runId: foundRunId } = lookup;
    console.log(`Found finding in run: ${foundRunId}`);

    const reproductionJourneyId = typeof finding.reproduction === 'object'
        ? finding.reproduction.journeyId
        : finding.journey;

    const bundle = await loadBundle(foundRunId);
    if (!bundle) {
        console.error(`Bundle not found for run: ${foundRunId}`);
        return 1;
    }

    const statePath = finding.location;
    let expectedValue: unknown = null;

    for (const snapshot of bundle.snapshots) {
        const value = resolvePath(snapshot.state, statePath);
        if (value !== undefined) {
            expectedValue = value;
            break;
        }
    }

    const originalJourney = getKnownJourney(reproductionJourneyId);
    const steps: any[] = [];

    if (originalJourney) {
        steps.push({ kind: 'seed', notes: originalJourney.seed.notes, settings: originalJourney.seed.settings });
    } else {
        steps.push({ kind: 'seed', notes: [], settings: { theme: 'dark', ontology: [] } });
    }

    if (originalJourney) {
        for (const step of originalJourney.steps) {
            if (step.kind === 'navigate') {
                steps.push(step);
                break;
            }
        }
    } else {
        steps.push({ kind: 'navigate', hash: 'notes/scene-editor-note' });
    }

    const expectAny = { __expectAny: true, type: String };
    steps.push({ kind: 'assertState', path: 'note.id', equals: expectAny });
    steps.push({ kind: 'assertState', path: statePath, equals: expectedValue ?? [] });
    steps.push({ kind: 'assertNoConsoleErrors' });

    const regressionJourney: JourneySpec = {
        id: `regression-${finding.id}`,
        version: 1,
        intent: `Regression test for finding: ${finding.title}`,
        journeysTouched: ['regression', finding.journey],
        seed: originalJourney?.seed ?? { notes: [], settings: { theme: 'dark', ontology: [] } },
        steps,
        status: 'ready',
    };

    const regressionsDir = join(__dirname, '../../ui/test/optimize/regressions');
    if (!existsSync(regressionsDir)) {
        mkdirSync(regressionsDir, { recursive: true });
    }

    const testCode = generateTestFile(regressionJourney);
    const outputPath = join(regressionsDir, `${finding.id}.journey.ts`);
    writeFileSync(outputPath, testCode);

    console.log(`✅ Generated regression test: ${outputPath}`);
    console.log(`Journey ID: ${regressionJourney.id}`);
    console.log(`Status: ${regressionJourney.status}`);
    return 0;
}

export async function handleReproduce(target: string, json: boolean, a11y: boolean): Promise<number> {
    console.log(`🔁 Reproducing: ${target}`);

    const bundle = await loadBundle(target);
    if (bundle) {
        console.log(`🔁 Replaying run: ${target}`);
        const replayRunId = createRunId('replay');
        const { status, runId } = runOptimizeTest({ runId: replayRunId, originalRunId: target, grep: 'replay' });

        if (status === 0) {
            console.log(`✅ Replay completed. Replay Run ID: ${runId}`);
            const verification = await verifyReplay(target, `replay_${target}`);
            if (verification.reproduced) console.log('REPRODUCED');
            else if (verification.verifiedFix) console.log('VERIFIED');
            else if (verification.passed) console.log('PASSED');
            else console.log('UNEXPECTED');
        } else {
            console.log(`❌ Replay failed. Replay Run ID: ${runId}`);
        }
        return status ?? 1;
    }

    console.log(`🔁 Reproducing finding: ${target}`);
    const lookup = await findFindingById(target);
    if (!lookup) {
        console.error(`Finding not found: ${target}`);
        return 1;
    }

    const { finding, runId: foundRunId } = lookup;
    console.log(`Found finding in run: ${foundRunId}`);
    console.log(`Journey: ${getReproductionJourneyId(finding)}, Version: ${typeof finding.reproduction === 'object' ? finding.reproduction.version : 1}`);

    const replayBundle = await loadBundle(foundRunId);
    if (!replayBundle) {
        console.error(`Bundle not found for run: ${foundRunId}`);
        return 1;
    }

    const replayRunId = createRunId('replay');
    const { status, runId } = runOptimizeTest({ runId: replayRunId, originalRunId: foundRunId, grep: 'replay' });

    if (status === 0) {
        console.log(`✅ Reproduction completed. Replay Run ID: ${runId}`);
        const verification = await verifyReplay(foundRunId, `replay_${foundRunId}`);
        if (verification.reproduced) console.log('REPRODUCED');
        else if (verification.verifiedFix) console.log('VERIFIED');
        else if (verification.passed) console.log('PASSED');
        else console.log('UNEXPECTED');
    } else {
        console.log(`❌ Reproduction failed. Replay Run ID: ${runId}`);
    }
    return status ?? 1;
}

export async function handleMarkFixed(findingId: string, commitSha: string, json: boolean, a11y: boolean): Promise<number> {
    console.log(`🔧 Marking finding as fixed: ${findingId}`);

    const lookup = await findFindingById(findingId);
    if (!lookup) {
        console.error(`Finding not found: ${findingId}`);
        return 1;
    }

    const { runId: foundRunId } = lookup;
    console.log(`Found finding in run: ${foundRunId}`);
    const sha = commitSha || 'manual';
    const updated = await updateFindingStatus(foundRunId, findingId, 'fixed', sha);
    if (updated) {
        console.log(`✅ Finding ${findingId} marked as fixed (commit: ${sha})`);
        return 0;
    } else {
        console.error(`Failed to mark finding as fixed`);
        return 1;
    }
}

export async function handleFindings(json: boolean, a11y: boolean, status?: string): Promise<number> {
    const findings = await listFindings(status);

    if (json) {
        console.log(JSON.stringify(findings, null, 2));
        return 0;
    }

    if (a11y) {
        console.log('Accessibility findings:');
        for (const finding of findings) {
            if (isA11yFinding(finding)) {
                console.log(`  [${finding.severity.toUpperCase()}] ${finding.title}`);
                console.log(`    Run: ${finding.runId}`);
                console.log(`    Location: ${finding.location}`);
                console.log(`    WCAG: ${finding.wcagCriteria?.join(', ') || 'N/A'}`);
                console.log(`    Impact: ${finding.userImpact}`);
                console.log(`    Fix: ${finding.proposedFix}`);
                console.log(`    Status: ${finding.status || 'open'}`);
                console.log();
            }
        }
        return 0;
    }

    console.log('Findings:');
    for (const finding of findings) {
        console.log(`  [${finding.id}] ${finding.title}`);
        console.log(`    Run: ${finding.runId}`);
        console.log(`    Journey: ${finding.journey}`);
        console.log(`    Location: ${finding.location}`);
        console.log(`    Severity: ${finding.severity}`);
        console.log(`    Status: ${finding.status || 'open'}`);
        if (finding.fixedAt) console.log(`    Fixed: ${finding.fixedAt} (${finding.fixedBy})`);
        if (finding.verifiedAt) console.log(`    Verified: ${finding.verifiedAt} (run: ${finding.verifiedRunId})`);
        console.log();
    }

    if (status) {
        console.log(`Filtered by status: ${status}`);
    }
    console.log(`Total: ${findings.length} finding(s)`);
    return 0;
}
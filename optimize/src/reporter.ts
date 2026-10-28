import { writeFileSync, mkdirSync, existsSync, readFileSync } from 'fs';
import { join } from 'path';
import type { EvidenceBundle } from './evidence.js';
import { getEvidenceDir } from '@notention/core';
import { generateA11yFindingsFromBundle, type A11yFinding } from './a11y.js';
import { validateFinding, type Finding } from './finding.js';

function toFinding(a11yFinding: A11yFinding, bundle: EvidenceBundle): Finding {
    return {
        id: a11yFinding.id,
        title: a11yFinding.title,
        journey: a11yFinding.journey,
        location: a11yFinding.location,
        severity: a11yFinding.severity === 'critical' ? 'high' : a11yFinding.severity === 'major' ? 'high' : a11yFinding.severity === 'minor' ? 'medium' : 'low',
        confidence: a11yFinding.confidence,
        evidence: {
            runId: bundle.runId,
            assertions: a11yFinding.evidence,
            snapshots: bundle.snapshots.map(s => s.label),
        },
        reproduction: {
            journeyId: bundle.journeyId,
            version: 1,
            bundle: bundle.runId,
        },
        affectedLayer: a11yFinding.affectedLayer.map(l => l === 'agent' ? 'network' : l) as Array<'ui' | 'prompt' | 'core' | 'network'>,
        userImpact: a11yFinding.userImpact,
        proposedVerification: a11yFinding.verification,
        status: 'open',
    };
}

async function writeSnapshots(runDir: string, snapshots: EvidenceBundle['snapshots']): Promise<void> {
    const stateDir = join(runDir, 'state');
    const ariaDir = join(runDir, 'aria');
    const shotsDir = join(runDir, 'shots');
    await Promise.all([
        mkdirSync(stateDir, { recursive: true }),
        mkdirSync(ariaDir, { recursive: true }),
        mkdirSync(shotsDir, { recursive: true }),
    ]);

    for (const snapshot of snapshots) {
        writeFileSync(join(stateDir, `${snapshot.label}.json`), JSON.stringify(snapshot.state, null, 2));
        writeFileSync(join(ariaDir, `${snapshot.label}.yml`), snapshot.aria);
        if (snapshot.screenshot) {
            writeFileSync(join(shotsDir, `${snapshot.label}.png`), snapshot.screenshot);
        }
    }
}

async function writeBaseBundle(runDir: string, bundle: EvidenceBundle): Promise<void> {
    writeFileSync(join(runDir, 'bundle.json'), JSON.stringify(bundle, null, 2));
    const consoleLines = bundle.console.map(c => JSON.stringify(c)).join('\n');
    writeFileSync(join(runDir, 'console.jsonl'), consoleLines);
    await writeSnapshots(runDir, bundle.snapshots);
}

export async function writeBundle(runId: string, bundle: EvidenceBundle): Promise<void> {
    const outputDir = await getEvidenceDir();
    const runDir = join(outputDir, runId);

    if (!existsSync(runDir)) {
        mkdirSync(runDir, { recursive: true });
    }

    // Generate a11y findings from bundle and convert to Findings with status: 'open'
    const a11yFindings = generateA11yFindingsFromBundle(bundle);
    const findings = a11yFindings.map(f => toFinding(f, bundle));

    await writeBaseBundle(runDir, bundle);

    // Write findings.json (include a11y findings with lifecycle)
    writeFileSync(join(runDir, 'findings.json'), JSON.stringify(findings, null, 2));

    // Write index.jsonl for fast finding lookup
    const indexPath = join(outputDir, 'index.jsonl');
    const indexLines = findings.map(f => JSON.stringify({ type: 'finding', runId, finding: f })).join('\n');
    if (indexLines) {
        const existingIndex = existsSync(indexPath) ? readFileSync(indexPath, 'utf-8') : '';
        writeFileSync(indexPath, existingIndex + (existingIndex ? '\n' : '') + indexLines + '\n');
    }

    console.log(`[Optimize] Evidence bundle written to: ${runDir}`);
    if (findings.length > 0) {
        console.log(`[A11y] Generated ${findings.length} accessibility findings (status: open)`);
    }
}

export async function writeReplayBundle(runId: string, bundle: EvidenceBundle): Promise<void> {
    const outputDir = await getEvidenceDir();
    const runDir = join(outputDir, runId);

    if (!existsSync(runDir)) {
        mkdirSync(runDir, { recursive: true });
    }

    await writeBaseBundle(runDir, bundle);

    console.log(`[Replay] Evidence bundle written to: ${runDir}`);
}
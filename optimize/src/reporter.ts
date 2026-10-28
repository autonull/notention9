import { writeFileSync, mkdirSync, existsSync } from 'fs';
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

export async function writeBundle(runId: string, bundle: EvidenceBundle): Promise<void> {
    const outputDir = await getEvidenceDir();
    const runDir = join(outputDir, runId);

    if (!existsSync(runDir)) {
        mkdirSync(runDir, { recursive: true });
    }

    // Generate a11y findings from bundle and convert to Findings with status: 'open'
    const a11yFindings = generateA11yFindingsFromBundle(bundle);
    const findings = a11yFindings.map(f => toFinding(f, bundle));

    // Write bundle.json
    writeFileSync(join(runDir, 'bundle.json'), JSON.stringify(bundle, null, 2));

    // Write findings.json (include a11y findings with lifecycle)
    writeFileSync(join(runDir, 'findings.json'), JSON.stringify(findings, null, 2));

    // Write console.jsonl
    const consoleLines = bundle.console.map(c => JSON.stringify(c)).join('\n');
    writeFileSync(join(runDir, 'console.jsonl'), consoleLines);

    // Write state, aria, shots
    for (const snapshot of bundle.snapshots) {
        const stateDir = join(runDir, 'state');
        const ariaDir = join(runDir, 'aria');
        const shotsDir = join(runDir, 'shots');
        if (!existsSync(stateDir)) mkdirSync(stateDir, { recursive: true });
        if (!existsSync(ariaDir)) mkdirSync(ariaDir, { recursive: true });
        if (!existsSync(shotsDir)) mkdirSync(shotsDir, { recursive: true });

        writeFileSync(join(stateDir, `${snapshot.label}.json`), JSON.stringify(snapshot.state, null, 2));
        writeFileSync(join(ariaDir, `${snapshot.label}.yml`), snapshot.aria);
        if (snapshot.screenshot) {
            writeFileSync(join(shotsDir, `${snapshot.label}.png`), snapshot.screenshot);
        }
    }

    console.log(`[Optimize] Evidence bundle written to: ${runDir}`);
    if (findings.length > 0) {
        console.log(`[A11y] Generated ${findings.length} accessibility findings (status: open)`);
    }
}
import { writeFileSync, existsSync, readFileSync } from 'fs';
import { join } from 'path';
import type { EvidenceBundle } from './evidence.js';
import { getEvidenceDir } from '@notention/core';
import { generateA11yFindingsFromBundle, type A11yFinding } from './a11y.js';
import { validateFinding, type Finding } from './finding.js';
import { writeBundleArtifacts, writeIndexEntry } from './bundleWriter.js';

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

    // Generate a11y findings from bundle and convert to Findings with status: 'open'
    const a11yFindings = generateA11yFindingsFromBundle(bundle);
    const findings = a11yFindings.map(f => toFinding(f, bundle));

    // Write artifacts
    writeBundleArtifacts({ runDir, bundle });

    // Write findings.json (include a11y findings with lifecycle)
    writeFileSync(join(runDir, 'findings.json'), JSON.stringify(findings, null, 2));

    // Write index.jsonl for fast finding lookup
    const indexPath = join(outputDir, 'index.jsonl');
    writeIndexEntry(indexPath, runId, findings);

    console.log(`[Optimize] Evidence bundle written to: ${runDir}`);
    if (findings.length > 0) {
        console.log(`[A11y] Generated ${findings.length} accessibility findings (status: open)`);
    }
}

export async function writeReplayBundle(runId: string, bundle: EvidenceBundle): Promise<void> {
    const outputDir = await getEvidenceDir();
    const runDir = join(outputDir, runId);

    // Write bundle.json only (no a11y findings generation for replay runs)
    writeBundleArtifacts({ runDir, bundle });

    console.log(`[Replay] Evidence bundle written to: ${runDir}`);
}
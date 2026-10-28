import { writeFileSync, mkdirSync, existsSync } from 'fs';
import { join } from 'path';
import type { EvidenceBundle } from './evidence.js';
import { getEvidenceDir } from '@notention/core';

export async function writeBundle(runId: string, bundle: EvidenceBundle): Promise<void> {
    const outputDir = await getEvidenceDir();
    const runDir = join(outputDir, runId);

    if (!existsSync(runDir)) {
        mkdirSync(runDir, { recursive: true });
    }

    // Write bundle.json
    writeFileSync(join(runDir, 'bundle.json'), JSON.stringify(bundle, null, 2));

    // Write findings.json (empty for now, derived later)
    writeFileSync(join(runDir, 'findings.json'), JSON.stringify([], null, 2));

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
}
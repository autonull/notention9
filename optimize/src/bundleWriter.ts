import { writeFileSync, mkdirSync, existsSync, readFileSync } from 'fs';
import { join } from 'path';
import type { EvidenceBundle } from './evidence.js';

export interface BundleWriteOptions {
    runDir: string;
    bundle: EvidenceBundle;
    writeState?: boolean;
    writeAria?: boolean;
    writeShots?: boolean;
}

export function writeBundleArtifacts({ runDir, bundle, writeState = true, writeAria = true, writeShots = true }: BundleWriteOptions): void {
    if (!existsSync(runDir)) {
        mkdirSync(runDir, { recursive: true });
    }

    // Write bundle.json
    writeFileSync(join(runDir, 'bundle.json'), JSON.stringify(bundle, null, 2));

    // Write console.jsonl
    const consoleLines = bundle.console.map(c => JSON.stringify(c)).join('\n');
    writeFileSync(join(runDir, 'console.jsonl'), consoleLines);

    if (!writeState && !writeAria && !writeShots) {
        return;
    }

    // Write state, aria, shots
    for (const snapshot of bundle.snapshots) {
        if (writeState) {
            const stateDir = join(runDir, 'state');
            if (!existsSync(stateDir)) mkdirSync(stateDir, { recursive: true });
            writeFileSync(join(stateDir, `${snapshot.label}.json`), JSON.stringify(snapshot.state, null, 2));
        }
        if (writeAria) {
            const ariaDir = join(runDir, 'aria');
            if (!existsSync(ariaDir)) mkdirSync(ariaDir, { recursive: true });
            writeFileSync(join(ariaDir, `${snapshot.label}.yml`), snapshot.aria);
        }
        if (writeShots && snapshot.screenshot) {
            const shotsDir = join(runDir, 'shots');
            if (!existsSync(shotsDir)) mkdirSync(shotsDir, { recursive: true });
            writeFileSync(join(shotsDir, `${snapshot.label}.png`), snapshot.screenshot);
        }
    }
}

export function writeIndexEntry(indexPath: string, runId: string, findings: Array<{ id: string }>): void {
    if (findings.length === 0) return;

    const indexLines = findings.map(f => JSON.stringify({ type: 'finding', runId, finding: f })).join('\n');
    const existingIndex = existsSync(indexPath) ? readFileSync(indexPath, 'utf-8') : '';
    writeFileSync(indexPath, existingIndex + (existingIndex ? '\n' : '') + indexLines + '\n');
}
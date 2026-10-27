import { FullConfig, FullResult, TestCase, TestResult } from '@playwright/test/reporter';
import { writeFileSync, mkdirSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import type { EvidenceBundle } from './evidence.js';
import { getEvidenceDir } from '@notention/core';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export class OptimizeReporter {
    private bundles: Map<string, EvidenceBundle> = new Map();
    private outputDir: string;

    constructor() {
        this.outputDir = getEvidenceDir();
    }

    onTestEnd(test: TestCase, result: TestResult): void {
        if (!test.title.includes('optimize:')) return;

        // Extract runId from test annotations or use a default
        const runId = (test as any).runId || `run_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;

        // Build bundle from test fixtures (attached via testInfo)
        const testInfo = (test as any)._testInfo;
        if (!testInfo) return;

        // This is a simplified version - real implementation would pull from fixtures
        console.log(`[OptimizeReporter] Test ended: ${test.title}, runId: ${runId}`);
    }

    onEnd(result: FullResult): void {
        // Write index.jsonl
        const indexPath = join(this.outputDir, 'index.jsonl');
        // In a real implementation, we'd write each bundle's summary here
    }
}

export function writeBundle(runId: string, bundle: EvidenceBundle): void {
    const outputDir = getEvidenceDir();
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
        // screenshot would be written as binary
    }
}
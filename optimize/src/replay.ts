import type { EvidenceBundle } from './evidence.js';
import type { JourneySpec } from './journey.js';
import { readFileSync, existsSync, writeFileSync, mkdirSync } from 'fs';
import { join } from 'path';
import { getEvidenceDir } from '@notention/core';
import { type Finding, validateFinding, markVerified, markFixed } from './finding.js';

export async function loadBundle(runId: string): Promise<EvidenceBundle | null> {
    const bundlePath = join(await getEvidenceDir(), runId, 'bundle.json');
    if (!existsSync(bundlePath)) return null;
    return JSON.parse(readFileSync(bundlePath, 'utf-8'));
}

export interface ReplayRequest {
    runId: string;
    journeyId: string;
    version: number;
    seed: JourneySpec['seed'];
    steps: Array<{ index: number; kind: string; label?: string; startedAt: string; durationMs: number; ok: boolean; error?: string; ariaSnapshot?: string; screenshot?: string; stateSnapshot?: unknown }>;
}

export async function createReplayRequest(runId: string): Promise<ReplayRequest | null> {
    const bundle = await loadBundle(runId);
    if (!bundle) return null;

    return {
        runId,
        journeyId: bundle.journeyId,
        version: 1,
        seed: bundle.steps.find(s => s.kind === 'seed')?.kind === 'seed'
            ? { notes: (bundle.steps.find(s => s.kind === 'seed') as any).notes, settings: (bundle.steps.find(s => s.kind === 'seed') as any).settings }
            : { notes: [], settings: {} },
        steps: bundle.steps,
    };
}

export function planReplay(bundle: EvidenceBundle): { command: string; env: Record<string, string> } {
    return {
        command: `pnpm optimize --replay ${bundle.runId}`,
        env: {
            NOTENTION_REPORT_ONLY: '1',
        },
    };
}

export interface ReplayResult {
    runId: string;
    originalRunId: string;
    reproduced: boolean;
    verifiedFix: boolean;
    passed: boolean;
    matchingFailures: number;
    unexpected: boolean;
    failedAssertions: Array<{ id: string; ok: boolean; message?: string }>;
}

export async function verifyReplay(originalRunId: string, replayRunId: string): Promise<ReplayResult> {
    const originalBundle = await loadBundle(originalRunId);
    const replayBundle = await loadBundle(replayRunId);

    if (!originalBundle || !replayBundle) {
        throw new Error('Bundle not found for verification');
    }

    const originalFailed = originalBundle.assertions.filter(a => !a.ok);
    const replayFailed = replayBundle.assertions.filter(a => !a.ok);

    const matchingFailures = originalFailed.filter(orig =>
        replayFailed.some(replay => replay.id === orig.id && !replay.ok)
    );

    return {
        runId: replayRunId,
        originalRunId,
        reproduced: originalFailed.length > 0 && matchingFailures.length > 0,
        verifiedFix: originalFailed.length > 0 && replayFailed.length === 0,
        passed: originalFailed.length === 0 && replayFailed.length === 0,
        matchingFailures: matchingFailures.length,
        unexpected: (originalFailed.length === 0 && replayFailed.length > 0) ||
                    (originalFailed.length > 0 && matchingFailures.length === 0 && replayFailed.length > 0),
        failedAssertions: replayFailed,
    };
}

export async function updateFindingStatus(originalRunId: string, findingId: string, status: 'verified', verifiedRunId: string): Promise<boolean>;
export async function updateFindingStatus(originalRunId: string, findingId: string, status: 'fixed', commitSha: string): Promise<boolean>;
export async function updateFindingStatus(originalRunId: string, findingId: string, status: 'verified' | 'fixed', verifiedRunIdOrCommitSha: string): Promise<boolean> {
    const evidenceDir = await getEvidenceDir();
    const findingsPath = join(evidenceDir, originalRunId, 'findings.json');

    if (!existsSync(findingsPath)) {
        return false;
    }

    const findings = JSON.parse(readFileSync(findingsPath, 'utf-8'));
    const findingIndex = findings.findIndex((f: any) => f.id === findingId);

    if (findingIndex === -1) {
        return false;
    }

    const finding = validateFinding(findings[findingIndex]);
    let updatedFinding: Finding;
    if (status === 'verified') {
        updatedFinding = markVerified(finding, verifiedRunIdOrCommitSha);
    } else {
        updatedFinding = markFixed(finding, verifiedRunIdOrCommitSha);
    }
    findings[findingIndex] = updatedFinding;

    writeFileSync(findingsPath, JSON.stringify(findings, null, 2));
    
    // Also update index.jsonl if it exists
    const indexPath = join(evidenceDir, 'index.jsonl');
    if (existsSync(indexPath)) {
        const lines = readFileSync(indexPath, 'utf-8').trim().split('\n').filter(Boolean);
        const updatedLines = lines.map(line => {
            const entry = JSON.parse(line);
            if (entry.type === 'finding' && entry.finding.id === findingId) {
                entry.finding = updatedFinding;
                return JSON.stringify(entry);
            }
            return line;
        });
        writeFileSync(indexPath, updatedLines.join('\n') + '\n');
    }
    
    return true;
}
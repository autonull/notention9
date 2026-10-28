import { getEvidenceDir } from '@notention/core';
import { readFileSync, existsSync, readdirSync } from 'fs';
import { join } from 'path';
import { validateFinding, type Finding } from './finding.js';

export interface FindingLookupResult {
    finding: Finding;
    runId: string;
}

export async function findFindingById(findingId: string): Promise<FindingLookupResult | null> {
    const evidenceDir = await getEvidenceDir();

    if (!existsSync(evidenceDir)) {
        return null;
    }

    // Try index.jsonl first for fast lookup
    const indexPath = join(evidenceDir, 'index.jsonl');
    if (existsSync(indexPath)) {
        const lines = readFileSync(indexPath, 'utf-8').trim().split('\n').filter(Boolean);
        // Search from most recent to oldest
        for (let i = lines.length - 1; i >= 0; i--) {
            const entry = JSON.parse(lines[i]);
            if (entry.type === 'finding' && entry.finding.id === findingId) {
                return { finding: validateFinding(entry.finding), runId: entry.runId };
            }
        }
    }

    // Fallback: scan all findings.json files (most recent first)
    const runDirs = readdirSync(evidenceDir, { withFileTypes: true })
        .filter(d => d.isDirectory() && d.name.startsWith('run_'))
        .map(d => d.name)
        .sort()
        .reverse();

    for (const runId of runDirs) {
        const findingsPath = join(evidenceDir, runId, 'findings.json');
        if (existsSync(findingsPath)) {
            const findings = JSON.parse(readFileSync(findingsPath, 'utf-8'));
            const finding = findings.find((f: any) => f.id === findingId);
            if (finding) {
                return { finding: validateFinding(finding), runId };
            }
        }
    }

    return null;
}

export async function listFindings(status?: string): Promise<Array<Finding & { runId: string }>> {
    const evidenceDir = await getEvidenceDir();

    if (!existsSync(evidenceDir)) {
        return [];
    }

    const runDirs = readdirSync(evidenceDir, { withFileTypes: true })
        .filter(d => d.isDirectory() && d.name.startsWith('run_'))
        .map(d => d.name);

    if (runDirs.length === 0) {
        return [];
    }

    const allFindings = runDirs.flatMap(runId => {
        const findingsPath = join(evidenceDir, runId, 'findings.json');
        if (existsSync(findingsPath)) {
            const findings = JSON.parse(readFileSync(findingsPath, 'utf-8'));
            return findings.map((f: any) => ({ ...f, runId }));
        }
        return [];
    });

    if (status) {
        return allFindings.filter(f => f.status === status);
    }

    return allFindings;
}
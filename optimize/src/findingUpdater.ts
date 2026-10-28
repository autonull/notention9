import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { join } from 'path';
import { getEvidenceDir } from '@notention/core';
import { validateFinding, type Finding, markFixed, markVerified } from './finding.js';

export async function updateFindingStatus(
    originalRunId: string,
    findingId: string,
    status: 'verified',
    verifiedRunId: string
): Promise<boolean>;
export async function updateFindingStatus(
    originalRunId: string,
    findingId: string,
    status: 'fixed',
    commitSha: string
): Promise<boolean>;
export async function updateFindingStatus(
    originalRunId: string,
    findingId: string,
    status: 'verified' | 'fixed',
    verifiedRunIdOrCommitSha: string
): Promise<boolean> {
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
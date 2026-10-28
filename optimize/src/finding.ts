import { FindingSchema, type FindingStatus, normalizeSeverity, normalizeEvidence, normalizeReproduction } from './findingSchemas.js';
import { createHash } from 'node:crypto';

export type { FindingStatus };

export interface Finding {
    id: string;
    title: string;
    journey: string;
    location: string;
    severity: 'low' | 'medium' | 'high';
    confidence: 'low' | 'medium' | 'high';
    evidence: { runId: string; assertions: string[]; snapshots: string[] } | string[];
    reproduction: { journeyId: string; version: number; bundle: string } | string;
    affectedLayer: Array<'ui' | 'prompt' | 'core' | 'network' | 'agent'>;
    userImpact: string;
    proposedVerification: string;
    proposedFix?: string;
    status: FindingStatus;
    fixedAt?: string;
    fixedBy?: string;
    verifiedAt?: string;
    verifiedRunId?: string;
}

export { FindingSchema } from './findingSchemas.js';

export function validateFinding(finding: unknown): Finding {
    const parsed = FindingSchema.parse(finding);
    
    // Normalize the finding to the new format
    return {
        ...parsed,
        severity: normalizeSeverity(parsed.severity),
        evidence: normalizeEvidence(parsed.evidence, parsed.id),
        reproduction: normalizeReproduction(parsed.reproduction, parsed.id),
        proposedVerification: parsed.proposedVerification ?? parsed.proposedFix ?? 'Run journey with assertState on the failing path',
        status: parsed.status ?? 'open',
    };
}

export function deriveFindingId(journeyId: string, version: number, assertionId: string): string {
    const hash = createHash('sha256').update(`${journeyId}:${version}:${assertionId}`).digest('hex').slice(0, 12);
    return `fnd_${hash}`;
}

export function markFixed(finding: Finding, commitSha: string): Finding {
    const { verifiedAt, verifiedRunId, ...rest } = finding;
    return {
        ...rest,
        status: 'fixed',
        fixedAt: new Date().toISOString(),
        fixedBy: commitSha,
    };
}

export function markVerified(finding: Finding, runId: string): Finding {
    return {
        ...finding,
        status: 'verified',
        verifiedAt: new Date().toISOString(),
        verifiedRunId: runId,
    };
}
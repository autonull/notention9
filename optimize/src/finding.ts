import { z } from 'zod';

export type FindingStatus = 'open' | 'fixed' | 'verified';

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

const EvidenceSchema = z.union([
    z.object({ runId: z.string(), assertions: z.array(z.string()), snapshots: z.array(z.string()) }),
    z.array(z.string()),
]);

const ReproductionSchema = z.union([
    z.object({ journeyId: z.string(), version: z.number(), bundle: z.string() }),
    z.string(),
]);

export const FindingSchema = z.object({
    id: z.string(),
    title: z.string(),
    journey: z.string(),
    location: z.string(),
    severity: z.enum(['low', 'medium', 'high', 'critical', 'major', 'minor', 'warning']),
    confidence: z.enum(['low', 'medium', 'high']),
    evidence: EvidenceSchema,
    reproduction: ReproductionSchema,
    affectedLayer: z.array(z.enum(['ui', 'prompt', 'core', 'network', 'agent'])),
    userImpact: z.string(),
    proposedVerification: z.string().optional(),
    proposedFix: z.string().optional(),
    status: z.enum(['open', 'fixed', 'verified']).optional(),
    fixedAt: z.string().optional(),
    fixedBy: z.string().optional(),
    verifiedAt: z.string().optional(),
    verifiedRunId: z.string().optional(),
});

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

function normalizeSeverity(severity: string): 'low' | 'medium' | 'high' {
    if (severity === 'critical' || severity === 'major') return 'high';
    if (severity === 'minor' || severity === 'warning') return 'low';
    return severity as 'low' | 'medium' | 'high';
}

function normalizeEvidence(evidence: any, findingId: string): { runId: string; assertions: string[]; snapshots: string[] } {
    if (Array.isArray(evidence)) {
        return { runId: '', assertions: evidence, snapshots: [] };
    }
    return evidence;
}

function normalizeReproduction(reproduction: any, findingId: string): { journeyId: string; version: number; bundle: string } {
    if (typeof reproduction === 'string') {
        // Parse string like "Run journey capture-and-edit-keyboard and inspect property framework"
        const match = reproduction.match(/journey\s+(\S+)/);
        return {
            journeyId: match ? match[1] : 'unknown',
            version: 1,
            bundle: '',
        };
    }
    return reproduction;
}

export function deriveFindingId(journeyId: string, version: number, assertionId: string): string {
    const crypto = require('crypto');
    const hash = crypto.createHash('sha256').update(`${journeyId}:${version}:${assertionId}`).digest('hex').slice(0, 12);
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
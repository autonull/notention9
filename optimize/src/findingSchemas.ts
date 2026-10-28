import { z } from 'zod';

export type FindingStatus = 'open' | 'fixed' | 'verified';

export const EvidenceSchema = z.union([
    z.object({ runId: z.string(), assertions: z.array(z.string()), snapshots: z.array(z.string()) }),
    z.array(z.string()),
]);

export const ReproductionSchema = z.union([
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

export function normalizeSeverity(severity: string): 'low' | 'medium' | 'high' {
    if (severity === 'critical' || severity === 'major') return 'high';
    if (severity === 'minor' || severity === 'warning') return 'low';
    return severity as 'low' | 'medium' | 'high';
}

export function normalizeEvidence(evidence: any, findingId: string): { runId: string; assertions: string[]; snapshots: string[] } {
    if (Array.isArray(evidence)) {
        return { runId: '', assertions: evidence, snapshots: [] };
    }
    return evidence;
}

export function normalizeReproduction(reproduction: any, findingId: string): { journeyId: string; version: number; bundle: string } {
    if (typeof reproduction === 'string') {
        const match = reproduction.match(/journey\s+(\S+)/);
        return {
            journeyId: match ? match[1] : 'unknown',
            version: 1,
            bundle: '',
        };
    }
    return reproduction;
}
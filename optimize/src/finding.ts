import { z } from 'zod';

export interface Finding {
    id: string;
    title: string;
    journey: string;
    location: string;
    severity: 'low' | 'medium' | 'high';
    confidence: 'low' | 'medium' | 'high';
    evidence: { runId: string; assertions: string[]; snapshots: string[] };
    reproduction: { journeyId: string; version: number; bundle: string };
    affectedLayer: Array<'ui' | 'prompt' | 'core' | 'network'>;
    userImpact: string;
    proposedVerification: string;
}

export const FindingSchema = z.object({
    id: z.string(),
    title: z.string(),
    journey: z.string(),
    location: z.string(),
    severity: z.enum(['low', 'medium', 'high']),
    confidence: z.enum(['low', 'medium', 'high']),
    evidence: z.object({ runId: z.string(), assertions: z.array(z.string()), snapshots: z.array(z.string()) }),
    reproduction: z.object({ journeyId: z.string(), version: z.number(), bundle: z.string() }),
    affectedLayer: z.array(z.enum(['ui', 'prompt', 'core', 'network'])),
    userImpact: z.string(),
    proposedVerification: z.string(),
});

export function validateFinding(finding: unknown): Finding {
    return FindingSchema.parse(finding);
}

export function deriveFindingId(journeyId: string, version: number, assertionId: string): string {
    const crypto = require('crypto');
    const hash = crypto.createHash('sha256').update(`${journeyId}:${version}:${assertionId}`).digest('hex').slice(0, 12);
    return `fnd_${hash}`;
}
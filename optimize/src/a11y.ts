import { z } from 'zod';

export type A11ySeverity = 'critical' | 'major' | 'minor' | 'warning';

export interface A11yFinding {
    id: string;
    title: string;
    journey: string;
    location: string;
    severity: A11ySeverity;
    confidence: 'high' | 'medium' | 'low';
    evidence: string[];
    reproduction: string;
    affectedLayer: ('ui' | 'prompt' | 'core' | 'agent')[];
    userImpact: string;
    proposedFix: string;
    verification: string;
    wcagCriteria?: string[];
    standard?: 'WCAG2.1' | 'WCAG2.2' | 'Section508';
}

export const A11yFindingSchema = z.object({
    id: z.string(),
    title: z.string(),
    journey: z.string(),
    location: z.string(),
    severity: z.enum(['critical', 'major', 'minor', 'warning']),
    confidence: z.enum(['high', 'medium', 'low']),
    evidence: z.array(z.string()),
    reproduction: z.string(),
    affectedLayer: z.array(z.enum(['ui', 'prompt', 'core', 'agent'])),
    userImpact: z.string(),
    proposedFix: z.string(),
    verification: z.string(),
    wcagCriteria: z.array(z.string()).optional(),
    standard: z.enum(['WCAG2.1', 'WCAG2.2', 'Section508']).optional(),
});

export function validateA11yFinding(finding: unknown): A11yFinding {
    return A11yFindingSchema.parse(finding);
}

export function createA11yFinding(partial: Partial<A11yFinding>): A11yFinding {
    return {
        id: partial.id || `a11y-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
        title: partial.title || 'Accessibility issue',
        journey: partial.journey || 'unknown',
        location: partial.location || 'unknown',
        severity: partial.severity || 'minor',
        confidence: partial.confidence || 'medium',
        evidence: partial.evidence || [],
        reproduction: partial.reproduction || 'Run journey',
        affectedLayer: partial.affectedLayer || ['ui'],
        userImpact: partial.userImpact || 'Unknown impact',
        proposedFix: partial.proposedFix || 'Fix needed',
        verification: partial.verification || 'Run journey with a11y checks',
        wcagCriteria: partial.wcagCriteria,
        standard: partial.standard || 'WCAG2.1',
    };
}

export function generateA11yFindingsFromBundle(bundle: any): A11yFinding[] {
    const findings: A11yFinding[] = [];
    const journeyId = bundle.journeyId;

    // Check for missing accessible names
    for (const step of bundle.steps) {
        if (step.kind === 'act' && step.target?.testId) {
            // This would be checked during execution
        }
    }

    // Check state inconsistencies (like operator mismatch)
    if (bundle.steps) {
        const captureSteps = bundle.steps.filter((s: any) => s.kind === 'capture' || s.kind === 'captureAria');
        for (const capture of captureSteps) {
            if (capture.stateSnapshot?.note?.properties) {
                for (const prop of capture.stateSnapshot.note.properties) {
                    const indexValue = capture.stateSnapshot.note.propertyIndex?.[prop.key];
                    if (indexValue && prop.operator !== 'contains' && indexValue.includes(prop.values[0])) {
                        findings.push(createA11yFinding({
                            id: `a11y-${journeyId}-${prop.key}-operator-mismatch`,
                            title: `Property operator mismatch: ${prop.key} shows "${prop.operator}" but index has "${prop.values[0]}"`,
                            journey: journeyId,
                            location: `note.propertyIndex.${prop.key}`,
                            severity: 'major',
                            confidence: 'high',
                            evidence: ['stateSnapshot', 'propertyIndex'],
                            reproduction: `Run journey ${journeyId} and inspect property ${prop.key}`,
                            affectedLayer: ['core', 'ui'],
                            userImpact: 'Screen readers may announce incorrect operator state',
                            proposedFix: 'Ensure property operator in UI matches propertyIndex',
                            verification: 'Run journey with assertAccessibleName on property operator',
                            wcagCriteria: ['4.1.2 Name, Role, Value'],
                        }));
                    }
                }
            }
        }
    }

    return findings;
}

export function writeA11yFindings(runId: string, findings: A11yFinding[]): void {
    // This would be integrated with the evidence bundle writer
    console.log(`[A11y] Generated ${findings.length} findings for run ${runId}`);
}
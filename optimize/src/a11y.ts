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

    // Check rendered property operators against the stored properties
    if (bundle.steps) {
        const captureSteps = bundle.steps.filter((s: any) => s.kind === 'capture' || s.kind === 'captureAria');
        for (const capture of captureSteps) {
            const note = capture.stateSnapshot?.note;
            if (!note?.properties || typeof note.content !== 'string') continue;
            const rendered = new Map<string, string>();
            for (const match of note.content.matchAll(/data-name="([^"]+)"[^>]*?data-operator="([^"]+)"/g)) {
                rendered.set(match[1], match[2]);
            }
            for (const prop of note.properties) {
                const renderedOperator = rendered.get(prop.key);
                if (!renderedOperator || renderedOperator === prop.operator) continue;
                findings.push(createA11yFinding({
                    id: `a11y-${journeyId}-${prop.key}-operator-mismatch`,
                    title: `Property operator mismatch: ${prop.key} shows "${renderedOperator}" but is stored as "${prop.operator}"`,
                    journey: journeyId,
                    location: `note.properties.${prop.key}`,
                    severity: 'major',
                    confidence: 'high',
                    evidence: ['stateSnapshot', 'note.content', 'note.properties'],
                    reproduction: `Run journey ${journeyId} and inspect property ${prop.key}`,
                    affectedLayer: ['core', 'ui'],
                    userImpact: 'Screen readers may announce an operator different from the stored value',
                    proposedFix: 'Render the stored operator or persist the displayed operator',
                    verification: 'Run the journey and compare the rendered property with the stored operator',
                    wcagCriteria: ['4.1.2 Name, Role, Value'],
                }));
            }
        }
    }

    return findings;
}

export function writeA11yFindings(runId: string, findings: A11yFinding[]): void {
    // This would be integrated with the evidence bundle writer
    console.log(`[A11y] Generated ${findings.length} findings for run ${runId}`);
}
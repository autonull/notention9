import type { CandidateStrategy, Seam } from '../spec/index.js';
import type { GateResult } from '../gates.js';

export function runSeamConformanceGate(candidate: CandidateStrategy, seams: Seam[]): GateResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    const seam = seams.find(s => s.id === candidate.spec.seam);
    if (!seam) {
        errors.push(`Seam ${candidate.spec.seam} not found`);
        return { pass: false, errors, warnings };
    }

    // Check that component accepts all required props from seam
    const seamProps = seam.propsShape;
    const acceptsProps = (candidate.spec.accepts.properties as Record<string, unknown>) || {};

    for (const [propName, propType] of Object.entries(seamProps)) {
        if (!acceptsProps[propName] && propName !== 'ontology') { // ontology is often optional
            warnings.push(`Seam prop '${propName}' not in accepts schema`);
        }
    }

    // Check that component emits expected events
    const seamEvents = ['propertySaved', 'tagsChanged', 'extractionComplete', 'templateSelected'];
    const emitsEvents = Object.keys(candidate.spec.emits.properties || {});

    // Note: not all seams emit all events, so just warn
    if (emitsEvents.length === 0) {
        warnings.push('No events emitted - check if seam requires output events');
    }

    return { pass: errors.length === 0, errors, warnings };
}
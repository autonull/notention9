import { buildCoverageFinding } from '../cli/commands/ontologyAudit.js';

const result = {
    timestamp: '2026-11-23T00:00:00.000Z',
    ontology: { totalKeys: 353, keys: [] },
    usage: {
        extractionCases: { casesAnalyzed: 100, keysUsed: [], keysUsedCount: 130 },
        matchCases: { casesAnalyzed: 22, keysUsed: [], keysUsedCount: 19 },
        qualityNotes: { notesAnalyzed: 44, keysUsed: [], keysUsedCount: 19 },
        combined: { keysUsed: [], keysUsedCount: 138 },
    },
    gaps: {
        unusedOntologyKeys: Array.from({ length: 303 }, (_, i) => `unused${i}`),
        missingFromOntology: Array.from({ length: 88 }, (_, i) => `missing${i}`),
        coveragePercent: 39.1,
    },
    recommendations: [],
};

describe('buildCoverageFinding', () => {
    it('links the audit report to the ontology merge capability', () => {
        const finding = buildCoverageFinding(result, 'data/eval/ontology/report.json');
        expect(finding.nodeId).toBe('cap.ontology.merge');
        expect(finding.issue).toBe('ontology-coverage');
        expect(finding.status).toBe('open');
        expect(finding.evidence).toEqual([
            'data/eval/ontology/report.json',
            'coverage:39.1%',
            'unused:303',
            'missing:88',
        ]);
    });

    it('derives severity from coverage', () => {
        expect(buildCoverageFinding(result, 'r').severity).toBe('high');
        expect(buildCoverageFinding({ ...result, gaps: { ...result.gaps, coveragePercent: 65 } }, 'r').severity).toBe('medium');
        expect(buildCoverageFinding({ ...result, gaps: { ...result.gaps, coveragePercent: 92 } }, 'r').severity).toBe('low');
    });
});

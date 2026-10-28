import type { Finding } from '../finding.js';

export function isA11yFinding(finding: Finding & { wcagCriteria?: string[] }): finding is Finding & { wcagCriteria: string[] } {
    return finding.id?.startsWith('a11y-') && Array.isArray((finding as any).wcagCriteria);
}

export function getReproductionJourneyId(finding: Finding): string {
    return typeof finding.reproduction === 'object' ? finding.reproduction.journeyId : finding.journey;
}
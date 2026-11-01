import type { ExtractionTestCase, MatchTestCase } from '../../shared/types/testCaseTypes.js';
import type { ExtractedTerm } from '../ingest.js';
import { VALID_PROPERTY_KEYS, inferPropertyKey } from './propertyKeys.js';
import { createNaturalInput } from './naturalInput.ts';

/**
 * Generate extraction test cases from corpus terms
 */
export function generateTestCasesFromCorpus(terms: ExtractedTerm[], vocabulary: string[]): ExtractionTestCase[] {
    const testCases: ExtractionTestCase[] = [];

    // Group terms by category
    const byCategory = new Map<string, ExtractedTerm[]>();
    for (const term of terms) {
        const cat = term.category || 'general';
        if (!byCategory.has(cat)) byCategory.set(cat, []);
        byCategory.get(cat)!.push(term);
    }

    let caseId = 1;

    // Generate extraction test cases from high-frequency terms that map to valid properties
    for (const [category, catTerms] of byCategory) {
        const topTerms = catTerms.slice(0, 10);
        if (topTerms.length < 2) continue;

        // Filter to terms that map to valid property keys
        const validTerms = topTerms.filter(t => VALID_PROPERTY_KEYS.has(inferPropertyKey(t.term, category)));
        if (validTerms.length < 2) continue;

        // Create a composite input from top terms using natural language
        const inputParts = validTerms.slice(0, 5).map(t => t.term);
        const input = `I need ${inputParts.join(', ')} for my ${category} project`;

        const expectedProperties = validTerms.slice(0, 3).map(t => ({
            key: inferPropertyKey(t.term, category),
            operator: 'contains' as const,
            values: [t.term],
        }));

        // Only add if all expected properties are valid
        if (expectedProperties.every(p => VALID_PROPERTY_KEYS.has(p.key))) {
            testCases.push({
                id: `corpus-extraction-${caseId++}`,
                name: `Corpus extraction: ${category}`,
                input,
                expectedMinProperties: Math.min(3, expectedProperties.length),
                expectedProperties,
            });
        }
    }

    // Generate single-term extraction cases for terms that map to valid properties
    for (const term of terms.slice(0, 30)) {
        if (term.frequency < 2) continue;
        const propKey = inferPropertyKey(term.term, term.category);
        if (!VALID_PROPERTY_KEYS.has(propKey)) continue;

        // Create more natural input
        const input = createNaturalInput(term.term, propKey);

        testCases.push({
            id: `corpus-extraction-${caseId++}`,
            name: `Corpus term: ${term.term}`,
            input,
            expectedMinProperties: 1,
            expectedProperties: [
                {
                    key: propKey,
                    operator: 'contains',
                    values: [term.term],
                },
            ],
        });
    }

    return testCases.slice(0, 30);
}

/**
 * Generate match test cases from corpus terms
 */
export function generateMatchCasesFromCorpus(terms: ExtractedTerm[]): MatchTestCase[] {
    const matchCases: MatchTestCase[] = [];

    // Valid ontology property keys for matching
    const validPropertyKeys = new Set([
        'role', 'skills', 'experience', 'budget', 'rate', 'price', 'location',
        'remote', 'availability', 'deadline', 'project', 'task', 'intent',
        'company', 'title', 'description', 'duration', 'deliveryTime',
        'channel', 'from', 'to', 'subject', 'body', 'email', 'phone',
    ]);

    // Group by category for related match cases
    const byCategory = new Map<string, ExtractedTerm[]>();
    for (const term of terms) {
        const cat = term.category || 'general';
        if (!byCategory.has(cat)) byCategory.set(cat, []);
        byCategory.get(cat)!.push(term);
    }

    let caseId = 1;

    for (const [category, catTerms] of byCategory) {
        const topTerms = catTerms.slice(0, 5);
        if (topTerms.length < 2) continue;

        // Filter to terms that map to valid property keys
        const validTerms = topTerms.filter(t => validPropertyKeys.has(inferPropertyKey(t.term, category)));
        if (validTerms.length < 2) continue;

        // Create request/offer pairs from same category using natural language
        for (let i = 0; i < validTerms.length - 1; i++) {
            for (let j = i + 1; j < validTerms.length; j++) {
                const requestTerm = validTerms[i];
                const offerTerm = validTerms[j];

                const requestText = createNaturalInput(requestTerm.term, inferPropertyKey(requestTerm.term, category));
                const offerText = `Offering ${offerTerm.term} for ${category} work`;

                matchCases.push({
                    id: `corpus-match-${caseId++}`,
                    name: `Corpus match: ${category} - ${requestTerm.term} vs ${offerTerm.term}`,
                    requestText,
                    offerText,
                    expectedMinScore: 0.2,
                    expectedMaxScore: 0.8,
                });
            }
        }
    }

    return matchCases.slice(0, 20);
}
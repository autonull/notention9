import type { Property, OntologyNode } from '@notention/core';
import { alignToOntology } from '@notention/core';
import { scoreExtraction } from '../prompts/policy.js';

export interface GoldenCase {
    name: string;
    input: string;
    expected: Property[];
    forbidden?: Property[];
    expectedOutcome: 'suggested' | 'applied' | 'rejected' | 'invalid' | 'refused';
}

export interface Provider {
    name: string;
    extract(text: string, ontology: OntologyNode[]): Promise<Property[]>;
}

export class DeterministicProvider implements Provider {
    name = 'deterministic';

    async extract(text: string, ontology: OntologyNode[]): Promise<Property[]> {
        return alignToOntology(text, ontology);
    }
}

export class CannedProvider implements Provider {
    name = 'canned';
    private responses: Map<string, Property[]>;

    constructor(responses: Map<string, Property[]>) {
        this.responses = responses;
    }

    async extract(text: string, _ontology: OntologyNode[]): Promise<Property[]> {
        return this.responses.get(text) ?? [];
    }
}

export interface EvaluationResult {
    caseName: string;
    passed: boolean;
    expected: Property[];
    actual: Property[];
    errors: string[];
}

export async function evaluateGoldenSet(
    cases: GoldenCase[],
    provider: Provider,
    ontology: OntologyNode[]
): Promise<EvaluationResult[]> {
    const results: EvaluationResult[] = [];

    for (const testCase of cases) {
        const actual = await provider.extract(testCase.input, ontology);
        const errors: string[] = [];
        const score = scoreExtraction(testCase.expected, actual);

        for (const missing of score.missing) {
            errors.push(`Missing expected property: ${missing}`);
        }

        // Check forbidden properties are absent. Operator must match exactly:
        // the point is to reject the specific annotated mistake, not a synonym.
        if (testCase.forbidden) {
            for (const forbidden of testCase.forbidden) {
                const match = actual.find(candidate =>
                    candidate.key === forbidden.key
                    && candidate.operator === forbidden.operator
                    && candidate.values.some(value =>
                        forbidden.values.some(target => value === target)
                    )
                );
                if (match) {
                    errors.push(`Forbidden property found: ${forbidden.key} ${forbidden.operator} ${forbidden.values.join(',')}`);
                }
            }
        }

        results.push({
            caseName: testCase.name,
            passed: errors.length === 0,
            expected: testCase.expected,
            actual,
            errors,
        });
    }

    return results;
}
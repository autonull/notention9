import type { Property, OntologyNode } from '@notention/core';
import { alignToOntology } from '@notention/core';

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

        // Check expected properties are present
        for (const expected of testCase.expected) {
            const match = actual.find(a =>
                a.key === expected.key &&
                a.operator === expected.operator &&
                a.values.every(v => expected.values.includes(v))
            );
            if (!match) {
                errors.push(`Missing expected property: ${expected.key} ${expected.operator} ${expected.values.join(',')}`);
            }
        }

        // Check forbidden properties are absent
        if (testCase.forbidden) {
            for (const forbidden of testCase.forbidden) {
                const match = actual.find(a =>
                    a.key === forbidden.key &&
                    a.operator === forbidden.operator &&
                    a.values.every(v => forbidden.values.includes(v))
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
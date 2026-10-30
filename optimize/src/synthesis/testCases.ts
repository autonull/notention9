import type { TestCase, MatchTestCase } from './fastEvaluator.js';

/**
 * Core regression test cases - these must always pass
 * They represent the baseline behavior that should never regress
 */
export const CORE_EXTRACTION_TEST_CASES: TestCase[] = [
    {
        id: 'extraction-1',
        name: 'Job request with budget, role, deadline',
        input: 'I need a React developer for two weeks, up to 900 USD, starting next week',
        expectedMinProperties: 3,
        expectedProperties: [
            { key: 'intent', operator: 'is', values: ['task'] },
            { key: 'role', operator: 'contains', values: ['React developer'] },
            { key: 'budget', operator: 'is', values: ['900'] },
        ],
    },
    {
        id: 'extraction-2',
        name: 'Project with budget and deadline',
        input: 'Create a new project with React 18, TypeScript, and Vite. Use Tailwind for styling. Budget 5000 USD, deadline next Friday.',
        expectedMinProperties: 3,
        expectedProperties: [
            { key: 'budget', operator: 'is', values: ['5000'] },
            { key: 'price', operator: 'is', values: ['5000 USD'] },
        ],
    },
    {
        id: 'extraction-3',
        name: 'Shopping intent',
        input: 'Buy milk #shopping',
        expectedMinProperties: 1,
        expectedProperties: [
            { key: 'intent', operator: 'is', values: ['shopping'] },
        ],
    },
    {
        id: 'extraction-4',
        name: 'Meeting with budget',
        input: 'Meeting at 3pm with John about the project budget of 5000 USD',
        expectedMinProperties: 2,
        expectedProperties: [
            { key: 'budget', operator: 'is', values: ['5000'] },
            { key: 'price', operator: 'is', values: ['5000 USD'] },
        ],
    },
    {
        id: 'extraction-5',
        name: 'Freelance offer with rate',
        input: 'I offer React development services at 100 USD per hour',
        expectedMinProperties: 2,
        expectedProperties: [
            { key: 'price', operator: 'is', values: ['100 USD'] },
        ],
    },
];

export const CORE_MATCH_TEST_CASES: MatchTestCase[] = [
    {
        id: 'match-1',
        name: 'React developer request matches React offer (price compatible)',
        requestText: 'I need a React developer for 100 USD per hour',
        offerText: 'I offer React development services at 100 USD per hour',
        expectedMinScore: 0.3,
        expectedMaxScore: 1.0,
    },
    {
        id: 'match-2',
        name: 'Budget request matches priced offer',
        requestText: 'Need a designer for 5000 USD',
        offerText: 'Designer offering services at 5000 USD',
        expectedMinScore: 0.3,
        expectedMaxScore: 1.0,
    },
    {
        id: 'match-3',
        name: 'No match for unrelated skills',
        requestText: 'I need a React developer',
        offerText: 'I offer Python development services',
        expectedMinScore: 0,
        expectedMaxScore: 0.2,
    },
    {
        id: 'match-4',
        name: 'Price conflict - different budgets',
        requestText: 'Need a developer for 2000 USD',
        offerText: 'Developer offering services at 100 USD per hour',
        expectedMinScore: 0,
        expectedMaxScore: 0.1,
    },
];

/**
 * Capture test case - tests the capture task (uses extraction)
 */
export const CORE_CAPTURE_TEST_CASE = {
    id: 'capture-1',
    name: 'Capture extracts key properties',
    input: 'I need a React developer for two weeks, up to 900 USD, starting next week',
    expectedMinProperties: 3,
    maxDurationMs: 20000,
};

/**
 * Test case registry for managing all test cases
 */
export class TestCaseRegistry {
    private extractionCases: TestCase[] = [];
    private matchCases: MatchTestCase[] = [];
    
    constructor() {
        this.registerCoreCases();
    }
    
    private registerCoreCases(): void {
        this.extractionCases.push(...CORE_EXTRACTION_TEST_CASES);
        this.matchCases.push(...CORE_MATCH_TEST_CASES);
    }
    
    registerExtractionCases(cases: TestCase[]): void {
        this.extractionCases.push(...cases);
    }
    
    registerMatchCases(cases: MatchTestCase[]): void {
        this.matchCases.push(...cases);
    }
    
    getExtractionCases(): TestCase[] {
        return [...this.extractionCases];
    }
    
    getMatchCases(): MatchTestCase[] {
        return [...this.matchCases];
    }
    
    getAllCases(): { extraction: TestCase[]; match: MatchTestCase[] } {
        return {
            extraction: this.getExtractionCases(),
            match: this.getMatchCases(),
        };
    }
    
    getCoreExtractionCases(): TestCase[] {
        return [...CORE_EXTRACTION_TEST_CASES];
    }
    
    getCoreMatchCases(): MatchTestCase[] {
        return [...CORE_MATCH_TEST_CASES];
    }
    
    getCorpusExtractionCases(): TestCase[] {
        return this.extractionCases.filter(c => c.id.startsWith('corpus-'));
    }
    
    getCorpusMatchCases(): MatchTestCase[] {
        return this.matchCases.filter(c => c.id.startsWith('corpus-'));
    }
}

export const testCaseRegistry = new TestCaseRegistry();
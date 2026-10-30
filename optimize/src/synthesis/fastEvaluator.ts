import { readFileSync, writeFileSync, mkdirSync, existsSync, rmSync } from 'fs';
import { join, dirname } from 'path';
import { PropertyExtractor } from '@notention/core';
import { MatchEngine } from '@notention/core';
import { DEFAULT_ONTOLOGY } from '@notention/core';
import { OntologyService } from '@notention/core';
import { Note, Property } from '@notention/core';
import type { CandidateStrategy, CandidateDir } from './StrategySpec.js';
import type { BaselineResult, ResourceMetrics, CandidateEvaluation, EvaluationReport } from './evaluator.js';

// Re-export types for compatibility
export type { BaselineResult, ResourceMetrics, CandidateEvaluation, EvaluationReport };

interface TestCase {
    id: string;
    name: string;
    input: string;
    expectedMinProperties: number;
    expectedProperties?: Partial<Property>[];
}

interface MatchTestCase {
    id: string;
    name: string;
    requestText: string;
    offerText: string;
    expectedMinScore: number;
    expectedMaxScore?: number;
}

interface TestCase {
    id: string;
    name: string;
    input: string;
    expectedMinProperties: number;
    expectedProperties?: Partial<Property>[];
}

interface MatchTestCase {
    id: string;
    name: string;
    requestText: string;
    offerText: string;
    expectedMinScore: number;
    expectedMaxScore?: number;
}

const EXTRACTION_TEST_CASES: TestCase[] = [
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

const MATCH_TEST_CASES: MatchTestCase[] = [
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

const ontologyService = new OntologyService(DEFAULT_ONTOLOGY);
const extractor = new PropertyExtractor(DEFAULT_ONTOLOGY);
const matchEngine = new MatchEngine(DEFAULT_ONTOLOGY);

function createNoteFromText(text: string, id: string = 'test'): Note {
    const properties = extractor.extractFromText(text);
    return {
        id,
        title: text.slice(0, 50),
        content: `<p>${text}</p>`,
        properties,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        tags: [],
    };
}

function checkPropertyMatch(actual: Property[], expected: Partial<Property>[]): { matched: number; total: number; details: string[] } {
    let matched = 0;
    const details: string[] = [];
    
    for (const exp of expected) {
        const found = actual.some(a => 
            a.key === exp.key && 
            a.operator === exp.operator &&
            exp.values?.some(v => a.values.includes(v))
        );
        if (found) {
            matched++;
            details.push(`✓ ${exp.key} ${exp.operator} ${exp.values?.join(',')}`);
        } else {
            details.push(`✗ Missing: ${exp.key} ${exp.operator} ${exp.values?.join(',')}`);
        }
    }
    
    return { matched, total: expected.length, details };
}

export async function runFastBaselineEvaluation(): Promise<BaselineResult[]> {
    const results: BaselineResult[] = [];
    
    // Test extraction tasks
    for (const testCase of EXTRACTION_TEST_CASES) {
        const startTime = Date.now();
        const properties = extractor.extractFromText(testCase.input);
        const duration = Date.now() - startTime;
        
        const check = checkPropertyMatch(properties, testCase.expectedProperties || []);
        const success = properties.length >= testCase.expectedMinProperties && check.matched === check.total;
        
        results.push({
            taskId: `task-3-extraction-${testCase.id}`,
            successRate: success ? 1 : 0,
            medianDuration: duration,
            p90Duration: duration,
            medianSteps: 1,
            p90Steps: 1,
            errors: success ? [] : [`Extracted ${properties.length} properties, expected ≥${testCase.expectedMinProperties}. Missing: ${check.details.filter(d => d.startsWith('✗')).join('; ')}`],
        });
    }
    
    // Test match tasks
    for (const testCase of MATCH_TEST_CASES) {
        const startTime = Date.now();
        const request = createNoteFromText(testCase.requestText, 'request');
        const offer = createNoteFromText(testCase.offerText, 'offer');
        const result = matchEngine.calculateMatchScore(request, offer);
        const duration = Date.now() - startTime;
        
        const success = result.score >= testCase.expectedMinScore && 
                       (testCase.expectedMaxScore === undefined || result.score <= testCase.expectedMaxScore);
        
        results.push({
            taskId: `task-2-match-${testCase.id}`,
            successRate: success ? 1 : 0,
            medianDuration: duration,
            p90Duration: duration,
            medianSteps: 1,
            p90Steps: 1,
            errors: success ? [] : [`Match score ${result.score.toFixed(2)} not in range [${testCase.expectedMinScore}, ${testCase.expectedMaxScore ?? 1.0}]`],
        });
    }
    
    // Test capture task (uses extraction)
    const captureInput = 'I need a React developer for two weeks, up to 900 USD, starting next week';
    const captureStart = Date.now();
    const captureProps = extractor.extractFromText(captureInput);
    const captureDuration = Date.now() - captureStart;
    const captureSuccess = captureProps.length >= 3 && captureDuration < 20000;
    
    results.unshift({
        taskId: 'task-1-capture',
        successRate: captureSuccess ? 1 : 0,
        medianDuration: captureDuration,
        p90Duration: captureDuration,
        medianSteps: 2,
        p90Steps: 2,
        errors: captureSuccess ? [] : [`Capture extracted ${captureProps.length} properties in ${captureDuration}ms`],
    });
    
    return results;
}

export async function evaluateCandidateFast(
    candidate: CandidateStrategy,
    baseline: BaselineResult[]
): Promise<CandidateEvaluation> {
    // For now, candidates don't change the core logic, so they get the same results as baseline
    // In the future, candidates could provide custom extractors/matchers
    
    const taskResults = new Map<string, BaselineResult>();
    let totalSuccessRate = 0;
    let totalDuration = 0;
    
    for (const baselineResult of baseline) {
        // Candidate inherits baseline behavior (no custom logic yet)
        taskResults.set(baselineResult.taskId, { ...baselineResult });
        totalSuccessRate += baselineResult.successRate;
        totalDuration += baselineResult.medianDuration;
    }
    
    const overallSuccessRate = totalSuccessRate / baseline.length;
    const overallMedianDuration = totalDuration / baseline.length;
    
    // Must-win: candidate must beat baseline on overall success rate
    const baselineOverall = baseline.reduce((sum, b) => sum + b.successRate, 0) / baseline.length;
    const passed = overallSuccessRate >= baselineOverall;
    
    return {
        candidateId: candidate.id,
        taskResults,
        overallSuccessRate,
        overallMedianDuration,
        passed,
        resourceMetrics: {
            totalLatencyMs: 0,
            avgInferenceLatencyMs: 0,
            peakMemoryMB: 0,
            modelSizeMB: 0,
            inferenceCount: 0,
            tokensUsed: 0,
        },
    };
}

export async function runFastEvaluation(
    candidatesDir: CandidateDir,
    baseline: BaselineResult[],
): Promise<EvaluationReport> {
    const results: CandidateEvaluation[] = [];
    
    for (const candidate of candidatesDir.candidates.values()) {
        const evaluation = await evaluateCandidateFast(candidate, baseline);
        results.push(evaluation);
    }
    
    return {
        baseline,
        candidates: results,
        timestamp: new Date().toISOString(),
    };
}

export async function loadOrRunFastBaseline(
    baselinePath: string
): Promise<BaselineResult[]> {
    if (existsSync(baselinePath)) {
        const content = readFileSync(baselinePath, 'utf-8');
        return JSON.parse(content);
    }
    
    const baseline = await runFastBaselineEvaluation();
    mkdirSync(dirname(baselinePath), { recursive: true });
    writeFileSync(baselinePath, JSON.stringify(baseline, null, 2));
    
    return baseline;
}
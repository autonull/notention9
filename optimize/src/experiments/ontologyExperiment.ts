import { DEFAULT_ONTOLOGY, PropertyExtractor, MatchEngine } from '@notention/core';
import { FACETS_STATUS_ONTOLOGY } from '@notention/core/ontology/domains.facets';
import { runFastBaselineEvaluation, runFastEvaluation, loadOrRunFastBaseline } from '../synthesis/fastEvaluator.js';
import type { BaselineResult, CandidateEvaluation, EvaluationReport } from '../synthesis/fastEvaluator.js';

interface OntologyExperimentResult {
    flat: {
        baseline: BaselineResult[];
        coreSuccessRate: number;
        coreMedianDuration: number;
    };
    facetsStatus: {
        baseline: BaselineResult[];
        coreSuccessRate: number;
        coreMedianDuration: number;
    };
    comparison: {
        successRateDiff: number;  // facets - flat (positive = facets better)
        durationDiff: number;     // facets - flat (negative = facets faster)
        winner: 'flat' | 'facets+status' | 'tie';
        notes: string[];
    };
}

const flatExtractor = new PropertyExtractor(DEFAULT_ONTOLOGY);
const flatMatchEngine = new MatchEngine(DEFAULT_ONTOLOGY);

const facetsExtractor = new PropertyExtractor(FACETS_STATUS_ONTOLOGY);
const facetsMatchEngine = new MatchEngine(FACETS_STATUS_ONTOLOGY);

/**
 * Run baseline evaluation with a specific ontology
 */
async function runBaselineWithOntology(
    extractor: PropertyExtractor,
    matchEngine: MatchEngine
): Promise<BaselineResult[]> {
    const results: BaselineResult[] = [];

    // Test core extraction tasks (regression tests)
    const EXTRACTION_TEST_CASES = [
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

    const MATCH_TEST_CASES = [
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

    function createNoteFromText(text: string, id: string = 'test') {
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

    function checkPropertyMatch(actual: any[], expected: any[]) {
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

    // Test core extraction tasks
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
            isCorpusTest: false,
        });
    }

    // Test core match tasks
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
            isCorpusTest: false,
        });
    }

    // Test capture task
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
        isCorpusTest: false,
    });

    return results;
}

function calculateCoreMetrics(baseline: BaselineResult[]) {
    const coreTests = baseline.filter(b => !b.isCorpusTest);
    if (coreTests.length === 0) return { successRate: 0, medianDuration: 0 };
    
    const successRate = coreTests.reduce((sum, b) => sum + b.successRate, 0) / coreTests.length;
    const medianDuration = coreTests.reduce((sum, b) => sum + b.medianDuration, 0) / coreTests.length;
    
    return { successRate, medianDuration };
}

export async function runOntologyExperiment(): Promise<OntologyExperimentResult> {
    console.log('🧪 Running Ontology Experiment: Flat vs Facets+Status\n');
    
    // Run baseline with flat ontology
    console.log('  📏 Running baseline with FLAT ontology...');
    const flatBaseline = await runBaselineWithOntology(flatExtractor, flatMatchEngine);
    const flatMetrics = calculateCoreMetrics(flatBaseline);
    
    console.log(`     Core success rate: ${(flatMetrics.successRate * 100).toFixed(1)}%`);
    console.log(`     Core median duration: ${flatMetrics.medianDuration.toFixed(0)}ms`);
    
    // Print flat details
    for (const task of flatBaseline.filter(b => !b.isCorpusTest)) {
        const status = task.successRate === 1 ? '✅' : '❌';
        console.log(`     ${status} ${task.taskId}: ${(task.successRate * 100).toFixed(0)}% (${task.medianDuration}ms)`);
        if (task.errors.length > 0) {
            console.log(`        Errors: ${task.errors.join('; ')}`);
        }
    }
    
    // Run baseline with facets+status ontology
    console.log('\n  📏 Running baseline with FACETS+STATUS ontology...');
    const facetsBaseline = await runBaselineWithOntology(facetsExtractor, facetsMatchEngine);
    const facetsMetrics = calculateCoreMetrics(facetsBaseline);
    
    console.log(`     Core success rate: ${(facetsMetrics.successRate * 100).toFixed(1)}%`);
    console.log(`     Core median duration: ${facetsMetrics.medianDuration.toFixed(0)}ms`);
    
    // Print facets details
    for (const task of facetsBaseline.filter(b => !b.isCorpusTest)) {
        const status = task.successRate === 1 ? '✅' : '❌';
        console.log(`     ${status} ${task.taskId}: ${(task.successRate * 100).toFixed(0)}% (${task.medianDuration}ms)`);
        if (task.errors.length > 0) {
            console.log(`        Errors: ${task.errors.join('; ')}`);
        }
    }
    
    // Compare
    const successRateDiff = facetsMetrics.successRate - flatMetrics.successRate;
    const durationDiff = facetsMetrics.medianDuration - flatMetrics.medianDuration;
    
    let winner: 'flat' | 'facets+status' | 'tie' = 'tie';
    const notes: string[] = [];
    
    if (Math.abs(successRateDiff) < 0.05 && Math.abs(durationDiff) < 50) {
        winner = 'tie';
        notes.push('Performance essentially equivalent');
    } else if (successRateDiff > 0.05 || (successRateDiff >= 0 && durationDiff < -50)) {
        winner = 'facets+status';
        notes.push('Facets+status shows better accuracy and/or speed');
    } else if (successRateDiff < -0.05 || (successRateDiff <= 0 && durationDiff > 50)) {
        winner = 'flat';
        notes.push('Flat ontology performs better');
    }
    
    // Additional analysis
    const flatProperties = flatBaseline.find(b => b.taskId === 'task-1-capture');
    const facetsProperties = facetsBaseline.find(b => b.taskId === 'task-1-capture');
    
    if (flatProperties && facetsProperties) {
        notes.push(`Flat capture properties: ${flatProperties.errors.length === 0 ? '≥3 ✓' : 'failed ✗'}`);
        notes.push(`Facets capture properties: ${facetsProperties.errors.length === 0 ? '≥3 ✓' : 'failed ✗'}`);
    }
    
    // Check if status attribute is being extracted in facets version
    const facetsExtraction = facetsBaseline.find(b => b.taskId.startsWith('task-3-extraction'));
    if (facetsExtraction) {
        notes.push('Facets ontology includes status facet in note domain');
    }
    
    console.log('\n📊 COMPARISON RESULTS:');
    console.log(`   Success rate diff (facets - flat): ${(successRateDiff * 100).toFixed(1)}%`);
    console.log(`   Duration diff (facets - flat): ${durationDiff.toFixed(0)}ms`);
    console.log(`   Winner: ${winner.toUpperCase()}`);
    console.log(`   Notes: ${notes.join('; ')}`);
    
    return {
        flat: { baseline: flatBaseline, ...flatMetrics },
        facetsStatus: { baseline: facetsBaseline, ...facetsMetrics },
        comparison: {
            successRateDiff,
            durationDiff,
            winner,
            notes,
        },
    };
}

// Run if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
    runOntologyExperiment()
        .then(result => {
            console.log('\n✅ Experiment complete');
            process.exit(result.comparison.winner === 'flat' ? 1 : 0);
        })
        .catch(err => {
            console.error('Experiment failed:', err);
            process.exit(1);
        });
}
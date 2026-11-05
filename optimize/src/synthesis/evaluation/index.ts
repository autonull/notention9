// Test case types
export * from './testCaseTypes.js';

// Test case registry
export { testCaseRegistry, CORE_EXTRACTION_TEST_CASES, CORE_MATCH_TEST_CASES, CORE_CAPTURE_TEST_CASE } from './testCaseRegistry.js';
export type { TestCaseRegistry } from './testCaseRegistry.js';

// Evaluation types
export * from './types.js';

// Resource monitor
export { ResourceMonitor } from './resourceMonitor.js';

// Evaluator factories
export { createExtractionEvaluator, createMatchEvaluator, createCaptureEvaluator } from './evaluators.js';
export type { BaseTestCaseEvaluator, TestCaseEvaluator } from './evaluators.js';
export type { EvaluationResult } from './evaluators.js';
export { checkPropertyMatch, createNoteFromText } from './evaluators.js';

// Dependencies
export { createDefaultDependencies, getDefaultDependencies, resetDefaultDependencies } from './dependencies.js';
export type { EvaluationDependencies } from './dependencies.js';

// Corpus loader
export { loadCorpusTestCasesForEvaluation, prepareEvaluationTestCases, buildTestCasesWithFlags } from './corpusLoader.js';

// Baseline evaluation
export { runFastBaselineEvaluation, runTestCases, createBaselineResultAsync } from './baseline.js';

// Candidate evaluation
export { evaluateCandidateFast, runFastEvaluation, loadOrRunFastBaseline } from './candidateEvaluation.js';
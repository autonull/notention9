import { PropertyExtractor } from '@notention/core';
import { MatchEngine } from '@notention/core';
import { DEFAULT_ONTOLOGY } from '@notention/core';
import type { BaseTestCaseEvaluator } from './evaluators.js';
import type { ExtractionTestCase, MatchTestCase, CaptureTestCase } from './testCaseTypes.js';
import { createExtractionEvaluator, createMatchEvaluator, createCaptureEvaluator } from './evaluators.js';

/**
 * Shared evaluation dependencies - use dependency injection instead of global singletons
 */
export interface EvaluationDependencies {
    extractor: PropertyExtractor;
    matchEngine: MatchEngine;
    extractionEvaluator: BaseTestCaseEvaluator<ExtractionTestCase>;
    matchEvaluator: BaseTestCaseEvaluator<MatchTestCase>;
    captureEvaluator: BaseTestCaseEvaluator<CaptureTestCase>;
}

/**
 * Create default evaluation dependencies
 */
export function createDefaultDependencies(): EvaluationDependencies {
    const extractor = new PropertyExtractor(DEFAULT_ONTOLOGY);
    const matchEngine = new MatchEngine(DEFAULT_ONTOLOGY);
    return {
        extractor,
        matchEngine,
        extractionEvaluator: createExtractionEvaluator(extractor),
        matchEvaluator: createMatchEvaluator(matchEngine, extractor),
        captureEvaluator: createCaptureEvaluator(extractor),
    };
}

/**
 * Default dependencies singleton - for backward compatibility
 * Use createDefaultDependencies() for new code
 */
let _defaultDependencies: EvaluationDependencies | null = null;

export function getDefaultDependencies(): EvaluationDependencies {
    if (!_defaultDependencies) {
        _defaultDependencies = createDefaultDependencies();
    }
    return _defaultDependencies;
}

export function resetDefaultDependencies(): void {
    _defaultDependencies = null;
}
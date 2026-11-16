import { describe, expect, it } from 'vitest';
import {
    analyzeComplexity,
    makeRoutingDecision,
    computeBlendedMetrics,
    validateModelsAvailable,
    type ModelConfig,
    type ExtractionResult,
} from '../../llm/adaptiveRouter.js';

const MOCK_MODELS: ModelConfig[] = [
    {
        size: '2B',
        modelPath: '/models/2b.gguf',
        contextSize: 4096,
        gpuLayers: 'max',
        maxTokens: 512,
        temperature: 0,
        description: 'Fast extraction for simple notes',
    },
    {
        size: '4B',
        modelPath: '/models/4b.gguf',
        contextSize: 8192,
        gpuLayers: 'max',
        maxTokens: 512,
        temperature: 0,
        description: 'Balanced extraction for standard notes',
    },
    {
        size: '9B',
        modelPath: '/models/9b.gguf',
        contextSize: 8192,
        gpuLayers: 'max',
        maxTokens: 1024,
        temperature: 0,
        description: 'High-quality extraction for complex/governance notes',
    },
];

describe('analyzeComplexity', () => {
    it('returns low score for very short notes', () => {
        const score = analyzeComplexity('Buy milk');
        expect(score).toBeLessThan(30);
    });

    it('returns low score for simple todo notes', () => {
        const score = analyzeComplexity('TODO: call mom');
        expect(score).toBeLessThan(30);
    });

    it('returns high score for governance notes with keywords', () => {
        const text = 'Budget approval required for Q4 contract compliance audit. Legal review mandate for regulatory specification. Authorization needed for confidential indemnification clause.';
        const score = analyzeComplexity(text);
        expect(score).toBeGreaterThan(70);
    });

    it('returns high score for long notes with deadlines', () => {
        const text = 'Project milestone deliverable due 2024-12-31. Risk assessment and liability warranty review needed. Confidential indemnification clause requires authorization.';
        const score = analyzeComplexity(text);
        expect(score).toBeGreaterThan(70);
    });

    it('returns medium score for standard notes', () => {
        const text = 'Meeting with team at 2pm to discuss project timeline and next steps. Need to prepare agenda and share with stakeholders.';
        const score = analyzeComplexity(text);
        expect(score).toBeGreaterThanOrEqual(30);
        expect(score).toBeLessThanOrEqual(70);
    });

    it('scores based on word count', () => {
        const shortText = 'Short note';
        const longText = ' '.repeat(200).split(' ').map((_, i) => `word${i}`).join(' ');
        expect(analyzeComplexity(shortText)).toBeLessThan(analyzeComplexity(longText));
    });

    it('detects dates and money amounts', () => {
        const withDate = 'Meeting on 2024-12-31 at 5pm';
        const withMoney = 'Budget is $5000.00 for the project';
        const without = 'Meeting tomorrow at five pm';

        expect(analyzeComplexity(withDate)).toBeGreaterThan(analyzeComplexity(without));
        expect(analyzeComplexity(withMoney)).toBeGreaterThan(analyzeComplexity(without));
    });
});

describe('makeRoutingDecision', () => {
    it('routes simple notes to 2B', () => {
        const decision = makeRoutingDecision('Buy milk', MOCK_MODELS);
        expect(decision.modelSize).toBe('2B');
        expect(decision.modelPath).toBe('/models/2b.gguf');
    });

    it('routes complex notes to 9B', () => {
        const text = 'Budget approval required for Q4 contract compliance audit. Legal review mandate for regulatory specification.';
        const decision = makeRoutingDecision(text, MOCK_MODELS);
        expect(decision.modelSize).toBe('9B');
        expect(decision.modelPath).toBe('/models/9b.gguf');
    });

    it('routes standard notes to 4B', () => {
        // Text with ~30-50 words, some complexity indicators
        const text = 'Team meeting scheduled for 2pm to discuss project timeline, budget allocation for Q1, and resource allocation. Need to prepare detailed agenda with action items and deadlines for each workstream.';
        const decision = makeRoutingDecision(text, MOCK_MODELS);
        expect(decision.modelSize).toBe('4B');
        expect(decision.modelPath).toBe('/models/4b.gguf');
    });

    it('includes complexity score and reason', () => {
        const decision = makeRoutingDecision('Simple todo', MOCK_MODELS);
        expect(decision.complexityScore).toBeDefined();
        expect(decision.reason).toContain('2B');
    });

    it('falls back to first model if size not found', () => {
        const incompleteModels = MOCK_MODELS.filter(m => m.size !== '2B');
        const decision = makeRoutingDecision('Buy milk', incompleteModels);
        expect(decision.modelPath).toBe('/models/4b.gguf');
    });
});

describe('computeBlendedMetrics', () => {
    const mockResults: ExtractionResult[] = [
        { properties: [], modelUsed: '2B', latencyMs: 100, routingReason: 'test' },
        { properties: [], modelUsed: '2B', latencyMs: 150, routingReason: 'test' },
        { properties: [], modelUsed: '4B', latencyMs: 300, routingReason: 'test' },
        { properties: [], modelUsed: '4B', latencyMs: 400, routingReason: 'test' },
        { properties: [], modelUsed: '9B', latencyMs: 800, routingReason: 'test' },
    ];

    it('computes average latency', () => {
        const metrics = computeBlendedMetrics(mockResults);
        expect(metrics.avgLatencyMs).toBeCloseTo(350, 0);
    });

    it('computes p95 latency', () => {
        const metrics = computeBlendedMetrics(mockResults);
        // p95 of [100, 150, 300, 400, 800] is 800 (index 4)
        expect(metrics.p95LatencyMs).toBe(800);
    });

    it('computes model distribution', () => {
        const metrics = computeBlendedMetrics(mockResults);
        expect(metrics.modelDistribution['2B']).toBe(2);
        expect(metrics.modelDistribution['4B']).toBe(2);
        expect(metrics.modelDistribution['9B']).toBe(1);
    });

    it('returns total extractions', () => {
        const metrics = computeBlendedMetrics(mockResults);
        expect(metrics.totalExtractions).toBe(5);
    });
});

describe('validateModelsAvailable', () => {
    it('returns empty array when all models available', () => {
        const missing = validateModelsAvailable(MOCK_MODELS);
        expect(missing).toEqual([]);
    });

    it('returns missing model sizes', () => {
        const incompleteModels = MOCK_MODELS.filter(m => m.size !== '9B');
        const missing = validateModelsAvailable(incompleteModels);
        expect(missing).toEqual(['9B']);
    });

    it('returns all sizes when none provided', () => {
        const missing = validateModelsAvailable([]);
        expect(missing).toEqual(['2B', '4B', '9B']);
    });
});
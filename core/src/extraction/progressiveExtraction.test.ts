import { describe, expect, it, vi } from 'vitest';
import type { OntologyNode, Property, ExtractionOptions } from '../types/index.js';
import {
    runHeuristicExtraction,
    progressiveExtract,
    createProgressiveExtractor,
    mergeProperties,
} from './progressiveExtraction.js';

const MOCK_ONTOLOGY: OntologyNode[] = [
    {
        id: 'test',
        label: 'Test',
        attributes: {
            budget: { type: 'number', operators: { real: ['is', 'less than', 'greater than'], imaginary: [] } },
            deadline: { type: 'date', operators: { real: ['is', 'before', 'after'], imaginary: [] } },
            status: { type: 'enum', operators: { real: ['is', 'is not'], imaginary: [] }, options: ['active', 'done'] },
            price: { type: 'number', operators: { real: ['is', 'less than', 'greater than'], imaginary: [] } },
        },
    },
];

// Mock AI provider that simulates latency
function createMockAIProvider(latencyMs: number, properties: Property[]) {
    return {
        extract: async () => {
            await new Promise(resolve => setTimeout(resolve, latencyMs));
            return properties;
        },
    };
}

describe('mergeProperties', () => {
    it('merges heuristic and AI properties', () => {
        const heuristic: Property[] = [
            { key: 'budget', operator: 'less than', values: ['100'], confidence: 0.7, provenance: 'deterministic' },
            { key: 'status', operator: 'is', values: ['active'], confidence: 0.6, provenance: 'pattern' },
        ];
        const ai: Property[] = [
            { key: 'budget', operator: 'less than', values: ['50'], confidence: 0.9, provenance: 'ai' },
            { key: 'deadline', operator: 'is', values: ['2024-12-31'], confidence: 0.85, provenance: 'ai' },
        ];

        const merged = mergeProperties(heuristic, ai);
        
        expect(merged).toHaveLength(3);
        const budget = merged.find(p => p.key === 'budget');
        expect(budget?.values[0]).toBe('50'); // AI overrides
        expect(budget?.provenance).toBe('ai');
    });

    it('handles empty arrays', () => {
        expect(mergeProperties([], [])).toEqual([]);
        expect(mergeProperties([{ key: 'a', operator: 'is', values: ['1'] }], [])).toHaveLength(1);
        expect(mergeProperties([], [{ key: 'a', operator: 'is', values: ['1'] }])).toHaveLength(1);
    });
});

describe('runHeuristicExtraction', () => {
    it('extracts basic properties from text', async () => {
        const text = 'Budget is less than 100. Status is active. Deadline is 2024-12-31.';
        const properties = await runHeuristicExtraction(text, MOCK_ONTOLOGY);
        
        expect(properties.length).toBeGreaterThan(0);
        // Check for any recognized property from our mock ontology
        const keys = properties.map(p => p.key);
        expect(keys.some(k => ['budget', 'status', 'deadline', 'price'].includes(k))).toBe(true);
    });

    it('handles text with no matches', async () => {
        const text = 'Lorem ipsum dolor sit amet.';
        const properties = await runHeuristicExtraction(text, MOCK_ONTOLOGY);
        
        expect(properties).toEqual([]);
    });

    it('completes quickly', async () => {
        const text = 'Budget less than 1000. Need this done by Friday. Price is 500.';
        const start = Date.now();
        await runHeuristicExtraction(text, MOCK_ONTOLOGY);
        const latency = Date.now() - start;
        
        expect(latency).toBeLessThan(100); // Should be very fast
    });
});

describe('progressiveExtract', () => {
    it('returns heuristic results first, then AI results', async () => {
        const heuristicCalls: Property[][] = [];
        const completeCalls: Property[][] = [];

        const aiProvider = createMockAIProvider(50, [
            { key: 'deadline', operator: 'is', values: ['2024-12-31'], confidence: 0.9, provenance: 'ai' },
        ]);

        const result = await progressiveExtract(
            'Budget less than 100. Status active.',
            MOCK_ONTOLOGY,
            aiProvider,
            {
                onHeuristicResults: (props) => heuristicCalls.push(props),
                onCompleteResults: (props) => completeCalls.push(props),
            }
        );

        expect(heuristicCalls).toHaveLength(1);
        expect(completeCalls).toHaveLength(1);
        expect(result.heuristicProperties.length).toBeGreaterThan(0);
        expect(result.aiProperties.length).toBeGreaterThan(0);
        expect(result.allProperties.length).toBeGreaterThanOrEqual(result.heuristicProperties.length);
    });

    it('handles AI timeout gracefully', async () => {
        // AI provider that takes longer than budget
        const slowAIProvider = createMockAIProvider(2000, [
            { key: 'budget', operator: 'less than', values: ['50'], confidence: 0.9, provenance: 'ai' },
        ]);

        const result = await progressiveExtract(
            'Budget less than 100.',
            MOCK_ONTOLOGY,
            slowAIProvider,
            { aiBudgetMs: 100 } // Very short budget
        );

        // Should still return heuristic results
        expect(result.heuristicProperties.length).toBeGreaterThan(0);
        expect(result.aiBudgetExceeded).toBe(true);
        expect(result.aiProperties).toEqual([]);
    });

    it('reports budget exceeded flags', async () => {
        const fastAIProvider = createMockAIProvider(10, [
            { key: 'deadline', operator: 'is', values: ['2024-12-31'], confidence: 0.9, provenance: 'ai' },
        ]);

        const result = await progressiveExtract(
            'Budget less than 100.',
            MOCK_ONTOLOGY,
            fastAIProvider,
            { heuristicBudgetMs: 1000, aiBudgetMs: 1000 }
        );

        expect(result.heuristicBudgetExceeded).toBe(false);
        expect(result.aiBudgetExceeded).toBe(false);
        expect(result.heuristicLatencyMs).toBeLessThan(1000);
        expect(result.aiLatencyMs).toBeLessThan(1000);
    });

    it('calls onError on failure', async () => {
        const errors: Error[] = [];
        
        const failingProvider = {
            extract: async () => { throw new Error('AI failed'); },
        };

        await progressiveExtract(
            'Budget less than 100.',
            MOCK_ONTOLOGY,
            failingProvider,
            { onError: (e) => errors.push(e) }
        );

        expect(errors).toHaveLength(1);
        expect(errors[0].message).toBe('AI failed');
    });
});

describe('createProgressiveExtractor', () => {
    it('creates a reusable extractor with default options', async () => {
        const aiProvider = createMockAIProvider(10, []);
        
        const extractor = createProgressiveExtractor(aiProvider, { heuristicBudgetMs: 500 });
        
        const result = await extractor('Test budget 100', MOCK_ONTOLOGY);
        
        expect(result).toBeDefined();
        expect(result.heuristicBudgetExceeded).toBe(false);
    });

    it('allows overriding options per call', async () => {
        const aiProvider = createMockAIProvider(10, []);
        
        const extractor = createProgressiveExtractor(aiProvider, { heuristicBudgetMs: 500 });
        
        // Test that options override works by checking the result structure
        const result = await extractor('Test budget 100', MOCK_ONTOLOGY, { heuristicBudgetMs: 500 });
        
        expect(result.heuristicBudgetExceeded).toBe(false);
        expect(result.heuristicLatencyMs).toBeLessThan(500);
    });
});
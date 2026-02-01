import { describe, it, expect, vi } from 'vitest';
import { PropertyExtractionService } from '../../../services/ai/propertyExtraction';
import type { AIProvider } from '../../../services/ai/types';

describe('PropertyExtractionService', () => {
    const mockOntology = []; // Empty ontology for simplicity

    it('should use heuristic fallback when AI provider fails with specific error', async () => {
        const mockAIProvider: AIProvider = {
            name: 'Mock',
            isAvailable: true,
            generateCompletion: vi.fn().mockResolvedValue('does not support generic text generation'),
            alignToOntology: vi.fn().mockResolvedValue(['[price:is:100]']),
            analyzeOntology: vi.fn(),
            optimizeOntology: vi.fn(),
            suggestTags: vi.fn(),
        };

        const service = new PropertyExtractionService(mockAIProvider, mockOntology);
        const properties = await service.extractProperties('I want to sell for $100');

        expect(mockAIProvider.generateCompletion).toHaveBeenCalled();
        expect(mockAIProvider.alignToOntology).toHaveBeenCalled();
        expect(properties).toHaveLength(1);
        expect(properties[0]).toEqual({
            key: 'price',
            operator: 'is',
            values: ['100']
        });
    });

    it('should use heuristic fallback when AI provider throws error', async () => {
        const mockAIProvider: AIProvider = {
            name: 'Mock',
            isAvailable: true,
            generateCompletion: vi.fn().mockRejectedValue(new Error('Network error')),
            alignToOntology: vi.fn().mockResolvedValue(['[role:contains:dev]']),
            analyzeOntology: vi.fn(),
            optimizeOntology: vi.fn(),
            suggestTags: vi.fn(),
        };

        const service = new PropertyExtractionService(mockAIProvider, mockOntology);
        const properties = await service.extractProperties('Need a dev');

        expect(mockAIProvider.alignToOntology).toHaveBeenCalled();
        expect(properties).toHaveLength(1);
        expect(properties[0]).toEqual({
            key: 'role',
            operator: 'contains',
            values: ['dev']
        });
    });

    it('should return properties from AI completion when successful', async () => {
        const mockResponse = JSON.stringify([
            { key: 'role', operator: 'is', values: ['Engineer'] }
        ]);

        const mockAIProvider: AIProvider = {
            name: 'Mock',
            isAvailable: true,
            generateCompletion: vi.fn().mockResolvedValue(mockResponse),
            alignToOntology: vi.fn(),
            analyzeOntology: vi.fn(),
            optimizeOntology: vi.fn(),
            suggestTags: vi.fn(),
        };

        const service = new PropertyExtractionService(mockAIProvider, mockOntology);
        const properties = await service.extractProperties('Need Engineer');

        expect(mockAIProvider.generateCompletion).toHaveBeenCalled();
        expect(mockAIProvider.alignToOntology).not.toHaveBeenCalled();
        expect(properties).toHaveLength(1);
        expect(properties[0]).toEqual({
            key: 'role',
            operator: 'is',
            values: ['Engineer']
        });
    });
});

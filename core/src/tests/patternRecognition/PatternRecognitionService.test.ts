import { describe, it, expect } from 'vitest';
import { PatternRecognitionService } from '../../patternRecognition.js';
import { Note, OntologyNode } from '../../types/index.js';
import { Pattern } from '../../patternRecognition/types.js';

describe('PatternRecognitionService', () => {
    const mockOntology: OntologyNode[] = [
        {
            id: 'test',
            label: 'Test',
            attributes: {
                rate: { type: 'number', description: 'Rate', icon: 'cash', operators: { real: ['is'], imaginary: ['<', '>', 'between'] } }
            }
        }
    ];

    const service = new PatternRecognitionService();

    it('should match pattern with range condition using MatchEngine', () => {
        const pattern: Pattern = {
            id: 'p1',
            name: 'Test Pattern',
            description: 'Test',
            conditions: [
                { key: 'rate', operator: 'is', values: ['50-100'] }
            ],
            predictedActions: ['Action'],
            confidence: 1,
            lastUsed: 0,
            usageCount: 0,
            accuracyRate: 1
        };

        // Inject pattern
        (service as any).patterns.set('user1', { patterns: [pattern], userId: 'user1', lastUpdated: 0 });

        const note = {
            id: 'n1',
            title: 'Note 1',
            content: '',
            properties: [
                { key: 'rate', operator: 'is', values: ['80'] }
            ],
            updatedAt: new Date().toISOString()
        } as unknown as Note;

        const predictions = service.predictUserNeeds('user1', note, mockOntology);
        expect(predictions).toHaveLength(1);
        expect(predictions[0].pattern.id).toBe('p1');
    });

    it('should NOT match pattern with range condition without MatchEngine (legacy fallback)', () => {
        const pattern: Pattern = {
            id: 'p1',
            name: 'Test Pattern',
            description: 'Test',
            conditions: [
                { key: 'rate', operator: 'is', values: ['50-100'] }
            ],
            predictedActions: ['Action'],
            confidence: 1,
            lastUsed: 0,
            usageCount: 0,
            accuracyRate: 1
        };

        (service as any).patterns.set('user1', { patterns: [pattern], userId: 'user1', lastUpdated: 0 });

        const note = {
            id: 'n1',
            title: 'Note 1',
            content: '',
            properties: [
                { key: 'rate', operator: 'is', values: ['80'] }
            ],
            updatedAt: new Date().toISOString()
        } as unknown as Note;

        // No ontology passed -> fallback
        const predictions = service.predictUserNeeds('user1', note);
        expect(predictions).toHaveLength(0);
    });
});

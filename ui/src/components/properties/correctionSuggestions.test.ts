import { describe, expect, it } from 'vitest';
import type { OntologyNode, Property } from '@notention/core';
import {
    getCorrectionSuggestions,
    CONFUSION_PAIRS,
    IMPLIED_PROPERTIES,
    OPERATOR_CORRECTIONS,
} from './correctionSuggestions.js';

const MOCK_ONTOLOGY: OntologyNode[] = [
    {
        id: 'test',
        label: 'Test',
        attributes: {
            budget: { type: 'number', operators: { real: ['is', 'less than', 'greater than'], imaginary: [] } },
            price: { type: 'number', operators: { real: ['is', 'less than', 'greater than'], imaginary: [] } },
            schedule: { type: 'string', operators: { real: ['is', 'contains'], imaginary: [] } },
            frequency: { type: 'string', operators: { real: ['is', 'contains'], imaginary: [] } },
            student: { type: 'string', operators: { real: ['is'], imaginary: [] } },
            format: { type: 'enum', operators: { real: ['is'], imaginary: [] }, options: ['online', 'in-person'] },
            audience: { type: 'string', operators: { real: ['is'], imaginary: [] } },
            role: { type: 'string', operators: { real: ['is'], imaginary: [] } },
            location: { type: 'string', operators: { real: ['is'], imaginary: [] } },
            deadline: { type: 'date', operators: { real: ['is', 'before', 'after'], imaginary: [] } },
        },
    },
];

describe('correctionSuggestions', () => {
    describe('CONFUSION_PAIRS', () => {
        it('has price/budget confusion', () => {
            expect(CONFUSION_PAIRS.price).toContain('budget');
            expect(CONFUSION_PAIRS.budget).toContain('price');
        });

        it('has schedule/frequency confusion', () => {
            expect(CONFUSION_PAIRS.schedule).toContain('frequency');
            expect(CONFUSION_PAIRS.frequency).toContain('schedule');
        });
    });

    describe('IMPLIED_PROPERTIES', () => {
        it('implies budget with price', () => {
            expect(IMPLIED_PROPERTIES.price).toContain('budget');
        });

        it('implies frequency with schedule', () => {
            expect(IMPLIED_PROPERTIES.schedule).toContain('frequency');
        });
    });

    describe('OPERATOR_CORRECTIONS', () => {
        it('corrects budget operator', () => {
            expect(OPERATOR_CORRECTIONS.budget).toEqual(
                expect.arrayContaining([
                    { wrong: 'is', correct: 'less than' },
                ])
            );
        });
    });

    describe('getCorrectionSuggestions', () => {
        it('suggests budget when price is used', () => {
            const property: Property = {
                key: 'price',
                operator: 'is',
                values: ['100'],
                confidence: 0.8,
                provenance: 'ai',
            };

            const suggestions = getCorrectionSuggestions(property, [property], MOCK_ONTOLOGY);
            
            const budgetSuggestion = suggestions.find(s => s.action().key === 'budget');
            expect(budgetSuggestion).toBeDefined();
            expect(budgetSuggestion?.type).toBe('key');
            expect(budgetSuggestion?.confidence).toBeGreaterThan(0.8);
        });

        it('suggests price when budget is used', () => {
            const property: Property = {
                key: 'budget',
                operator: 'is',
                values: ['500'],
                confidence: 0.8,
                provenance: 'ai',
            };

            const suggestions = getCorrectionSuggestions(property, [property], MOCK_ONTOLOGY);
            
            const priceSuggestion = suggestions.find(s => s.action().key === 'price');
            expect(priceSuggestion).toBeDefined();
        });

        it('suggests frequency when schedule is used', () => {
            const property: Property = {
                key: 'schedule',
                operator: 'is',
                values: ['weekly'],
                confidence: 0.8,
                provenance: 'ai',
            };

            const suggestions = getCorrectionSuggestions(property, [property], MOCK_ONTOLOGY);
            
            const frequencySuggestion = suggestions.find(s => s.action().key === 'frequency');
            expect(frequencySuggestion).toBeDefined();
        });

        it('suggests implied properties', () => {
            const property: Property = {
                key: 'price',
                operator: 'is',
                values: ['100'],
                confidence: 0.8,
                provenance: 'ai',
            };

            const suggestions = getCorrectionSuggestions(property, [property], MOCK_ONTOLOGY);
            
            // Should suggest budget as implied property
            const impliedBudget = suggestions.find(s => 
                s.type === 'key' && s.action().key === 'budget' && s.message.includes('often needed')
            );
            expect(impliedBudget).toBeDefined();
        });

        it('corrects operator for budget', () => {
            const property: Property = {
                key: 'budget',
                operator: 'is',
                values: ['100'],
                confidence: 0.8,
                provenance: 'ai',
            };

            const suggestions = getCorrectionSuggestions(property, [property], MOCK_ONTOLOGY);
            
            const operatorSuggestion = suggestions.find(s => s.type === 'operator');
            expect(operatorSuggestion).toBeDefined();
            expect(operatorSuggestion?.action().operator).toBe('less than');
        });

        it('corrects operator for price', () => {
            const property: Property = {
                key: 'price',
                operator: 'greater than',
                values: ['50'],
                confidence: 0.8,
                provenance: 'ai',
            };

            const suggestions = getCorrectionSuggestions(property, [property], MOCK_ONTOLOGY);
            
            const operatorSuggestion = suggestions.find(s => s.type === 'operator');
            expect(operatorSuggestion).toBeDefined();
            expect(operatorSuggestion?.action().operator).toBe('less than');
        });

        it('suggests value format for date fields', () => {
            const property: Property = {
                key: 'deadline',
                operator: 'is',
                values: ['next friday'],
                confidence: 0.8,
                provenance: 'ai',
            };

            const suggestions = getCorrectionSuggestions(property, [property], MOCK_ONTOLOGY);
            
            const valueSuggestion = suggestions.find(s => s.type === 'value');
            expect(valueSuggestion).toBeDefined();
            expect(valueSuggestion?.message).toContain('date format');
        });

        it('does not suggest already existing keys', () => {
            const property: Property = {
                key: 'price',
                operator: 'is',
                values: ['100'],
                confidence: 0.8,
                provenance: 'ai',
            };
            const allProperties: Property[] = [
                property,
                { key: 'budget', operator: 'less than', values: ['200'], confidence: 0.7, provenance: 'ai' },
            ];

            const suggestions = getCorrectionSuggestions(property, allProperties, MOCK_ONTOLOGY);
            
            const budgetSuggestion = suggestions.find(s => s.action().key === 'budget');
            expect(budgetSuggestion).toBeUndefined(); // budget already exists
        });

        it('sorts by confidence descending', () => {
            const property: Property = {
                key: 'price',
                operator: 'is',
                values: ['100'],
                confidence: 0.8,
                provenance: 'ai',
            };

            const suggestions = getCorrectionSuggestions(property, [property], MOCK_ONTOLOGY);
            
            for (let i = 1; i < suggestions.length; i++) {
                expect(suggestions[i].confidence).toBeLessThanOrEqual(suggestions[i - 1].confidence);
            }
        });
    });
});
import { describe, it, expect } from 'vitest';
import { validateNote } from '../../validation.js';
import { Note, OntologyNode } from '../../types/index.js';

describe('Validation Logic', () => {
    const mockOntology: OntologyNode[] = [
        {
            id: 'job',
            label: 'Job',
            requiredAttributes: ['role', 'salary'],
            attributes: {
                role: { type: 'string', description: '', icon: '', operators: { real: ['is'], imaginary: [] }, aliases: ['position'] },
                salary: { type: 'number', description: '', icon: '', operators: { real: ['is'], imaginary: [] }, aliases: ['rate'] },
                location: { type: 'string', description: '', icon: '', operators: { real: ['is'], imaginary: [] } }
            }
        }
    ];

    function createNote(props: { key: string; value: string }[]): Note {
        return {
            id: '1',
            title: '',
            content: '',
            properties: props.map(p => ({ key: p.key, operator: 'is', values: [p.value] })),
            source: { type: 'user', identifier: 'test', timestamp: Date.now() },
            privacy: 'public',
            priority: 1,
            tags: [],
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };
    }

    it('should validate valid note with canonical keys', () => {
        const note = createNote([
            { key: 'role', value: 'Dev' },
            { key: 'salary', value: '100k' }
        ]);
        const result = validateNote(note, mockOntology);
        expect(result.isValid).toBe(true);
        expect(result.errors).toHaveLength(0);
    });

    it('should validate valid note with alias keys', () => {
        const note = createNote([
            { key: 'position', value: 'Dev' }, // alias for role
            { key: 'rate', value: '100k' }     // alias for salary
        ]);
        const result = validateNote(note, mockOntology);
        expect(result.isValid).toBe(true);
    });

    it('should fail note missing required property', () => {
        const note = createNote([
            { key: 'role', value: 'Dev' }
            // Missing salary
        ]);
        const result = validateNote(note, mockOntology);
        expect(result.isValid).toBe(false);
        expect(result.errors[0]).toContain("Missing required property: 'salary'");
    });

    it('should ignore requirements if note has no relevant properties', () => {
        const note = createNote([
            { key: 'something', value: 'else' }
        ]);
        const result = validateNote(note, mockOntology);
        expect(result.isValid).toBe(true); // Doesn't trigger "Job" requirements
    });
});

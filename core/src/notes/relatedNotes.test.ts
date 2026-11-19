import { describe, it, expect, beforeEach } from 'vitest';
import { RelatedNotesService, createRelatedNotesService } from './relatedNotes.js';
import { CoOccurrenceRecorder } from '../ontology/CoOccurrenceRecorder.js';
import type { Note, Property } from '../types/index.js';

const createMockNote = (overrides: Partial<Note> = {}): Note => ({
    id: 'note-1',
    title: 'Test Note',
    content: 'Test content',
    tags: [],
    properties: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    source: { type: 'user', identifier: 'test', timestamp: Date.now() },
    privacy: 'private',
    priority: 1,
    ...overrides,
});

const createMockProperty = (key: string, values: string[] = ['value']): Property => ({
    key,
    operator: 'is',
    values,
    role: 'fact',
    provenance: 'user',
});

describe('RelatedNotesService', () => {
    let coOccurrenceRecorder: CoOccurrenceRecorder;
    let ontology: any[];
    let notes: Note[];

    beforeEach(() => {
        coOccurrenceRecorder = new CoOccurrenceRecorder();
        ontology = [
            {
                id: 'task',
                label: 'Task',
                attributes: {
                    skill: { type: 'string' },
                    schedule: { type: 'string' },
                    rate: { type: 'number' },
                    budget: { type: 'number' },
                },
            },
        ];

        // Record some co-occurrence data
        coOccurrenceRecorder.record([
            { key: 'skill', values: ['coding'] },
            { key: 'schedule', values: ['weekends'] },
        ]);
        coOccurrenceRecorder.record([
            { key: 'skill', values: ['mentoring'] },
            { key: 'schedule', values: ['weekends'] },
        ]);

        notes = [
            createMockNote({
                id: 'note-1',
                title: 'Need weekend coding mentor',
                properties: [
                    createMockProperty('skill', ['coding']),
                    createMockProperty('schedule', ['weekends']),
                ],
                tags: ['mentor', 'coding'],
            }),
            createMockNote({
                id: 'note-2',
                title: 'Offer: Weekend coding mentor',
                properties: [
                    createMockProperty('skill', ['coding']),
                    createMockProperty('schedule', ['weekends']),
                ],
                tags: ['mentor', 'coding'],
            }),
            createMockNote({
                id: 'note-3',
                title: 'Offer: Weekday coding tutor',
                properties: [
                    createMockProperty('skill', ['coding']),
                    createMockProperty('schedule', ['weekdays']),
                ],
                tags: ['tutor', 'coding'],
            }),
            createMockNote({
                id: 'note-4',
                title: 'Unrelated note',
                properties: [
                    createMockProperty('budget', ['100']),
                ],
                tags: ['finance'],
            }),
        ];
    });

    it('should find related notes by shared properties', () => {
        const service = createRelatedNotesService(notes, coOccurrenceRecorder, ontology);
        const targetNote = notes[0]; // Need weekend coding mentor
        const related = service.findRelated(targetNote);

        expect(related.length).toBeGreaterThan(0);
        const note2 = related.find(r => r.note.id === 'note-2');
        expect(note2).toBeDefined();
        expect(note2!.score).toBeGreaterThan(0.5); // High score for exact property match
    });

    it('should find related notes by shared tags', () => {
        const service = createRelatedNotesService(notes, coOccurrenceRecorder, ontology, {
            includeTagOnly: true,
            tagWeight: 0.3,
        });
        const targetNote = notes[0];
        const related = service.findRelated(targetNote);

        const note3 = related.find(r => r.note.id === 'note-3');
        expect(note3).toBeDefined();
        // Should have some score from shared 'coding' tag
        expect(note3!.score).toBeGreaterThan(0);
    });

    it('should not include the target note itself', () => {
        const service = createRelatedNotesService(notes, coOccurrenceRecorder, ontology);
        const targetNote = notes[0];
        const related = service.findRelated(targetNote);

        const self = related.find(r => r.note.id === targetNote.id);
        expect(self).toBeUndefined();
    });

    it('should respect minScore threshold', () => {
        const service = createRelatedNotesService(notes, coOccurrenceRecorder, ontology, {
            minScore: 0.9,
        });
        const targetNote = notes[0];
        const related = service.findRelated(targetNote);

        // Only very high scoring matches should pass
        for (const r of related) {
            expect(r.score).toBeGreaterThanOrEqual(0.9);
        }
    });

    it('should respect limit', () => {
        const service = createRelatedNotesService(notes, coOccurrenceRecorder, ontology, {
            limit: 2,
        });
        const targetNote = notes[0];
        const related = service.findRelated(targetNote);

        expect(related.length).toBeLessThanOrEqual(2);
    });

    it('should find backlinks via inResponseTo property', () => {
        const notesWithBacklinks = [
            createMockNote({
                id: 'request-1',
                title: 'Original request',
                properties: [createMockProperty('intent', ['request'])],
            }),
            createMockNote({
                id: 'response-1',
                title: 'Response to request',
                properties: [
                    createMockProperty('intent', ['response']),
                    createMockProperty('inResponseTo', ['request-1']),
                ],
            }),
            createMockNote({
                id: 'response-2',
                title: 'Another response',
                properties: [
                    createMockProperty('intent', ['response']),
                    createMockProperty('inResponseTo', ['request-1']),
                ],
            }),
        ];

        const service = createRelatedNotesService(notesWithBacklinks, coOccurrenceRecorder, ontology);
        const targetNote = notesWithBacklinks[0];
        const backlinks = service.findBacklinks(targetNote);

        expect(backlinks.length).toBe(2);
        expect(backlinks.map(b => b.id).sort()).toEqual(['response-1', 'response-2']);
    });

    it('should find backlinks via references property', () => {
        const notesWithBacklinks = [
            createMockNote({ id: 'note-a', title: 'Note A' }),
            createMockNote({
                id: 'note-b',
                title: 'Note B',
                properties: [createMockProperty('references', ['note-a'])],
            }),
        ];

        const service = createRelatedNotesService(notesWithBacklinks, coOccurrenceRecorder, ontology);
        const backlinks = service.findBacklinks(notesWithBacklinks[0]);

        expect(backlinks.length).toBe(1);
        expect(backlinks[0].id).toBe('note-b');
    });

    it('should update notes when updateNotes is called', () => {
        const service = createRelatedNotesService(notes, coOccurrenceRecorder, ontology);
        const targetNote = notes[0];
        let related = service.findRelated(targetNote);
        const initialCount = related.length;

        // Add a new highly related note
        const newNote = createMockNote({
            id: 'note-5',
            title: 'Another weekend coding mentor',
            properties: [
                createMockProperty('skill', ['coding']),
                createMockProperty('schedule', ['weekends']),
            ],
            tags: ['mentor', 'coding'],
        });

        service.updateNotes([...notes, newNote]);
        related = service.findRelated(targetNote);

        expect(related.length).toBeGreaterThanOrEqual(initialCount);
        const found = related.find(r => r.note.id === 'note-5');
        expect(found).toBeDefined();
    });

    it('should score ontology keys higher than unknown keys', () => {
        const customOntology = [
            {
                id: 'custom',
                label: 'Custom',
                attributes: {
                    knownKey: { type: 'string' },
                },
            },
        ];

        // Target note has BOTH known and unknown keys
        const customNotes = [
            createMockNote({
                id: 'note-1',
                properties: [
                    createMockProperty('knownKey', ['value']),
                    createMockProperty('unknownKey', ['value']),
                ],
            }),
            createMockNote({
                id: 'note-2',
                properties: [createMockProperty('knownKey', ['value'])],
            }),
            createMockNote({
                id: 'note-3',
                properties: [createMockProperty('unknownKey', ['value'])],
            }),
        ];

        const service = createRelatedNotesService(customNotes, coOccurrenceRecorder, customOntology, {
            minScore: 0.01, // Low threshold to catch unknown key matches
        });
        const targetNote = customNotes[0];

        const related = service.findRelated(targetNote);
        const knownKeyMatch = related.find(r => r.note.id === 'note-2');
        const unknownKeyMatch = related.find(r => r.note.id === 'note-3');

        expect(knownKeyMatch).toBeDefined();
        expect(unknownKeyMatch).toBeDefined();

        // Known key should score higher (ontology keys get full weight, unknown get half)
        expect(knownKeyMatch!.score).toBeGreaterThan(unknownKeyMatch!.score);
    });
});
import { describe, it, expect, beforeEach } from 'vitest';
import type { Note, Property } from '../types/index.js';
import { migrateNotes, migrateNote, validateMigration, createOntologyVersion, clearMigrationMarkers } from './ontologyMigration.js';
import type { OntologyChange, OntologyVersion } from './OntologyAdapter.js';

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

const createMockProperty = (key: string, values: string[] = ['value'], operator: string = 'is'): Property => ({
    key,
    operator: operator as Property['operator'],
    values,
    role: 'fact',
    provenance: 'user',
});

describe('ontologyMigration', () => {
    let notes: Note[];

    beforeEach(() => {
        notes = [
            createMockNote({
                id: 'note-1',
                title: 'Task: Learn TypeScript',
                properties: [
                    createMockProperty('skill', ['TypeScript']),
                    createMockProperty('schedule', ['weekends']),
                ],
            }),
            createMockNote({
                id: 'note-2',
                title: 'Offer: Teach TypeScript',
                properties: [
                    createMockProperty('skill', ['TypeScript']),
                    createMockProperty('rate', ['50']),
                ],
            }),
            createMockNote({
                id: 'note-3',
                title: 'Unrelated: Buy groceries',
                properties: [
                    createMockProperty('budget', ['100']),
                ],
            }),
        ];
    });

    describe('migrateNote', () => {
        it('should add a new property', () => {
            const note = notes[0];
            const changes: OntologyChange[] = [{
                type: 'add',
                path: 'properties.newProp',
                after: 'default-value',
                reason: 'Add new property',
                evidence: [],
                timestamp: new Date(),
                version: '1.1.0',
            }];

            const { note: migrated, appliedChanges, errors } = migrateNote(note, changes);

            expect(errors).toHaveLength(0);
            expect(appliedChanges).toHaveLength(1);
            expect(migrated.properties.some(p => p.key === 'newProp' && p.values.includes('default-value'))).toBe(true);
        });

        it('should modify a property key (rename)', () => {
            const note = notes[0];
            const changes: OntologyChange[] = [{
                type: 'modify',
                path: 'properties.skill.key',
                before: 'skill',
                after: 'expertise',
                reason: 'Rename skill to expertise',
                evidence: [],
                timestamp: new Date(),
                version: '1.1.0',
            }];

            const { note: migrated, appliedChanges, errors } = migrateNote(note, changes);

            expect(errors).toHaveLength(0);
            expect(appliedChanges).toHaveLength(1);
            expect(migrated.properties.some(p => p.key === 'expertise')).toBe(true);
            expect(migrated.properties.some(p => p.key === 'skill')).toBe(false);
            expect(appliedChanges[0].details).toContain('Renamed property from skill to expertise');
        });

        it('should modify a property operator', () => {
            const note = notes[0];
            const changes: OntologyChange[] = [{
                type: 'modify',
                path: 'properties.schedule.operator',
                before: 'is',
                after: 'includes',
                reason: 'Change operator',
                evidence: [],
                timestamp: new Date(),
                version: '1.1.0',
            }];

            const { note: migrated, appliedChanges, errors } = migrateNote(note, changes);

            expect(errors).toHaveLength(0);
            expect(appliedChanges).toHaveLength(1);
            const scheduleProp = migrated.properties.find(p => p.key === 'schedule');
            expect(scheduleProp?.operator).toBe('includes');
        });

        it('should remove a property', () => {
            const note = notes[0];
            const changes: OntologyChange[] = [{
                type: 'remove',
                path: 'properties.schedule',
                reason: 'Remove schedule property',
                evidence: [],
                timestamp: new Date(),
                version: '1.1.0',
            }];

            const { note: migrated, appliedChanges, errors } = migrateNote(note, changes);

            expect(errors).toHaveLength(0);
            expect(appliedChanges).toHaveLength(1);
            expect(migrated.properties.some(p => p.key === 'schedule')).toBe(false);
        });

        it('should deprecate a property', () => {
            const note = notes[1]; // note-2 has 'rate' property
            const changes: OntologyChange[] = [{
                type: 'deprecate',
                path: 'properties.rate',
                reason: 'Deprecate rate property',
                evidence: [],
                timestamp: new Date(),
                version: '1.1.0',
            }];

            const { note: migrated, appliedChanges, errors } = migrateNote(note, changes);

            expect(errors).toHaveLength(0);
            expect(appliedChanges).toHaveLength(1);
            const rateProp = migrated.properties.find(p => p.key === 'rate');
            expect(rateProp?.role).toBe('marker'); // 'deprecated' not a valid PropertyRole, uses 'marker'
        });

        it('should be idempotent - running twice produces same result', () => {
            const note = notes[0];
            const changes: OntologyChange[] = [{
                type: 'add',
                path: 'properties.newProp',
                after: 'value',
                reason: 'Add property',
                evidence: [],
                timestamp: new Date(),
                version: '1.1.0',
            }];

            const { note: migrated1 } = migrateNote(note, changes);
            const { note: migrated2 } = migrateNote(migrated1, changes);

            expect(migrated2.properties.filter(p => p.key === 'newProp')).toHaveLength(1);
            expect(migrated2.properties.find(p => p.key === 'newProp')?.values).toEqual(['value']);
        });

        it('should skip changes for non-existent properties gracefully', () => {
            const note = notes[0];
            const changes: OntologyChange[] = [{
                type: 'modify',
                path: 'properties.nonexistent.key',
                before: 'nonexistent',
                after: 'newKey',
                reason: 'Rename non-existent',
                evidence: [],
                timestamp: new Date(),
                version: '1.1.0',
            }];

            const { note: migrated, appliedChanges, errors } = migrateNote(note, changes);

            expect(errors).toHaveLength(0);
            expect(appliedChanges).toHaveLength(0);
            // Migration marker should be added for idempotency
            expect(migrated.properties.some(p => p.key.startsWith('_migration_'))).toBe(true);
            // Original properties unchanged
            expect(migrated.properties.filter(p => !p.key.startsWith('_migration_'))).toEqual(note.properties);
        });
    });

    describe('migrateNotes', () => {
        it('should migrate multiple notes', () => {
            const version = createOntologyVersion('1.1.0', [{
                type: 'add',
                path: 'properties.category',
                after: 'general',
                reason: 'Add category',
                evidence: [],
                timestamp: new Date(),
                version: '1.1.0',
            }]);

            const result = migrateNotes(notes, version);

            expect(result.errors).toHaveLength(0);
            expect(result.migratedNotes).toHaveLength(3);
            result.migratedNotes.forEach(note => {
                expect(note.properties.some(p => p.key === 'category' && p.values.includes('general'))).toBe(true);
            });
        });

        it('should apply only relevant changes to each note', () => {
            const version = createOntologyVersion('1.1.0', [
                {
                    type: 'modify',
                    path: 'properties.skill.key',
                    before: 'skill',
                    after: 'expertise',
                    reason: 'Rename skill',
                    evidence: [],
                    timestamp: new Date(),
                    version: '1.1.0',
                },
                {
                    type: 'remove',
                    path: 'properties.budget',
                    reason: 'Remove budget',
                    evidence: [],
                    timestamp: new Date(),
                    version: '1.1.0',
                },
            ]);

            const result = migrateNotes(notes, version);

            expect(result.errors).toHaveLength(0);

            // note-1 and note-2 have 'skill' -> should be renamed
            expect(result.migratedNotes[0].properties.some(p => p.key === 'expertise')).toBe(true);
            expect(result.migratedNotes[1].properties.some(p => p.key === 'expertise')).toBe(true);

            // note-3 has 'budget' -> should be removed
            expect(result.migratedNotes[2].properties.some(p => p.key === 'budget')).toBe(false);
        });

        it('should track applied changes', () => {
            const version = createOntologyVersion('1.1.0', [{
                type: 'add',
                path: 'properties.newProp',
                after: 'value',
                reason: 'Add property',
                evidence: [],
                timestamp: new Date(),
                version: '1.1.0',
            }]);

            const result = migrateNotes(notes, version);

            expect(result.changesApplied).toHaveLength(1);
            expect(result.changesApplied[0].change.path).toBe('properties.newProp');
            expect(result.changesApplied[0].affectedNoteIds).toHaveLength(3);
        });
    });

    describe('validateMigration', () => {
        it('should warn when adding property that already exists', () => {
            const version = createOntologyVersion('1.1.0', [{
                type: 'add',
                path: 'properties.skill',
                after: 'default',
                reason: 'Add skill',
                evidence: [],
                timestamp: new Date(),
                version: '1.1.0',
            }]);

            const { valid, warnings } = validateMigration(notes, version);

            expect(valid).toBe(false);
            expect(warnings).toContainEqual(expect.stringContaining('already have this property'));
        });

        it('should warn when renaming to existing key', () => {
            const version = createOntologyVersion('1.1.0', [{
                type: 'modify',
                path: 'properties.schedule.key',
                before: 'schedule',
                after: 'skill',
                reason: 'Rename to skill',
                evidence: [],
                timestamp: new Date(),
                version: '1.1.0',
            }]);

            const { valid, warnings } = validateMigration(notes, version);

            expect(valid).toBe(false);
            expect(warnings).toContainEqual(expect.stringContaining('already have target key'));
        });

        it('should warn when removing non-existent property', () => {
            const version = createOntologyVersion('1.1.0', [{
                type: 'remove',
                path: 'properties.nonexistent',
                reason: 'Remove',
                evidence: [],
                timestamp: new Date(),
                version: '1.1.0',
            }]);

            const { valid, warnings } = validateMigration(notes, version);

            expect(valid).toBe(false);
            expect(warnings).toContainEqual(expect.stringContaining('no notes have this property'));
        });

        it('should pass validation for clean changes', () => {
            const version = createOntologyVersion('1.1.0', [{
                type: 'add',
                path: 'properties.newProp',
                after: 'value',
                reason: 'Add new',
                evidence: [],
                timestamp: new Date(),
                version: '1.1.0',
            }]);

            const { valid, warnings } = validateMigration(notes, version);

            expect(valid).toBe(true);
            expect(warnings).toHaveLength(0);
        });
    });

    describe('clearMigrationMarkers', () => {
        it('should remove migration markers for a version', () => {
            const version = createOntologyVersion('1.1.0', [{
                type: 'add',
                path: 'properties.newProp',
                after: 'value',
                reason: 'Add property',
                evidence: [],
                timestamp: new Date(),
                version: '1.1.0',
            }]);

            const result = migrateNotes(notes, version);
            const cleaned = clearMigrationMarkers(result.migratedNotes, '1.1.0');

            cleaned.forEach(note => {
                const markers = note.properties.filter(p => p.key.startsWith('_migration_'));
                expect(markers).toHaveLength(0);
            });
        });

        it('should preserve other migration markers', () => {
            const version1 = createOntologyVersion('1.1.0', [{
                type: 'add',
                path: 'properties.prop1',
                after: 'value',
                reason: 'Add prop1',
                evidence: [],
                timestamp: new Date(),
                version: '1.1.0',
            }]);

            const version2 = createOntologyVersion('1.2.0', [{
                type: 'add',
                path: 'properties.prop2',
                after: 'value',
                reason: 'Add prop2',
                evidence: [],
                timestamp: new Date(),
                version: '1.2.0',
            }]);

            let result = migrateNotes(notes, version1);
            console.log('After v1 markers:', result.migratedNotes[0].properties.filter(p => p.key.startsWith('_migration_')).map(p => p.key));
            
            result = migrateNotes(result.migratedNotes, version2);
            console.log('After v2 markers:', result.migratedNotes[0].properties.filter(p => p.key.startsWith('_migration_')).map(p => p.key));

            const cleaned = clearMigrationMarkers(result.migratedNotes, '1.1.0');
            console.log('After clear v1:', cleaned[0].properties.filter(p => p.key.startsWith('_migration_')).map(p => p.key));

            cleaned.forEach(note => {
                const v1Markers = note.properties.filter(p => p.key.includes('_1.1.0'));
                const v2Markers = note.properties.filter(p => p.key.includes('_1.2.0'));
                expect(v1Markers).toHaveLength(0);
                expect(v2Markers.length).toBeGreaterThan(0);
            });
        });
    });

    describe('createOntologyVersion', () => {
        it('should create version with timestamped changes', () => {
            const changes: OntologyChange[] = [{
                type: 'add',
                path: 'properties.test',
                after: 'value',
                reason: 'Test',
                evidence: [],
                timestamp: new Date('2024-01-01'),
                version: '1.0.0',
            }];

            const version = createOntologyVersion('2.0.0', changes, '1.0.0');

            expect(version.version).toBe('2.0.0');
            expect(version.baseVersion).toBe('1.0.0');
            expect(version.changes).toHaveLength(1);
            expect(version.changes[0].version).toBe('2.0.0');
        });
    });
});
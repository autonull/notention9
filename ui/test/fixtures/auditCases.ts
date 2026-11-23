import type {SeedOptions} from '../support/seed';
import {STORAGE_KEYS} from '../../src/config/storageKeys';
import {defaultSettings, demoNotes, deletedNote, noteWithDetails, taskNotes} from './workspace';

export interface AuditCase {
    id: string;
    state: string;
    prepare: SeedOptions;
    waitFor?: string;
    settleMs?: number;
}

export const auditCases: AuditCase[] = [
    {id: 'notes-empty', state: 'empty', prepare: {notes: [], settings: defaultSettings(), hash: '#notes'}, waitFor: '[data-empty-state]'},
    {id: 'notes-populated', state: 'populated', prepare: {notes: demoNotes(), settings: defaultSettings(), hash: '#notes'}, waitFor: '[data-testid="note-history-rail"]'},
    {id: 'note-page', state: 'populated', prepare: {notes: demoNotes(), settings: defaultSettings(), hash: '#notes/demo-request-react'}, waitFor: '[data-testid="page-surface"]'},
    {id: 'notes-grid', state: 'populated', prepare: {notes: demoNotes(), settings: defaultSettings(), hash: '#notes?mode=canvas'}, waitFor: '[data-testid="notes-grid-items"]'},
    {id: 'trash', state: 'populated', prepare: {notes: [deletedNote()], settings: defaultSettings(), hash: '#trash'}},
    {id: 'timeline', state: 'populated', prepare: {notes: demoNotes(), settings: defaultSettings(), hash: '#timeline'}, waitFor: '.rbc-calendar'},
    {id: 'notes-board', state: 'populated', prepare: {notes: [...demoNotes(), ...taskNotes()], settings: defaultSettings(), hash: '#notes?mode=board'}, waitFor: '[aria-label="Board"]'},
    {id: 'note-replies', state: 'populated', prepare: {notes: [noteWithDetails()], settings: defaultSettings(), hash: '#notes/scene-editor-note?tab=replies', storage: {[STORAGE_KEYS.contextOpen]: true}}, waitFor: '[data-testid="note-replies"]'},
    {id: 'labels', state: 'populated', prepare: {notes: demoNotes(), settings: defaultSettings(), hash: '#labels'}},
    {id: 'ontology', state: 'populated', prepare: {notes: demoNotes(), settings: defaultSettings(), hash: '#ontology'}, waitFor: 'text=shared vocabulary'},
    {id: 'map', state: 'populated', prepare: {notes: demoNotes(), settings: defaultSettings(), hash: '#map'}, waitFor: '.leaflet-container'},
    {id: 'settings', state: 'populated', prepare: {notes: demoNotes(), settings: defaultSettings(), hash: '#settings'}},
    {id: 'chat', state: 'empty', prepare: {notes: demoNotes(), settings: defaultSettings(), hash: '#chat'}},
    {id: 'editor', state: 'populated', prepare: {notes: [noteWithDetails()], settings: defaultSettings(), hash: '#notes/scene-editor-note'}},
    {id: 'explore', state: 'empty', prepare: {notes: demoNotes(), settings: defaultSettings(), hash: '#network'}, waitFor: 'text=No network notes found'},
];

import type {SeedOptions} from '../support/seed';
import {defaultSettings, demoNotes, deletedNote, noteWithDetails, taskNotes} from './workspace';

export interface AuditCase {
    id: string;
    state: string;
    prepare: SeedOptions;
    waitFor?: string;
    settleMs?: number;
}

export const auditCases: AuditCase[] = [
    {id: 'inbox-empty', state: 'empty', prepare: {notes: [], settings: defaultSettings(), hash: '#inbox'}},
    {id: 'inbox-populated', state: 'populated', prepare: {notes: demoNotes(), settings: defaultSettings(), hash: '#inbox'}, waitFor: '[data-testid="local-match"]'},
    {id: 'notes-list', state: 'populated', prepare: {notes: demoNotes(), settings: defaultSettings(), hash: '#notes/demo-request-react'}, waitFor: '.note-list-item'},
    {id: 'notes-grid', state: 'populated', prepare: {notes: demoNotes(), settings: defaultSettings(), hash: '#notes', sidebarViewMode: 'grid'}, waitFor: '.note-list-item'},
    {id: 'trash', state: 'populated', prepare: {notes: [deletedNote()], settings: defaultSettings(), hash: '#trash'}},
    {id: 'timeline', state: 'populated', prepare: {notes: demoNotes(), settings: defaultSettings(), hash: '#timeline'}, waitFor: '.rbc-calendar'},
    {id: 'actions', state: 'populated', prepare: {notes: [...demoNotes(), ...taskNotes()], settings: defaultSettings(), hash: '#actions'}, waitFor: '[aria-label="Running"]'},
    {id: 'responses', state: 'empty', prepare: {notes: demoNotes(), settings: defaultSettings(), hash: '#responses'}},
    {id: 'labels', state: 'populated', prepare: {notes: demoNotes(), settings: defaultSettings(), hash: '#labels'}},
    {id: 'ontology', state: 'populated', prepare: {notes: demoNotes(), settings: defaultSettings(), hash: '#ontology'}, waitFor: 'text=shared vocabulary'},
    {id: 'map', state: 'populated', prepare: {notes: demoNotes(), settings: defaultSettings(), hash: '#map'}, waitFor: '.leaflet-container'},
    {id: 'settings', state: 'populated', prepare: {notes: demoNotes(), settings: defaultSettings(), hash: '#settings'}},
    {id: 'chat', state: 'empty', prepare: {notes: demoNotes(), settings: defaultSettings(), hash: '#chat'}},
    {id: 'editor', state: 'populated', prepare: {notes: [noteWithDetails()], settings: defaultSettings(), hash: '#notes/scene-editor-note'}},
    {id: 'network', state: 'empty', prepare: {notes: demoNotes(), settings: defaultSettings(), hash: '#network'}, waitFor: 'text=No network notes found'},
];

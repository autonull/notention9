import type { Note, AppSettings } from '@notention/core';
import type { ParsedGoal } from './goalParser.js';

export interface SeedBuilderOptions {
    seedNotes?: Note[];
    seedSettings?: Partial<AppSettings>;
}

export function buildSeed(parsedGoal: ParsedGoal, options: SeedBuilderOptions = {}): { notes: Note[]; settings: Partial<AppSettings> } {
    const notes = options.seedNotes || generateDefaultNotes(parsedGoal);
    const settings = options.seedSettings || {
        ontology: [],
        aiEnabled: false,
        aiProvider: 'local',
        aiModel: '',
        googleGeminiApiKey: '',
        theme: 'dark',
    };

    // Adjust privacy based on constraints
    if (parsedGoal.constraints.privacy === 'public') {
        for (const note of notes) {
            note.privacy = 'public';
        }
    } else if (parsedGoal.constraints.privacy === 'private') {
        for (const note of notes) {
            note.privacy = 'private';
        }
    }

    return { notes, settings };
}

function generateDefaultNotes(parsedGoal: ParsedGoal): Note[] {
    const now = new Date().toISOString();
    const noteId = `synthesized-${Date.now()}`;

    return [{
        id: noteId,
        title: parsedGoal.targetState.path.includes('property')
            ? 'Note for property test'
            : 'Synthesized Note',
        content: 'Test content for synthesized journey',
        tags: ['test', 'synthesized'],
        properties: parsedGoal.targetState.type === 'property'
            ? [{ key: parsedGoal.targetState.path.split('.').pop() || 'test', operator: 'is', values: ['test-value'] }]
            : [],
        createdAt: now,
        updatedAt: now,
        source: { type: 'user', identifier: 'user-default', timestamp: Date.now() },
        privacy: 'private',
        priority: 1,
    }];
}
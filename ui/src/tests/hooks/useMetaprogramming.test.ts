import { describe, it, expect } from 'vitest';
import { getUpdatedSettings } from '../../hooks/useMetaprogramming';
import { Note, AppSettings } from '@notention/core';

describe('getUpdatedSettings', () => {
    const defaultSettings: AppSettings = {
        theme: 'dark',
        developerMode: false,
        aiEnabled: false,
        ontology: [],
        nostr: { relays: [], privkey: null },
        customTemplates: []
    };

    function createNote(id: string, tags: string[], properties: any[], updatedAt: string): Note {
        return {
            id,
            title: 'Note',
            content: '',
            tags,
            properties,
            updatedAt
        } as unknown as Note;
    }

    it('should return null if no config notes', () => {
        const notes = [createNote('1', [], [], new Date().toISOString())];
        const updates = getUpdatedSettings(notes, defaultSettings);
        expect(updates).toBeNull();
    });

    it('should update theme if config note present', () => {
        const notes = [
            createNote('1', ['#config'], [{ key: 'theme', values: ['light'] }], new Date().toISOString())
        ];
        const updates = getUpdatedSettings(notes, defaultSettings);
        expect(updates).toEqual({ theme: 'light' });
    });

    it('should update developer_mode', () => {
        const notes = [
            createNote('1', ['#config'], [{ key: 'developer_mode', values: ['true'] }], new Date().toISOString())
        ];
        const updates = getUpdatedSettings(notes, defaultSettings);
        expect(updates).toEqual({ developerMode: true });
    });

    it('should respect update order (latest note wins)', () => {
        const oldDate = new Date('2024-01-01').toISOString();
        const newDate = new Date('2024-01-02').toISOString();

        // Notes order in array shouldn't matter as we sort by date
        const notes = [
            createNote('2', ['#config'], [{ key: 'theme', values: ['light'] }], newDate), // Newest
            createNote('1', ['#config'], [{ key: 'theme', values: ['dark'] }], oldDate)   // Oldest
        ];

        // Oldest sets dark, Newest sets light -> Result should be light
        const updates = getUpdatedSettings(notes, defaultSettings);
        expect(updates).toEqual({ theme: 'light' });
    });

    it('should not update if value is same', () => {
        const notes = [
            createNote('1', ['#config'], [{ key: 'theme', values: ['dark'] }], new Date().toISOString())
        ];
        const updates = getUpdatedSettings(notes, defaultSettings); // default is dark
        expect(updates).toBeNull();
    });
});

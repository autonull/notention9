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

    function createNote(id: string, tags: string[], properties: any[]): Note {
        return {
            id,
            title: 'Note',
            content: '',
            tags,
            properties,
            updatedAt: new Date().toISOString()
        } as unknown as Note;
    }

    it('should return null if no config notes', () => {
        const notes = [createNote('1', [], [])];
        const updates = getUpdatedSettings(notes, defaultSettings);
        expect(updates).toBeNull();
    });

    it('should update theme if config note present', () => {
        const notes = [
            createNote('1', ['#config'], [{ key: 'theme', values: ['light'] }])
        ];
        const updates = getUpdatedSettings(notes, defaultSettings);
        expect(updates).toEqual({ theme: 'light' });
    });

    it('should update developer_mode', () => {
        const notes = [
            createNote('1', ['#config'], [{ key: 'developer_mode', values: ['true'] }])
        ];
        const updates = getUpdatedSettings(notes, defaultSettings);
        expect(updates).toEqual({ developerMode: true });
    });

    it('should respect update order (latest note wins if logic implies overwrite)', () => {
        // Since we process oldest to newest in logic (reverse of input assuming input is desc),
        // effectively the "last processed" property wins.
        // Wait, I reversed the input `[...configNotes].reverse()`.
        // If input is [newest, oldest], reversed is [oldest, newest].
        // Iterating [oldest, newest]:
        // 1. Oldest sets theme=dark
        // 2. Newest sets theme=light
        // Result: theme=light. Correct.

        const notes = [
            createNote('2', ['#config'], [{ key: 'theme', values: ['light'] }]), // Newest
            createNote('1', ['#config'], [{ key: 'theme', values: ['dark'] }])   // Oldest
        ];

        const updates = getUpdatedSettings(notes, defaultSettings);
        expect(updates).toEqual({ theme: 'light' });
    });

    it('should not update if value is same', () => {
        const notes = [
            createNote('1', ['#config'], [{ key: 'theme', values: ['dark'] }])
        ];
        const updates = getUpdatedSettings(notes, defaultSettings); // default is dark
        expect(updates).toBeNull();
    });
});

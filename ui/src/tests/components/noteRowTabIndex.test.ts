import {describe, expect, it} from 'vitest';
import {createNote} from '@notention/core';
import {noteRowTabIndex} from '../../components/sidebar/useNoteDisplay';

const notes = ['a', 'b', 'c'].map(id => createNote({id, title: id}));

describe('noteRowTabIndex', () => {
    it('makes the selected row the only tab stop', () => {
        expect(notes.map(note => noteRowTabIndex(notes, 'b', note.id))).toEqual([-1, 0, -1]);
    });

    it('falls back to the first row when the selection is elsewhere', () => {
        expect(notes.map(note => noteRowTabIndex(notes, 'missing', note.id))).toEqual([0, -1, -1]);
        expect(notes.map(note => noteRowTabIndex(notes, null, note.id))).toEqual([0, -1, -1]);
    });
});

import {describe, expect, it, vi} from 'vitest';
import {render, fireEvent} from '@testing-library/react';
import {createNote, type Note} from '@notention/core';
import {NoteListItem} from '../../components/sidebar/NoteListItem';
import {noteRowTabIndex} from '../../components/sidebar/useNoteDisplay';

const notes = ['a', 'b', 'c'].map(id => createNote({id, title: `Note ${id}`, content: `<p>Body ${id}</p>`}));

const renderList = (selectedNoteId: string | null = null) => {
    const onSelect = vi.fn();
    const {container} = render(
        <div role="list">
            {notes.map(note => (
                <NoteListItem
                    key={note.id}
                    note={note as Note}
                    isSelected={note.id === selectedNoteId}
                    onSelect={() => onSelect(note.id)}
                    tabIndex={noteRowTabIndex(notes, selectedNoteId, note.id)}
                />
            ))}
        </div>,
    );
    return {rows: Array.from(container.querySelectorAll<HTMLElement>('[data-row]')), onSelect};
};

describe('NoteListItem keyboard', () => {
    it('keeps one tab stop on the selected row', () => {
        const {rows} = renderList('b');
        expect(rows.map(row => row.tabIndex)).toEqual([-1, 0, -1]);
    });

    it('falls back to the first row when nothing is selected', () => {
        const {rows} = renderList(null);
        expect(rows.map(row => row.tabIndex)).toEqual([0, -1, -1]);
    });

    it('moves focus with arrows and Home/End', () => {
        const {rows} = renderList('a');
        rows[0].focus();
        fireEvent.keyDown(rows[0], {key: 'ArrowDown'});
        expect(document.activeElement).toBe(rows[1]);
        fireEvent.keyDown(rows[1], {key: 'End'});
        expect(document.activeElement).toBe(rows[2]);
        fireEvent.keyDown(rows[2], {key: 'ArrowUp'});
        expect(document.activeElement).toBe(rows[1]);
        fireEvent.keyDown(rows[1], {key: 'Home'});
        expect(document.activeElement).toBe(rows[0]);
    });

    it('opens the row with Enter or Space', () => {
        const {rows, onSelect} = renderList('a');
        fireEvent.keyDown(rows[0], {key: 'Enter'});
        fireEvent.keyDown(rows[1], {key: ' '});
        expect(onSelect.mock.calls).toEqual([['a'], ['b']]);
    });
});

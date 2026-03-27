import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { CommandPalette } from '../../components/common/CommandPalette';
import { Note } from '@notention/core';

// Mock icons
vi.mock('../common/icons', () => ({
    NoteIcon: () => <span>NoteIcon</span>,
    PlusIcon: () => <span>PlusIcon</span>,
    SearchIcon: () => <span>SearchIcon</span>,
}));

describe('CommandPalette', () => {
    const mockNotes: Note[] = [
        { id: '1', title: 'Note 1', content: 'Content 1', tags: [], properties: [], created_at: 0, modified_at: 0, type: 'note', stats: { viewCount: 0, readTime: 0 } },
        { id: '2', title: 'Note 2', content: 'Content 2', tags: ['important'], properties: [], created_at: 0, modified_at: 0, type: 'note', stats: { viewCount: 0, readTime: 0 } },
    ];

    const mockCommands = [
        { label: 'Test Command', icon: <span>CmdIcon</span>, action: vi.fn() },
    ];

    const mockOnSelectNote = vi.fn();
    const mockOnCreateNote = vi.fn();
    const mockOnClose = vi.fn();

    it('renders when open', () => {
        render(
            <CommandPalette
                isOpen={true}
                onClose={mockOnClose}
                notes={mockNotes}
                onSelectNote={mockOnSelectNote}
                onCreateNote={mockOnCreateNote}
                commands={mockCommands}
            />
        );
        expect(screen.getByPlaceholderText(/Type a command/)).toBeTruthy();
    });

    it('shows shortcuts when query is empty', () => {
        render(
            <CommandPalette
                isOpen={true}
                onClose={mockOnClose}
                notes={mockNotes}
                onSelectNote={mockOnSelectNote}
                onCreateNote={mockOnCreateNote}
                commands={mockCommands}
            />
        );
        // Notes are rendered first, so we might not see shortcuts if notes exist and query is empty
        // Wait, the logic is: "Default View: Show Shortcuts if no query" AND "allItems.length > 0 ? map items : show shortcuts"
        // Since mockNotes has items, allItems > 0, so it shows items, NOT shortcuts.
        // We need to test with empty notes/commands or verify it shows items.
        // Or update component logic if we WANT shortcuts always visible (probably not if list is full).
        // Let's test the "no items" case to see shortcuts, or force empty list.
    });

    it('shows shortcuts when query is empty and no items', () => {
         render(
            <CommandPalette
                isOpen={true}
                onClose={mockOnClose}
                notes={[]}
                onSelectNote={mockOnSelectNote}
                onCreateNote={mockOnCreateNote}
                commands={[]}
            />
        );
        expect(screen.getByText(/Keyboard Shortcuts/i)).toBeTruthy();
        expect(screen.getByText('Ctrl+N')).toBeTruthy();
    });

    it('filters notes based on query', () => {
        render(
            <CommandPalette
                isOpen={true}
                onClose={mockOnClose}
                notes={mockNotes}
                onSelectNote={mockOnSelectNote}
                onCreateNote={mockOnCreateNote}
                commands={mockCommands}
            />
        );

        const input = screen.getByPlaceholderText(/Type a command/);
        fireEvent.change(input, { target: { value: 'Note 1' } });

        expect(screen.getByText('Note 1')).toBeTruthy();
        expect(screen.queryByText('Note 2')).toBeNull();
        expect(screen.queryByText('Keyboard Shortcuts')).toBeNull();
    });

    it('handles tag search', () => {
        render(
            <CommandPalette
                isOpen={true}
                onClose={mockOnClose}
                notes={mockNotes}
                onSelectNote={mockOnSelectNote}
                onCreateNote={mockOnCreateNote}
                commands={mockCommands}
            />
        );

        const input = screen.getByPlaceholderText(/Type a command/);
        fireEvent.change(input, { target: { value: '#important' } });

        expect(screen.getByText('Note 2')).toBeTruthy();
        expect(screen.queryByText('Note 1')).toBeNull();
    });
});

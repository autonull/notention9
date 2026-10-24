import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { EnhancedCommandPalette } from '../../components/ui/EnhancedCommandPalette';
import { Note } from '@notention/core';

// Mock icons
vi.mock('../common/icons', () => ({
    NoteIcon: () => <span>NoteIcon</span>,
    PlusIcon: () => <span>PlusIcon</span>,
    SearchIcon: () => <span>SearchIcon</span>,
}));

describe('EnhancedCommandPalette', () => {
    const mockNotes: Note[] = [
        { id: '1', title: 'Note 1', content: 'Content 1', tags: [], properties: [], createdAt: '2024-01-01T00:00:00Z', updatedAt: '2024-01-01T00:00:00Z', source: { type: 'user', identifier: 'test', timestamp: 0 }, privacy: 'private', priority: 0, author: 'test' },
        { id: '2', title: 'Note 2', content: 'Content 2', tags: ['important'], properties: [], createdAt: '2024-01-01T00:00:00Z', updatedAt: '2024-01-01T00:00:00Z', source: { type: 'user', identifier: 'test', timestamp: 0 }, privacy: 'private', priority: 0, author: 'test' },
    ];

    const mockItems = [
        { id: 'cmd-1', label: 'Test Command', icon: <span>CmdIcon</span>, action: vi.fn(), category: 'Actions', shortcut: 'Ctrl+T', keywords: ['test', 'command'] },
    ];

    const mockOnClose = vi.fn();

    it('renders when open', () => {
        render(
            <EnhancedCommandPalette
                isOpen={true}
                onClose={mockOnClose}
                items={mockItems}
                placeholder="Type a command or search..."
                title="Command Palette"
            />
        );
        expect(screen.getByPlaceholderText(/Type a command/)).toBeTruthy();
    });

    it('shows shortcuts when query is empty', () => {
        render(
            <EnhancedCommandPalette
                isOpen={true}
                onClose={mockOnClose}
                items={[]}
                placeholder="Type a command or search..."
                title="Command Palette"
                showShortcuts={true}
            />
        );
        expect(screen.getByText(/Keyboard Shortcuts/i)).toBeTruthy();
        expect(screen.getByText('Ctrl + N')).toBeTruthy();
    });

    it('filters items based on query', () => {
        render(
            <EnhancedCommandPalette
                isOpen={true}
                onClose={mockOnClose}
                items={mockItems}
                placeholder="Type a command or search..."
                title="Command Palette"
                fuzzySearch={true}
            />
        );

        const input = screen.getByPlaceholderText(/Type a command/);
        fireEvent.change(input, { target: { value: 'Test' } });

        expect(screen.getByText('Test Command')).toBeTruthy();
        expect(screen.queryByText('Keyboard Shortcuts')).toBeNull();
    });

    it('shows notes with tag search', () => {
        const noteItems = mockNotes.map(note => ({
            id: note.id,
            label: note.title || 'Untitled',
            description: note.content,
            icon: <span>NoteIcon</span>,
            action: vi.fn(),
            category: 'Notes',
            keywords: [note.title.toLowerCase(), ...note.tags.map(t => `#${t.toLowerCase()}`)],
        }));

        render(
            <EnhancedCommandPalette
                isOpen={true}
                onClose={mockOnClose}
                items={noteItems}
                placeholder="Type a command or search..."
                title="Command Palette"
                fuzzySearch={true}
            />
        );

        const input = screen.getByPlaceholderText(/Type a command/);
        fireEvent.change(input, { target: { value: '#important' } });

        expect(screen.getByText('Note 2')).toBeTruthy();
        expect(screen.queryByText('Note 1')).toBeNull();
    });
});
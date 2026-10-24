import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { EnhancedCommandPalette } from '../../components/ui/EnhancedCommandPalette';
import { Note } from '@notention/core';
import { MOD_LABEL } from '../../utils/platform';

// Mock icons
vi.mock('../common/icons', () => ({
    NoteIcon: () => <span>NoteIcon</span>,
    PlusIcon: () => <span>PlusIcon</span>,
    SearchIcon: () => <span>SearchIcon</span>,
    SearchSparkleIcon: () => <span>SearchSparkleIcon</span>,
    XIcon: () => <span>XIcon</span>,
    ClockIcon: () => <span>ClockIcon</span>,
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

    it('shows welcome empty state when no recent items', () => {
        render(
            <EnhancedCommandPalette
                isOpen={true}
                onClose={mockOnClose}
                items={[]}
                placeholder="Type a command or search..."
                title="Command Palette"
                showShortcuts={true}
                showRecent={false}
            />
        );
        expect(screen.getByText(/Welcome to Command Palette/i)).toBeTruthy();
        expect(screen.getByText(/View Shortcuts/i)).toBeTruthy();
    });

    it('shows shortcuts when help is opened', async () => {
        render(
            <EnhancedCommandPalette
                isOpen={true}
                onClose={mockOnClose}
                items={[]}
                placeholder="Type a command or search..."
                title="Command Palette"
                showShortcuts={true}
                showRecent={false}
            />
        );
        // Click the "View Shortcuts" button
        fireEvent.click(screen.getByText(/View Shortcuts/i));
        // Wait for help state to update - shows "Help & Shortcuts"
        await waitFor(() => {
            expect(screen.getByText(/Help & Shortcuts/i)).toBeTruthy();
        });
        expect(screen.getByText(`${MOD_LABEL} + N`)).toBeTruthy();
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

        // Find the button by its id since text is broken up by mark elements
        const button = screen.getByRole('option', { name: /command/i });
        expect(button).toBeTruthy();
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
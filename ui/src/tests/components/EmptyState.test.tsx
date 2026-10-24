import {describe, expect, it, vi} from 'vitest';
import {fireEvent, render, screen} from '@testing-library/react';
import {EmptyState, EmptyStatePreset} from '../../components/common/EmptyState';

describe('EmptyState', () => {
    it('renders contextual shortcuts when enabled', () => {
        render(<EmptyState title="Nothing here" showShortcuts shortcutContext="notes"/>);

        expect(screen.getByText('New note')).toBeTruthy();
        expect(screen.getByText('Search notes')).toBeTruthy();
    });

    it('omits shortcuts when not requested', () => {
        render(<EmptyState title="Nothing here" shortcutContext="notes"/>);

        expect(screen.queryByText('New note')).toBeNull();
    });
});

describe('EmptyStatePreset', () => {
    it('invokes first-note actions', () => {
        const onCreateNote = vi.fn();
        const onLoadSample = vi.fn();

        render(<EmptyStatePreset type="firstNote" onCreateNote={onCreateNote} onLoadSample={onLoadSample}/>);

        fireEvent.click(screen.getByRole('button', {name: /create your first note/i}));
        fireEvent.click(screen.getByRole('button', {name: /load sample workspace/i}));

        expect(onCreateNote).toHaveBeenCalledOnce();
        expect(onLoadSample).toHaveBeenCalledOnce();
    });

    it('clears a search that has no matches', () => {
        const onClearSearch = vi.fn();

        render(<EmptyStatePreset type="noMatches" searchTerm="missing" onClearSearch={onClearSearch}/>);
        fireEvent.click(screen.getByRole('button', {name: /clear search/i}));

        expect(onClearSearch).toHaveBeenCalledOnce();
    });
});

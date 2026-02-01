import React from 'react';
import { NoteIcon, PlusIcon } from '../common/icons';
import { Button } from '../common/Button';
import { EmptyState } from '../common/EmptyState';

interface SidebarEmptyStateProps {
    searchTerm: string;
    isTrashView: boolean;
    onCreateNote: (term?: string) => void;
}

export function SidebarEmptyState({ searchTerm, isTrashView, onCreateNote }: SidebarEmptyStateProps) {
    return (
        <EmptyState
            icon={NoteIcon}
            title={searchTerm ? 'No matching notes found' : (isTrashView ? 'Trash is empty' : 'Your notebook is empty')}
            description={searchTerm ? `Try adjusting your search for '${searchTerm}'` : 'Capture your ideas, daily tasks, and knowledge.'}
            action={
                searchTerm ? (
                    <Button
                        onClick={() => onCreateNote(searchTerm)}
                        icon={PlusIcon}
                    >
                        Create note &apos;{searchTerm}&apos;
                    </Button>
                ) : (
                    <Button
                        onClick={() => onCreateNote()}
                        icon={PlusIcon}
                    >
                        Create First Note
                    </Button>
                )
            }
        />
    );
};

import React from 'react';
import {PlusIcon, SparklesIcon, SearchIcon} from '../ui/icons';
import {Button} from '../ui/Button';
import {EmptyState, NotesEmptyIllustration, SearchEmptyIllustration, TrashEmptyIllustration} from '../ui/Primitives';
import {useDemoWorkspace} from '../../hooks/useDemoWorkspace';

interface SidebarEmptyStateProps {
    searchTerm: string;
    isTrashView: boolean;
    onCreateNote: (term?: string) => void;
}

export function SidebarEmptyState({searchTerm, isTrashView, onCreateNote}: SidebarEmptyStateProps) {
    const {load} = useDemoWorkspace();

    if (searchTerm) {
        return (
            <EmptyState
                variant="illustrated"
                illustration={<SearchEmptyIllustration/>}
                title="No matching notes found"
                description={`No notes match "${searchTerm}". Try broadening your search or creating a new note.`}
                showSearchSuggestion
                searchTerm={searchTerm}
                action={
                    <Button
                        onClick={() => onCreateNote(searchTerm)}
                        leftIcon={<PlusIcon className="w-4 h-4"/>}
                        size="md"
                    >
                        Create note "{searchTerm}"
                    </Button>
                }
            />
        );
    }

    if (isTrashView) {
        return (
            <EmptyState
                variant="illustrated"
                illustration={<TrashEmptyIllustration/>}
                title="Trash is empty"
                description="Deleted notes would appear here. Notes stay in trash for 30 days before being permanently removed."
                action={
                    <Button variant="ghost" size="sm" onClick={() => onCreateNote()}>
                        <PlusIcon className="w-4 h-4"/> Create a note instead
                    </Button>
                }
            />
        );
    }

    return (
        <EmptyState
            variant="illustrated"
            illustration={<NotesEmptyIllustration/>}
            title="Your notebook is empty"
            description="Capture your ideas, daily tasks, and knowledge. Everything you add becomes searchable and matchable."
            action={
                <div className="flex flex-col gap-2 w-full max-w-xs">
                    <Button
                        onClick={() => onCreateNote()}
                        leftIcon={<PlusIcon className="w-4 h-4"/>}
                        fullWidth
                        size="md"
                    >
                        Create First Note
                    </Button>
                    <Button onClick={load} variant="secondary" leftIcon={<SparklesIcon className="w-4 h-4"/>} fullWidth size="md">
                        Load sample workspace
                    </Button>
                </div>
            }
            secondaryAction={
                <Button variant="ghost" size="sm" onClick={() => onCreateNote('Quick capture')}>
                    <SearchIcon className="w-4 h-4"/> Try quick capture
                </Button>
            }
        />
    );
};

import React from 'react';
import {NoteIcon, PlusIcon, SparklesIcon} from '../common/icons';
import {Button} from '../common/Button';
import {EmptyState} from '../common/EmptyState';
import {useDemoWorkspace} from '../../hooks/useDemoWorkspace';

interface SidebarEmptyStateProps {
    searchTerm: string;
    isTrashView: boolean;
    onCreateNote: (term?: string) => void;
}

export function SidebarEmptyState({searchTerm, isTrashView, onCreateNote}: SidebarEmptyStateProps) {
    const {load} = useDemoWorkspace();
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
                    <div className="flex flex-col gap-2">
                        <Button
                            onClick={() => onCreateNote()}
                            icon={PlusIcon}
                        >
                            Create First Note
                        </Button>
                        {!isTrashView && (
                            <Button onClick={load} variant="secondary" icon={SparklesIcon}>
                                Load sample workspace
                            </Button>
                        )}
                    </div>
                )
            }
        />
    );
};

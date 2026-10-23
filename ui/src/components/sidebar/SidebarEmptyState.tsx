import React from 'react';
import {NoteIcon, PlusIcon, SparklesIcon} from '../common/icons';
import {Button} from '../ui/Primitives';
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
            variant="card"
            icon={NoteIcon}
            title={searchTerm ? 'No matching notes found' : (isTrashView ? 'Trash is empty' : 'Your notebook is empty')}
            description={searchTerm ? `Try adjusting your search for &#34;${searchTerm}&#34;` : 'Capture your ideas, daily tasks, and knowledge.'}
            action={
                searchTerm ? (
                    <Button
                        onClick={() => onCreateNote(searchTerm)}
                        leftIcon={<PlusIcon className="w-4 h-4"/>}
                        size="sm"
                    >
                        Create note &#34;{searchTerm}&#34;
                    </Button>
                ) : (
                    <div className="flex flex-col gap-2 w-full">
                        <Button
                            onClick={() => onCreateNote()}
                            leftIcon={<PlusIcon className="w-4 h-4"/>}
                            fullWidth
                            size="sm"
                        >
                            Create First Note
                        </Button>
                        {!isTrashView && (
                            <Button onClick={load} variant="secondary" leftIcon={<SparklesIcon className="w-4 h-4"/>} fullWidth size="sm">
                                Load sample workspace
                            </Button>
                        )}
                    </div>
                )
            }
        />
    );
};
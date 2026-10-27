import React from 'react';
import {Button} from '../ui/Button';
import {NoteIcon, PlusIcon} from '../ui/icons';
import {EmptyState} from '../ui/Primitives';

interface EmptyStateForNotesProps {
    onCreateNote: () => void;
}

export function EmptyStateForNotes({onCreateNote}: EmptyStateForNotesProps) {
    return (
        <section className="rounded-3xl border border-gray-700/50 bg-gray-900/50 p-8 animate-fade-in-up">
            <EmptyState
                icon={NoteIcon}
                title="No recent activity"
                description="Your notes will appear here as you create and edit them."
                action={
                    <Button
                        onClick={onCreateNote}
                        variant="primary"
                        leftIcon={<PlusIcon className="w-4 h-4"/>}
                        className="touch-target-48"
                    >
                        Create your first note
                    </Button>
                }
            />
        </section>
    );
}
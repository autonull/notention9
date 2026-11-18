import React from 'react';
import type {Note} from '@notention/core';
import {PlusIcon} from '../ui/icons';

import {useNotesView} from '../../hooks/useNotesView';
import {useView} from '../../hooks/useViewContext';
import {EditorManager} from '../editor/EditorManager';
import {NoteListItem} from '../sidebar/NoteListItem';
import {EmptyState, NotesEmptyIllustration} from '../ui/Primitives';
import {Button} from '../ui/Button';

interface NotesViewProps {
    sortedNotes?: Note[];
}

export function NotesView({sortedNotes = []}: NotesViewProps) {
    const {selectedNote, updateNote} = useNotesView();

    if (selectedNote) {
        return (
            <EditorManager
                key={selectedNote.id}
                note={selectedNote}
                onSave={updateNote}
                sortedNotes={sortedNotes}
            />
        );
    }

    return <NotesList notes={sortedNotes}/>;
}

function NotesList({notes}: {notes: Note[]}) {
    const {selectedNoteId, setSelectedNoteId, setActiveView, searchTerm} = useView();

    const openCapture = () => {
        setActiveView('inbox');
        requestAnimationFrame(() => window.dispatchEvent(new CustomEvent('focus-capture')));
    };

    const selectNote = (id: string) => {
        setSelectedNoteId(id);
        setActiveView('notes');
    };

    return (
        <div className="h-full overflow-y-auto bg-gray-950 text-white p-4 md:p-6 lg:p-8">
            <div className="max-w-3xl mx-auto space-y-4">
                <header className="flex items-baseline justify-between gap-4">
                    <h1 className="text-xl font-semibold">Notes</h1>
                    <div className="flex items-center gap-2">
                        {notes.length > 0 && <span className="text-xs text-gray-500">{notes.length}</span>}
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={openCapture}
                            aria-label="Capture a new note"
                            className="touch-target-48"
                        >
                            <PlusIcon className="w-4 h-4"/>
                        </Button>
                    </div>
                </header>

                {notes.length > 0 ? (
                    <div className="space-y-2" role="list">
                        {notes.map(note => (
                            <NoteListItem
                                key={note.id}
                                note={note}
                                isSelected={selectedNoteId === note.id}
                                onSelect={() => selectNote(note.id)}
                            />
                        ))}
                    </div>
                ) : (
                    <EmptyState
                        variant="illustrated"
                        illustration={<NotesEmptyIllustration/>}
                        title={searchTerm ? 'No notes match your search' : 'No notes yet'}
                        description={searchTerm
                            ? 'Try a different word, or clear the search to see every note.'
                            : 'Capture your first thought in the inbox. It stays on this device.'}
                        action={!searchTerm && (
                            <Button variant="primary" onClick={openCapture}>
                                Go to capture
                            </Button>
                        )}
                    />
                )}
            </div>
        </div>
    );
}

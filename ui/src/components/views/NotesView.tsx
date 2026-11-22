import React, {useMemo, useEffect, useRef, useState} from 'react';
import type {Note} from '@notention/core';

import {useNotesView} from '../../hooks/useNotesView';
import {useView} from '../../hooks/useViewContext';
import {useNotes} from '../../hooks/useNotes';
import {useToast} from '../../hooks/useToast';
import {EditorManager} from '../editor/EditorManager';
import {NoteListItem} from '../sidebar/NoteListItem';
import {NoteGridItem} from '../sidebar/NoteGridItem';
import {MapView} from './MapView';
import {TimelineView} from './TimelineView';
import {EmptyState, NotesEmptyIllustration, ConfirmationModal} from '../ui/Primitives';
import {Button} from '../ui/Button';
import {CaptureOmnibox} from '../capture/CaptureOmnibox';
import {type NoteMode, type NoteSection} from '../../config/uiSurfaces';
import {isTaskNote} from '../../utils/noteFilters';

type Section = NoteSection;
type Mode = NoteMode;

const UNGROUPED = 'unscheduled';
const STATUS_ORDER = ['todo', 'queued', 'planned', 'open', 'running', 'in-progress', 'blocked', 'review', 'completed', 'done', 'cancelled'];
const SCROLL_KEY = 'notention-notes-scroll';


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

    return <NotesWorkspace notes={sortedNotes}/>;
}

function NotesWorkspace({notes}: {notes: Note[]}) {
    const {
        selectedNoteId,
        setSelectedNoteId,
        notesSection,
        notesMode,
        searchTerm,
    } = useView();
    const {notes: allNotes, restoreNote, permanentlyDeleteNote} = useNotes();
    const {addToast} = useToast();
    const scrollRef = useRef<HTMLDivElement>(null);
    const [noteToDelete, setNoteToDelete] = useState<Note | null>(null);

    const section: Section = notesSection;
    const mode: Mode = notesMode;

    useEffect(() => {
        const saved = Number(sessionStorage.getItem(SCROLL_KEY) ?? '0');
        if (saved > 0) requestAnimationFrame(() => scrollRef.current?.scrollTo({top: saved}));
        return () => {
            sessionStorage.setItem(SCROLL_KEY, String(scrollRef.current?.scrollTop ?? 0));
        };
    }, []);

    const sourceNotes = section === 'trash' ? allNotes : notes;
    const filteredNotes = sourceNotes.filter(note => {
        const isDeleted = !!note.deletedAt;
        if (section === 'trash') return isDeleted;
        if (section === 'tasks') return isTaskNote(note);
        if (section === 'tags') return note.tags.length > 0;
        return !isDeleted;
    });

    const activeMode: Mode = section === 'trash' ? 'list' : mode;

    const openCapture = () => {
        sessionStorage.removeItem(SCROLL_KEY);
        window.dispatchEvent(new CustomEvent('focus-capture'));
    };

    const selectNote = (id: string) => {
        setSelectedNoteId(id);
    };

    const restore = (note: Note) => {
        restoreNote(note.id);
        addToast('Note restored', 'success');
    };

    const confirmDelete = () => {
        if (!noteToDelete) return;
        permanentlyDeleteNote(noteToDelete.id);
        addToast('Note permanently deleted', 'success');
        setNoteToDelete(null);
    };

    const renderNote = (note: Note) => section === 'trash' ? (
        <NoteListItem
            key={note.id}
            note={note}
            isSelected={selectedNoteId === note.id}
            onSelect={() => selectNote(note.id)}
            isTrash
            onRestore={() => restore(note)}
            onDelete={() => setNoteToDelete(note)}
        />
    ) : (
        <NoteGridItem
            key={note.id}
            note={note}
            isSelected={selectedNoteId === note.id}
            onSelect={() => selectNote(note.id)}
        />
    );

    const empty = filteredNotes.length === 0;

    return (
        <div ref={scrollRef} className="h-full overflow-y-auto custom-scrollbar">
            <div className="mx-auto w-full max-w-[1440px] px-4 pb-28 pt-4 md:px-6 md:pt-5">
                <CaptureOmnibox showSample/>

                <div className="mt-6">
                    {empty ? (
                        <div className="flex min-h-[36vh] items-center justify-center">
                            <EmptyState
                                variant="illustrated"
                                illustration={<NotesEmptyIllustration/>}
                                title={searchTerm ? 'No notes match your search' : section === 'trash' ? 'Trash is empty' : section === 'tasks' ? 'No tasks yet' : 'Your first note starts above'}
                                description={searchTerm
                                    ? 'Try a different word, or clear the search to see every note.'
                                    : section === 'trash'
                                    ? 'Deleted notes appear here.'
                                    : section === 'tasks'
                                    ? 'Add a "task" tag or status property to create tasks.'
                                    : 'Type what you need or offer. Press Enter to keep it. Matching happens on this device.'}
                                action={!searchTerm && section === 'all' ? (
                                    <Button variant="primary" onClick={openCapture}>Write a note</Button>
                                ) : undefined}
                            />
                        </div>
                    ) : activeMode === 'board' ? (
                        <Board notes={filteredNotes} renderNote={renderNote}/>
                    ) : activeMode === 'map' ? (
                        <MapView/>
                    ) : activeMode === 'timeline' ? (
                        <TimelineView/>
                    ) : activeMode === 'list' ? (
                        <div className="space-y-1 rounded-lg border border-[var(--app-line)] bg-[var(--app-surface)] p-1" role="list">
                            {filteredNotes.map(note => (
                                <NoteListItem
                                    key={note.id}
                                    note={note}
                                    isSelected={selectedNoteId === note.id}
                                    onSelect={() => selectNote(note.id)}
                                    isTrash={section === 'trash'}
                                    onRestore={section === 'trash' ? () => restore(note) : undefined}
                                    onDelete={section === 'trash' ? () => setNoteToDelete(note) : undefined}
                                />
                            ))}
                        </div>
                    ) : (
                        <div
                            className="grid grid-cols-1 gap-[var(--ui-gap)] sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4"
                            role="list"
                            aria-label="Notes"
                        >
                            {filteredNotes.map(renderNote)}
                        </div>
                    )}
                </div>
            </div>

            <ConfirmationModal
                isOpen={!!noteToDelete}
                onClose={() => setNoteToDelete(null)}
                onConfirm={confirmDelete}
                title="Delete note permanently?"
                message={`"${noteToDelete?.title || 'Untitled Note'}" will be removed forever. This cannot be undone.`}
                confirmLabel="Delete forever"
                isDestructive
            />
        </div>
    );
}

function Board({notes, renderNote}: {notes: Note[]; renderNote: (note: Note) => React.ReactNode}) {
    const columns = useMemo(() => {
        const groups = new Map<string, Note[]>();
        for (const note of notes) {
            const status = note.properties.find(p => p.key === 'status')?.values[0] ?? UNGROUPED;
            const key = status.toLowerCase();
            const bucket = groups.get(key) ?? [];
            bucket.push(note);
            groups.set(key, bucket);
        }

        const rank = (key: string) => {
            const index = STATUS_ORDER.indexOf(key);
            if (index !== -1) return index;
            return key === UNGROUPED ? 1000 : 500;
        };

        return [...groups.entries()].sort((a, b) => rank(a[0]) - rank(b[0]) || a[0].localeCompare(b[0]));
    }, [notes]);

    return (
        <div className="flex items-start gap-3 overflow-x-auto pb-4" role="list" aria-label="Board">
            {columns.map(([status, columnNotes]) => (
                <section key={status} role="listitem" className="w-[280px] shrink-0 rounded-xl border border-[var(--app-line)] bg-[var(--app-surface)]">
                    <h3 className="flex items-center justify-between gap-2 border-b border-[var(--app-line)] px-3 py-2.5 text-[12px] font-semibold text-[var(--app-text-secondary)]">
                        <span className="truncate capitalize" title={status === UNGROUPED ? 'No status' : status}>
                            {status === UNGROUPED ? 'No status' : status}
                        </span>
                        <span className="text-[11px] tabular-nums text-[var(--app-faint)]">{columnNotes.length}</span>
                    </h3>
                    <div className="space-y-2 p-2" role="list" aria-label={`${status === UNGROUPED ? 'No status' : status} notes`}>
                        {columnNotes.map(renderNote)}
                    </div>
                </section>
            ))}
        </div>
    );
}

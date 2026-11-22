import React, {useMemo, useEffect, useRef, useState} from 'react';
import type {Note} from '@notention/core';
import {ColumnsIcon, ClockIcon, GridIcon, ListIcon, MapIcon, PlusIcon} from '../ui/icons';

import {useNotesView} from '../../hooks/useNotesView';
import {useView} from '../../hooks/useViewContext';
import {useNotes} from '../../hooks/useNotes';
import {useToast} from '../../hooks/useToast';
import {useIsMobile} from '../../hooks/useMediaQuery';
import {EditorManager} from '../editor/EditorManager';
import {NoteListItem} from '../sidebar/NoteListItem';
import {NoteGridItem} from '../sidebar/NoteGridItem';
import {MapView} from './MapView';
import {TimelineView} from './TimelineView';
import {EmptyState, NotesEmptyIllustration, ConfirmationModal} from '../ui/Primitives';
import {Button} from '../ui/Button';
import {CaptureOmnibox} from '../capture/CaptureOmnibox';
import {cn} from '../../utils/ui';

type Section = 'all' | 'tasks' | 'tags' | 'trash';
type Mode = 'canvas' | 'list' | 'board' | 'map' | 'timeline';

const UNGROUPED = 'unscheduled';
const STATUS_ORDER = ['todo', 'queued', 'planned', 'open', 'running', 'in-progress', 'blocked', 'review', 'completed', 'done', 'cancelled'];
const SCROLL_KEY = 'notention-notes-scroll';

const MODES: {id: Mode; label: string; icon: typeof ListIcon}[] = [
    {id: 'canvas', label: 'Canvas', icon: GridIcon},
    {id: 'list', label: 'List', icon: ListIcon},
    {id: 'board', label: 'Board', icon: ColumnsIcon},
    {id: 'map', label: 'Map', icon: MapIcon},
    {id: 'timeline', label: 'Timeline', icon: ClockIcon},
];

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
        setNotesSection,
        notesMode,
        setNotesMode,
        searchTerm,
    } = useView();
    const {notes: allNotes, restoreNote, permanentlyDeleteNote} = useNotes();
    const {addToast} = useToast();
    const isMobile = useIsMobile();
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

    const isTask = (note: Note) =>
        note.tags.includes('task') || note.properties.some(p => p.key === 'status' && p.values.includes('todo'));

    const filteredNotes = notes.filter(note => {
        const isDeleted = !!note.deletedAt;
        if (section === 'trash') return isDeleted;
        if (section === 'tasks') return isTask(note);
        if (section === 'tags') return note.tags.length > 0;
        return !isDeleted;
    });

    const sections: {id: Section; label: string; count: number}[] = [
        {id: 'all', label: 'All', count: allNotes.filter(n => !n.deletedAt).length},
        {id: 'tasks', label: 'Tasks', count: allNotes.filter(n => isTask(n) && !n.deletedAt).length},
        {id: 'tags', label: 'Tags', count: allNotes.filter(n => n.tags.length > 0 && !n.deletedAt).length},
        {id: 'trash', label: 'Trash', count: allNotes.filter(n => n.deletedAt).length},
    ];

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
            <div className="mx-auto w-full max-w-[1600px] px-4 pb-24 pt-5 md:px-6 md:pt-6">
                <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
                    <div>
                        <h2 className="text-2xl font-semibold tracking-tight text-neutral-100">Notes</h2>
                        <p className="text-sm text-neutral-400">Your only work surface. Capture, browse, connect.</p>
                    </div>
                    <div className="flex flex-wrap items-center gap-1.5" role="tablist" aria-label="Note filters">
                        {sections.map(tab => (
                            <button
                                key={tab.id}
                                onClick={() => {
                                    setNotesSection(tab.id);
                                    if (tab.id === 'trash') setNotesMode('list');
                                }}
                                role="tab"
                                aria-selected={section === tab.id}
                                className={cn(
                                    'h-9 rounded-full border px-3 text-sm font-medium transition-colors',
                                    section === tab.id
                                        ? 'border-neutral-600 bg-neutral-800 text-neutral-100'
                                        : 'border-transparent text-neutral-400 hover:border-neutral-800 hover:text-neutral-300'
                                )}
                            >
                                {tab.label}
                                {tab.count > 0 && <span className="ml-1.5 text-xs tabular-nums text-neutral-400">{tab.count}</span>}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="mb-6">
                    <CaptureOmnibox autoFocus={section === 'all' && allNotes.length === 0 && !searchTerm} showSample/>
                </div>

                <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-1 rounded-xl border border-neutral-800 bg-neutral-900/60 p-1" role="tablist" aria-label="View mode">
                        {MODES.map(item => (
                            <button
                                key={item.id}
                                onClick={() => setNotesMode(item.id)}
                                role="tab"
                                aria-selected={activeMode === item.id}
                                disabled={section === 'trash' && item.id !== 'list'}
                                className={cn(
                                    'flex h-9 items-center gap-1.5 rounded-lg px-2.5 text-sm font-medium transition-colors',
                                    activeMode === item.id
                                        ? 'bg-neutral-800 text-neutral-100'
                                        : 'text-neutral-400 hover:text-neutral-300',
                                    section === 'trash' && item.id !== 'list' && 'opacity-30'
                                )}
                            >
                                <item.icon className="h-4 w-4"/>
                                <span className="hidden sm:inline">{item.label}</span>
                            </button>
                        ))}
                    </div>
                    <span className="text-sm text-neutral-400">
                        {filteredNotes.length} {filteredNotes.length === 1 ? 'note' : 'notes'}
                    </span>
                </div>

                {empty ? (
                    <div className="flex min-h-[40vh] items-center justify-center">
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
                    <div className="space-y-2" role="list">
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
                        className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-[repeat(auto-fill,minmax(320px,1fr))]"
                        role="list"
                        aria-label="Notes"
                    >
                        {filteredNotes.map(renderNote)}
                    </div>
                )}
            </div>

            {isMobile && (
                <button
                    type="button"
                    onClick={openCapture}
                    aria-label="Capture a new note"
                    className="fixed bottom-5 right-5 z-30 flex h-14 w-14 items-center justify-center rounded-full bg-neutral-100 text-neutral-950 shadow-xl"
                >
                    <PlusIcon className="h-6 w-6"/>
                </button>
            )}

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
        <div className="flex items-start gap-4 overflow-x-auto pb-4" role="list" aria-label="Board">
            {columns.map(([status, columnNotes]) => (
                <section key={status} role="listitem" className="w-72 shrink-0 rounded-xl border border-neutral-800 bg-neutral-900/40">
                    <h3 className="flex items-center justify-between px-3 py-2 text-sm font-semibold text-neutral-400">
                        <span className="truncate" title={status === UNGROUPED ? 'No status' : status}>
                            {status === UNGROUPED ? 'No status' : status}
                        </span>
                        <span className="text-neutral-400 tabular-nums">{columnNotes.length}</span>
                    </h3>
                    <div className="space-y-2 p-2" role="list" aria-label={`${status === UNGROUPED ? 'No status' : status} notes`}>
                        {columnNotes.map(renderNote)}
                    </div>
                </section>
            ))}
        </div>
    );
}

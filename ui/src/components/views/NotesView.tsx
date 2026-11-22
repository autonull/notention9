import React, {useMemo, useState} from 'react';
import type {Note} from '@notention/core';
import {PlusIcon, ListIcon, ColumnsIcon, MapIcon, ClockIcon} from '../ui/icons';

import {useNotesView} from '../../hooks/useNotesView';
import {useView} from '../../hooks/useViewContext';
import {useNotes} from '../../hooks/useNotes';
import {useToast} from '../../hooks/useToast';
import {EditorManager} from '../editor/EditorManager';
import {NoteListItem} from '../sidebar/NoteListItem';
import {MapView} from './MapView';
import {TimelineView} from './TimelineView';
import {EmptyState, NotesEmptyIllustration, ConfirmationModal} from '../ui/Primitives';
import {Button} from '../ui/Button';
import {cn} from '../../utils/ui';

type Section = 'all' | 'tasks' | 'tags' | 'trash';
type Mode = 'list' | 'board' | 'map' | 'timeline';

interface NotesViewProps {
    sortedNotes?: Note[];
}

const UNGROUPED = 'unscheduled';
/** Board columns read as workflow stages before alphabetical leftovers. */
const STATUS_ORDER = ['todo', 'queued', 'planned', 'open', 'running', 'in-progress', 'blocked', 'review', 'completed', 'done', 'cancelled'];

const MODES: {id: Mode; label: string; icon: typeof ListIcon}[] = [
    {id: 'list', label: 'List', icon: ListIcon},
    {id: 'board', label: 'Board', icon: ColumnsIcon},
    {id: 'map', label: 'Map', icon: MapIcon},
    {id: 'timeline', label: 'Timeline', icon: ClockIcon},
];

export function NotesView({sortedNotes = []}: NotesViewProps) {
    const {selectedNote, updateNote} = useNotesView();
    const {notesSection, notesMode, activeView} = useView();

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

    return <NotesList notes={sortedNotes} section={notesSection} mode={notesMode} activeView={activeView}/>;
}

function NotesList({notes, section: storedSection, mode: storedMode, activeView}: {
    notes: Note[];
    section: Section;
    mode: Mode;
    activeView: string;
}) {
    const {selectedNoteId, setSelectedNoteId, setActiveView, searchTerm, setNotesSection, setNotesMode} = useView();
    const {notes: allNotes, restoreNote, permanentlyDeleteNote} = useNotes();
    const {addToast} = useToast();
    const [noteToDelete, setNoteToDelete] = useState<Note | null>(null);

    // Deep links (#trash, #map, #timeline, #actions) drive the notebook surface.
    const section: Section = activeView === 'trash' ? 'trash' : storedSection === 'trash' ? 'all' : storedSection;
    const mode: Mode = activeView === 'map' ? 'map'
        : activeView === 'timeline' ? 'timeline'
        : activeView === 'actions' ? 'board'
        : storedMode;

    const chooseSection = (next: Section) => {
        if (next !== 'trash') setNotesSection(next);
        setActiveView(next === 'trash' ? 'trash' : 'notes');
    };

    const chooseMode = (next: Mode) => {
        setNotesMode(next);
        if (activeView !== 'notes') setActiveView('notes');
    };

    const openCapture = () => {
        setActiveView('capture');
        requestAnimationFrame(() => window.dispatchEvent(new CustomEvent('focus-capture')));
    };

    const selectNote = (id: string) => {
        setSelectedNoteId(id);
        setActiveView('notes');
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

    const isTask = (note: Note) => note.tags.includes('task') || note.properties.some(p => p.key === 'status' && p.values.includes('todo'));

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
    const isDocumentMode = activeMode === 'list' || activeMode === 'board';

    const renderNote = (note: Note) => (
        <NoteListItem
            key={note.id}
            note={note}
            isSelected={selectedNoteId === note.id}
            onSelect={() => selectNote(note.id)}
            isTrash={section === 'trash'}
            onRestore={section === 'trash' ? () => restore(note) : undefined}
            onDelete={section === 'trash' ? () => setNoteToDelete(note) : undefined}
        />
    );

    return (
        <div className="h-full flex flex-col bg-gray-950 text-white">
            <header className="flex-none flex flex-wrap items-center gap-x-3 gap-y-2 px-4 md:px-6 py-3 border-b border-gray-800/70">
                <h1 className="text-xl font-semibold mr-1">Notes</h1>

                <div className="flex items-center gap-0.5 bg-gray-900/50 rounded-lg p-0.5 border border-gray-700/50"
                     role="tablist" aria-label="Notes sections">
                    {sections.map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => chooseSection(tab.id)}
                            role="tab"
                            aria-selected={section === tab.id}
                            className={cn(
                                'px-2.5 py-1 text-xs font-medium rounded-md transition-colors',
                                section === tab.id
                                    ? 'bg-indigo-600/20 text-indigo-300'
                                    : 'text-gray-400 hover:text-white hover:bg-gray-800/50'
                            )}
                        >
                            {tab.label}
                            {tab.count > 0 && (
                                <span className={cn(
                                    'ml-1.5 text-[10px] tabular-nums',
                                    section === tab.id ? 'text-indigo-400/80' : 'text-gray-600'
                                )}>{tab.count}</span>
                            )}
                        </button>
                    ))}
                </div>

                <div className="ml-auto flex items-center gap-1">
                    {section !== 'trash' && (
                        <div className="flex items-center gap-0.5 bg-gray-900/50 rounded-lg p-0.5 border border-gray-700/50"
                             role="tablist" aria-label="View mode">
                            {MODES.map(tab => (
                                <button
                                    key={tab.id}
                                    onClick={() => chooseMode(tab.id)}
                                    role="tab"
                                    aria-selected={mode === tab.id}
                                    aria-label={tab.label}
                                    title={tab.label}
                                    className={cn(
                                        'p-1.5 rounded-md transition-colors',
                                        mode === tab.id
                                            ? 'bg-indigo-600/20 text-indigo-300'
                                            : 'text-gray-400 hover:text-white hover:bg-gray-800/50'
                                    )}
                                >
                                    <tab.icon className="w-4 h-4"/>
                                </button>
                            ))}
                        </div>
                    )}
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={openCapture}
                        aria-label="Capture a new note"
                        title="Capture a new note"
                        className="touch-target-48"
                    >
                        <PlusIcon className="w-4 h-4"/>
                    </Button>
                </div>
            </header>

            <div className={cn('flex-1 min-h-0', isDocumentMode ? 'overflow-y-auto' : 'overflow-hidden')}>
                {filteredNotes.length === 0 ? (
                    <div className="h-full flex items-center justify-center">
                        <EmptyState
                            variant="illustrated"
                            illustration={<NotesEmptyIllustration/>}
                            title={searchTerm ? 'No notes match your search' : section === 'trash' ? 'Trash is empty' : section === 'tasks' ? 'No tasks yet' : 'No notes yet'}
                            description={searchTerm
                                ? 'Try a different word, or clear the search to see every note.'
                                : section === 'trash'
                                ? 'Deleted notes appear here.'
                                : section === 'tasks'
                                ? 'Add a "task" tag or status property to create tasks.'
                                : 'Capture your first thought in the inbox. It stays on this device.'}
                            action={!searchTerm && section === 'all' && (
                                <Button variant="primary" onClick={openCapture}>
                                    Go to capture
                                </Button>
                            )}
                        />
                    </div>
                ) : activeMode === 'board' ? (
                    <Board notes={filteredNotes} renderNote={renderNote}/>
                ) : activeMode === 'map' ? (
                    <MapView/>
                ) : activeMode === 'timeline' ? (
                    <TimelineView/>
                ) : (
                    <div className="max-w-3xl mx-auto px-4 md:px-6 py-4" role="list">
                        {filteredNotes.map(renderNote)}
                    </div>
                )}
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
        <div className="flex items-start gap-4 px-4 md:px-6 py-4 overflow-x-auto" role="list" aria-label="Board">
            {columns.map(([status, columnNotes]) => (
                <section
                    key={status}
                    role="listitem"
                    className="w-64 shrink-0 rounded-xl border border-gray-800 bg-gray-900/40 animate-fade-in"
                >
                    <h2 className="flex items-center justify-between px-3 py-2 text-[11px] font-semibold uppercase tracking-wider text-gray-400">
                        <span className="truncate" title={status === UNGROUPED ? 'No status' : status}>
                            {status === UNGROUPED ? 'No status' : status}
                        </span>
                        <span className="text-gray-600 tabular-nums">{columnNotes.length}</span>
                    </h2>
                    <div className="space-y-2 p-2" role="list" aria-label={`${status === UNGROUPED ? 'No status' : status} notes`}>
                        {columnNotes.map(renderNote)}
                    </div>
                </section>
            ))}
        </div>
    );
}

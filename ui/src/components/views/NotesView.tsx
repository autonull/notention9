import React from 'react';
import type {Note} from '@notention/core';
import {PlusIcon, ListIcon, GridIcon, MapIcon, ClockIcon} from '../ui/icons';

import {useNotesView} from '../../hooks/useNotesView';
import {useView} from '../../hooks/useViewContext';
import {EditorManager} from '../editor/EditorManager';
import {NoteListItem} from '../sidebar/NoteListItem';
import {EmptyState, NotesEmptyIllustration} from '../ui/Primitives';
import {Button} from '../ui/Button';
import {cn} from '../../utils/ui';

interface NotesViewProps {
    sortedNotes?: Note[];
}

export function NotesView({sortedNotes = []}: NotesViewProps) {
    const {selectedNote, updateNote} = useNotesView();
    const {notesSection, notesMode} = useView();

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

    return <NotesList notes={sortedNotes} section={notesSection} mode={notesMode}/>;
}

function NotesList({notes, section, mode}: {notes: Note[]; section: 'all' | 'tasks' | 'tags' | 'trash'; mode: 'list' | 'board' | 'map' | 'timeline'}) {
    const {selectedNoteId, setSelectedNoteId, setActiveView, searchTerm, setNotesSection, setNotesMode} = useView();

    const openCapture = () => {
        setActiveView('capture');
        requestAnimationFrame(() => window.dispatchEvent(new CustomEvent('focus-capture')));
    };

    const selectNote = (id: string) => {
        setSelectedNoteId(id);
        setActiveView('notes');
    };

    const filteredNotes = notes.filter(note => {
        const isDeleted = !!note.deletedAt;
        if (section === 'trash') return isDeleted;
        if (section === 'tasks') return note.tags.includes('task') || note.properties.some(p => p.key === 'status' && p.values.includes('todo'));
        if (section === 'tags') return note.tags.length > 0;
        return !isDeleted;
    });

    const sectionTabs = [
        {id: 'all', label: 'All', count: notes.filter(n => !n.deletedAt).length},
        {id: 'tasks', label: 'Tasks', count: notes.filter(n => n.tags.includes('task') || n.properties.some(p => p.key === 'status' && p.values.includes('todo'))).length},
        {id: 'tags', label: 'Tags', count: notes.filter(n => n.tags.length > 0 && !n.deletedAt).length},
        {id: 'trash', label: 'Trash', count: notes.filter(n => n.deletedAt).length},
    ] as const;

    const modeTabs = [
        {id: 'list', label: 'List', icon: ListIcon},
        {id: 'board', label: 'Board', icon: GridIcon},
        {id: 'map', label: 'Map', icon: MapIcon},
        {id: 'timeline', label: 'Timeline', icon: ClockIcon},
    ] as const;

    return (
        <div className="h-full overflow-y-auto bg-gray-950 text-white p-4 md:p-6 lg:p-8">
            <div className="max-w-3xl mx-auto space-y-4">
                <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div className="flex items-center gap-4">
                        <h1 className="text-xl font-semibold">Notes</h1>
                        {/* Section tabs */}
                        <div className="flex items-center gap-1 bg-gray-900/50 rounded-lg p-1 border border-gray-700/50" role="tablist" aria-label="Notes sections">
                            {sectionTabs.map((tab) => (
                                <button
                                    key={tab.id}
                                    onClick={() => setNotesSection(tab.id as 'all' | 'tasks' | 'tags' | 'trash')}
                                    role="tab"
                                    aria-selected={section === tab.id}
                                    className={cn(
                                        'px-3 py-1.5 text-xs font-medium rounded-md transition-colors',
                                        section === tab.id
                                            ? 'bg-indigo-600/20 text-indigo-400'
                                            : 'text-gray-400 hover:text-white hover:bg-gray-800/50'
                                    )}
                                >
                                    {tab.label}
                                    {tab.count > 0 && <span className="ml-1.5 px-1.5 py-0.5 text-[10px] bg-gray-700 rounded-full">{tab.count}</span>}
                                </button>
                            ))}
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        {/* Mode switch */}
                        <div className="flex items-center gap-1 bg-gray-900/50 rounded-lg p-1 border border-gray-700/50" role="tablist" aria-label="View mode">
                            {modeTabs.map((tab) => (
                                <button
                                    key={tab.id}
                                    onClick={() => setNotesMode(tab.id as 'list' | 'board' | 'map' | 'timeline')}
                                    role="tab"
                                    aria-selected={mode === tab.id}
                                    className={cn(
                                        'p-1.5 rounded-md transition-colors',
                                        mode === tab.id
                                            ? 'bg-indigo-600/20 text-indigo-400'
                                            : 'text-gray-400 hover:text-white hover:bg-gray-800/50'
                                    )}
                                    aria-label={tab.label}
                                >
                                    <tab.icon className="w-4 h-4" />
                                </button>
                            ))}
                        </div>
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

                {filteredNotes.length > 0 ? (
                    mode === 'board' ? (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4" role="list">
                            {filteredNotes.map(note => (
                                <NoteListItem
                                    key={note.id}
                                    note={note}
                                    isSelected={selectedNoteId === note.id}
                                    onSelect={() => selectNote(note.id)}
                                />
                            ))}
                        </div>
                    ) : mode === 'map' ? (
                        <div className="space-y-2" role="list">
                            {filteredNotes.map(note => (
                                <NoteListItem
                                    key={note.id}
                                    note={note}
                                    isSelected={selectedNoteId === note.id}
                                    onSelect={() => selectNote(note.id)}
                                />
                            ))}
                        </div>
                    ) : mode === 'timeline' ? (
                        <div className="space-y-2" role="list">
                            {filteredNotes.map(note => (
                                <NoteListItem
                                    key={note.id}
                                    note={note}
                                    isSelected={selectedNoteId === note.id}
                                    onSelect={() => selectNote(note.id)}
                                />
                            ))}
                        </div>
                    ) : (
                        <div className="space-y-2" role="list">
                            {filteredNotes.map(note => (
                                <NoteListItem
                                    key={note.id}
                                    note={note}
                                    isSelected={selectedNoteId === note.id}
                                    onSelect={() => selectNote(note.id)}
                                />
                            ))}
                        </div>
                    )
                ) : (
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
                )}
            </div>
        </div>
    );
}

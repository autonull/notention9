import React, {useEffect, useMemo, useRef, useState} from 'react';
import {NoteFilter, type Note, type NotesSection} from '@notention/core';

import {useView} from '../../hooks/useViewContext';
import {useNotesView} from '../../hooks/useNotesView';
import {useNotes} from '../../hooks/useNotes';
import {useSettings} from '../../hooks/useSettingsContext';
import {useToast} from '../../hooks/useToast';
import {EditorManager} from '../editor/EditorManager';
import {NoteListItem} from '../sidebar/NoteListItem';
import {NoteGridItem} from '../sidebar/NoteGridItem';
import {NoteHistoryRail} from '../sidebar/NoteHistoryRail';
import {noteRowTabIndex} from '../sidebar/useNoteDisplay';
import {MapView} from './MapView';
import {TimelineView} from './TimelineView';
import {EmptyState, NotesEmptyIllustration, ConfirmationModal} from '../ui/Primitives';
import {Button} from '../ui/Button';
import {ArrowLeftIcon, PlusIcon} from '../ui/icons';
import {browseModeLabel} from '../../config/uiSurfaces';
import {selectIndex, type NoteIndexGroup} from '../../utils/noteIndex';

type Section = NotesSection;

const SCROLL_KEY = 'notention-notes-scroll';

export function NotesView() {
    const {selectedNote, updateNote} = useNotesView();
    const {
        selectedNoteId,
        setSelectedNoteId,
        notesSection,
        setNotesSection,
        notesMode,
        setNotesMode,
        sortOrder,
        setSortOrder,
        notesGroup,
        setNotesGroup,
        searchTerm,
        setSearchTerm,
        userLocation,
        historyShare,
        setHistoryShare,
    } = useView();
    const {notes: allNotes, restoreNote, permanentlyDeleteNote, addNote} = useNotes();
    const {settings} = useSettings();
    const {addToast} = useToast();
    const scrollRef = useRef<HTMLDivElement>(null);
    const [noteToDelete, setNoteToDelete] = useState<Note | null>(null);

    const section: Section = notesSection;
    const activeMode = section === 'trash' ? 'list' : notesMode;
    const modeSurface = activeMode !== 'list' && !selectedNote;

    useEffect(() => {
        const saved = Number(sessionStorage.getItem(SCROLL_KEY) ?? '0');
        if (saved > 0) requestAnimationFrame(() => scrollRef.current?.scrollTo({top: saved}));
        return () => {
            sessionStorage.setItem(SCROLL_KEY, String(scrollRef.current?.scrollTop ?? 0));
        };
    }, []);

    const noteFilter = useMemo(() => new NoteFilter(settings.ontology ?? []), [settings.ontology]);
    const index = useMemo(() => selectIndex(allNotes, {
        subset: section,
        arrangement: activeMode,
        order: sortOrder,
        group: notesGroup,
        query: searchTerm,
        location: userLocation,
    }, noteFilter), [allNotes, section, activeMode, sortOrder, notesGroup, searchTerm, userLocation, noteFilter]);

    const filteredNotes = index.items;
    const counts = index.counts;

    const selectNote = (id: string) => {
        if (section === 'trash') return;
        setSelectedNoteId(id);
    };

    const createNote = () => {
        const note = addNote({title: '', content: ''});
        setSelectedNoteId(note.id);
    };

    const restore = (note: Note) => {
        restoreNote(note.id);
        addToast('Note restored', 'success');
    };

    const renderNote = (note: Note) => (
        <NoteGridItem
            key={note.id}
            note={note}
            isSelected={selectedNoteId === note.id}
            onSelect={() => selectNote(note.id)}
        />
    );

    const confirmDelete = () => {
        if (!noteToDelete) return;
        permanentlyDeleteNote(noteToDelete.id);
        addToast('Note permanently deleted', 'success');
        setNoteToDelete(null);
        if (selectedNoteId === noteToDelete.id) setSelectedNoteId(null);
    };

    if (counts.all === 0 && counts.trash === 0 && !searchTerm) {
        return (
            <div className="flex h-full min-h-0 flex-col overflow-y-auto px-6 py-6 custom-scrollbar">
                <div aria-hidden="true" className="flex-1"/>
                <EmptyState
                    variant="illustrated"
                    illustration={<NotesEmptyIllustration/>}
                    title="No notes yet"
                    description="Start a page. A title, a sentence, one detail is enough."
                    action={
                        <Button onClick={createNote} variant="primary" size="sm" icon={PlusIcon}>
                            New note
                        </Button>
                    }
                    className="shrink-0"
                />
                <div aria-hidden="true" className="flex-1"/>
            </div>
        );
    }

    return (
        <div className="flex h-full min-h-0">
            <NoteHistoryRail
                notes={filteredNotes}
                counts={counts}
                section={section}
                onSectionChange={setNotesSection}
                mode={notesMode}
                onModeChange={setNotesMode}
                sortOrder={sortOrder}
                onSortOrderChange={setSortOrder}
                group={notesGroup}
                onGroupChange={setNotesGroup}
                selectedNoteId={selectedNoteId}
                onSelect={selectNote}
                searchTerm={searchTerm}
                onSearchChange={setSearchTerm}
                share={historyShare}
                onShareChange={setHistoryShare}
                onRestore={restore}
                onDelete={setNoteToDelete}
                className={selectedNote || modeSurface ? 'hidden lg:flex' : 'flex'}
            />

            <div className={selectedNote || modeSurface ? 'flex min-w-0 flex-1' : 'hidden min-w-0 flex-1 lg:flex'}>
                {selectedNote ? (
                    <EditorManager
                        key={selectedNote.id}
                        note={selectedNote}
                        onSave={updateNote}
                        sortedNotes={filteredNotes}
                    />
                ) : (
                    <div className="flex h-full min-h-0 w-full flex-col">
                        {modeSurface && (
                            <div className="flex h-11 shrink-0 items-center gap-2 border-b border-[var(--app-line)] px-3 lg:hidden">
                                <button
                                    type="button"
                                    onClick={() => setNotesMode('list')}
                                    className="inline-flex h-10 touch-target items-center gap-1 rounded-md px-2 text-[12px] font-medium text-[var(--app-muted)] transition-colors hover:bg-[var(--app-hover)] hover:text-[var(--app-text)]"
                                >
                                    <ArrowLeftIcon className="h-3.5 w-3.5"/>
                                    Notes
                                </button>
                                <span className="ml-auto text-[11px] font-medium text-[var(--app-faint)]">{browseModeLabel(activeMode)}</span>
                            </div>
                        )}
                        <div ref={scrollRef} className="flex min-h-0 flex-1 flex-col overflow-y-auto custom-scrollbar">
                            <div className="min-h-0 flex-1 px-4 pb-24 pt-4 md:px-6">
                                {filteredNotes.length === 0 ? (
                                    <div className="flex min-h-[40vh] items-center justify-center">
                                        <EmptyState
                                            variant="illustrated"
                                            illustration={<NotesEmptyIllustration/>}
                                            title={searchTerm ? 'No notes match your search' : section === 'trash' ? 'Trash is empty' : 'No notes yet'}
                                            description={searchTerm
                                                ? 'Try a different word, or clear the search to see every note.'
                                                : section === 'trash'
                                                ? 'Deleted notes appear here.'
                                                : 'Start a page. A title, a sentence, one detail is enough.'}
                                        />
                                    </div>
                                ) : activeMode === 'board' ? (
                                    <Board groups={index.groups} renderNote={renderNote}/>
                                ) : activeMode === 'map' ? (
                                    <MapView/>
                                ) : activeMode === 'timeline' ? (
                                    <TimelineView/>
                                ) : activeMode === 'list' ? (
                                    <div className="space-y-0.5" role="list" aria-label="Notes" data-testid="notes-list-items">
                                        {filteredNotes.map(note => (
                                            <NoteListItem
                                                key={note.id}
                                                note={note}
                                                isSelected={selectedNoteId === note.id}
                                                onSelect={() => selectNote(note.id)}
                                                searchTerm={searchTerm}
                                                tabIndex={noteRowTabIndex(filteredNotes, selectedNoteId, note.id)}
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
                                        data-testid="notes-grid-items"
                                    >
                                        {filteredNotes.map(note => (
                                            <NoteGridItem
                                                key={note.id}
                                                note={note}
                                                isSelected={selectedNoteId === note.id}
                                                onSelect={() => selectNote(note.id)}
                                            />
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )}
            </div>

            <ConfirmationModal
                isOpen={!!noteToDelete}
                onClose={() => setNoteToDelete(null)}
                onConfirm={confirmDelete}
                title="Delete note permanently?"
                message={`"${noteToDelete?.title || 'Untitled note'}" will be removed forever. This cannot be undone.`}
                confirmLabel="Delete forever"
                isDestructive
            />
        </div>
    );
}

function Board({groups, renderNote}: {
    groups: NoteIndexGroup[];
    renderNote: (note: Note) => React.ReactNode;
}) {
    if (groups.length === 0) {
        return (
            <p className="px-1 py-8 text-[12px] text-[var(--app-muted)]">
                Group this board by status to see columns.
            </p>
        );
    }

    return (
        <div className="flex items-start gap-3 overflow-x-auto pb-4" role="list" aria-label="Board">
            {groups.map(group => (
                <section key={group.id} role="listitem" className="min-w-[240px] max-w-[320px] flex-1 basis-0 shrink-0">
                    <h3 className="mb-1 flex items-center justify-between gap-2 px-1 text-[12px] font-medium text-[var(--app-text-secondary)]">
                        <span className="truncate capitalize" title={group.label}>
                            {group.label}
                        </span>
                        <span className="text-[11px] tabular-nums text-[var(--app-faint)]">{group.notes.length}</span>
                    </h3>
                    <div className="space-y-2" role="list" aria-label={`${group.label} notes`}>
                        {group.notes.map(renderNote)}
                    </div>
                </section>
            ))}
        </div>
    );
}

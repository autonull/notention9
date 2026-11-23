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
import {browseModeLabel, sortOrderLabel} from '../../config/uiSurfaces';
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
    const {notes: allNotes, restoreNote, permanentlyDeleteNote} = useNotes();
    const {settings} = useSettings();
    const {addToast} = useToast();
    const scrollRef = useRef<HTMLDivElement>(null);
    const [noteToDelete, setNoteToDelete] = useState<Note | null>(null);

    const section: Section = notesSection;
    const activeMode = section === 'trash' ? 'list' : notesMode;

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
                className={selectedNote ? 'hidden lg:flex' : 'flex'}
            />

            <div className={selectedNote ? 'flex min-w-0 flex-1' : 'hidden min-w-0 flex-1 lg:flex'}>
                {selectedNote ? (
                    <EditorManager
                        key={selectedNote.id}
                        note={selectedNote}
                        onSave={updateNote}
                        sortedNotes={filteredNotes}
                    />
                ) : (
                    <div ref={scrollRef} className="flex h-full min-h-0 w-full flex-col overflow-y-auto custom-scrollbar">
                        <IndexHeader
                            count={filteredNotes.length}
                            mode={activeMode}
                            sortOrder={sortOrder}
                        />
                        <div className="min-h-0 flex-1 px-4 pb-24 pt-1 md:px-6">
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

function IndexHeader({count, mode, sortOrder}: {
    count: number;
    mode: NonNullable<ReturnType<typeof useView>['notesMode']>;
    sortOrder: NonNullable<ReturnType<typeof useView>['sortOrder']>;
}) {
    return (
        <div className="sticky top-0 z-10 flex h-10 items-center gap-3 bg-[var(--app-bg)] px-4 md:px-6">
            <span className="text-[13px] font-medium text-[var(--app-text-secondary)]">
                {browseModeLabel(mode)}
                <span className="text-[var(--app-faint)]"> · {sortOrderLabel(sortOrder)}</span>
            </span>
            <span className="text-[11px] tabular-nums text-[var(--app-faint)]">{count} notes</span>
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
                <section key={group.id} role="listitem" className="w-[280px] shrink-0">
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

import React from 'react';
import type {Note, NoteMode, NotesGroup, NotesSection, SortOrder} from '@notention/core';
import {NoteListItem} from './NoteListItem';
import {noteRowTabIndex} from './useNoteDisplay';
import {ArrangeMenu} from '../patterns/ArrangeMenu';
import {PaneResizer} from '../ui/ResizablePane';
import {Input} from '../ui/Input';
import {SearchIcon} from '../ui/icons';
import {cn} from '../../utils/ui';

interface NoteHistoryRailProps {
    notes: Note[];
    counts: Record<NotesSection, number>;
    section: NotesSection;
    onSectionChange: (section: NotesSection) => void;
    mode: NoteMode;
    onModeChange: (mode: NoteMode) => void;
    sortOrder: SortOrder;
    onSortOrderChange: (order: SortOrder) => void;
    group: NotesGroup;
    onGroupChange: (group: NotesGroup) => void;
    selectedNoteId: string | null;
    onSelect: (id: string) => void;
    searchTerm: string;
    onSearchChange: (term: string) => void;
    share: number;
    onShareChange: (share: number) => void;
    onRestore?: (note: Note) => void;
    onDelete?: (note: Note) => void;
    className?: string;
}

const SECTIONS: Array<{id: NotesSection; label: string}> = [
    {id: 'all', label: 'All'},
    {id: 'tasks', label: 'Tasks'},
    {id: 'tags', label: 'Tags'},
    {id: 'trash', label: 'Trash'},
];

/** The semantic index: one list with subsets, arrangements, and orders. */
export function NoteHistoryRail({
    notes,
    counts,
    section,
    onSectionChange,
    mode,
    onModeChange,
    sortOrder,
    onSortOrderChange,
    group,
    onGroupChange,
    selectedNoteId,
    onSelect,
    searchTerm,
    onSearchChange,
    share,
    onShareChange,
    onRestore,
    onDelete,
    className,
}: NoteHistoryRailProps) {
    return (
        <div
            className={cn('flex h-full min-h-0 w-full shrink-0 lg:w-[var(--history-share)]', className)}
            style={{'--history-share': `${share}%`} as React.CSSProperties}
            data-testid="note-history-rail"
        >
            <div className="flex min-w-0 flex-1 flex-col border-r border-[var(--app-line)] bg-[var(--app-bg)]">
                <div className="shrink-0 space-y-2 px-3 pt-3">
                    <div className="flex items-center gap-1.5">
                        <div className="relative min-w-0 flex-1">
                            <SearchIcon className="pointer-events-none absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[var(--app-faint)]"/>
                            <Input
                                value={searchTerm}
                                onChange={event => onSearchChange(event.target.value)}
                                placeholder="Search notes…"
                                aria-label="Search notes"
                                className="h-8 w-full pl-7 text-[12px]"
                            />
                        </div>
                        <ArrangeMenu
                            mode={mode}
                            onModeChange={onModeChange}
                            sortOrder={sortOrder}
                            onSortOrderChange={onSortOrderChange}
                            group={group}
                            onGroupChange={onGroupChange}
                            className="shrink-0"
                        />
                    </div>

                    <div className="flex items-center gap-0.5" role="tablist" aria-label="Note filters">
                        {SECTIONS.map(tab => (
                            <button
                                key={tab.id}
                                type="button"
                                role="tab"
                                aria-selected={section === tab.id}
                                onClick={() => onSectionChange(tab.id)}
                                className={cn(
                                    'flex h-7 min-w-0 shrink items-center gap-1 rounded-md px-1.5 text-[12px] font-medium transition-colors',
                                    section === tab.id
                                        ? 'bg-[var(--app-raised)] text-[var(--app-text)]'
                                        : 'text-[var(--app-muted)] hover:bg-[var(--app-hover)] hover:text-[var(--app-text-secondary)]'
                                )}
                            >
                                <span className="truncate">{tab.label}</span>
                                <span className="text-[11px] tabular-nums text-[var(--app-faint)]">{counts[tab.id]}</span>
                            </button>
                        ))}
                    </div>
                </div>

                <div className="min-h-0 flex-1 overflow-y-auto px-2 py-2 custom-scrollbar" role="list" aria-label="Note history">
                    {notes.length === 0 ? (
                        <p className="px-2 py-4 text-[12px] leading-5 text-[var(--app-muted)]">
                            {section === 'trash'
                                ? 'Trash is empty.'
                                : searchTerm
                                ? 'No notes match your search.'
                                : 'No notes yet.'}
                        </p>
                    ) : notes.map(note => (
                        <NoteListItem
                            key={note.id}
                            note={note}
                            isSelected={selectedNoteId === note.id}
                            onSelect={() => onSelect(note.id)}
                            searchTerm={searchTerm}
                            tabIndex={noteRowTabIndex(notes, selectedNoteId, note.id)}
                            isTrash={section === 'trash'}
                            onRestore={onRestore ? () => onRestore(note) : undefined}
                            onDelete={onDelete ? () => onDelete(note) : undefined}
                        />
                    ))}
                </div>
            </div>

            <PaneResizer
                label="Resize history"
                value={share}
                min={16}
                max={30}
                defaultValue={22}
                onChange={onShareChange}
            />
        </div>
    );
}

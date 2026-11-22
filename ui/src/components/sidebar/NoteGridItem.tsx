import React from 'react';
import type {Note} from '@notention/core';
import {DownloadIcon, PinIcon, WorldIcon} from '../ui/icons';
import {SkillExecutionIndicator} from '../notes/SkillExecutionIndicator';
import {useNoteDisplay} from './useNoteDisplay';
import {cn} from '../../utils/ui';
import {noteAccentClass} from '../../utils/noteAccent';

interface NoteGridItemProps {
    note: Note;
    isSelected: boolean;
    onSelect: () => void;
}

export function NoteGridItem({note, isSelected, onSelect}: NoteGridItemProps) {
    const {
        contentPreview,
        relativeTime,
        displayProperties,
        isPublic,
        isImported,
        isPinned,
        isLowPriority,
        isVeryLowPriority,
    } = useNoteDisplay(note);

    const primary = displayProperties[0];
    const primaryValue = primary?.values[0]?.trim();
    const label = primaryValue
        ? primaryValue.replace(/[-_]/g, ' ')
        : note.tags[0] ? `#${note.tags[0]}` : '';

    return (
        <div
            onClick={onSelect}
            onKeyDown={(event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    onSelect();
                }
            }}
            role="button"
            tabIndex={0}
            aria-current={isSelected ? 'true' : undefined}
            title={note.title}
            className={cn(
                'group relative flex min-h-[var(--ui-note-min)] cursor-pointer flex-col gap-2 rounded-xl border border-[var(--app-line)] bg-[var(--app-surface)] p-[var(--ui-pad)] transition-colors',
                'hover:border-[var(--app-line-strong)] hover:bg-[var(--app-panel)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--app-accent)]/40',
                noteAccentClass(note),
                isSelected && 'border-[var(--app-accent-line)] bg-[var(--app-panel)]',
                isLowPriority && 'opacity-65',
                isVeryLowPriority && 'border-dashed'
            )}
        >
            <div className="flex min-w-0 items-center gap-2 text-[11px] text-[var(--app-muted)]">
                <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--note-accent)]" aria-hidden="true"/>
                <span className="truncate capitalize">{label || 'note'}</span>
                <span className="ml-auto flex shrink-0 items-center gap-1.5 text-[var(--app-faint)]">
                    {isPinned && <PinIcon className="h-3 w-3" aria-label="Pinned"/>}
                    {isImported && <DownloadIcon className="h-3 w-3" aria-label="Imported"/>}
                    {isPublic ? <WorldIcon className="h-3 w-3" aria-label="Public"/> : null}
                </span>
            </div>

            <span className="line-clamp-2 text-[15px] font-medium leading-[1.35] text-[var(--app-text)]">
                {note.title || 'Untitled'}
            </span>
            <span className="line-clamp-2 text-[13px] leading-[1.45] text-[var(--app-muted)]">
                {contentPreview}
            </span>

            <div className="mt-auto flex items-center gap-2 pt-0.5 text-[11px] text-[var(--app-faint)]">
                <span className="truncate">{relativeTime}</span>
                <span className="ml-auto flex items-center gap-2">
                    <SkillExecutionIndicator noteId={note.id}/>
                </span>
            </div>
        </div>
    );
}

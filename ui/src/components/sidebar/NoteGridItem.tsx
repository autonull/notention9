import React from 'react';
import type {Note} from '@notention/core';
import {DownloadIcon, LockIcon, PinIcon, WorldIcon} from '../ui/icons';
import {SkillExecutionIndicator} from '../notes/SkillExecutionIndicator';
import {useNoteDisplay} from './useNoteDisplay';
import {cn} from '../../utils/ui';

interface NoteGridItemProps {
    note: Note;
    isSelected: boolean;
    onSelect: () => void;
}

const accentClass = (note: Note): string => {
    const intent = note.properties.find(p => p.key === 'intent')?.values[0];
    const type = note.properties.find(p => p.key === 'type')?.values[0];
    if (intent === 'request') return 'note-request';
    if (intent === 'offer') return 'note-offer';
    if (note.tags.includes('task') || type === 'task') return 'note-task';
    if (type === 'event') return 'note-event';
    if (type === 'person') return 'note-person';
    return 'note-neutral';
};

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

    const meta = displayProperties.length > 0
        ? displayProperties.slice(0, 2).map(prop => `${prop.key}: ${prop.values.join(', ')}`).join(' · ')
        : note.tags.slice(0, 2).map(tag => `#${tag}`).join(' ');

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
                'relative flex min-h-[132px] cursor-pointer flex-col gap-2 overflow-hidden rounded-xl border border-neutral-800 bg-neutral-900/60 p-4 pl-5 transition-colors',
                'before:absolute before:bottom-0 before:left-0 before:top-0 before:w-1 before:bg-[var(--note-accent)]',
                'hover:border-neutral-700 hover:bg-neutral-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-neutral-500/50',
                accentClass(note),
                isSelected && 'border-neutral-600 bg-neutral-900',
                isLowPriority && 'opacity-60',
                isVeryLowPriority && 'border-dashed'
            )}
        >
            <div className="flex items-center gap-2 text-meta text-neutral-400">
                {isPinned && <PinIcon className="h-3.5 w-3.5" aria-label="Pinned"/>}
                {isImported && <DownloadIcon className="h-3.5 w-3.5" aria-label="Imported"/>}
                <span className="truncate">{relativeTime}</span>
                <span className="ml-auto flex items-center gap-1.5">
                    {isPublic ? <WorldIcon className="h-3.5 w-3.5" aria-label="Public"/> : <LockIcon className="h-3.5 w-3.5" aria-label="Private"/>}
                </span>
            </div>

            <span className="line-clamp-2 text-lg font-medium leading-6 text-neutral-100">
                {note.title || 'Untitled'}
            </span>
            <span className="line-clamp-2 text-sm leading-5 text-neutral-400">
                {contentPreview}
            </span>

            <div className="mt-auto flex items-center gap-2 text-meta text-neutral-400">
                <span className="truncate">{meta}</span>
                <SkillExecutionIndicator noteId={note.id}/>
            </div>
        </div>
    );
}

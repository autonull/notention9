import React from 'react';
import type {Note} from '@notention/core';
import {DownloadIcon, LockIcon, PinIcon, WorldIcon} from '../ui/icons';
import {Badge} from '../ui/Badge';
import {SkillExecutionIndicator} from '../notes/SkillExecutionIndicator';
import {useNoteDisplay} from './useNoteDisplay';

interface NoteGridItemProps {
    note: Note;
    isSelected: boolean;
    onSelect: () => void;
}

export function NoteGridItem({note, isSelected, onSelect}: NoteGridItemProps) {
    const {
        contentPreview,
        isPublic,
        isImported,
        isPinned,
        isLowPriority,
        isVeryLowPriority,
    } = useNoteDisplay(note);

    return (
        <div
            onClick={onSelect}
            onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    onSelect();
                }
            }}
            role="button"
            tabIndex={0}
            aria-current={isSelected ? 'true' : undefined}
            className={`
        relative aspect-square flex flex-col p-2.5 rounded-lg cursor-pointer transition-all border focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/50
        ${isSelected
                ? 'bg-blue-900/30 border-blue-500/50 text-blue-100 shadow-md shadow-blue-900/20'
                : 'bg-gray-800/50 text-gray-400 hover:bg-gray-800 hover:text-gray-200'
            }
        ${!isSelected && isPublic ? 'border-green-800/50' : ''}
        ${!isSelected && !isPublic && !isVeryLowPriority ? 'border-gray-700/50' : ''}
        ${!isSelected && isVeryLowPriority ? 'border-gray-700/50 border-dashed' : ''}
        ${isLowPriority ? 'opacity-50' : ''}
      `}
            title={note.title}
        >
            <div className="flex items-center justify-between gap-1 min-h-[14px]">
                <div className="flex items-center gap-1">
                    {isPinned && <PinIcon className="w-3 h-3 text-blue-400"/>}
                    {isImported && <DownloadIcon className="w-3 h-3 text-blue-400/50"/>}
                </div>
                {isPublic ? (
                    <WorldIcon className="w-3 h-3 text-green-500/70"/>
                ) : (
                    <LockIcon className="w-3 h-3 text-gray-500/50"/>
                )}
            </div>

            <span className="mt-1 text-xs font-medium text-center line-clamp-2 leading-tight break-words w-full">
                {note.title || 'Untitled'}
            </span>
            <span className="mt-1 text-[10px] text-gray-500 text-center line-clamp-2 leading-snug w-full">
                {contentPreview}
            </span>

            {isLowPriority && (
                <div className="absolute bottom-2 left-0 right-0 flex justify-center">
                    <Badge variant="outline" size="xs" className="text-[9px] px-1 py-0 h-auto opacity-70">
                        Low priority
                    </Badge>
                </div>
            )}

            <div className="absolute bottom-1 w-full flex justify-center">
                <SkillExecutionIndicator noteId={note.id}/>
            </div>
        </div>
    );
};

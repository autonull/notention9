import React from 'react';
import type { Note } from '@notention/core';
import { NoteIcon, LockIcon, WorldIcon, DownloadIcon } from '../common/icons';
import { Badge } from '../common/Badge';
import { SkillExecutionIndicator } from '../notes/SkillExecutionIndicator';

interface NoteGridItemProps {
  note: Note;
  isSelected: boolean;
  onSelect: () => void;
}

export function NoteGridItem({ note, isSelected, onSelect }: NoteGridItemProps) {
  // Visual indicators based on note state
  const isPublic = note.privacy === 'public';
  const isImported = note.source?.type === 'import' || note.source?.type === 'skill';

  // Priority Logic (Phase 3.2)
  const priority = note.priority ?? 1.0;
  const isLowPriority = priority < 0.5;
  const isVeryLowPriority = priority < 0.3;

  return (
    <div
      onClick={onSelect}
      className={`
        relative aspect-square flex flex-col items-center justify-center p-2 rounded-lg cursor-pointer transition-all border
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
      <div className="absolute top-2 right-2 flex gap-1">
        {isPublic ? (
          <WorldIcon className="w-3 h-3 text-green-500/70" />
        ) : (
          <LockIcon className="w-3 h-3 text-gray-500/50" />
        )}
      </div>

      {isImported && (
        <div className="absolute top-2 left-2">
           <DownloadIcon className="w-3 h-3 text-blue-400/50" />
        </div>
      )}

      <NoteIcon className={`h-8 w-8 mb-2 ${isPublic ? 'text-green-500/30' : 'opacity-50'}`} />

      <span className="text-xs text-center line-clamp-2 leading-tight break-words w-full px-1">
        {note.title || 'Untitled'}
      </span>

      {isLowPriority && (
        <div className="absolute bottom-2">
            <Badge variant="ghost" size="xs" className="text-[9px] px-1 py-0 h-auto opacity-70">
                Low Prio
            </Badge>
        </div>
      )}

      <div className="absolute bottom-1 w-full flex justify-center">
          <SkillExecutionIndicator noteId={note.id} />
      </div>
    </div>
  );
};

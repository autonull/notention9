import React from 'react';
import type { Note } from '@notention/core';
import { NoteIcon } from '../common/icons';

interface NoteGridItemProps {
  note: Note;
  isSelected: boolean;
  onSelect: () => void;
}

export function NoteGridItem({ note, isSelected, onSelect }: NoteGridItemProps) {
  return (
    <div
      onClick={onSelect}
      className={`
        aspect-square flex flex-col items-center justify-center p-2 rounded-lg cursor-pointer transition-colors border
        ${isSelected
          ? 'bg-blue-900/30 border-blue-500/50 text-blue-100'
          : 'bg-gray-800/50 border-gray-700/50 text-gray-400 hover:bg-gray-800 hover:text-gray-200'
        }
      `}
      title={note.title}
    >
      <NoteIcon className="h-8 w-8 mb-2 opacity-50" />
      <span className="text-xs text-center line-clamp-2 leading-tight break-words w-full">
        {note.title || 'Untitled'}
      </span>
    </div>
  );
};

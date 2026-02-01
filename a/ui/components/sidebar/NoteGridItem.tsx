import React from 'react';
import type { Note } from '@notention/core';
import { NoteIcon, DownloadIcon } from '../common/icons';
import { Badge } from '../common/Badge';
import { Tooltip } from '../common/Tooltip';

interface NoteGridItemProps {
  note: Note;
  isSelected: boolean;
  onSelect: () => void;
}

export function NoteGridItem({ note, isSelected, onSelect }: NoteGridItemProps) {
  // Use priority to determine visual weight (Phase 3.2)
  const opacity = note.priority !== undefined && note.priority < 0.5 ? 0.6 : 1.0;

  // Public status determines border color
  // Green-ish for public, Gray for private (default)
  const borderColorClass = note.public
      ? (isSelected ? 'border-green-400' : 'border-green-600/50')
      : (isSelected ? 'border-blue-500/50' : 'border-gray-700/50');

  // Dashed border for low priority
  const borderStyleClass = (note.priority !== undefined && note.priority < 0.3) ? 'border-dashed' : 'border-solid';

  return (
    <div
      onClick={onSelect}
      className={`
        aspect-square flex flex-col items-center justify-center p-2 rounded-lg cursor-pointer transition-all border relative
        ${borderColorClass}
        ${borderStyleClass}
        ${isSelected
          ? 'bg-blue-900/30 text-blue-100'
          : 'bg-gray-800/50 text-gray-400 hover:bg-gray-800 hover:text-gray-200'
        }
      `}
      style={{ opacity }}
      title={note.title}
    >
      {/* Priority Badge */}
      {note.priority !== undefined && note.priority < 0.5 && (
        <div className="absolute top-2 right-2">
            <Badge variant="outline" size="sm" className="bg-gray-900/80 border-gray-600 text-[9px] px-1 py-0">
                Low Priority
            </Badge>
        </div>
      )}

      {/* Provenance Indicator */}
      {note.source?.type === 'skill' && (
        <div className="absolute top-2 left-2">
            <Tooltip content={`Imported from ${note.source.identifier}`} position="right">
                <DownloadIcon className="w-3 h-3 text-gray-400" />
            </Tooltip>
        </div>
      )}

      <NoteIcon className="h-8 w-8 mb-2 opacity-50" />
      <span className="text-xs text-center line-clamp-2 leading-tight break-words w-full">
        {note.title || 'Untitled'}
      </span>

      {note.public && (
        <span className="absolute bottom-1 right-2 text-[8px] uppercase tracking-wider text-green-500/70 font-bold">
            Public
        </span>
      )}
    </div>
  );
};

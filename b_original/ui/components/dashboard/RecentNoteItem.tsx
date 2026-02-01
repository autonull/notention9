import React from 'react';
import type { Note } from '@notention/core';
import { Badge } from '../common/Badge';

interface RecentNoteItemProps {
  note: Note;
  onClick: (noteId: string) => void;
}

export function RecentNoteItem({ note, onClick }: RecentNoteItemProps) {
  return (
    <button
      type="button"
      onClick={() => onClick(note.id)}
      className="w-full text-left p-4 bg-gray-900/50 hover:bg-gray-800 cursor-pointer rounded-xl border border-gray-700/50 hover:border-blue-500/50 transition-all group flex flex-col gap-2"
    >
      <div className="flex justify-between items-start w-full">
        <h3 className="font-medium text-base text-gray-200 group-hover:text-blue-400 truncate flex-1">
            {note.title || 'Untitled Note'}
        </h3>
        <span className="text-xs text-gray-600 whitespace-nowrap ml-2">
            {new Date(note.updatedAt).toLocaleDateString()}
        </span>
      </div>

      <p className="text-sm text-gray-500 line-clamp-2 w-full">
        {note.content.replace(/<[^>]*>/g, '').slice(0, 150) || 'No content preview available.'}
      </p>

      {note.tags.length > 0 && (
        <div className="mt-1">
          <Badge variant="default" size="sm">
            #{note.tags[0]}
          </Badge>
        </div>
      )}
    </button>
  );
};

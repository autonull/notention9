import React from 'react';
import type { Note } from '@notention/core';
import { NoteIcon, ClockIcon } from '../common/icons';

interface ActivityFeedProps {
  recentNotes: Note[];
  onSelectNote: (id: string) => void;
}

export function ActivityFeed({ recentNotes, onSelectNote }: ActivityFeedProps) {
  if (recentNotes.length === 0) {
    return (
      <div className="text-center text-gray-500 py-8 italic text-sm">
        No recent activity. Start creating notes!
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {recentNotes.map((note) => (
        <div
          key={note.id}
          onClick={() => onSelectNote(note.id)}
          className="flex items-start gap-3 p-3 rounded-lg hover:bg-gray-800/50 cursor-pointer transition-colors border border-transparent hover:border-gray-700/50"
        >
          <div className="p-2 bg-gray-800 rounded-full text-gray-400">
            <NoteIcon className="w-4 h-4" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex justify-between items-start">
              <h4 className="font-medium text-sm text-gray-200 truncate pr-2">
                {note.title || 'Untitled Note'}
              </h4>
              <span className="text-xs text-gray-500 flex-shrink-0 flex items-center gap-1">
                <ClockIcon className="w-3 h-3" />
                {new Date(note.updatedAt).toLocaleDateString()}
              </span>
            </div>
            <p className="text-xs text-gray-500 truncate mt-0.5">
              {note.tags.map(t => `#${t}`).join(' ')}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}

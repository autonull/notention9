import React from 'react';
import type {Note} from '@notention/core';
import {ClockIcon, NoteIcon} from '../common/icons';

interface ActivityFeedProps {
    recentNotes: Note[];
    onSelectNote: (id: string) => void;
}

export function ActivityFeed({recentNotes, onSelectNote}: ActivityFeedProps) {
    if (recentNotes.length === 0) {
        return (
            <div
                className="text-center text-gray-500 py-8 italic text-sm"
                role="status"
                aria-live="polite"
            >
                No recent activity. Start creating notes!
            </div>
        );
    }

    return (
        <ul className="space-y-3" aria-label="Recent activity feed">
            {recentNotes.map((note) => (
                <li
                    key={note.id}
                    className="group relative"
                >
                    <button
                        onClick={() => onSelectNote(note.id)}
                        className="w-full text-left flex items-start gap-3 p-3 rounded-lg hover:bg-gray-800/50 cursor-pointer transition-colors border border-transparent hover:border-gray-700/50 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                        aria-label={`Open note: ${note.title || 'Untitled Note'}`}
                    >
                        <div
                            className="p-2 bg-gray-800 rounded-full text-gray-400 group-hover:text-blue-400 transition-colors">
                            <NoteIcon className="w-4 h-4" aria-hidden="true"/>
                        </div>
                        <div className="flex-1 min-w-0">
                            <div className="flex justify-between items-start">
                                <h4 className="font-medium text-sm text-gray-200 truncate pr-2">
                                    {note.title || 'Untitled Note'}
                                </h4>
                                <span className="text-xs text-gray-500 flex-shrink-0 flex items-center gap-1">
                  <ClockIcon className="w-3 h-3" aria-hidden="true"/>
                  <time dateTime={note.updatedAt}>
                    {new Date(note.updatedAt).toLocaleDateString(undefined, {month: 'short', day: 'numeric'})}
                  </time>
                </span>
                            </div>
                            {note.tags && note.tags.length > 0 && (
                                <p className="text-xs text-gray-500 truncate mt-0.5">
                                    {note.tags.map(t => `#${t}`).join(' ')}
                                </p>
                            )}
                        </div>
                    </button>
                </li>
            ))}
        </ul>
    );
}

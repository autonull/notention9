import React from 'react';
import type {Note} from '@notention/core';
import {ClockIcon, NoteIcon} from '../common/icons';

interface RecentNoteItemProps {
    note: Note;
    onClick: () => void;
}

export function RecentNoteItem({note, onClick}: RecentNoteItemProps) {
    return (
        <button
            onClick={onClick}
            className="w-full text-left p-3 hover:bg-gray-700/50 transition-colors group"
        >
            <div className="flex items-start gap-3">
                <div
                    className="p-2 rounded-md bg-gray-700/30 text-blue-400 group-hover:bg-blue-500/10 group-hover:text-blue-300 transition-colors">
                    <NoteIcon className="w-4 h-4"/>
                </div>
                <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-start">
                        <h4 className="font-medium text-gray-200 truncate pr-2 group-hover:text-blue-200 transition-colors">
                            {note.title || 'Untitled Note'}
                        </h4>
                        <span className="text-xs text-gray-500 whitespace-nowrap flex items-center gap-1">
              <ClockIcon className="w-3 h-3"/>
                            {new Date(note.updatedAt).toLocaleDateString()}
            </span>
                    </div>
                    {note.tags.length > 0 && (
                        <div className="flex gap-2 mt-1 overflow-hidden">
                            {note.tags.slice(0, 3).map(tag => (
                                <span key={tag} className="text-xs text-gray-500 bg-gray-900/50 px-1.5 py-0.5 rounded">
                  #{tag}
                </span>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </button>
    );
}

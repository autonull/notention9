import React from 'react';
import type {Note} from '@notention/core';
import {RecentNoteItem} from './RecentNoteItem';

interface RecentNotesWidgetProps {
    notes: Note[];
    onSelectNote: (id: string) => void;
}

export function RecentNotesWidget({notes, onSelectNote}: RecentNotesWidgetProps) {
    const recentNotes = [...notes]
        .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
        .slice(0, 5);

    if (recentNotes.length === 0) {
        return (
            <div className="bg-gray-800 rounded-lg p-6 text-center text-gray-500 border border-gray-700/50">
                No recent notes
            </div>
        );
    }

    return (
        <div className="bg-gray-800 rounded-lg overflow-hidden border border-gray-700/50">
            <div className="p-4 border-b border-gray-700/50 bg-gray-800/50">
                <h3 className="font-semibold text-gray-200">Recent Notes</h3>
            </div>
            <div className="divide-y divide-gray-700/50">
                {recentNotes.map((note) => (
                    <RecentNoteItem
                        key={note.id}
                        note={note}
                        onClick={() => onSelectNote(note.id)}
                    />
                ))}
            </div>
        </div>
    );
}

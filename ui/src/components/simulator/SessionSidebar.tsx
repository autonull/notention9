import React from 'react';
import {PlusIcon} from '../common/icons';
import type {Note} from '@notention/core';
import {Button} from '../common/Button';

interface SessionSidebarProps {
    notes: Note[];
    activeNote: Note | null;
    setActiveNote: (note: Note) => void;
    addNote: () => Note;
}

export function SessionSidebar({
                                   notes,
                                   activeNote,
                                   setActiveNote,
                                   addNote
                               }: SessionSidebarProps) {
    return (
        <div className="w-48 bg-gray-950 border-r border-gray-800 flex flex-col flex-shrink-0">
            <div className="p-2 border-b border-gray-800">
                <Button
                    onClick={() => {
                        const n = addNote();
                        setActiveNote(n);
                    }}
                    variant="secondary"
                    size="xs"
                    className="w-full"
                    icon={PlusIcon}
                >
                    New Note
                </Button>
            </div>
            <div className="overflow-y-auto flex-1 p-1 space-y-0.5 custom-scrollbar">
                {notes.length === 0 && (
                    <div className="flex flex-col items-center justify-center h-32 text-gray-600 gap-2">
                        <span className="text-[10px] italic">No notes created.</span>
                    </div>
                )}
                {notes.map(note => (
                    <div
                        key={note.id}
                        onClick={() => setActiveNote(note)}
                        className={`px-2 py-1.5 cursor-pointer rounded truncate text-[10px] transition-all border border-transparent ${
                            activeNote?.id === note.id
                                ? 'bg-blue-900/20 text-blue-200 border-blue-900/30'
                                : 'text-gray-500 hover:text-gray-300 hover:bg-gray-900'
                        }`}
                    >
                        {note.title || "Untitled Note"}
                    </div>
                ))}
            </div>
        </div>
    );
};

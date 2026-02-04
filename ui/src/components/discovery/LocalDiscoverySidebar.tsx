import React from 'react';
import { useMatches } from '../../hooks/useMatches';
import { MatchCard } from '../matching/MatchCard';
import { Note } from '@notention/core';

interface LocalDiscoverySidebarProps {
    note: Note | null;
    onSelectMatch: (note: Note) => void;
}

export const LocalDiscoverySidebar: React.FC<LocalDiscoverySidebarProps> = ({ note, onSelectMatch }) => {
    const matches = useMatches(note);

    if (!note) return null;

    return (
        <div className="w-64 bg-gray-900 border-l border-gray-800 flex flex-col h-full">
            <div className="p-3 border-b border-gray-800 bg-gray-900/50 backdrop-blur sticky top-0 z-10">
                <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider flex items-center gap-2">
                    <span>📡</span> Local Matches
                    <span className="bg-gray-800 text-gray-400 px-1.5 py-0.5 rounded-full">{matches.length}</span>
                </h3>
            </div>

            <div className="p-3 space-y-2 overflow-y-auto flex-1">
                {matches.length === 0 ? (
                    <div className="text-center py-8">
                        <div className="text-2xl mb-2 opacity-20">📭</div>
                        <p className="text-xs text-gray-500">No matches found.</p>
                        <p className="text-[10px] text-gray-600 mt-1">Try adding more properties like [role:...] or [rate:...]</p>
                    </div>
                ) : (
                    matches.map(item => (
                        <MatchCard
                            key={item.note.id}
                            note={item.note}
                            match={item.result}
                            onClick={() => onSelectMatch(item.note)}
                        />
                    ))
                )}
            </div>
        </div>
    );
};

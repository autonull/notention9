import React from 'react';
import type {NostrEvent} from '@notention/core';

export interface SuggestionMatch {
    localNoteId: string;
    event: NostrEvent;
    score: number;
}

interface SuggestedMatchItemProps {
    match: SuggestionMatch;
    onSelect: (noteId: string) => void;
}

export function SuggestedMatchItem({match, onSelect}: SuggestedMatchItemProps) {
    return (
        <div
            className="bg-gray-700/50 p-3 rounded-lg border border-gray-600/50 hover:bg-gray-700 transition cursor-pointer"
            onClick={() => onSelect(match.localNoteId)}
        >
            <div className="flex justify-between items-start mb-1">
                <span className="text-xs font-mono text-blue-400">Match Score: {Math.round(match.score * 100)}%</span>
                <span className="text-xs text-gray-500">Your note: {match.localNoteId.slice(0, 6)}...</span>
            </div>
            <div className="text-white font-medium text-sm mb-1 line-clamp-1">
                {match.event.content.slice(0, 50)}...
            </div>
        </div>
    );
};

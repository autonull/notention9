import React from 'react';
import {MatchResult, Note} from '@notention/core';

interface MatchCardProps {
    note: Note;
    match: MatchResult;
    onClick: () => void;
}

export const MatchCard: React.FC<MatchCardProps> = ({note, match, onClick}) => {
    return (
        <div
            className="p-3 bg-gray-800 border border-gray-700 rounded-lg hover:border-gray-500 transition-colors cursor-pointer group"
            onClick={onClick}
        >
            <div className="flex justify-between items-start mb-2">
                <h4 className="font-semibold text-gray-200 truncate pr-2">{note.title || 'Untitled'}</h4>
                <div className={`
                    text-xs font-bold px-1.5 py-0.5 rounded
                    ${match.score > 0.8 ? 'bg-green-900 text-green-300' :
                    match.score > 0.5 ? 'bg-yellow-900 text-yellow-300' : 'bg-gray-700 text-gray-400'}
                `}>
                    {Math.round(match.score * 100)}%
                </div>
            </div>

            {/* Matches */}
            {match.matches.length > 0 && (
                <div className="flex flex-wrap gap-1 mb-2">
                    {match.matches.slice(0, 3).map((m, i) => (
                        <div key={i}
                             className="text-[10px] bg-green-500/10 text-green-400 border border-green-500/20 px-1.5 py-0.5 rounded flex items-center gap-1"
                             title={m.reason}>
                            <span>✓</span>
                            <span className="opacity-80">{m.requestProp.key}</span>
                        </div>
                    ))}
                    {match.matches.length > 3 && (
                        <span className="text-[10px] text-gray-500">+{match.matches.length - 3}</span>
                    )}
                </div>
            )}

            {/* Conflicts */}
            {match.conflicts.length > 0 && (
                <div className="flex flex-wrap gap-1">
                    {match.conflicts.slice(0, 2).map((c, i) => (
                        <div key={i}
                             className="text-[10px] bg-red-500/10 text-red-400 border border-red-500/20 px-1.5 py-0.5 rounded flex items-center gap-1"
                             title={c.reason}>
                            <span>⚠️</span>
                            <span className="opacity-80">{c.requestProp.key}</span>
                        </div>
                    ))}
                </div>
            )}

            <div className="mt-2 text-[10px] text-gray-500 truncate">
                {note.content.substring(0, 60)}...
            </div>
        </div>
    );
};

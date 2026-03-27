import React from 'react';
import type { Note } from '@notention/core';
import type { MatchResult } from '../../hooks/useNetworkMatching';
import { DownloadIcon } from '../common/icons';
import { IconButton } from '../common/IconButton';

interface NetworkEventItemProps {
    note: Note;
    relatedMatches: MatchResult[];
    onSaveNote?: (note: Note) => void;
}

export function NetworkEventItem({ note, relatedMatches, onSaveNote }: NetworkEventItemProps) {
    const isMatch = relatedMatches.length > 0;

    return (
        <div
            className={`p-2 rounded border transition-all duration-500 group ${
                isMatch
                ? 'bg-indigo-900/20 border-indigo-500/50 shadow-[0_0_15px_rgba(99,102,241,0.1)] hover:bg-indigo-900/30'
                : 'bg-gray-800/50 border-gray-700/50 hover:bg-gray-800'
            }`}
        >
            <div className="flex justify-between items-start mb-1.5">
                 <div className="text-[9px] text-gray-500 font-mono">
                     {note.updatedAt ? new Date(note.updatedAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit', second:'2-digit'}) : 'Now'}
                 </div>
                 {isMatch && <span className="text-[8px] bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 px-1 rounded animate-pulse font-bold">MATCH</span>}

                 {onSaveNote && (
                     <IconButton
                        onClick={() => onSaveNote(note)}
                        title="Save to My Notes"
                        icon={DownloadIcon}
                        size="xs"
                        variant="ghost"
                        className="ml-auto opacity-0 group-hover:opacity-100 hover:text-green-400"
                     />
                 )}
            </div>

            <div className="text-[10px] text-gray-300 font-medium mb-2 break-words leading-relaxed line-clamp-2">
                {note.content.replace(/<[^>]*>/g, '')}
            </div>

            {/* Semantic Properties */}
            {note.properties.length > 0 && (
                <div className="flex flex-wrap gap-1 mb-1.5">
                    {note.properties.map((p, i) => (
                        <span key={i} className={`text-[9px] px-1.5 py-0.5 rounded font-mono border ${
                            isMatch
                            ? 'bg-indigo-900/40 border-indigo-500/30 text-indigo-200'
                            : 'bg-gray-900 border-gray-700 text-gray-400'
                        }`}>
                            {p.key}:{p.values.join(', ')}
                        </span>
                    ))}
                </div>
            )}

            {/* Tags */}
            {note.tags.length > 0 && (
                <div className="flex flex-wrap gap-1">
                    {note.tags.map(tag => (
                        <span key={tag} className="text-[9px] text-blue-400/70 hover:text-blue-400 transition-colors">#{tag}</span>
                    ))}
                </div>
            )}

            {/* Match Details */}
            {relatedMatches.length > 0 && (
                 <div className="mt-2 pt-1 border-t border-indigo-500/20 text-[9px] text-indigo-300/80 font-mono">
                     {relatedMatches.map((m, idx) => (
                         <div key={idx} className="flex justify-between">
                             <span>&lt;-&gt; {m.source.id === note.id ? m.target.id.slice(0,6) : m.source.id.slice(0,6)}</span>
                             <span className="font-bold">{Math.round(m.score * 100)}%</span>
                         </div>
                     ))}
                 </div>
            )}
        </div>
    );
};

import React from 'react';
import {ScoredMatch} from '@notention/core';
import {MatchItem} from './MatchItem';
import {SparklesIcon} from '../common/icons';

interface MatchRepliesProps {
    matches: ScoredMatch[];
    onMatchClick?: (match: ScoredMatch) => void;
}

export function MatchReplies({matches, onMatchClick}: MatchRepliesProps) {
    if (!matches || matches.length === 0) return null;

    return (
        <div className="mt-8 max-w-4xl mx-auto">
            <div className="flex items-center gap-2 mb-6 text-gray-400 pl-4 border-l-4 border-blue-500/50">
                <SparklesIcon className="w-5 h-5 text-blue-400"/>
                <h3 className="text-base font-medium uppercase tracking-widest text-gray-300">Semantic Matches</h3>
                <span className="text-xs bg-blue-900/40 text-blue-300 px-2.5 py-1 rounded-full border border-blue-700/50 font-bold ml-2">
                    {matches.length}
                </span>
            </div>

            <div className="space-y-6 relative ml-6">
                {/* Vertical thread line */}
                <div className="absolute top-0 bottom-4 -left-6 w-px bg-gradient-to-b from-gray-700 via-gray-700/50 to-transparent"></div>

                {matches.map((match) => (
                    <div key={match.note.id} className="relative">
                        {/* Horizontal connector line */}
                        <div className="absolute top-8 -left-6 w-4 h-px bg-gray-700"></div>

                        <MatchItem
                            match={match}
                            isLocal={!match.note.author}
                            onClick={() => onMatchClick && onMatchClick(match)}
                        />
                    </div>
                ))}
            </div>
        </div>
    );
}

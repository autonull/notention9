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
        <div className="mt-8 border-t border-gray-800 pt-6">
            <div className="flex items-center gap-2 mb-4 text-gray-400">
                <SparklesIcon className="w-4 h-4 text-blue-400"/>
                <h3 className="text-sm font-semibold uppercase tracking-wider">Semantic Matches</h3>
                <span className="text-xs bg-blue-900/30 text-blue-300 px-2 py-0.5 rounded-full border border-blue-800/50">
                    {matches.length}
                </span>
            </div>

            <div className="space-y-4">
                {matches.map((match) => (
                    <div key={match.note.id} className="relative pl-6 before:absolute before:left-0 before:top-0 before:bottom-0 before:w-0.5 before:bg-gray-800">
                        {/* Avatar / Line Connector Placeholder */}
                        <div className="absolute left-[-5px] top-4 w-2.5 h-2.5 rounded-full bg-gray-700 border-2 border-gray-900"></div>

                        <MatchItem
                            match={match}
                            isLocal={true} // For now, treating as local view
                            onClick={() => onMatchClick && onMatchClick(match)}
                        />
                    </div>
                ))}
            </div>
        </div>
    );
}

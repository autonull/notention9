import React from 'react';
import { SparklesIcon } from '../common/icons';
import { useView } from '../../hooks/useViewContext';
import { SuggestedMatchItem } from './SuggestedMatchItem';

export function SuggestedMatches() {
    const { matches, setMatchingNoteId } = useView();

    if (matches.length === 0) return null;

    return (
        <div className="mb-8">
            <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                <SparklesIcon className="w-4 h-4 text-blue-400" />
                Suggested Opportunities
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {matches.slice(0, 4).map(match => (
                    <SuggestedMatchItem
                        key={`${match.localNoteId}-${match.event.id}`}
                        match={match}
                        onSelect={setMatchingNoteId}
                    />
                ))}
            </div>
            <div className="h-px bg-gray-700 my-6"></div>
        </div>
    );
};

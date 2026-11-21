import React from 'react';
import {EmptyState} from '../ui/Primitives';
import {MatchIcon} from '../ui/icons';

export function MatchesView() {
    return (
        <div className="h-full flex flex-col items-center justify-center">
            <EmptyState
                variant="minimal"
                title="Matches"
                description="Matching notes from the network will appear here."
                action={<MatchIcon className="w-12 h-12 text-gray-600" />}
            />
        </div>
    );
}
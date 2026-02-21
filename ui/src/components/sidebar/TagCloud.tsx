import React, {useMemo} from 'react';
import type {Note} from '@notention/core';

interface TagCloudProps {
    notes: Note[];
    onTagClick: (tag: string) => void;
}

export function TagCloud({notes, onTagClick}: TagCloudProps) {
    const tags = useMemo(() => {
        const counts: Record<string, number> = {};
        notes.forEach(note => {
            note.tags.forEach(tag => {
                counts[tag] = (counts[tag] || 0) + 1;
            });
        });
        return Object.entries(counts)
            .sort((a, b) => b[1] - a[1]) // Sort by frequency
            .map(([tag, count]) => ({tag, count}));
    }, [notes]);

    if (tags.length === 0) {
        return (
            <div className="p-4 text-center text-gray-500 text-sm">
                No tags found in current view.
            </div>
        );
    }

    // Simple scaling logic
    const maxCount = tags[0]?.count || 1;

    return (
        <div className="flex flex-wrap gap-2 p-2 justify-center">
            {tags.map(({tag, count}) => {
                const scale = 0.75 + (count / maxCount) * 0.75; // 0.75rem to 1.5rem

                return (
                    <button
                        key={tag}
                        onClick={() => onTagClick(tag)}
                        className="px-2 py-1 rounded-full bg-gray-800 border border-gray-700 hover:bg-gray-700 hover:border-blue-500/50 hover:text-blue-300 transition-all flex items-center"
                        style={{fontSize: `${Math.max(0.75, Math.min(1.5, scale))}rem`}}
                        title={`${count} notes`}
                    >
                        <span className="truncate max-w-[150px]">#{tag}</span>
                        <span className="ml-1 text-xs opacity-50" style={{fontSize: '0.7em'}}>{count}</span>
                    </button>
                );
            })}
        </div>
    );
};

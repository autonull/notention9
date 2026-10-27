import React, {useCallback, useMemo} from 'react';
import type {Note} from '@notention/core';
import {useView} from '../../hooks/useViewContext';
import {useNotes} from '../../hooks/useNotes';
import {ActivityFeed} from '../widgets/ActivityFeed';
import {EmptyState} from '../ui/Primitives';
import {ClockIcon} from '../ui/icons';
import {cn} from '../../utils/ui';

interface DashboardActivityFeedProps {
    notes: Note[];
}

export function DashboardActivityFeed({notes}: DashboardActivityFeedProps) {
    const {setSelectedNoteId, setActiveView} = useView();

    const recentNotes = useMemo(() => [...notes]
        .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
        .slice(0, 5), [notes]);

    const handleSelectNote = useCallback((id: string) => {
        setSelectedNoteId(id);
        setActiveView('notes');
    }, [setSelectedNoteId, setActiveView]);

    return (
        <article className="lg:col-span-2 bg-gray-900/50 rounded-3xl border border-gray-700/30 overflow-hidden flex flex-col backdrop-blur-sm shadow-xl animate-fade-in-up stagger-4">
            <header className="p-6 border-b border-gray-700/30 flex justify-between items-center bg-gray-800/20">
                <h2 className="text-xl font-bold flex items-center gap-3 text-white">
                    <div className="p-2 bg-gray-800 rounded-lg text-gray-300">
                        <ClockIcon className="w-5 h-5"/>
                    </div>
                    Recent Activity
                </h2>
            </header>
            <div className="p-6 flex-1">
                {recentNotes.length > 0 ? (
                    <ActivityFeed recentNotes={recentNotes} onSelectNote={handleSelectNote}/>
                ) : (
                    <EmptyState
                        icon={ClockIcon}
                        title="No recent activity"
                        description="Your recently updated notes will appear here."
                        className="h-full"
                    />
                )}
            </div>
        </article>
    );
}
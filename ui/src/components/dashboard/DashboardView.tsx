import React, {useState, useCallback} from 'react';
import type {Note} from '@notention/core';
import {useNotes} from '../../hooks/useNotes';
import {useView} from '../../hooks/useViewContext';
import {useSettings} from '../../hooks/useSettingsContext';
import {useDemoWorkspace} from '../../hooks/useDemoWorkspace';
import {DashboardWelcome} from './DashboardWelcome';
import {DashboardQuickCapture} from './DashboardQuickCapture';
import {DashboardStats} from './DashboardStats';
import {DashboardActivityFeed} from './DashboardActivityFeed';
import {DashboardQuickActions} from './DashboardQuickActions';
import {DashboardLocalMatch} from './DashboardLocalMatch';
import {EmptyState} from '../common/EmptyState';
import {Button} from '../ui';
import {PlusIcon, NoteIcon} from '../common/icons';
import {cn} from '../../utils/ui';

export function DashboardView() {
    const {notes, addNote, loading: notesLoading} = useNotes();
    const {setActiveView, setSelectedNoteId} = useView();
    const {settings} = useSettings();
    const {load: loadSampleWorkspace} = useDemoWorkspace();
    const [showFeatures, setShowFeatures] = useState(false);

    const handleCreateNote = useCallback(() => {
        const newNote = addNote({title: ''});
        setSelectedNoteId(newNote.id);
        setActiveView('notes');
    }, [addNote, setSelectedNoteId, setActiveView]);

    const handleSelectNote = useCallback((id: string) => {
        setSelectedNoteId(id);
        setActiveView('notes');
    }, [setSelectedNoteId, setActiveView]);

    // Show skeleton while loading
    if (notesLoading) {
        return (
            <div className="h-full overflow-y-auto bg-gray-950 text-white custom-scrollbar p-4 md:p-6 lg:p-8">
                <div className="max-w-7xl mx-auto space-y-8 animate-fade-in">
                    {/* Welcome Header Skeleton */}
                    <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 animate-fade-in">
                        <div>
                            <div className="h-8 w-48 bg-gray-800 rounded animate-pulse mb-2" />
                            <div className="h-4 w-64 bg-gray-800 rounded animate-pulse" />
                        </div>
                        <div className="h-12 w-32 bg-gray-800 rounded animate-pulse" />
                    </header>

                    {/* Quick Capture Section Skeleton */}
                    <section className="relative overflow-hidden rounded-3xl border border-gray-800 bg-gradient-to-br from-gray-900/50 to-gray-900/80 p-6 md:p-8 animate-fade-in">
                        <div className="relative z-10 max-w-2xl mx-auto text-center">
                            <div className="h-8 w-48 bg-gray-800 rounded mx-auto animate-pulse mb-2" />
                            <div className="h-4 w-80 bg-gray-800 rounded mx-auto animate-pulse mb-6" />
                            <div className="h-14 w-full bg-gray-800 rounded-lg animate-pulse mb-6 mx-auto max-w-md" />
                            <div className="h-4 w-40 bg-gray-800 rounded mx-auto animate-pulse mb-6" />
                            <div className="flex flex-wrap justify-center gap-2">
                                <div className="h-9 w-20 bg-gray-800 rounded-lg animate-pulse" />
                                <div className="h-9 w-20 bg-gray-800 rounded-lg animate-pulse" />
                                <div className="h-9 w-20 bg-gray-800 rounded-lg animate-pulse" />
                            </div>
                        </div>
                    </section>

                    {/* Stats Grid Skeleton */}
                    <section aria-label="Statistics" className="animate-fade-in">
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            <div className="h-24 bg-gray-800 rounded-xl animate-pulse" />
                            <div className="h-24 bg-gray-800 rounded-xl animate-pulse" />
                            <div className="h-24 bg-gray-800 rounded-xl animate-pulse" />
                            <div className="h-24 bg-gray-800 rounded-xl animate-pulse" />
                        </div>
                    </section>

                    {/* Main Content Grid Skeleton */}
                    <section className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-fade-in">
                        <div className="lg:col-span-2 h-96 bg-gray-800 rounded-3xl animate-pulse" />
                        <div className="h-96 bg-gray-800 rounded-3xl animate-pulse" />
                    </section>
                </div>
            </div>
        );
    }

    const showSampleWorkspace = notes.length === 0;
    const hasRecentActivity = notes.length > 0;

    return (
        <div className="h-full overflow-y-auto bg-gray-950 text-white custom-scrollbar p-4 md:p-6 lg:p-8">
            <div className="max-w-7xl mx-auto space-y-8 animate-fade-in">
                <DashboardWelcome
                    onCreateNote={handleCreateNote}
                    onToggleFeatures={() => setShowFeatures(!showFeatures)}
                    showFeatures={showFeatures}
                    loadSampleWorkspace={loadSampleWorkspace}
                    showSampleWorkspace={showSampleWorkspace}
                />

                <DashboardQuickCapture
                    onCreateNote={handleCreateNote}
                    loadSampleWorkspace={loadSampleWorkspace}
                    showSampleWorkspace={showSampleWorkspace}
                />

                {/* Empty state for users with notes but no recent activity */}
                {hasRecentActivity && notes.length > 0 && (
                    <section className="rounded-3xl border border-gray-700/50 bg-gray-900/50 p-8 animate-fade-in-up">
                        <EmptyState
                            icon={NoteIcon}
                            title="No recent activity"
                            description="Your notes will appear here as you create and edit them."
                            action={
                                <Button
                                    onClick={handleCreateNote}
                                    variant="primary"
                                    leftIcon={<PlusIcon className="w-4 h-4"/>}
                                    className="touch-target-48"
                                >
                                    Create your first note
                                </Button>
                            }
                        />
                    </section>
                )}

                <DashboardLocalMatch
                    notes={notes}
                    onSelectNote={handleSelectNote}
                />

                <DashboardStats
                    showFeatures={showFeatures}
                    setShowFeatures={setShowFeatures}
                />

                {/* Main Content Grid */}
                <section className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <DashboardActivityFeed notes={notes} />
                    <DashboardQuickActions onCreateNote={handleCreateNote} />
                </section>
            </div>
        </div>
    );
}
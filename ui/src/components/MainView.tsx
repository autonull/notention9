import React from 'react';
import type {Note} from '@notention/core';

import {useSettings} from '../hooks/useSettingsContext';
import {useView} from '../hooks/useViewContext';
import {useBackgroundMatcher} from '../hooks/useBackgroundMatcher';
import {useChatNotifications} from '../hooks/useChatNotifications';
import {useMetaprogramming} from '../hooks/useMetaprogramming';
import {LoadingSpinner} from './ui/icons';
import {NotesView} from './views/NotesView';
import {SettingsView} from './views/SettingsView';

interface MainViewProps {
    sortedNotes?: Note[];
    loading?: boolean;
}

export function MainView({sortedNotes, loading = false}: MainViewProps) {
    const {activeView} = useView();
    const {settingsLoading} = useSettings();

    useBackgroundMatcher();
    useChatNotifications();
    useMetaprogramming();

    if (loading || settingsLoading) {
        return (
            <div className="flex h-full items-center justify-center">
                <LoadingSpinner className="h-12 w-12"/>
            </div>
        );
    }

    return (
        <div className="relative h-full">
            {activeView === 'settings'
                ? <SettingsView/>
                : <NotesView sortedNotes={sortedNotes}/>}
        </div>
    );
}

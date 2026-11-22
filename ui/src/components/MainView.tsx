import React from 'react';
import type {Note} from '@notention/core';

import {useNotes} from '../hooks/useNotes';
import {useSettings} from '../hooks/useSettingsContext';
import {useView} from '../hooks/useViewContext';
import {useBackgroundMatcher} from '../hooks/useBackgroundMatcher';
import {useChatNotifications} from '../hooks/useChatNotifications';
import {useMetaprogramming} from '../hooks/useMetaprogramming';
import {LoadingSpinner} from './ui/icons';
import {ChatView} from './views/ChatView';
import {NotesView} from './views/NotesView';
import {SettingsView} from './views/SettingsView';
import {ResponsesView} from './views/ResponsesView';
import {InboxView} from './views/InboxView';
import {ConnectionsView} from './views/ConnectionsView';
import {LEGACY_VIEW_ALIASES} from '../utils/navigation';

interface MainViewProps {
    sortedNotes?: Note[];
}

export function MainView({sortedNotes}: MainViewProps) {
    const {activeView, sidebarViewMode} = useView();
    const {settingsLoading} = useSettings();
    const {notes, loading: notesLoading} = useNotes();

    // Run background matching
    useBackgroundMatcher();
    useChatNotifications();
    useMetaprogramming();

    if (notesLoading || settingsLoading) {
        return (
            <div className="flex justify-center items-center h-full">
                <LoadingSpinner className="h-12 w-12"/>
            </div>
        );
    }

    const renderView = () => {
        // Handle legacy view aliases
        const resolvedView = LEGACY_VIEW_ALIASES[activeView] ?? activeView;

        switch (resolvedView) {
            case 'capture':
                return <InboxView sortedNotes={sortedNotes}/>;
            case 'notes':
                return <NotesView sortedNotes={sortedNotes}/>;
            case 'connections':
                return <ConnectionsView/>;
            case 'settings':
                return <SettingsView/>;
            case 'chat':
                return <ChatView/>;
            case 'responses':
                return <ResponsesView/>;
            default:
                return <InboxView sortedNotes={sortedNotes}/>;
        }
    };

    return (
        <div className="relative h-full">
            {renderView()}
        </div>
    );
}

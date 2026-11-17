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
import {MapView} from './views/MapView';
import {TimelineView} from './views/TimelineView';
import {NetworkView} from './views/NetworkView';
import {NotesView} from './views/NotesView';
import {TrashView} from './views/TrashView';
import {SettingsView} from './views/SettingsView';
import {ResponsesView} from './views/ResponsesView';
import {ActionsView} from './views/ActionsView';
import {InboxView} from './views/InboxView';
import {LabelsView} from './views/LabelsView';
import {OntologyView} from './views/OntologyView';
import {SkillManagementView} from './skills';

interface MainViewProps {
    sortedNotes?: Note[];
}

export function MainView({sortedNotes}: MainViewProps) {
    const {activeView, matchingNoteId} = useView();
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
        switch (activeView) {
            case 'inbox':
                return <InboxView sortedNotes={sortedNotes}/>;
            case 'notes':
                return <NotesView sortedNotes={sortedNotes}/>;
            case 'trash':
                return <TrashView/>;
            case 'actions':
                return <ActionsView/>;
            case 'responses':
                return <ResponsesView/>;
            case 'labels':
                return <LabelsView/>;
            case 'ontology':
                return <OntologyView/>;
            case 'map':
                return <MapView/>;
            case 'timeline':
                return <TimelineView/>;
            case 'network':
                const matchNote = matchingNoteId
                    ? notes.find((n) => n.id === matchingNoteId)
                    : null;
                return <NetworkView matchAgainst={matchNote}/>;
            case 'chat':
                return <ChatView/>;
            case 'settings':
                return <SettingsView/>;
            case 'skills':
                return <SkillManagementView/>;
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

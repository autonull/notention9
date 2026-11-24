import React from 'react';

import {useSettings} from '../hooks/useSettingsContext';
import {useView} from '../hooks/useViewContext';
import {useBackgroundMatcher} from '../hooks/useBackgroundMatcher';
import {useChatNotifications} from '../hooks/useChatNotifications';
import {useMetaprogramming} from '../hooks/useMetaprogramming';
import {LoadingSpinner} from './ui/icons';
import {NotesView} from './views/NotesView';
import {SettingsView} from './views/SettingsView';

const GraphEditor = React.lazy(() => import('../dev/GraphEditor').then(m => ({ default: m.GraphEditor })));
const TemplatePlayground = React.lazy(() => import('../dev/TemplatePlayground').then(m => ({ default: m.TemplatePlayground })));

interface MainViewProps {
    loading?: boolean;
}

export function MainView({loading = false}: MainViewProps) {
    const {activeView, uisgMode} = useView();
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

    if (activeView === 'settings') {
        return <SettingsView/>;
    }

    if (activeView === 'uisg-dev') {
        return (
            <React.Suspense fallback={<div className="flex h-full items-center justify-center"><LoadingSpinner className="h-12 w-12"/></div>}>
                {uisgMode === 'template' ? <TemplatePlayground/> : <GraphEditor/>}
            </React.Suspense>
        );
    }

    return <NotesView/>;
}

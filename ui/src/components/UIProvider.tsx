import React, {ReactNode} from 'react';
import {SettingsProvider} from './contexts/SettingsContext';
import {MatchingProvider} from './contexts/MatchingContext';
import {NotesProvider} from './contexts/NotesContext';
import {ToastProvider} from './contexts/ToastProvider';
import {ViewNavigationProvider} from './contexts/ViewNavigationContext';
import {ViewSelectionProvider} from './contexts/ViewSelectionContext';
import {ViewNotificationProvider} from './contexts/ViewNotificationContext';
import {ViewUIStateProvider} from './contexts/ViewUIStateContext';
import {ViewLocationProvider} from './contexts/ViewLocationContext';
import {SuggestionProvider} from './contexts/SuggestionContext';

export function UIProvider({children}: { children: ReactNode }) {
    return (
        <SettingsProvider>
            <MatchingProvider>
                <NotesProvider>
                    <ToastProvider>
                        <ViewNavigationProvider>
                            <ViewSelectionProvider>
                                <ViewNotificationProvider>
                                    <ViewUIStateProvider>
                                        <ViewLocationProvider>
                                            <SuggestionProvider>
                                                {children}
                                            </SuggestionProvider>
                                        </ViewLocationProvider>
                                    </ViewUIStateProvider>
                                </ViewNotificationProvider>
                            </ViewSelectionProvider>
                        </ViewNavigationProvider>
                    </ToastProvider>
                </NotesProvider>
            </MatchingProvider>
        </SettingsProvider>
    );
}

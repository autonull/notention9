import React, {ReactNode} from 'react';
import {SettingsProvider} from './contexts/SettingsContext';
import {MatchingProvider} from './contexts/MatchingContext';
import {NotesProvider} from './contexts/NotesContext';
import {ToastProvider} from './contexts/ToastProvider';
import {ViewProvider} from './contexts/ViewContext';
import {SuggestionProvider} from './contexts/SuggestionContext';

export function UIProvider({children}: { children: ReactNode }) {
    return (
        <SettingsProvider>
            <MatchingProvider>
                <NotesProvider>
                    <ToastProvider>
                        <ViewProvider>
                            <SuggestionProvider>
                                {children}
                            </SuggestionProvider>
                        </ViewProvider>
                    </ToastProvider>
                </NotesProvider>
            </MatchingProvider>
        </SettingsProvider>
    );
}

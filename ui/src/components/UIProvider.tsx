import React, {ReactNode} from 'react';
import {SettingsProvider} from './contexts/SettingsContext';
import {NotesProvider} from './contexts/NotesContext';
import {ToastProvider} from './contexts/ToastProvider';
import {ViewProvider} from './contexts/ViewContext';
import {SuggestionProvider} from './contexts/SuggestionContext';

export function UIProvider({children}: { children: ReactNode }) {
    return (
        <SettingsProvider>
            <NotesProvider>
                <ToastProvider>
                    <ViewProvider>
                        <SuggestionProvider>
                            {children}
                        </SuggestionProvider>
                    </ViewProvider>
                </ToastProvider>
            </NotesProvider>
        </SettingsProvider>
    );
}

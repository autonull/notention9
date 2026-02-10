import React, { ReactNode } from 'react';
import { SettingsProvider } from './contexts/SettingsContext';
import { NotesProvider } from './contexts/NotesContext';
import { ToastProvider } from './contexts/ToastProvider';
import { ViewProvider } from './contexts/ViewContext';
import { SimulatorProvider } from './contexts/SimulatorProvider';
import { SuggestionProvider } from './contexts/SuggestionContext';

export function UIProvider({ children }: { children: ReactNode }) {
  return (
    <SettingsProvider>
      <NotesProvider>
        <ToastProvider>
          <ViewProvider>
            <SimulatorProvider>
              <SuggestionProvider>
                {children}
              </SuggestionProvider>
            </SimulatorProvider>
          </ViewProvider>
        </ToastProvider>
      </NotesProvider>
    </SettingsProvider>
  );
}

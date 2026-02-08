import React from 'react';
import ReactDOM from 'react-dom/client';
import 'tippy.js/dist/tippy.css'; // Import tippy styles for suggestions
import './index.css';
import App from './App';
import { SettingsProvider } from './components/contexts/SettingsContext';
import { NotesProvider } from './components/contexts/NotesContext';
import { ToastProvider } from './components/contexts/ToastProvider';
import { ViewProvider } from './components/contexts/ViewContext';
import { SimulatorProvider } from './components/contexts/SimulatorProvider';
import { SuggestionProvider } from './components/contexts/SuggestionContext';
import { pluginManager } from './plugins';
import { Logger } from '@notention/core';

// Initialize plugins
pluginManager.loadPlugins();

// Service worker is registered via vite-plugin-pwa injection

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error('Could not find root element to mount to');
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <SettingsProvider>
      <NotesProvider>
        <ToastProvider>
          <ViewProvider>
            <SimulatorProvider>
              <SuggestionProvider>
                <App />
              </SuggestionProvider>
            </SimulatorProvider>
          </ViewProvider>
        </ToastProvider>
      </NotesProvider>
    </SettingsProvider>
  </React.StrictMode>
);

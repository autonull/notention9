import React from 'react';
import ReactDOM from 'react-dom/client';
import 'tippy.js/dist/tippy.css'; // Import tippy styles for suggestions
import './index.css';
import App from './App';
import { UIProvider } from './components/UIProvider';
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
    <UIProvider>
      <App />
    </UIProvider>
  </React.StrictMode>
);

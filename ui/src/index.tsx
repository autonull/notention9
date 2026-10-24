import React from 'react';
import ReactDOM from 'react-dom/client';
import 'tippy.js/dist/tippy.css'; // Import tippy styles for suggestions
import 'leaflet/dist/leaflet.css';
import './index.css';
import App from './App';
import {UIProvider} from './components/UIProvider';
import {pluginManager} from './plugins';

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
            <App/>
        </UIProvider>
    </React.StrictMode>
);

// Enhanced focus management for keyboard navigation
if (typeof window !== 'undefined') {
    // Announce route changes to screen readers
    let lastActiveView = '';
    const observer = new MutationObserver(() => {
        const mainContent = document.getElementById('main-content');
        if (mainContent && mainContent.firstElementChild) {
            const viewName = mainContent.firstElementChild.tagName.toLowerCase();
            if (viewName !== lastActiveView) {
                lastActiveView = viewName;
                // Could announce to screen readers here if needed
            }
        }
    });
    
    const mainContent = document.getElementById('main-content');
    if (mainContent) {
        observer.observe(mainContent, {childList: true, subtree: true});
    }
    
    // Add global keyboard shortcut listener for accessibility
    document.addEventListener('keydown', (e) => {
        // Ctrl+Alt+S: Skip to main content (accessibility)
        if (e.ctrlKey && e.altKey && e.key === 's') {
            e.preventDefault();
            const mainContent = document.getElementById('main-content');
            if (mainContent) {
                mainContent.focus();
                mainContent.scrollIntoView({behavior: 'smooth'});
            }
        }
    });
}

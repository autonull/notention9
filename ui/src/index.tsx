// __name polyfill for Rollup's CommonJS helper - MUST BE FIRST IMPORT
import './polyfills/name';
import './polyfills/buffer';

import React from 'react';
import ReactDOM from 'react-dom/client';
import 'tippy.js/dist/tippy.css';
import 'leaflet/dist/leaflet.css';
import './index.css';
import App from './App';
import {UIProvider} from './components/UIProvider';
import {pluginManager} from './plugins';
import {storageRecovery} from '@notention/core';
import {initializeAI, getInferenceRouter} from './services/ai/init';
import {initializeHelp} from '@/lib/helpConfig';

// Initialize plugins
pluginManager.loadPlugins();

// Start storage recovery auto-snapshots (24h interval)
storageRecovery.startAutoSnapshot();

// Initialize help system with video support
initializeHelp().catch(console.error);

// Service worker is registered via vite-plugin-pwa injection

// Expose AI initialization for optimizer/headless use
if (typeof window !== 'undefined') {
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('optimizer') === 'true') {
        window.__OPTIMIZER_AI__ = { initializeAI, getInferenceRouter };
    }
}

const rootElement = document.getElementById('root');
if (!rootElement) {
    throw new Error('Could not find root element to mount to');
}

const KitGallery = React.lazy(() => import('./dev/KitGallery'));
const GeneratedSurfaceGallery = React.lazy(() => import('./dev/GeneratedSurfaceGallery'));
const GeneratedSkeleton = React.lazy(() => import('./dev/GeneratedSkeleton'));
const params = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : new URLSearchParams();
const kitRequested = typeof window !== 'undefined' &&
    (window.location.hash === '#/kit' || params.get('kit') === '1');
const skeletonRequested = params.get('uisg') === '1' && params.get('flow');
const galleryRequested = params.get('uisg') === '1' && !params.get('flow');
const uisgRequested = params.get('uisg') === '1';
const requestedTheme = params.get('theme');
const themeStyles = import.meta.glob('./styles/theme-*.css');

if (uisgRequested && requestedTheme) {
    if (requestedTheme === 'dark' || requestedTheme === 'light') {
        document.documentElement.setAttribute('data-theme', requestedTheme);
        document.documentElement.classList.toggle('light', requestedTheme === 'light');
        document.documentElement.classList.toggle('dark', requestedTheme === 'dark');
    } else {
        const loadTheme = themeStyles[`./styles/theme-${requestedTheme}.css`];
        if (loadTheme) void loadTheme();
        else console.warn(`Unknown uisg theme: ${requestedTheme}`);
    }
}

const root = ReactDOM.createRoot(rootElement);
root.render(
    skeletonRequested
        ? <React.Suspense fallback={null}><GeneratedSkeleton/></React.Suspense>
        : galleryRequested
            ? <React.Suspense fallback={null}><GeneratedSurfaceGallery/></React.Suspense>
            : kitRequested
                ? <React.Suspense fallback={null}><KitGallery/></React.Suspense>
                : <UIProvider><App/></UIProvider>
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

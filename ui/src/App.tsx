import React from 'react';
import {AppShell} from './components/AppShell';
import {ErrorBoundary, ErrorDisplay, ErrorHandlingProvider, SkipLink} from './components/ui/Primitives';
import {ConfigSync} from './components/config/ConfigSync';
import {AgentCursor} from './components/AgentCursor';
import {AgentStatusIndicator} from './components/agent/AgentStatusIndicator';
import {useNetworkManagement} from './hooks/useNetworkManagement';

function App() {
    return (
        <ErrorHandlingProvider>
            <ErrorBoundary>
                <AppContent/>
            </ErrorBoundary>
            <ErrorDisplay/>
        </ErrorHandlingProvider>
    );
}

function AppContent() {
    // Enable P2P Sync
    useNetworkManagement();

    return (
        <>
            <SkipLink targetId="main-content" />
            <AgentStatusIndicator/>
            <AgentCursor/>
            <AppShell/>
            <ConfigSync/>
        </>
    );
}

export default App;

import React from 'react';
import {AppShell} from './components/AppShell';
import {ErrorDisplay, ErrorHandlingProvider} from './components/common/ErrorHandler';
import {ConfigSync} from './components/config/ConfigSync';
import {AgentCursor} from './components/AgentCursor';
import {AgentStatusIndicator} from './components/agent/AgentStatusIndicator';
import {useNostrSync} from './hooks/useNostrSync';

function App() {
    return (
        <ErrorHandlingProvider>
            <AppContent/>
            <ErrorDisplay/>
        </ErrorHandlingProvider>
    );
}

function AppContent() {
    // Enable P2P Sync
    useNostrSync();

    return (
        <>
            <AgentStatusIndicator/>
            <AgentCursor/>
            <AppShell/>
            <ConfigSync/>
        </>
    );
}

export default App;

import React from 'react';
import {AppShell} from './components/AppShell';
import {ErrorBoundary, ErrorDisplay, ErrorHandlingProvider, SkipLink} from './components/ui/Primitives';
import {ConfigSync} from './components/config/ConfigSync';
import {AgentCursor} from './components/AgentCursor';
import {AgentStatusIndicator} from './components/agent/AgentStatusIndicator';
import {useNetworkManagement} from './hooks/useNetworkManagement';
import {useStrategyInit} from './hooks/useStrategyInit';
import {StrategyProvider} from './hooks/useStrategyResolver';

function App() {
    useStrategyInit();
    
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
        <StrategyProvider>
            <>
                <SkipLink targetId="main-content" />
                <AgentStatusIndicator/>
                <AgentCursor/>
                <AppShell/>
                <ConfigSync/>
            </>
        </StrategyProvider>
    );
}

export default App;

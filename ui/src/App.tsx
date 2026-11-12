import React from 'react';
import {AppShell} from './components/AppShell';
import {ErrorBoundary, ErrorDisplay, ErrorHandlingProvider, SkipLink} from './components/ui/Primitives';
import {ConfigSync} from './components/config/ConfigSync';
import {AgentCursor} from './components/AgentCursor';
import {AgentStatusIndicator} from './components/agent/AgentStatusIndicator';
import {useNetworkManagement} from './hooks/useNetworkManagement';
import {useStrategyInit} from './hooks/useStrategyInit';
import {StrategyProvider} from './hooks/useStrategyResolver';
import {I18nProvider} from './components/i18n';
import {AccessibilityProvider} from './hooks/useAccessibility';

function App() {
    useStrategyInit();
    
    return (
        <I18nProvider>
            <AccessibilityProvider>
                <ErrorHandlingProvider>
                    <ErrorBoundary>
                        <AppContent/>
                    </ErrorBoundary>
                    <ErrorDisplay/>
                </ErrorHandlingProvider>
            </AccessibilityProvider>
        </I18nProvider>
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

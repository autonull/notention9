import React, { useEffect, useState } from 'react';
import { Logger } from '@notention/core';
import { AppShell } from './components/AppShell';
import { agentService } from './services/AgentService';
import { ErrorHandlingProvider, ErrorDisplay } from './components/common/ErrorHandler';

import { OnboardingModal } from './components/onboarding/OnboardingModal';
import { ConfigSync } from './components/config/ConfigSync';
import { AgentCursor } from './components/AgentCursor';
import { AgentStatusIndicator } from './components/AgentStatus';

function App() {
  return (
    <ErrorHandlingProvider>
      <AppContent />
      <ErrorDisplay />
    </ErrorHandlingProvider>
  );
}

function AppContent() {
  const [agentStatus, setAgentStatus] = useState(agentService.getStatus());

  useEffect(() => {
    agentService.connect();

    const handleStatusChange = (status: any) => {
      setAgentStatus(status);
    };

    const handleError = (errorInfo: any) => {
      Logger.getInstance().error('Agent error:', undefined, errorInfo);
      setAgentStatus(agentService.getStatus());
    };

    agentService.on('status_change', handleStatusChange);
    agentService.on('error', handleError);

    // Also listen to browser online/offline events
    const handleBrowserOnline = () => {
      // Try to reconnect when browser comes online
      if (agentStatus.status === 'offline') {
        agentService.reconnect();
      }
    };

    window.addEventListener('online', handleBrowserOnline);

    // Initial status
    setAgentStatus(agentService.getStatus());

    return () => {
      agentService.off('status_change', handleStatusChange);
      agentService.off('error', handleError);
      window.removeEventListener('online', handleBrowserOnline);
    };
  }, []);

  return (
    <>
      <AgentStatusIndicator status={agentStatus} />
      <AgentCursor />
      <AppShell />
      <OnboardingModal />
      <ConfigSync />
    </>
  );
}

export default App;

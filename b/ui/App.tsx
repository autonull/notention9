import React, { useEffect, useState } from 'react';
import { AppShell } from './components/AppShell';
import { agentService } from './services/AgentService';
import { ErrorHandlingProvider, ErrorDisplay } from './components/common/ErrorHandler';

import { OnboardingModal } from './components/onboarding/OnboardingModal';
import { ConfigSync } from './components/config/ConfigSync';
import { AgentCursor } from './components/AgentCursor';

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
      console.error('Agent error:', errorInfo);
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

  // Determine UI status display
  let statusDisplay = null;
  if (agentStatus.status === 'offline') {
    statusDisplay = (
      <div className="fixed top-4 right-4 bg-yellow-500 text-black px-4 py-2 rounded shadow-lg z-50 animate-pulse">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 bg-black rounded-full"></span>
          Offline Mode - Working locally
        </div>
      </div>
    );
  } else if (agentStatus.status === 'connecting' || agentStatus.status === 'reconnecting') {
    statusDisplay = (
      <div className="fixed top-4 right-4 bg-blue-500 text-white px-4 py-2 rounded shadow-lg z-50">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
          {agentStatus.status === 'connecting' ? 'Connecting...' : 'Reconnecting...'}
        </div>
      </div>
    );
  } else if (agentStatus.status === 'connected') {
    statusDisplay = (
      <div className="fixed top-4 right-4 bg-green-500 text-white px-4 py-2 rounded shadow-lg z-50">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 bg-white rounded-full"></div>
          Connected to Agent
        </div>
        {agentStatus.queueSize > 0 && (
          <div className="text-xs mt-1">Processing {agentStatus.queueSize} queued messages...</div>
        )}
      </div>
    );
  }

  // Show error notification if there's an error
  let errorDisplay = null;
  if (agentStatus.lastError) {
    errorDisplay = (
      <div className="fixed top-16 right-4 bg-red-500 text-white px-4 py-2 rounded shadow-lg z-50 max-w-xs">
        <div className="text-sm">Agent Error: {agentStatus.lastError}</div>
        <button
          onClick={() => agentService.reconnect()}
          className="mt-1 text-xs underline hover:no-underline"
        >
          Retry Connection
        </button>
      </div>
    );
  }

  return (
    <>
      {statusDisplay}
      {errorDisplay}
      <AgentCursor />
      <AppShell />
      <OnboardingModal />
      <ConfigSync />
    </>
  );
}

export default App;

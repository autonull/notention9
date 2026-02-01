import React, { useEffect } from 'react';
import { AppShell } from './components/AppShell';
import { agentService } from './services/AgentService';
import { ControlModeProvider } from './components/contexts/ControlModeContext';

function App() {
  useEffect(() => {
    agentService.connect();
  }, []);

  return (
    <ControlModeProvider>
      <AppShell />
    </ControlModeProvider>
  );
}

export default App;

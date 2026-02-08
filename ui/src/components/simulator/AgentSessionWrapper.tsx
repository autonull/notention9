import React, { useMemo } from 'react';
import { NotesContext } from '../contexts/NotesContext';
import { useNotesData } from '../../hooks/data/useNotesData';
import { SettingsContext } from '../contexts/SettingsContext';
import localforage from 'localforage';
import type { ReactNode } from 'react';
import type { OntologyNode } from '@notention/core';
import { DEFAULT_ONTOLOGY } from '@notention/core';

interface Props {
  agentId: string;
  ontology: OntologyNode[];
  children: ReactNode;
}

export function AgentSessionWrapper({ agentId, ontology, children }: Props) {
  // Create a unique localForage instance for this agent
  const driver = useMemo(() => {
    return localforage.createInstance({
      name: `agent-${agentId}`
    });
  }, [agentId]);

  // Initialize notes state with this driver
  const notesState = useNotesData(driver);

  // For the simulation, we provide a static settings context.
  // In a deeper implementation, we could also use useLocalForage for settings.
  const settingsState = useMemo(() => ({
    settings: {
      aiEnabled: true, // Force AI on for agents
      developerMode: false,
      theme: 'dark' as const,
      nostr: {
        privkey: null, // Agents handle keys separately
      },
      ontology: ontology || DEFAULT_ONTOLOGY,
    },
    setSettings: () => {}, // No-op for now
    settingsLoading: false
  }), [ontology]);

  return (
    <SettingsContext.Provider value={settingsState}>
      <NotesContext.Provider value={notesState}>
        {children}
      </NotesContext.Provider>
    </SettingsContext.Provider>
  );
};

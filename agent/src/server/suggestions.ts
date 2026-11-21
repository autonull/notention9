import { PersistenceService } from '../persistence.js';
import { SuggestionOrchestrator, type SuggestionEnvironment, DEFAULT_ONTOLOGY, referenceSkillDefinitions } from '@notention/core';
import { AgentSuggestionStateStore } from './AgentSuggestionStateStore.js';

let initialized = false;

export async function initializeAgentSuggestions(): Promise<void> {
  if (initialized) return;

  // Load ontology and notes
  const notes = await PersistenceService.getNotesSafe();

  // Create persistent state store
  const stateStore = new AgentSuggestionStateStore();

  // Configure orchestrator with environment snapshot
  SuggestionOrchestrator.getInstance().configure({
    ontology: DEFAULT_ONTOLOGY,
    notes,
    skills: referenceSkillDefinitions,
    store: stateStore,
  });

  initialized = true;
}

export async function refreshAgentSuggestions(): Promise<void> {
  if (!initialized) {
    await initializeAgentSuggestions();
    return;
  }

  // Refresh notes and reconfigure
  const notes = await PersistenceService.getNotesSafe();

  SuggestionOrchestrator.getInstance().configure({
    notes,
    skills: referenceSkillDefinitions,
  });
}
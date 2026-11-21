import { useEffect, useMemo, useCallback } from 'react';
import { useSettings } from '../hooks/useSettingsContext';
import { useNotes } from '../hooks/useNotes';
import { browserSuggestionStateStore } from './suggestionStateStore';
import { suggestionOrchestrator, type SuggestionEnvironment } from '@notention/core';
import { referenceSkillDefinitions } from '@notention/core/suggestions/note';
import { CapabilityManager } from '@notention/core/security';

let initialized = false;

export function useSuggestionsCompositionRoot(): void {
  const { settings } = useSettings();
  const { notes } = useNotes();

  const capabilityManager = useMemo(() => new CapabilityManager(), []);

  const llmConfig = useMemo(() => {
    if (!settings.aiEnabled) return undefined;
    
    // LLM client will be created lazily when needed
    // For now, return config without client - the LLM source handles client creation
    return {
      client: null as any, // Will be set by LLM source
      capabilityManager,
      enabled: true,
      maxSuggestions: 3
    };
  }, [settings.aiEnabled, capabilityManager]);

  const environment = useMemo((): Partial<SuggestionEnvironment> => ({
    ontology: settings.ontology ?? [],
    notes,
    skills: referenceSkillDefinitions,
    store: browserSuggestionStateStore,
    llm: llmConfig,
  }), [settings.ontology, notes, llmConfig]);

  const configure = useCallback(() => {
    suggestionOrchestrator.configure(environment);
    initialized = true;
  }, [environment]);

  useEffect(() => {
    configure();
  }, [configure]);
}

export function initializeSuggestions(): void {
  // Called once at app startup from AppShell
  // The actual configuration happens in useSuggestionsCompositionRoot
  // This function exists for explicit initialization if needed
}
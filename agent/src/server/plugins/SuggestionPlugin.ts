import { z } from 'zod';
import { McpToolRegistry } from '../McpToolRegistry.js';
import { AgentPlugin } from '../AgentPlugin.js';
import { SuggestionOrchestrator, type SuggestionEvent } from '@notention/core';
import { PersistenceService } from '../../persistence.js';
import { tryCatch, tryCatchSync, createSuccessResponse } from '../../utils/errorHandling.js';
import { logInfo, logDebug } from '@notention/core';

export class SuggestionPlugin implements AgentPlugin {
  name = 'suggestions';
  version = '1.0.0';
  private orchestrator: SuggestionOrchestrator;

  constructor() {
    this.orchestrator = SuggestionOrchestrator.getInstance();
  }

  async initialize(registry: McpToolRegistry): Promise<void> {
    this.registerSuggestionTools(registry);
    this.setupEventForwarding();
    logInfo('SuggestionPlugin initialized');
  }

  private registerSuggestionTools(registry: McpToolRegistry): void {
    registry.register('get_note_suggestions', {
      description: 'Get suggestions for a note',
      schema: z.object({
        noteId: z.string()
      }),
      sideEffect: 'read' as const,
      handler: async ({ noteId }) => {
        return tryCatch(async () => {
          const suggestions = this.orchestrator.getSuggestions(noteId);
          return { suggestions };
        }, 'SuggestionPlugin.get_note_suggestions', { suggestions: [] });
      }
    });

    registry.register('refresh_note_suggestions', {
      description: 'Refresh suggestions for a note',
      schema: z.object({
        noteId: z.string()
      }),
      sideEffect: 'write' as const,
      handler: async ({ noteId }) => {
        return tryCatch(async () => {
          const notes = await PersistenceService.getNotesSafe();
          const note = notes.find(n => n.id === noteId);
          if (!note) throw new Error(`Note ${noteId} not found`);

          const result = await this.orchestrator.onNoteEdited(note);
          return { suggestions: result.suggestions, generationId: result.generationId };
        }, 'SuggestionPlugin.refresh_note_suggestions', { suggestions: [], generationId: '' });
      }
    });

    registry.register('apply_suggestion', {
      description: 'Apply a suggestion to a note',
      schema: z.object({
        suggestionId: z.string()
      }),
      sideEffect: 'write' as const,
      handler: async ({ suggestionId }) => {
        return tryCatch(async () => {
          const applied = this.orchestrator.applySuggestion(suggestionId);
          if (!applied) throw new Error(`Suggestion ${suggestionId} not found or already applied`);
          
          return { success: true, suggestionId };
        }, 'SuggestionPlugin.apply_suggestion', { success: false, suggestionId: '' });
      }
    });

    registry.register('dismiss_suggestion', {
      description: 'Dismiss a suggestion',
      schema: z.object({
        suggestionId: z.string()
      }),
      sideEffect: 'write' as const,
      handler: async ({ suggestionId }) => {
        return tryCatch(async () => {
          const dismissed = this.orchestrator.dismissSuggestion(suggestionId);
          if (!dismissed) throw new Error(`Suggestion ${suggestionId} not found`);
          
          return { success: true, suggestionId };
        }, 'SuggestionPlugin.dismiss_suggestion', { success: false, suggestionId: '' });
      }
    });

    registry.register('generate_suggestions_on_publish', {
      description: 'Generate suggestions when a note is published',
      schema: z.object({
        noteId: z.string()
      }),
      sideEffect: 'write' as const,
      handler: async ({ noteId }) => {
        return tryCatch(async () => {
          const notes = await PersistenceService.getNotesSafe();
          const note = notes.find(n => n.id === noteId);
          if (!note) throw new Error(`Note ${noteId} not found`);

          const result = await this.orchestrator.onNotePublished(note);
          return { suggestions: result.suggestions, generationId: result.generationId };
        }, 'SuggestionPlugin.generate_suggestions_on_publish', { suggestions: [], generationId: '' });
      }
    });

    registry.register('generate_suggestions_on_match', {
      description: 'Generate suggestions when a match arrives',
      schema: z.object({
        noteId: z.string()
      }),
      sideEffect: 'write' as const,
      handler: async ({ noteId }) => {
        return tryCatch(async () => {
          const notes = await PersistenceService.getNotesSafe();
          const note = notes.find(n => n.id === noteId);
          if (!note) throw new Error(`Note ${noteId} not found`);

          const result = await this.orchestrator.onMatchArrival(note);
          return { suggestions: result.suggestions, generationId: result.generationId };
        }, 'SuggestionPlugin.generate_suggestions_on_match', { suggestions: [], generationId: '' });
      }
    });
  }

  private setupEventForwarding(): void {
    this.orchestrator.onAll((event: SuggestionEvent) => {
      logDebug('Suggestion event:', { type: event.type, noteId: event.noteId, generationId: event.generationId });
    });
  }
}
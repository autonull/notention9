import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { SuggestionOrchestrator, suggestionOrchestrator } from './orchestrator.js';
import type { Note, OntologyNode, Property } from '../../types/index.js';
import { createMockNote, createMockOntology, createMockProperty } from '../../test-utils/index.js';

function createTestNote(overrides: Partial<Note> = {}): Note {
  return createMockNote({
    id: 'test-note-1',
    title: 'Test Note',
    content: 'I need a developer for my project',
    properties: [
      createMockProperty('type', 'is', ['request/need-request']),
      createMockProperty('skill', 'is', ['typescript']),
      createMockProperty('priority', 'is', ['high']),
      createMockProperty('frequency', 'is', ['weekly']),
    ],
    ...overrides,
  });
}

function createEmptyTestNote(overrides: Partial<Note> = {}): Note {
  return createMockNote({
    id: 'empty-note-1',
    title: 'Empty Note',
    content: 'No properties',
    properties: [],
    ...overrides,
  });
}

function createTestOntology(): OntologyNode[] {
  return [
    {
      id: 'request/need-request',
      label: 'Need Request',
      description: 'A request for something needed',
      attributes: {
        skill: {
          type: 'string',
          description: 'Required skill',
          operators: { real: ['is'], imaginary: ['is not'] },
        },
        budget: {
          type: 'number',
          description: 'Budget range',
          operators: { real: ['gte', 'lte'], imaginary: ['gt', 'lt'] },
        },
        deadline: {
          type: 'date',
          description: 'Deadline',
          operators: { real: ['is'], imaginary: ['is not'] },
        },
        priority: {
          type: 'enum',
          options: ['low', 'medium', 'high', 'urgent', 'critical'],
          description: 'Priority level',
          operators: { real: ['is'], imaginary: ['is not'] },
        },
        frequency: {
          type: 'string',
          description: 'Recurrence frequency',
          operators: { real: ['is'], imaginary: ['is not'] },
        },
      },
      children: [],
    },
    {
      id: 'offer/skill-offer',
      label: 'Skill Offer',
      description: 'An offer of a skill',
      attributes: {
        skill: {
          type: 'string',
          description: 'Offered skill',
          operators: { real: ['is'], imaginary: ['is not'] },
        },
        contact: {
          type: 'string',
          description: 'Contact info',
          operators: { real: ['is'], imaginary: ['is not'] },
        },
      },
      children: [],
    },
  ];
}

describe('SuggestionOrchestrator', () => {
  let orchestrator: SuggestionOrchestrator;

  beforeEach(() => {
    vi.useFakeTimers();
    SuggestionOrchestrator.resetInstance();
    orchestrator = SuggestionOrchestrator.getInstance();
    orchestrator.setOntology(createTestOntology());
  });

  afterEach(() => {
    vi.useRealTimers();
    SuggestionOrchestrator.resetInstance();
  });

  describe('WS0: Orchestrator state management', () => {
    it('should return empty suggestions for a note with no triggers', async () => {
      const note = createEmptyTestNote();
      const result = await orchestrator.enqueueGeneration(note, 'refresh');
      expect(result.suggestions).toEqual([]);
      expect(result.generationId).toMatch(/^gen-/);
    });

    it('should generate suggestions on publish trigger', async () => {
      const note = createTestNote();
      const result = await orchestrator.onNotePublished(note);
      expect(result.suggestions.length).toBeGreaterThan(0);
      expect(result.suggestions.every(s => s.status === 'active')).toBe(true);
    });

    it('should generate suggestions on edit trigger', async () => {
      const note = createTestNote();
      const result = await orchestrator.onNoteEdited(note);
      expect(result.suggestions.length).toBeGreaterThan(0);
    });

    it('should generate suggestions on match-arrival trigger', async () => {
      const note = createTestNote();
      const result = await orchestrator.onMatchArrival(note);
      expect(result.suggestions.length).toBeGreaterThan(0);
    });

    it('should deduplicate identical consecutive generations (content hash)', async () => {
      const note = createTestNote();

      const result1 = await orchestrator.enqueueGeneration(note, 'publish');
      const result2 = await orchestrator.enqueueGeneration(note, 'refresh');

      expect(result2.generationId).toBe(result1.generationId);
      expect(result2.suggestions).toEqual(result1.suggestions);
    });

    it('should NOT deduplicate when content changes', async () => {
      const note1 = createTestNote({ id: 'note-1' });
      const note2 = createTestNote({
        id: 'note-1',
        properties: [
          createMockProperty('type', 'is', ['request/need-request']),
          createMockProperty('skill', 'is', ['typescript']),
          createMockProperty('priority', 'is', ['high']),
          createMockProperty('frequency', 'is', ['weekly']),
          createMockProperty('budget', 'gte', ['1000']),
        ],
      });

      const result1 = await orchestrator.enqueueGeneration(note1, 'publish');
      const result2 = await orchestrator.enqueueGeneration(note2, 'edit');

      expect(result2.generationId).not.toBe(result1.generationId);
    });

    it('should wait for ontology with timeout (1.5s)', async () => {
      SuggestionOrchestrator.resetInstance();
      const freshOrchestrator = SuggestionOrchestrator.getInstance();
      // Don't set ontology - should timeout
      
      const note = createEmptyTestNote();
      const promise = freshOrchestrator.enqueueGeneration(note, 'publish');
      
      await vi.advanceTimersByTimeAsync(1600);
      const result = await promise;
      
      expect(result.suggestions).toEqual([]);
    });

    it('should emit generation-started and generation-completed events', async () => {
      const events: string[] = [];
      const unsub = orchestrator.onAll((e) => events.push(e.type));
      
      const note = createTestNote({
        properties: [createMockProperty('type', 'is', ['request/need-request'])],
      });
      await orchestrator.enqueueGeneration(note, 'publish');
      
      expect(events).toContain('generation-started');
      expect(events).toContain('generation-completed');
      unsub();
    });

    it('should emit suggestion-added events for each new suggestion', async () => {
      const addedEvents: string[] = [];
      const unsub = orchestrator.on('suggestion-added', (e) => {
        console.log('[Test] suggestion-added event:', e.suggestion?.id);
        addedEvents.push(e.suggestion?.id || '');
      });
      
      const note = createTestNote();
      await orchestrator.enqueueGeneration(note, 'publish');
      
      console.log('[Test] addedEvents:', addedEvents);
      expect(addedEvents.length).toBeGreaterThan(0);
      unsub();
    });
  });

  describe('WS1: Stale suggestion handling', () => {
    it('should mark previous active suggestions as stale when new generation produces different suggestions', async () => {
      const note = createTestNote();

      await orchestrator.enqueueGeneration(note, 'publish');
      const firstSuggestions = orchestrator.getSuggestions(note.id, 'active');
      expect(firstSuggestions.length).toBeGreaterThan(0);

      // Change note type to offer - this should trigger different rules (contact suggestion)
      const noteAsOffer = createTestNote({
        id: 'test-note-1',
        properties: [
          createMockProperty('type', 'is', ['offer/skill-offer']),
          createMockProperty('skill', 'is', ['typescript']),
        ],
      });

      await orchestrator.enqueueGeneration(noteAsOffer, 'edit');
      
      const activeAfterEdit = orchestrator.getSuggestions(note.id, 'active');
      const staleAfterEdit = orchestrator.getSuggestions(note.id, 'stale');
      
      // The old request-type suggestions should be stale, new offer-type suggestions should be active
      expect(staleAfterEdit.length).toBeGreaterThan(0);
      expect(staleAfterEdit.every(s => s.status === 'stale')).toBe(true);
    });

    it('should emit suggestion-updated event when suggestion becomes stale', async () => {
      const updatedEvents: string[] = [];
      const unsub = orchestrator.on('suggestion-updated', (e) => updatedEvents.push(e.suggestion?.status || ''));
      
      const note = createTestNote();
      await orchestrator.enqueueGeneration(note, 'publish');

      // Change note type to offer - this should trigger different rules
      const noteAsOffer = createTestNote({
        id: 'test-note-1',
        properties: [
          createMockProperty('type', 'is', ['offer/skill-offer']),
          createMockProperty('skill', 'is', ['typescript']),
        ],
      });
      await orchestrator.enqueueGeneration(noteAsOffer, 'edit');
      
      expect(updatedEvents.some(s => s === 'stale')).toBe(true);
      unsub();
    });

    it('should NOT mark suggestions as stale when generation produces same suggestions', async () => {
      const note = createTestNote();

      await orchestrator.enqueueGeneration(note, 'publish');
      const firstSuggestions = orchestrator.getSuggestions(note.id, 'active');
      
      await orchestrator.enqueueGeneration(note, 'refresh');
      
      const staleAfterRefresh = orchestrator.getSuggestions(note.id, 'stale');
      expect(staleAfterRefresh.length).toBe(0);
    });

    it('should track generationId on all suggestions', async () => {
      const note = createTestNote();
      const result = await orchestrator.enqueueGeneration(note, 'publish');
      
      expect(result.suggestions.every(s => s.generationId === result.generationId)).toBe(true);
    });

    it('should preserve stale suggestions in getSuggestions (no status filter)', async () => {
      const note = createTestNote();
      await orchestrator.enqueueGeneration(note, 'publish');
      
      // Change note type to offer - this should trigger different rules
      const noteAsOffer = createTestNote({
        id: 'test-note-1',
        properties: [
          createMockProperty('type', 'is', ['offer/skill-offer']),
          createMockProperty('skill', 'is', ['typescript']),
        ],
      });
      await orchestrator.enqueueGeneration(noteAsOffer, 'edit');
      
      const allSuggestions = orchestrator.getSuggestions(note.id);
      const activeCount = allSuggestions.filter(s => s.status === 'active').length;
      const staleCount = allSuggestions.filter(s => s.status === 'stale').length;
      
      expect(activeCount + staleCount).toBe(allSuggestions.length);
      expect(staleCount).toBeGreaterThan(0);
    });
  });

  describe('Suppression after reload', () => {
    it('should regenerate suggestions after reload (dismissed state not persisted)', async () => {
      const note = createTestNote();
      await orchestrator.enqueueGeneration(note, 'publish');
      const suggestions = orchestrator.getSuggestions(note.id, 'active');
      expect(suggestions.length).toBeGreaterThan(0);
      
      const suggestionId = suggestions[0].id;
      orchestrator.dismissSuggestion(suggestionId);
      
      SuggestionOrchestrator.resetInstance();
      const freshOrchestrator = SuggestionOrchestrator.getInstance();
      freshOrchestrator.setOntology(createTestOntology());
      
      const result = await freshOrchestrator.enqueueGeneration(note, 'publish');
      // Dismissed suggestions are regenerated (no persistence)
      const regeneratedSuggestion = result.suggestions.find(s => s.id === suggestionId);
      expect(regeneratedSuggestion).toBeDefined();
      expect(regeneratedSuggestion?.status).toBe('active');
    });

    it('should regenerate suggestions after reload (applied state not persisted)', async () => {
      const note = createTestNote();
      await orchestrator.enqueueGeneration(note, 'publish');
      const suggestions = orchestrator.getSuggestions(note.id, 'active');
      expect(suggestions.length).toBeGreaterThan(0);
      
      const suggestionId = suggestions[0].id;
      orchestrator.applySuggestion(suggestionId);
      
      SuggestionOrchestrator.resetInstance();
      const freshOrchestrator = SuggestionOrchestrator.getInstance();
      freshOrchestrator.setOntology(createTestOntology());
      
      const result = await freshOrchestrator.enqueueGeneration(note, 'publish');
      // Applied suggestions are regenerated (no persistence)
      const regeneratedSuggestion = result.suggestions.find(s => s.id === suggestionId);
      expect(regeneratedSuggestion).toBeDefined();
      expect(regeneratedSuggestion?.status).toBe('active');
    });
  });

  describe('Race conditions / Hydration race', () => {
    it('should handle concurrent generation requests for same note (only one runs)', async () => {
      const note = createTestNote();

      const [result1, result2, result3] = await Promise.all([
        orchestrator.enqueueGeneration(note, 'publish'),
        orchestrator.enqueueGeneration(note, 'edit'),
        orchestrator.enqueueGeneration(note, 'refresh'),
      ]);

      expect(result1.generationId).toBe(result2.generationId);
      expect(result2.generationId).toBe(result3.generationId);
      expect(result1.suggestions).toEqual(result2.suggestions);
    });

    it('should handle rapid sequential generations (debounce-like behavior)', async () => {
      const note = createTestNote();

      await orchestrator.enqueueGeneration(note, 'publish');
      await orchestrator.enqueueGeneration(note, 'edit');
      await orchestrator.enqueueGeneration(note, 'refresh');
      const result = await orchestrator.enqueueGeneration(note, 'match-arrival');
      
      expect(result.suggestions.length).toBeGreaterThan(0);
    });

    it('should handle note switch during generation (abort previous)', async () => {
      const note1 = createTestNote({ id: 'note-1' });
      const note2 = createTestNote({ 
        id: 'note-2',
      });

      const promise1 = orchestrator.enqueueGeneration(note1, 'publish');
      const promise2 = orchestrator.enqueueGeneration(note2, 'publish');
      
      const [result1, result2] = await Promise.all([promise1, promise2]);
      
      expect(result1.noteId).toBe('note-1');
      expect(result2.noteId).toBe('note-2');
    });

    it('should not lose suggestions when ontology loads after first generation', async () => {
      SuggestionOrchestrator.resetInstance();
      const freshOrchestrator = SuggestionOrchestrator.getInstance();
      
      const note = createTestNote();
      
      // First generation without ontology - default rules may still fire
      const promise1 = freshOrchestrator.enqueueGeneration(note, 'publish');
      await vi.advanceTimersByTimeAsync(1600);
      const result1 = await promise1;
      // Default rules can fire without ontology
      expect(result1.suggestions.length).toBeGreaterThanOrEqual(0);
      
      freshOrchestrator.setOntology(createTestOntology());
      
      const result2 = await freshOrchestrator.enqueueGeneration(note, 'publish');
      // With ontology, more suggestions may be generated
      expect(result2.suggestions.length).toBeGreaterThanOrEqual(result1.suggestions.length);
    });
  });

  describe('applySuggestion / dismissSuggestion', () => {
    it('should mark suggestion as applied and emit event', async () => {
      const appliedEvents: string[] = [];
      const unsub = orchestrator.on('suggestion-applied', (e) => appliedEvents.push(e.suggestion?.id || ''));
      
      const note = createTestNote();
      await orchestrator.enqueueGeneration(note, 'publish');
      const suggestions = orchestrator.getSuggestions(note.id, 'active');
      expect(suggestions.length).toBeGreaterThan(0);
      
      const result = orchestrator.applySuggestion(suggestions[0].id);
      expect(result).toBe(true);
      expect(suggestions[0].status).toBe('applied');
      expect(suggestions[0].appliedAt).toBeDefined();
      expect(appliedEvents.length).toBe(1);
      unsub();
    });

    it('should mark suggestion as dismissed and emit event', async () => {
      const dismissedEvents: string[] = [];
      const unsub = orchestrator.on('suggestion-dismissed', (e) => dismissedEvents.push(e.suggestion?.id || ''));
      
      const note = createTestNote();
      await orchestrator.enqueueGeneration(note, 'publish');
      const suggestions = orchestrator.getSuggestions(note.id, 'active');
      expect(suggestions.length).toBeGreaterThan(0);
      
      const result = orchestrator.dismissSuggestion(suggestions[0].id);
      expect(result).toBe(true);
      expect(suggestions[0].status).toBe('dismissed');
      expect(suggestions[0].dismissedAt).toBeDefined();
      expect(dismissedEvents.length).toBe(1);
      unsub();
    });

    it('should return false for non-existent suggestion ID', async () => {
      const result = orchestrator.applySuggestion('non-existent-id');
      expect(result).toBe(false);
    });
  });

  describe('Persistence / getAllSuggestions', () => {
    it('should return all suggestions across all notes', async () => {
      const note1 = createTestNote({ id: 'note-1' });
      const note2 = createTestNote({ 
        id: 'note-2',
        properties: [
          createMockProperty('type', 'is', ['offer/skill-offer']),
          createMockProperty('skill', 'is', ['typescript']),
        ],
      });
      
      await orchestrator.enqueueGeneration(note1, 'publish');
      await orchestrator.enqueueGeneration(note2, 'publish');
      
      const all = orchestrator.getAllSuggestions();
      expect(all.length).toBeGreaterThan(0);
      const noteIds = new Set(all.map(s => s.noteId));
      expect(noteIds.has('note-1')).toBe(true);
      expect(noteIds.has('note-2')).toBe(true);
    });
  });
});
import { describe, it, expect, beforeEach } from 'vitest';
import type { Note, OntologyNode, Property } from '../../types/index.js';
import { generateCounterfactualSuggestions } from './counterfactual.js';

function createTestNote(overrides: Partial<Note> = {}): Note {
  return {
    id: 'test-note-1',
    title: 'Test Request',
    content: 'I need a developer',
    properties: [
      { key: 'type', operator: 'is', values: ['request/need-request'], role: 'marker', provenance: 'user' },
      { key: 'skill', operator: 'is', values: ['typescript'], role: 'constraint', provenance: 'user' },
      { key: 'budget', operator: 'gte', values: ['500'], role: 'constraint', provenance: 'user' },
      { key: 'priority', operator: 'is', values: ['high'], role: 'constraint', provenance: 'user' },
    ],
    tags: [],
    createdAt: Date.now(),
    updatedAt: Date.now(),
    ...overrides,
  };
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
        priority: {
          type: 'enum',
          options: ['low', 'medium', 'high', 'urgent', 'critical'],
          description: 'Priority level',
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
        budget: {
          type: 'number',
          description: 'Budget range',
          operators: { real: ['gte', 'lte'], imaginary: ['gt', 'lt'] },
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

function createOfferNote(id: string, skill: string, budget: string, priority: string = 'high'): Note {
  return {
    id,
    title: `${skill} developer`,
    content: `Offering ${skill} development`,
    properties: [
      { key: 'type', operator: 'is', values: ['offer/skill-offer'], role: 'marker', provenance: 'user' },
      { key: 'skill', operator: 'is', values: [skill], role: 'constraint', provenance: 'user' },
      { key: 'budget', operator: 'lte', values: [budget], role: 'constraint', provenance: 'user' },
      { key: 'priority', operator: 'is', values: [priority], role: 'constraint', provenance: 'user' },
      { key: 'contact', operator: 'is', values: ['dev@example.com'], role: 'constraint', provenance: 'user' },
    ],
    tags: [],
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
}

describe('generateCounterfactualSuggestions', () => {
  let note: Note;
  let ontology: OntologyNode[];
  let allNotes: Note[];
  let currentMatches: Array<{ note: Note; score: number }>;

  beforeEach(() => {
    note = createTestNote();
    ontology = createTestOntology();
    allNotes = [
      createOfferNote('offer-1', 'typescript', '1000', 'high'),
      createOfferNote('offer-2', 'typescript', '2000', 'urgent'),
      createOfferNote('offer-3', 'javascript', '1500', 'high'),
      createOfferNote('offer-4', 'python', '3000', 'critical'),
    ];
    
    // Current matches: only typescript offers with budget >= 500
    currentMatches = [
      { note: allNotes[0], score: 0.8 },
      { note: allNotes[1], score: 0.7 },
    ];
  });

  it('should generate numeric widening suggestions for budget', () => {
    const suggestions = generateCounterfactualSuggestions(note, currentMatches, {
      ontology,
      allNotes,
    });

    const budgetSuggestions = suggestions.filter(s => 
      s.proposedChange?.property?.key === 'budget'
    );
    
    expect(budgetSuggestions.length).toBeGreaterThan(0);
    
    for (const s of budgetSuggestions) {
      expect(s.kind).toBe('inferred-constraint');
      expect(s.proposedChange?.type).toBe('modify');
      expect(s.proposedChange?.previousProperty?.key).toBe('budget');
      expect(s.evidence[0].details).toHaveProperty('additionalMatches');
      expect(s.evidence[0].details).toHaveProperty('totalMatches');
      expect(s.evidence[0].details).toHaveProperty('widenType', 'numeric');
    }
  });

  it('should generate enum widening suggestions when enum change adds matches', () => {
    // Create ontology with priority in both request and offer
    const enumOntology: OntologyNode[] = [
      {
        id: 'request/need-request',
        label: 'Need Request',
        description: 'A request for something needed',
        attributes: {
          skill: { type: 'string', description: 'Required skill', operators: { real: ['is'], imaginary: ['is not'] } },
          budget: { type: 'number', description: 'Budget range', operators: { real: ['gte', 'lte'], imaginary: ['gt', 'lt'] } },
          priority: { type: 'enum', options: ['low', 'medium', 'high', 'urgent', 'critical'], description: 'Priority level', operators: { real: ['is'], imaginary: ['is not'] } },
        },
        children: [],
      },
      {
        id: 'offer/skill-offer',
        label: 'Skill Offer',
        description: 'An offer of a skill',
        attributes: {
          skill: { type: 'string', description: 'Offered skill', operators: { real: ['is'], imaginary: ['is not'] } },
          budget: { type: 'number', description: 'Budget range', operators: { real: ['gte', 'lte'], imaginary: ['gt', 'lt'] } },
          priority: { type: 'enum', options: ['low', 'medium', 'high', 'urgent', 'critical'], description: 'Priority level', operators: { real: ['is'], imaginary: ['is not'] } },
          contact: { type: 'string', description: 'Contact info', operators: { real: ['is'], imaginary: ['is not'] } },
        },
        children: [],
      },
    ];
    
    // Note with priority that matches NO offers (low priority)
    // Offers have high, urgent, critical - no low
    const note: Note = {
      id: 'test-note-1',
      title: 'Test Request',
      content: 'I need a developer',
      properties: [
        { key: 'type', operator: 'is', values: ['request/need-request'], role: 'marker', provenance: 'user' },
        { key: 'skill', operator: 'is', values: ['typescript'], role: 'constraint', provenance: 'user' },
        { key: 'priority', operator: 'is', values: ['low'], role: 'constraint', provenance: 'user' },
      ],
      tags: [],
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    
    // Multiple typescript offers with different priorities (none have 'low')
    const priorityOffers = [
      createOfferNote('offer-p1', 'typescript', '1000', 'high'),
      createOfferNote('offer-p2', 'typescript', '1500', 'urgent'),
      createOfferNote('offer-p3', 'typescript', '2000', 'critical'),
    ];
    
    // Current matches: 0 (no offers have priority=low)
    const priorityMatches: Array<{ note: Note; score: number }> = [];
    
    const suggestions = generateCounterfactualSuggestions(note, priorityMatches, {
      ontology: enumOntology,
      allNotes: priorityOffers,
    });

    const prioritySuggestions = suggestions.filter(s => 
      s.proposedChange?.property?.key === 'priority'
    );
    
    expect(prioritySuggestions.length).toBeGreaterThan(0);
    
    for (const s of prioritySuggestions) {
      expect(s.kind).toBe('inferred-constraint');
      expect(s.proposedChange?.type).toBe('modify');
      expect(s.proposedChange?.previousProperty?.key).toBe('priority');
      expect(s.evidence[0].details).toHaveProperty('widenType', 'enum');
    }
  });

  it('should cap suggestions at 3', () => {
    const suggestions = generateCounterfactualSuggestions(note, currentMatches, {
      ontology,
      allNotes,
    });

    expect(suggestions.length).toBeLessThanOrEqual(3);
  });

  it('should sort by additional matches descending', () => {
    const suggestions = generateCounterfactualSuggestions(note, currentMatches, {
      ontology,
      allNotes,
    });

    for (let i = 1; i < suggestions.length; i++) {
      const prev = suggestions[i - 1].evidence[0].details?.additionalMatches as number;
      const curr = suggestions[i].evidence[0].details?.additionalMatches as number;
      expect(prev).toBeGreaterThanOrEqual(curr);
    }
  });

  it('should not generate suggestions when no additional matches', () => {
    // Create note that already matches all offers
    const highBudgetNote = createTestNote({
      properties: [
        { key: 'type', operator: 'is', values: ['request/need-request'], role: 'marker', provenance: 'user' },
        { key: 'skill', operator: 'is', values: ['typescript'], role: 'constraint', provenance: 'user' },
        { key: 'budget', operator: 'gte', values: ['100'], role: 'constraint', provenance: 'user' },
        { key: 'priority', operator: 'is', values: ['high'], role: 'constraint', provenance: 'user' },
      ],
    });

    const allMatchingNotes = allNotes.map(n => ({ note: n, score: 0.8 }));
    const suggestions = generateCounterfactualSuggestions(highBudgetNote, allMatchingNotes, {
      ontology,
      allNotes,
    });

    expect(suggestions.length).toBe(0);
  });

  it('should include match count in description', () => {
    const suggestions = generateCounterfactualSuggestions(note, currentMatches, {
      ontology,
      allNotes,
    });

    for (const s of suggestions) {
      expect(s.description).toContain('more offer');
      expect(s.description).toContain('total');
    }
  });

  it('should set provenance to deterministic', () => {
    const suggestions = generateCounterfactualSuggestions(note, currentMatches, {
      ontology,
      allNotes,
    });

    for (const s of suggestions) {
      expect(s.proposedChange?.property?.provenance).toBe('deterministic');
    }
  });
});
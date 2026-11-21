import type { NoteSuggestion, ReshapeOperation } from './types.js';
import { MatchEngine } from '../../matching/MatchEngine.js';
import type { Note, OntologyNode } from '../../types/index.js';

export interface ReshapeContext {
  note: Note;
  ontology: OntologyNode[];
  allNotes: Note[];
}

export function reshapeSuggestions(
  suggestions: NoteSuggestion[],
  operations: ReshapeOperation[],
  context: ReshapeContext
): NoteSuggestion[] {
  let result = [...suggestions];

  for (const op of operations) {
    result = applyOperation(result, op, context);
  }

  return result;
}

function applyOperation(
  suggestions: NoteSuggestion[],
  operation: ReshapeOperation,
  context: ReshapeContext
): NoteSuggestion[] {
  switch (operation.type) {
    case 'filter':
      return filterSuggestions(suggestions, operation.params);
    case 'join':
      return joinSuggestions(suggestions, operation.params, context);
    case 'aggregate':
      return aggregateSuggestions(suggestions, operation.params);
    default:
      return suggestions;
  }
}

function filterSuggestions(
  suggestions: NoteSuggestion[],
  params: Record<string, unknown>
): NoteSuggestion[] {
  const { kind, minConfidence, maxCount, source } = params;

  return suggestions.filter(s => {
    if (kind && s.kind !== kind) return false;
    if (minConfidence && s.evidence[0]?.confidence < (minConfidence as number)) return false;
    if (source && s.evidence[0]?.source !== source) return false;
    return true;
  }).slice(0, (maxCount as number) || suggestions.length);
}

function joinSuggestions(
  suggestions: NoteSuggestion[],
  params: Record<string, unknown>,
  context: ReshapeContext
): NoteSuggestion[] {
  const { matchEngine } = params;
  if (!matchEngine || !(matchEngine instanceof MatchEngine)) return suggestions;

  const { note, allNotes } = context;
  const relatedNotes = allNotes.filter(n => n.id !== note.id && !n.deletedAt);

  const enriched = suggestions.map(s => {
    if (s.kind !== 'related-note' || !s.relatedNoteId) return s;

    const relatedNote = relatedNotes.find(n => n.id === s.relatedNoteId);
    if (!relatedNote) return s;

    const result = matchEngine.calculateMatchScore(note, relatedNote);
    
    return {
      ...s,
      evidence: s.evidence.map(e => ({
        ...e,
        confidence: Math.max(e.confidence, result.score),
        details: {
          ...e.details,
          matchScore: result.score,
          matchedProperties: result.matches.map(m => m.requestProp.key),
          conflicts: result.conflicts.map(c => c.requestProp.key)
        }
      }))
    };
  });

  return enriched;
}

function aggregateSuggestions(
  suggestions: NoteSuggestion[],
  params: Record<string, unknown>
): NoteSuggestion[] {
  const { groupBy, maxPerGroup } = params;
  if (!groupBy) return suggestions;

  const groups = new Map<string, NoteSuggestion[]>();

  for (const s of suggestions) {
    const key = getGroupKey(s, groupBy as string);
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(s);
  }

  const result: NoteSuggestion[] = [];
  for (const [, group] of groups) {
    const sorted = group.sort((a, b) => 
      (b.evidence[0]?.confidence || 0) - (a.evidence[0]?.confidence || 0)
    );
    result.push(...sorted.slice(0, (maxPerGroup as number) || 1));
  }

  return result;
}

function getGroupKey(suggestion: NoteSuggestion, groupBy: string): string {
  switch (groupBy) {
    case 'kind':
      return suggestion.kind;
    case 'source':
      return suggestion.evidence[0]?.source || 'unknown';
    case 'property':
      return suggestion.proposedChange?.property?.key || 'none';
    case 'skill':
      return suggestion.skillId || 'none';
    default:
      return 'all';
  }
}

export function createDefaultReshapeOps(note: Note): ReshapeOperation[] {
  const ops: ReshapeOperation[] = [
    {
      type: 'filter',
      input: [],
      params: {
        minConfidence: 0.5,
        maxCount: 10
      }
    },
    {
      type: 'aggregate',
      input: [],
      params: {
        groupBy: 'kind',
        maxPerGroup: 3
      }
    }
  ];

  if (note.properties.some(p => p.key === 'type' && p.values.some(v => v.includes('request')))) {
    ops.splice(1, 0, {
      type: 'join',
      input: [],
      params: {
        matchEngine: new MatchEngine()
      }
    });
  }

  return ops;
}
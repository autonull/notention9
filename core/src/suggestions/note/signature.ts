import type { NoteSuggestion } from './types.js';

export function suggestionSignature(s: NoteSuggestion): string {
  return [
    s.evidence[0]?.source ?? 'unknown',
    s.kind,
    s.proposedChange?.property?.key ?? '',
    s.proposedChange?.property?.operator ?? '',
    s.proposedChange?.property?.values.join(',') ?? '',
    s.skillId ?? '',
    s.relatedNoteId ?? '',
  ].join('|');
}
import type { Note } from '../types/index.js';
import { isIndefiniteProperty } from './properties.js';

export type NoteIntent = 'Real' | 'Imaginary' | 'Ambiguous';

export const inferNoteIntent = (note: Note): NoteIntent => {
  if (note.tags.includes('request') || note.content.includes('[intent:is:request]')) return 'Imaginary';
  if (note.tags.includes('offer') || note.content.includes('[intent:is:offer]')) return 'Real';

  if (note.properties.length === 0) return 'Ambiguous';

  const intentProp = note.properties.find(p => p.key === 'intent');
  if (intentProp) {
      if (intentProp.values.includes('request') || intentProp.values.includes('need') || intentProp.values.includes('want')) return 'Imaginary';
      if (intentProp.values.includes('offer') || intentProp.values.includes('have') || intentProp.values.includes('provide')) return 'Real';
  }

  if (note.properties.some(isIndefiniteProperty)) return 'Imaginary';

  if (note.properties.some(p => p.operator === 'is' && p.values.includes('?'))) return 'Imaginary';

  return 'Real';
};
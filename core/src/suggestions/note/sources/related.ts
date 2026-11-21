import type { Note, OntologyNode } from '../../../types/index.js';
import type { SuggestionGenerationContext, NoteSuggestion, SourcePlugin } from '../types.js';
import { MatchEngine } from '../../../matching/MatchEngine.js';
import { shortSha256 } from '../../../utils/common.js';

export interface SuggestionRelatedNote {
  note: Note;
  score: number;
  matchType: 'offer' | 'request';
}

export class RelatedSource implements SourcePlugin {
  name = 'related' as const;
  private matchEngine: MatchEngine;
  private allNotes: Note[];

  constructor(ontology: OntologyNode[], allNotes: Note[] = []) {
    this.matchEngine = new MatchEngine(ontology);
    this.allNotes = allNotes;
  }

  async generate(context: SuggestionGenerationContext): Promise<NoteSuggestion[]> {
    const { note, existingSuggestions } = context;
    const suggestions: NoteSuggestion[] = [];

    const relatedNotes = this.findRelatedNotes(note);
    
    for (const related of relatedNotes.slice(0, 5)) {
      const suggestion = this.createRelatedSuggestion(note, related);
      if (suggestion && !this.isDuplicate(suggestion, existingSuggestions)) {
        suggestion.generationId = context.generationId || `gen-${Date.now()}`;
        suggestions.push(suggestion);
      }
    }

    return suggestions;
  }

  private findRelatedNotes(note: Note): SuggestionRelatedNote[] {
    const results: SuggestionRelatedNote[] = [];

    for (const otherNote of this.allNotes) {
      if (otherNote.id === note.id) continue;
      if (otherNote.deletedAt) continue;

      const isRequest = this.isRequestNote(note);
      const isOffer = this.isOfferNote(otherNote);

      if (isRequest && isOffer) {
        const result = this.matchEngine.calculateMatchScore(note, otherNote);
        if (result.score > 0.3) {
          results.push({ note: otherNote, score: result.score, matchType: 'offer' });
        }
      }

      const reverseRequest = this.isRequestNote(otherNote);
      const reverseOffer = this.isOfferNote(note);

      if (reverseRequest && reverseOffer) {
        const result = this.matchEngine.calculateMatchScore(otherNote, note);
        if (result.score > 0.3) {
          results.push({ note: otherNote, score: result.score, matchType: 'request' });
        }
      }
    }

    return results.sort((a, b) => b.score - a.score);
  }

  private isRequestNote(note: Note): boolean {
    const typeProp = note.properties.find(p => p.key === 'type');
    if (!typeProp) return false;
    return typeProp.values.some(v => 
      v.includes('request') || v.includes('need') || v.includes('job-request') || v.includes('meetup-request')
    );
  }

  private isOfferNote(note: Note): boolean {
    const typeProp = note.properties.find(p => p.key === 'type');
    if (!typeProp) return false;
    return typeProp.values.some(v => 
      v.includes('offer') || v.includes('service-offer') || v.includes('skill-offer')
    );
  }

  private createRelatedSuggestion(note: Note, related: SuggestionRelatedNote): NoteSuggestion | null {
    const { note: otherNote, score, matchType } = related;

    const evidence = {
      source: 'related' as const,
      matchedNoteId: otherNote.id,
      confidence: score,
      details: {
        relatedTitle: otherNote.title,
        matchType,
        matchedProperties: otherNote.properties.map(p => p.key)
      }
    };

    const title = matchType === 'offer' 
      ? `Matching offer: ${otherNote.title}` 
      : `Matching request: ${otherNote.title}`;

    const description = matchType === 'offer'
      ? `Found an offer that matches your request (${Math.round(score * 100)}% match)`
      : `Found a request that matches your offer (${Math.round(score * 100)}% match)`;

    return {
      id: generateSuggestionId(note.id, otherNote.id, matchType),
      noteId: note.id,
      kind: 'related-note',
      status: 'active',
      title,
      description,
      evidence: [evidence],
      relatedNoteId: otherNote.id,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      generationId: ''
    };
  }

  private isDuplicate(suggestion: NoteSuggestion, existing: NoteSuggestion[]): boolean {
    return existing.some(e => 
      e.noteId === suggestion.noteId &&
      e.kind === suggestion.kind &&
      e.relatedNoteId === suggestion.relatedNoteId &&
      e.status === 'active'
    );
  }
}

function generateSuggestionId(noteId: string, relatedNoteId: string, matchType: string): string {
  return `sugg-${shortSha256(`${noteId}|${relatedNoteId}|${matchType}`)}`;
}

export function createRelatedSource(ontology: OntologyNode[], allNotes: Note[]): RelatedSource {
  return new RelatedSource(ontology, allNotes);
}
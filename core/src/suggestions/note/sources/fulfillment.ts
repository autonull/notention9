import type { Note, OntologyNode } from '../../../types/index.js';
import type { SuggestionGenerationContext, NoteSuggestion, SourcePlugin } from '../types.js';
import { SkillPatternMatcher, type SkillDefinition } from '../../../skills/skillPatternMatcher.js';
import { MatchEngine } from '../../../matching/MatchEngine.js';
import { generateCounterfactualSuggestions } from '../counterfactual.js';
import { shortSha256 } from '../../../utils/common.js';

export class FulfillmentSource implements SourcePlugin {
  name = 'fulfillment' as const;
  private matcher: SkillPatternMatcher;
  private matchEngine: MatchEngine;
  private allNotes: Note[] = [];

  constructor(ontology: OntologyNode[]) {
    this.matcher = new SkillPatternMatcher(ontology);
    this.matchEngine = new MatchEngine(ontology);
  }

  setNotes(notes: Note[]): void {
    this.allNotes = notes;
  }

  async generate(context: SuggestionGenerationContext): Promise<NoteSuggestion[]> {
    const { note, existingSuggestions } = context;
    const suggestions: NoteSuggestion[] = [];

    const matches = this.matcher.matchSkills(note);
    const highConfidenceMatches = matches.filter(m => m.confidence >= 60);

    for (const match of highConfidenceMatches) {
      const suggestion = this.createFulfillmentSuggestion(note, match);
      if (suggestion && !this.isDuplicate(suggestion, existingSuggestions)) {
        suggestion.generationId = context.generationId || `gen-${Date.now()}`;
        suggestions.push(suggestion);
      }
    }

    // Generate counterfactual widen suggestions
    const currentMatches = this.findCurrentMatches(note);
    const counterfactualSuggestions = generateCounterfactualSuggestions(note, currentMatches, {
      ontology: this.matcher.getOntology?.() ?? [],
      allNotes: this.allNotes
    });

    for (const suggestion of counterfactualSuggestions) {
      if (!this.isDuplicate(suggestion, existingSuggestions)) {
        suggestion.generationId = context.generationId || `gen-${Date.now()}`;
        suggestions.push(suggestion);
      }
    }

    return suggestions;
  }

  private findCurrentMatches(note: Note): Array<{ note: Note; score: number }> {
    const results: Array<{ note: Note; score: number }> = [];

    for (const otherNote of this.allNotes) {
      if (otherNote.id === note.id) continue;
      if (otherNote.deletedAt) continue;

      const isRequest = this.isRequestNote(note);
      const isOffer = this.isOfferNote(otherNote);

      if (isRequest && isOffer) {
        const result = this.matchEngine.calculateMatchScore(note, otherNote);
        if (result.score > 0.3) {
          results.push({ note: otherNote, score: result.score });
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

  private createFulfillmentSuggestion(note: Note, match: { skill: SkillDefinition; confidence: number; matchedAttributes: string[] }): NoteSuggestion | null {
    const { skill, confidence, matchedAttributes } = match;
    
    if (confidence < 60) return null;

    const evidence = {
      source: 'fulfillment' as const,
      ruleId: skill.id,
      matchedProperties: matchedAttributes,
      confidence: confidence / 100,
      details: { 
        skillName: skill.name,
        skillDescription: skill.description
      }
    };

    return {
      id: generateSuggestionId(note.id, skill.id, 'fulfillment'),
      noteId: note.id,
      kind: 'fulfillment-hint',
      status: 'active',
      title: `Fulfillment via ${skill.name}`,
      description: `This request can be fulfilled using ${skill.name}: ${skill.description}`,
      evidence: [evidence],
      skillId: skill.id,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      generationId: ''
    };
  }

  registerSkill(skill: SkillDefinition): void {
    this.matcher.registerSkill(skill);
  }

  unregisterSkill(skillId: string): void {
    this.matcher.unregisterSkill(skillId);
  }

  private isDuplicate(suggestion: NoteSuggestion, existing: NoteSuggestion[]): boolean {
    return existing.some(e => 
      e.noteId === suggestion.noteId &&
      e.kind === suggestion.kind &&
      e.skillId === suggestion.skillId &&
      e.status === 'active'
    );
  }
}

function generateSuggestionId(noteId: string, skillId: string, suffix: string): string {
  return `sugg-${shortSha256(`${noteId}|${skillId}|${suffix}`)}`;
}

export function createFulfillmentSource(ontology: OntologyNode[]): FulfillmentSource {
  return new FulfillmentSource(ontology);
}
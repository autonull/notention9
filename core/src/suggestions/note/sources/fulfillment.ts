import type { Note, OntologyNode } from '../../../types/index.js';
import type { SuggestionGenerationContext, NoteSuggestion, SourcePlugin } from '../types.js';
import { SkillPatternMatcher, type SkillDefinition } from '../../../skills/skillPatternMatcher.js';
import { shortSha256 } from '../../../utils/common.js';

export class FulfillmentSource implements SourcePlugin {
  name = 'fulfillment' as const;
  private matcher: SkillPatternMatcher;

  constructor(ontology: OntologyNode[]) {
    this.matcher = new SkillPatternMatcher(ontology);
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

    return suggestions;
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
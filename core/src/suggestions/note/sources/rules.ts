import type { Note, OntologyNode } from '@notention/core';
import type { SuggestionGenerationContext, NoteSuggestion, SourcePlugin } from '../types.js';
import { getDefaultRules, evaluateCondition, applyRuleAction } from '../rules.js';

export class RulesSource implements SourcePlugin {
  name = 'rules' as const;

  async generate(context: SuggestionGenerationContext): Promise<NoteSuggestion[]> {
    const { note, ontology, existingSuggestions } = context;
    const rules = getDefaultRules().filter(r => r.enabled);
    const suggestions: NoteSuggestion[] = [];

    for (const rule of rules) {
      if (!rule.targetNodeIds.includes('*') && !this.matchesTarget(note, rule.targetNodeIds)) {
        continue;
      }

      if (!evaluateCondition(note, rule.condition)) {
        continue;
      }

      const suggestion = applyRuleAction(note, rule, rule.action, ontology);
      if (suggestion && !this.isDuplicate(suggestion, existingSuggestions)) {
        suggestion.generationId = context.generationId || `gen-${Date.now()}`;
        suggestions.push(suggestion);
      }
    }

    return suggestions;
  }

  private matchesTarget(note: Note, targetNodeIds: string[]): boolean {
    const typeProp = note.properties.find(p => p.key === 'type');
    if (!typeProp) return false;
    return typeProp.values.some(v => targetNodeIds.includes(v));
  }

  private isDuplicate(suggestion: NoteSuggestion, existing: NoteSuggestion[]): boolean {
    return existing.some(e => 
      e.noteId === suggestion.noteId &&
      e.kind === suggestion.kind &&
      e.proposedChange?.property?.key === suggestion.proposedChange?.property?.key &&
      e.status === 'active'
    );
  }
}

export const rulesSource = new RulesSource();
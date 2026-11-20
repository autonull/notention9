import type { Note, OntologyNode } from '@notention/core';
import type { SuggestionGenerationContext, NoteSuggestion, SuggestionRule, SourcePlugin } from '../types.js';
import { getDefaultRules, evaluateCondition, applyRuleAction } from '../rules.js';

export class RulesSource implements SourcePlugin {
  name = 'rules' as const;

  async generate(context: SuggestionGenerationContext): Promise<NoteSuggestion[]> {
    const { note, ontology, existingSuggestions } = context;
    const rules = collectRules(ontology);
    const suggestions: NoteSuggestion[] = [];

    for (const rule of rules) {
      if (!rule.enabled) continue;
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

/** Rules declared on ontology nodes plus the built-in defaults. */
function collectRules(ontology: OntologyNode[]): SuggestionRule[] {
  const rules: SuggestionRule[] = [];
  const walk = (nodes: OntologyNode[]) => {
    for (const node of nodes) {
      if (node.suggestions) rules.push(...node.suggestions);
      if (node.children) walk(node.children);
    }
  };
  walk(ontology);

  const byId = new Map<string, SuggestionRule>();
  for (const rule of [...rules, ...getDefaultRules()]) {
    if (!byId.has(rule.id)) byId.set(rule.id, rule);
  }
  return [...byId.values()];
}

export const rulesSource = new RulesSource();

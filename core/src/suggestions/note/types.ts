import type { Note, Property, OntologyNode } from '../../types/index.js';

export type SuggestionSource = 'rules' | 'fulfillment' | 'related' | 'llm';

export type SuggestionKind =
  | 'add-property'
  | 'modify-property'
  | 'remove-property'
  | 'fulfillment-hint'
  | 'related-note'
  | 'skill-match'
  | 'inferred-constraint';

export type NoteSuggestionStatus = 'active' | 'stale' | 'applied' | 'dismissed';

export interface SuggestionEvidence {
  source: SuggestionSource;
  ruleId?: string;
  matchedProperties?: string[];
  matchedNoteId?: string;
  confidence: number;
  details?: Record<string, unknown>;
}

export interface NoteSuggestion {
  id: string;
  noteId: string;
  kind: SuggestionKind;
  status: NoteSuggestionStatus;
  title: string;
  description: string;
  evidence: SuggestionEvidence[];
  proposedChange?: PropertyChange;
  relatedNoteId?: string;
  skillId?: string;
  createdAt: number;
  updatedAt: number;
  appliedAt?: number;
  dismissedAt?: number;
  generationId: string;
}

export interface PropertyChange {
  type: 'add' | 'modify' | 'remove';
  property?: Property;
  previousProperty?: Property;
}

export interface SuggestionRule {
  id: string;
  name: string;
  description: string;
  targetNodeIds: string[];
  condition: RuleCondition;
  action: RuleAction;
  priority: number;
  enabled: boolean;
}

export type RuleCondition =
  | { type: 'hasProperty'; key: string; operator?: string; value?: string }
  | { type: 'hasAnyProperty'; keys: string[] }
  | { type: 'hasAllProperties'; keys: string[] }
  | { type: 'nodeType'; nodeId: string }
  | { type: 'and'; conditions: RuleCondition[] }
  | { type: 'or'; conditions: RuleCondition[] }
  | { type: 'not'; condition: RuleCondition }
  | { type: 'propertyMatches'; key: string; pattern: string; flags?: string }
  | { type: 'propertyValueIn'; key: string; values: string[] };

export type RuleAction =
  | { type: 'suggestAddProperty'; key: string; operator: string; value: string; reason: string }
  | { type: 'suggestModifyProperty'; key: string; operator: string; value: string; reason: string }
  | { type: 'suggestRemoveProperty'; key: string; reason: string }
  | { type: 'suggestFulfillment'; skillId: string; reason: string }
  | { type: 'suggestRelated'; matchType: 'offer' | 'request'; reason: string };

export interface SuggestionGenerationContext {
  note: Note;
  ontology: OntologyNode[];
  existingSuggestions: NoteSuggestion[];
  trigger: 'publish' | 'edit' | 'refresh' | 'match-arrival';
  generationId?: string;
}

export interface SuggestionGenerationResult {
  suggestions: NoteSuggestion[];
  generationId: string;
  timestamp: number;
}

export interface SourcePlugin {
  name: SuggestionSource;
  generate(context: SuggestionGenerationContext): Promise<NoteSuggestion[]>;
}

export interface ReshapeOperation {
  type: 'project' | 'filter' | 'join' | 'aggregate';
  input: NoteSuggestion[];
  params: Record<string, unknown>;
}

export interface VerificationResult {
  valid: boolean;
  confidence: number;
  reasons: string[];
}
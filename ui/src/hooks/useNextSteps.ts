import { useMemo } from 'react';
import { Note, NoteSuggestion } from '@notention/core';
import { useNoteSuggestions } from './useNoteSuggestions';

export type NextStepSource = 'on-device' | 'ai' | 'skill' | 'network';

export interface NextStep {
  id: string;
  title: string;
  evidence: string;
  why?: string;
  source: NextStepSource;
  state: 'active' | 'stale' | 'applied';
  actionLabel?: string;
  apply?: () => void;
  dismiss?: () => void;
  undo?: () => void;
}

export interface SimpleMatch {
  note: { id: string; title?: string };
  source?: 'local' | 'network';
  fitCount?: number;
  totalProperties?: number;
}

export interface UseNextStepsOptions {
  note: Note | null;
  localMatches?: SimpleMatch[];
  networkMatches?: SimpleMatch[];
}

export interface UseNextStepsReturn {
  nextSteps: NextStep[];
  topNextStep: NextStep | null;
  hasNextSteps: boolean;
  isGenerating: boolean;
  error: Error | null;
  refresh: () => Promise<void>;
}

function mapSource(suggestion: NoteSuggestion): NextStepSource {
  const evidence = suggestion.evidence[0];
  if (!evidence) return 'on-device';
  switch (evidence.source) {
    case 'llm':
      return 'ai';
    case 'fulfillment':
      return 'skill';
    case 'related':
      return 'network';
    case 'rules':
    default:
      return 'on-device';
  }
}

function getVerbTitle(suggestion: NoteSuggestion): string {
  const verbMap: Record<NoteSuggestion['kind'], string> = {
    'add-property': 'Add',
    'modify-property': 'Change',
    'remove-property': 'Remove',
    'fulfillment-hint': 'Run',
    'related-note': 'Open',
    'skill-match': 'Run',
    'inferred-constraint': 'Apply',
  };
  const verb = verbMap[suggestion.kind] || 'Add';
  const prop = suggestion.proposedChange?.property;
  const prevProp = suggestion.proposedChange?.previousProperty;

  if (prop) {
    return `${verb} ${prop.key}`;
  }
  if (prevProp) {
    return `${verb} ${prevProp.key}`;
  }
  if (suggestion.skillId) {
    return `${verb} ${suggestion.skillId}`;
  }
  if (suggestion.relatedNoteId) {
    return `Open related note`;
  }
  return suggestion.title || verb;
}

function getEvidenceLine(suggestion: NoteSuggestion): string {
  const evidence = suggestion.evidence[0];
  if (!evidence) return 'Suggestion available';

  switch (evidence.source) {
    case 'rules':
      if (evidence.ruleId) {
        return `Rule: ${evidence.ruleId.replace(/^rule-/, '').replace(/-/g, ' ')}`;
      }
      return 'Rule-based suggestion';
    case 'fulfillment':
      return 'Skill match available';
    case 'related':
      return evidence.matchedNoteId ? 'Matching note found' : 'Related content';
    case 'llm':
      return 'AI-generated suggestion';
    default:
      return 'Suggestion available';
  }
}

function getAppliedLine(suggestion: NoteSuggestion, fitCount?: number): string {
  if (suggestion.status !== 'applied') return '';
  if (typeof fitCount === 'number' && fitCount > 0) {
    return `${fitCount} offer${fitCount === 1 ? '' : 's'} now match`;
  }
  return 'Applied';
}

export function useNextSteps(options: UseNextStepsOptions): UseNextStepsReturn {
  const { note, localMatches = [], networkMatches = [] } = options;

  const {
    activeSuggestions,
    staleSuggestions,
    appliedSuggestions,
    isGenerating,
    error,
    refresh,
    applySuggestion,
    dismissSuggestion,
    undoApply,
    undoDismiss,
  } = useNoteSuggestions({ note });

  const nextSteps = useMemo((): NextStep[] => {
    if (!note) return [];

    const steps: NextStep[] = [];

    // Active suggestions first (ranked by priority)
    for (const suggestion of activeSuggestions) {
      const source = mapSource(suggestion);
      const isSkill = suggestion.kind === 'fulfillment-hint' || suggestion.kind === 'skill-match';
      const isCounterfactual = suggestion.kind === 'inferred-constraint';

      steps.push({
        id: suggestion.id,
        title: getVerbTitle(suggestion),
        evidence: getEvidenceLine(suggestion),
        why: suggestion.description,
        source,
        state: 'active',
        actionLabel: isSkill ? 'Preview & approve' : isCounterfactual ? 'Widen' : 'Apply',
        apply: () => { applySuggestion(suggestion.id); },
        dismiss: () => { dismissSuggestion(suggestion.id); },
      });
    }

    // Stale suggestions
    for (const suggestion of staleSuggestions) {
      const source = mapSource(suggestion);
      steps.push({
        id: suggestion.id,
        title: getVerbTitle(suggestion),
        evidence: getEvidenceLine(suggestion),
        why: suggestion.description,
        source,
        state: 'stale',
        actionLabel: 'Refresh',
        apply: () => { applySuggestion(suggestion.id); },
        dismiss: () => { dismissSuggestion(suggestion.id); },
      });
    }

    // Applied history
    for (const applied of appliedSuggestions) {
      const suggestion = applied.suggestion;
      const source = mapSource(suggestion);
      const fitCount = (applied as any).fitCount;

      steps.push({
        id: suggestion.id,
        title: getVerbTitle(suggestion),
        evidence: getAppliedLine(suggestion, fitCount),
        why: suggestion.description,
        source,
        state: 'applied',
        actionLabel: 'Undo',
        undo: () => { undoApply(suggestion.id); },
      });
    }

    // Local matches
    for (const match of localMatches.slice(0, 5)) {
      const fitCount = match.fitCount;
      steps.push({
        id: `match-local-${match.note.id}`,
        title: `View ${match.note.title || 'note'}`,
        evidence: typeof fitCount === 'number' && fitCount > 0
          ? `${fitCount} of ${match.totalProperties || 4} properties fit`
          : 'Local match',
        source: 'network',
        state: 'active',
        actionLabel: 'Open',
        apply: () => {}, // Navigation handled by caller
      });
    }

    // Network matches
    for (const match of networkMatches.slice(0, 5)) {
      const fitCount = match.fitCount;
      steps.push({
        id: `match-network-${match.note.id}`,
        title: `View ${match.note.title || 'note'}`,
        evidence: typeof fitCount === 'number' && fitCount > 0
          ? `${fitCount} of ${match.totalProperties || 4} properties fit`
          : 'Network match',
        source: 'network',
        state: 'active',
        actionLabel: 'Open',
        apply: () => {},
      });
    }

    return steps;
  }, [
    note?.id,
    activeSuggestions,
    staleSuggestions,
    appliedSuggestions,
    localMatches,
    networkMatches,
    applySuggestion,
    dismissSuggestion,
    undoApply,
  ]);

  const topNextStep = useMemo(() => {
    const active = nextSteps.filter(s => s.state === 'active');
    return active[0] ?? null;
  }, [nextSteps]);

  return {
    nextSteps,
    topNextStep,
    hasNextSteps: nextSteps.length > 0,
    isGenerating,
    error,
    refresh,
  };
}
import { useMemo, useState, useCallback } from 'react';
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
  // Skill approval fields
  skillId?: string;
  skillName?: string;
  skillDescription?: string;
  skillActions?: Array<{ type: string; description: string; url?: string; selector?: string }>;
  skillDomains?: string[];
  skillRequiresAuth?: boolean;
  skillExpectedOutcome?: string;
  skillPreview?: string;
}

export interface SkillApprovalState {
  isOpen: boolean;
  stepId: string | null;
  step: NextStep | null;
  onApprove: (autoExecute: boolean) => void;
  onReject: () => void;
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
  // Apply path handlers
  onOpenPropertyEditor?: (key: string, operator: string, value: string, placeholder?: string) => void;
  onUpdateProperty?: (key: string, operator: string, value: string, previousProperty?: any) => void;
  onRemoveProperty?: (key: string) => void;
  onNavigateToNote?: (noteId: string) => void;
  onExecuteSkill?: (skillId: string, note: Note) => Promise<{ success: boolean; resultNoteIds?: string[]; fitCount?: number; error?: string }>;
}

export interface UseNextStepsReturn {
  nextSteps: NextStep[];
  topNextStep: NextStep | null;
  hasNextSteps: boolean;
  isGenerating: boolean;
  error: Error | null;
  refresh: () => Promise<void>;
  skillApproval: SkillApprovalState;
  requestSkillApproval: (step: NextStep) => void;
  closeSkillApproval: () => void;
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
  const { 
    note, 
    localMatches = [], 
    networkMatches = [],
    onOpenPropertyEditor,
    onUpdateProperty,
    onRemoveProperty,
    onNavigateToNote,
    onExecuteSkill,
  } = options;

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

  // Skill approval state
  const [skillApproval, setSkillApproval] = useState<SkillApprovalState>({
    isOpen: false,
    stepId: null,
    step: null,
    onApprove: () => {},
    onReject: () => {},
  });

  const requestSkillApproval = useCallback((step: NextStep) => {
    setSkillApproval({
      isOpen: true,
      stepId: step.id,
      step,
      onApprove: async (autoExecute: boolean) => {
        // Execute the skill through existing gates
        if (step.skillId && onExecuteSkill) {
          const result = await onExecuteSkill(step.skillId, note!);
          if (result.success) {
            // Mark as applied only after success
            applySuggestion(step.id, result.resultNoteIds, result.fitCount);
          } else {
            // Show error but don't mark as applied
            console.error('Skill execution failed:', result.error);
          }
        } else {
          // Fallback: just mark as applied
          applySuggestion(step.id);
        }
        // Optionally store auto-execute preference
        if (autoExecute && step.skillId) {
          try {
            localStorage.setItem(`skill-auto-execute-${step.skillId}`, 'true');
          } catch {}
        }
        setSkillApproval({ ...skillApproval, isOpen: false, stepId: null, step: null });
      },
      onReject: () => {
        setSkillApproval({ ...skillApproval, isOpen: false, stepId: null, step: null });
      },
    });
  }, [applySuggestion, note, onExecuteSkill]);

  const closeSkillApproval = useCallback(() => {
    setSkillApproval({ ...skillApproval, isOpen: false, stepId: null, step: null });
  }, []);

  const nextSteps = useMemo((): NextStep[] => {
    if (!note) return [];

    const steps: NextStep[] = [];

    // Active suggestions first (ranked by priority)
    for (const suggestion of activeSuggestions) {
      const source = mapSource(suggestion);
      const isSkill = suggestion.kind === 'fulfillment-hint' || suggestion.kind === 'skill-match';
      const isCounterfactual = suggestion.kind === 'inferred-constraint';
      const isAddProperty = suggestion.kind === 'add-property';
      const isModifyProperty = suggestion.kind === 'modify-property';
      const isRemoveProperty = suggestion.kind === 'remove-property';
      const isRelatedNote = suggestion.kind === 'related-note';

      // Check if auto-execute is enabled for this skill
      let autoExecute = false;
      if (isSkill && suggestion.skillId) {
        try {
          autoExecute = localStorage.getItem(`skill-auto-execute-${suggestion.skillId}`) === 'true';
        } catch {}
      }

      // Get skill details from evidence
      const evidence = suggestion.evidence[0];
      const skillDetails = evidence?.details as Record<string, unknown> | undefined;
      const proposedChange = suggestion.proposedChange;

      // Determine action label and apply handler based on suggestion kind
      let actionLabel: string;
      let apply: () => void;

      if (isAddProperty && onOpenPropertyEditor) {
        // Add-property: prefill and open property editor
        const key = proposedChange?.property?.key || '';
        const operator = proposedChange?.property?.operator || 'is';
        const value = proposedChange?.property?.values?.[0] || '';
        const placeholder = proposedChange?.placeholder;
        actionLabel = 'Add';
        apply = () => { onOpenPropertyEditor(key, operator, value, placeholder); };
      } else if (isModifyProperty && onUpdateProperty) {
        // Modify-property: apply through existing property update
        const key = proposedChange?.property?.key || '';
        const operator = proposedChange?.property?.operator || 'is';
        const value = proposedChange?.property?.values?.[0] || '';
        const previousProperty = proposedChange?.previousProperty;
        actionLabel = 'Change';
        apply = () => { onUpdateProperty(key, operator, value, previousProperty); };
      } else if (isRemoveProperty && onRemoveProperty) {
        // Remove-property: apply through existing property update
        const key = proposedChange?.previousProperty?.key || '';
        actionLabel = 'Remove';
        apply = () => { onRemoveProperty(key); };
      } else if (isRelatedNote && onNavigateToNote && suggestion.relatedNoteId) {
        // Related: open note; mark applied only after navigation succeeds
        actionLabel = 'Open';
        apply = () => { onNavigateToNote(suggestion.relatedNoteId!); applySuggestion(suggestion.id); };
      } else if (isSkill && !autoExecute) {
        // Skill: open SkillApprovalDialog
        actionLabel = 'Preview & approve';
        apply = () => { requestSkillApproval(step); };
      } else if (isSkill && autoExecute) {
        // Skill with auto-execute
        actionLabel = 'Run';
        apply = async () => {
          if (suggestion.skillId && onExecuteSkill) {
            const result = await onExecuteSkill(suggestion.skillId, note);
            if (result.success) {
              applySuggestion(suggestion.id, result.resultNoteIds, result.fitCount);
            }
          } else {
            applySuggestion(suggestion.id);
          }
        };
      } else if (isCounterfactual) {
        // Counterfactual: "Widen" action
        actionLabel = 'Widen';
        apply = () => { applySuggestion(suggestion.id); };
      } else {
        actionLabel = 'Apply';
        apply = () => { applySuggestion(suggestion.id); };
      }

      const step: NextStep = {
        id: suggestion.id,
        title: getVerbTitle(suggestion),
        evidence: getEvidenceLine(suggestion),
        why: suggestion.description,
        source,
        state: 'active',
        actionLabel,
        apply,
        dismiss: () => { dismissSuggestion(suggestion.id); },
        // Skill approval fields
        skillName: skillDetails?.skillName as string,
        skillDescription: skillDetails?.skillDescription as string,
        skillActions: skillDetails?.actions as Array<{ type: string; description: string; url?: string; selector?: string }>,
        skillDomains: skillDetails?.domains as string[],
        skillRequiresAuth: skillDetails?.requiresAuth as boolean,
        skillExpectedOutcome: skillDetails?.expectedOutcome as string,
        skillPreview: skillDetails?.preview as string,
        skillId: suggestion.skillId,
      };
      steps.push(step);
    }

    // Stale suggestions
    for (const suggestion of staleSuggestions) {
      const source = mapSource(suggestion);
      const isSkill = suggestion.kind === 'fulfillment-hint' || suggestion.kind === 'skill-match';
      let autoExecute = false;
      if (isSkill && suggestion.skillId) {
        try {
          autoExecute = localStorage.getItem(`skill-auto-execute-${suggestion.skillId}`) === 'true';
        } catch {}
      }

      let actionLabel = 'Refresh';
      let apply: () => void;

      if (isSkill && !autoExecute) {
        actionLabel = 'Preview & approve';
        apply = () => { requestSkillApproval(step); };
      } else if (isSkill && autoExecute) {
        actionLabel = 'Run';
        apply = async () => {
          if (suggestion.skillId && onExecuteSkill) {
            const result = await onExecuteSkill(suggestion.skillId, note);
            if (result.success) {
              applySuggestion(suggestion.id, result.resultNoteIds, result.fitCount);
            }
          } else {
            applySuggestion(suggestion.id);
          }
        };
      } else {
        actionLabel = 'Refresh';
        apply = () => { applySuggestion(suggestion.id); };
      }

      // Create a temporary step for the skill approval reference
      const step: NextStep = {
        id: suggestion.id,
        title: getVerbTitle(suggestion),
        evidence: getEvidenceLine(suggestion),
        why: suggestion.description,
        source,
        state: 'stale',
        actionLabel,
        apply,
        dismiss: () => { dismissSuggestion(suggestion.id); },
        skillId: suggestion.skillId,
      };

      steps.push(step);
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
    requestSkillApproval,
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
    skillApproval,
    requestSkillApproval,
    closeSkillApproval,
  };
}
import React from 'react';
import { NoteSuggestion, Property } from '@notention/core';
import { XIcon, HelpIcon, CheckIcon, ArrowRightIcon, ArrowPathIcon } from '../ui/icons';
import styles from './SuggestionCard.module.css';

const verbMap: Record<NoteSuggestion['kind'], string> = {
  'add-property': 'Add',
  'modify-property': 'Change',
  'remove-property': 'Remove',
  'fulfillment-hint': 'Fulfill',
  'related-note': 'Open',
  'skill-match': 'Run',
  'inferred-constraint': 'Apply'
};

const sourceLabels: Record<NoteSuggestion['evidence'][0]['source'], string> = {
  rules: 'Rule',
  fulfillment: 'Skill',
  related: 'Match',
  llm: 'AI'
};

const sourceIcons: Record<NoteSuggestion['evidence'][0]['source'], React.ReactNode> = {
  rules: <span className={styles.sourceIcon}>📋</span>,
  fulfillment: <span className={styles.sourceIcon}>⚡</span>,
  related: <span className={styles.sourceIcon}>🔗</span>,
  llm: <span className={styles.sourceIcon}>🤖</span>
};

interface SuggestionCardProps {
  suggestion: NoteSuggestion;
  onApply: (suggestionId: string) => void;
  onDismiss: (suggestionId: string) => void;
  onUndoApply?: (suggestionId: string) => void;
  onUndoDismiss?: (suggestionId: string) => void;
  onPreview?: (suggestion: NoteSuggestion) => void;
}

function getVerbTitle(suggestion: NoteSuggestion): string {
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
    return `${verb} related note`;
  }
  return suggestion.title || verb;
}

function getEvidenceLine(suggestion: NoteSuggestion): string | null {
  const evidence = suggestion.evidence[0];
  if (!evidence) return null;

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
      return null;
  }
}

function getAppliedLine(suggestion: NoteSuggestion): string | null {
  if (suggestion.status !== 'applied') return null;
  const fitCount = (suggestion as any).fitCount;
  if (typeof fitCount === 'number' && fitCount > 0) {
    return `${fitCount} offer${fitCount === 1 ? '' : 's'} now match`;
  }
  return 'Applied';
}

export function SuggestionCard({ 
  suggestion, 
  onApply, 
  onDismiss, 
  onUndoApply, 
  onUndoDismiss,
  onPreview 
}: SuggestionCardProps) {
  const isStale = suggestion.status === 'stale';
  const isApplied = suggestion.status === 'applied';
  const isDismissed = suggestion.status === 'dismissed';
  const verbTitle = getVerbTitle(suggestion);
  const evidenceLine = getEvidenceLine(suggestion);
  const appliedLine = getAppliedLine(suggestion);
  const evidence = suggestion.evidence[0];
  const sourceLabel = evidence ? sourceLabels[evidence.source] : '';
  const sourceIcon = evidence ? sourceIcons[evidence.source] : null;

  const prop = suggestion.proposedChange?.property;
  const prevProp = suggestion.proposedChange?.previousProperty;
  const hasProposedChange = prop || prevProp;

  return (
    <div
      className={`${styles.card} ${isStale ? styles.stale : ''} ${isApplied ? styles.applied : ''} ${isDismissed ? styles.dismissed : ''}`}
      data-testid={`suggestion-card-${suggestion.id}`}
    >
      <div className={styles.mainRow}>
        <div className={styles.content}>
          <h4 className={styles.title}>{verbTitle}</h4>
          <p className={styles.description}>{suggestion.description}</p>

          {hasProposedChange && (
            <div className={styles.proposedChange}>
              {prop && (
                <div className={styles.property}>
                  <span className={styles.propertyKey}>{prop.key}</span>
                  <span className={styles.propertyOperator}>{prop.operator}</span>
                  <span className={styles.propertyValue}>{prop.values.join(', ')}</span>
                </div>
              )}
              {prevProp && !prop && (
                <div className={styles.property} style={{ opacity: 0.6 }}>
                  <span className={styles.propertyKey}>{prevProp.key}</span>
                  <span className={styles.propertyOperator}>{prevProp.operator}</span>
                  <span className={styles.propertyValue}>{prevProp.values.join(', ')}</span>
                </div>
              )}
            </div>
          )}

          {evidenceLine && !isApplied && (
            <div className={styles.evidence}>
              {sourceIcon}
              <span className={styles.evidenceText}>{evidenceLine}</span>
            </div>
          )}

          {appliedLine && (
            <div className={styles.appliedLine}>
              <span className={styles.appliedIcon}>✓</span>
              <span className={styles.appliedText}>{appliedLine}</span>
            </div>
          )}
        </div>

        <div className={styles.actions}>
          {!isApplied && !isDismissed && (
            <button
              className={`${styles.primaryAction} ${isStale ? styles.refreshAction : ''}`}
              onClick={() => onApply(suggestion.id)}
              aria-label={isStale ? 'Refresh suggestion' : 'Apply suggestion'}
              disabled={isStale && suggestion.proposedChange?.type !== 'add'}
            >
              {isStale ? (
                <>
                  <span className={styles.actionIcon}>↻</span>
                  <span>Refresh</span>
                </>
              ) : (
                <>
                  <span className={styles.actionIcon}>
                    <CheckIcon className="w-4 h-4" />
                  </span>
                  <span>Apply</span>
                </>
              )}
            </button>
          )}

          {isApplied && onUndoApply && (
            <button
              className={`${styles.primaryAction} ${styles.undoAction}`}
              onClick={() => onUndoApply(suggestion.id)}
              aria-label="Undo apply"
            >
              <span className={styles.actionIcon}>
                <ArrowPathIcon className="w-4 h-4" />
              </span>
              <span>Undo</span>
            </button>
          )}

          {isDismissed && onUndoDismiss && (
            <button
              className={`${styles.primaryAction} ${styles.undoAction}`}
              onClick={() => onUndoDismiss(suggestion.id)}
              aria-label="Undo dismiss"
            >
              <span className={styles.actionIcon}>
                <ArrowPathIcon className="w-4 h-4" />
              </span>
              <span>Undo</span>
            </button>
          )}

          {!isApplied && !isDismissed && (
            <>
              <button
                className={styles.whyButton}
                onClick={(e) => {
                  e.stopPropagation();
                  alert(`Why?\n\n${suggestion.description}\n\nSource: ${sourceLabel}`);
                }}
                aria-label="Why this suggestion?"
                title="Why?"
              >
                <HelpIcon className="w-4 h-4" />
              </button>

              <button
                className={styles.dismissButton}
                onClick={(e) => {
                  e.stopPropagation();
                  onDismiss(suggestion.id);
                }}
                aria-label="Dismiss suggestion"
              >
                <XIcon className="w-4 h-4" />
              </button>
            </>
          )}
        </div>
      </div>

      {evidence && !isApplied && (
        <div className={styles.sourceChip}>
          {sourceIcon}
          <span>{sourceLabel}</span>
        </div>
      )}
    </div>
  );
}
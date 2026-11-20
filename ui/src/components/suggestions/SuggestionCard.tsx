import React from 'react';
import { NoteSuggestion, Property } from '@notention/core';
import styles from './SuggestionCard.module.css';

interface SuggestionCardProps {
  suggestion: NoteSuggestion;
  onApply: (suggestionId: string) => void;
  onDismiss: (suggestionId: string) => void;
  onPreview?: (suggestion: NoteSuggestion) => void;
}

const kindIcons: Record<NoteSuggestion['kind'], string> = {
  'add-property': '➕',
  'modify-property': '✏️',
  'remove-property': '🗑️',
  'fulfillment-hint': '🔗',
  'related-note': '🔗',
  'skill-match': '⚡',
  'inferred-constraint': '🔍'
};

const kindLabels: Record<NoteSuggestion['kind'], string> = {
  'add-property': 'Add Property',
  'modify-property': 'Modify Property',
  'remove-property': 'Remove Property',
  'fulfillment-hint': 'Fulfillment',
  'related-note': 'Related Note',
  'skill-match': 'Skill Match',
  'inferred-constraint': 'Inferred Constraint'
};

const statusColors: Record<NoteSuggestion['status'], string> = {
  active: '#10b981',
  stale: '#f59e0b',
  applied: '#6366f1',
  dismissed: '#9ca3af'
};

export function SuggestionCard({ suggestion, onApply, onDismiss, onPreview }: SuggestionCardProps) {
  const Icon = kindIcons[suggestion.kind] || '💡';
  const Label = kindLabels[suggestion.kind] || suggestion.kind;
  const statusColor = statusColors[suggestion.status];

  const evidence = suggestion.evidence[0];
  const confidence = evidence ? Math.round(evidence.confidence * 100) : 0;

  const proposedProperty = suggestion.proposedChange?.property;
  const previousProperty = suggestion.proposedChange?.previousProperty;

  return (
    <div className={styles.card} style={{ borderLeftColor: statusColor }}>
      <div className={styles.header}>
        <div className={styles.titleRow}>
          <span className={styles.icon}>{Icon}</span>
          <h4 className={styles.title}>{suggestion.title}</h4>
          <span className={styles.badge} style={{ backgroundColor: statusColor }}>
            {suggestion.status}
          </span>
        </div>
        <div className={styles.meta}>
          <span className={styles.kind}>{Label}</span>
          <span className={styles.confidence}>{confidence}% confidence</span>
        </div>
      </div>

      <p className={styles.description}>{suggestion.description}</p>

      {proposedProperty && (
        <div className={styles.proposedChange}>
          <div className={styles.changeHeader}>
            {suggestion.proposedChange.type === 'add' && 'Proposed addition:'}
            {suggestion.proposedChange.type === 'modify' && 'Proposed change:'}
            {suggestion.proposedChange.type === 'remove' && 'To remove:'}
          </div>
          <div className={styles.property}>
            <span className={styles.propertyKey}>{proposedProperty.key}</span>
            <span className={styles.propertyOperator}>{proposedProperty.operator}</span>
            <span className={styles.propertyValue}>{proposedProperty.values.join(', ')}</span>
          </div>
          {previousProperty && (
            <div className={styles.previousProperty}>
              <span className={styles.propertyKey}>{previousProperty.key}</span>
              <span className={styles.propertyOperator}>{previousProperty.operator}</span>
              <span className={styles.propertyValue}>{previousProperty.values.join(', ')}</span>
            </div>
          )}
        </div>
      )}

      {suggestion.kind === 'fulfillment-hint' && suggestion.skillId && (
        <div className={styles.skillInfo}>
          <span className={styles.skillLabel}>Skill: </span>
          <span className={styles.skillValue}>{suggestion.skillId}</span>
        </div>
      )}

      {suggestion.kind === 'related-note' && suggestion.relatedNoteId && (
        <div className={styles.relatedInfo}>
          <span className={styles.skillLabel}>Related note: </span>
          <span className={styles.skillValue}>{suggestion.relatedNoteId}</span>
        </div>
      )}

      {evidence && evidence.details && (
        <details className={styles.details}>
          <summary>Evidence details</summary>
          <pre className={styles.evidenceJson}>{JSON.stringify(evidence.details, null, 2)}</pre>
        </details>
      )}

      <div className={styles.actions}>
        {suggestion.status === 'active' && (
          <>
            <button
              className={styles.applyButton}
              onClick={() => onApply(suggestion.id)}
            >
              Apply
            </button>
            <button
              className={styles.dismissButton}
              onClick={() => onDismiss(suggestion.id)}
            >
              Dismiss
            </button>
          </>
        )}
        {suggestion.status === 'stale' && (
          <button
            className={styles.refreshButton}
            onClick={() => onApply(suggestion.id)}
          >
            Refresh
          </button>
        )}
        {onPreview && (
          <button
            className={styles.previewButton}
            onClick={() => onPreview(suggestion)}
          >
            Preview
          </button>
        )}
      </div>
    </div>
  );
}
import React from 'react';
import { Note, NoteSuggestion } from '@notention/core';
import { SuggestionCard } from './SuggestionCard';
import { useNoteSuggestions } from '../../hooks/useNoteSuggestions';
import styles from './SuggestionStrip.module.css';

interface SuggestionStripProps {
  note: Note | null;
  maxVisible?: number;
  onSuggestionApplied?: (suggestionId: string) => void;
  onSuggestionDismissed?: (suggestionId: string) => void;
  onSuggestionUndoApply?: (suggestionId: string) => void;
  onSuggestionUndoDismiss?: (suggestionId: string) => void;
  showAllAction?: () => void;
}

export function SuggestionStrip({
  note,
  maxVisible = 3,
  onSuggestionApplied,
  onSuggestionDismissed,
  onSuggestionUndoApply,
  onSuggestionUndoDismiss,
  showAllAction
}: SuggestionStripProps) {
  const {
    activeSuggestions,
    isGenerating,
    error,
    refresh,
    applySuggestion,
    dismissSuggestion,
    undoApply,
    undoDismiss
  } = useNoteSuggestions({ note });

  const handleApply = (suggestionId: string) => {
    if (applySuggestion(suggestionId)) {
      onSuggestionApplied?.(suggestionId);
    }
  };

  const handleDismiss = (suggestionId: string) => {
    if (dismissSuggestion(suggestionId)) {
      onSuggestionDismissed?.(suggestionId);
    }
  };

  const handleUndoApply = (suggestionId: string) => {
    if (undoApply(suggestionId)) {
      onSuggestionUndoApply?.(suggestionId);
    }
  };

  const handleUndoDismiss = (suggestionId: string) => {
    if (undoDismiss(suggestionId)) {
      onSuggestionUndoDismiss?.(suggestionId);
    }
  };

  if (!note) return null;

  if (isGenerating && activeSuggestions.length === 0) {
    return (
      <div className={styles.loading} role="status" aria-live="polite">
        <div className={styles.spinner} />
        <span>Generating suggestions…</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.error} role="alert">
        <span>Error: {error.message}</span>
        <button onClick={refresh} className={styles.retryButton}>
          Retry
        </button>
      </div>
    );
  }

  if (activeSuggestions.length === 0) {
    return (
      <div className={styles.empty}>
        <span>No suggestions</span>
        <button onClick={refresh} className={styles.refreshButton} aria-label="Refresh suggestions">
          ⟳
        </button>
      </div>
    );
  }

  const visible = activeSuggestions.slice(0, maxVisible);
  const hiddenCount = activeSuggestions.length - maxVisible;

  return (
    <div className={styles.strip} role="region" aria-label="Suggestions">
      <div className={styles.cards}>
        {visible.map(suggestion => (
          <SuggestionCard
            key={suggestion.id}
            suggestion={suggestion}
            onApply={handleApply}
            onDismiss={handleDismiss}
            onUndoApply={handleUndoApply}
            onUndoDismiss={handleUndoDismiss}
          />
        ))}
      </div>
      {hiddenCount > 0 && showAllAction && (
        <button
          className={styles.showAll}
          onClick={showAllAction}
          aria-label={`Show ${hiddenCount} more suggestions`}
        >
          +{hiddenCount} more
        </button>
      )}
    </div>
  );
}
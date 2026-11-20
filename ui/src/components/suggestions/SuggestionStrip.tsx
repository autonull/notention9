import React from 'react';
import { Note, NoteSuggestion } from '@notention/core';
import { SuggestionCard } from './SuggestionCard';
import { useNoteSuggestions } from '../../hooks/useNoteSuggestions';
import styles from './SuggestionStrip.module.css';

interface SuggestionStripProps {
  note: Note | null;
  maxVisible?: number;
  onSuggestionApplied?: (suggestion: NoteSuggestion) => void;
  onSuggestionDismissed?: (suggestion: NoteSuggestion) => void;
  showAllAction?: () => void;
}

export function SuggestionStrip({
  note,
  maxVisible = 3,
  onSuggestionApplied,
  onSuggestionDismissed,
  showAllAction
}: SuggestionStripProps) {
  const {
    activeSuggestions,
    isGenerating,
    error,
    refresh,
    applySuggestion,
    dismissSuggestion
  } = useNoteSuggestions({ note, autoRefresh: false });

  const handleApply = (suggestionId: string) => {
    const suggestion = activeSuggestions.find(s => s.id === suggestionId);
    if (suggestion && applySuggestion(suggestionId)) {
      onSuggestionApplied?.(suggestion);
    }
  };

  const handleDismiss = (suggestionId: string) => {
    const suggestion = activeSuggestions.find(s => s.id === suggestionId);
    if (suggestion && dismissSuggestion(suggestionId)) {
      onSuggestionDismissed?.(suggestion);
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
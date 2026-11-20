import React from 'react';
import { Note, NoteSuggestion } from '@notention/core';
import { useNoteSuggestions } from '../../hooks/useNoteSuggestions';
import { SuggestionCard } from './SuggestionCard';
import styles from './NoteSuggestions.module.css';

interface NoteSuggestionsProps {
  note: Note | null;
  onSuggestionApplied?: (suggestion: NoteSuggestion) => void;
  onSuggestionDismissed?: (suggestion: NoteSuggestion) => void;
  showStale?: boolean;
  maxSuggestions?: number;
  showHeader?: boolean;
}

export function NoteSuggestions({
  note,
  onSuggestionApplied,
  onSuggestionDismissed,
  showStale = true,
  maxSuggestions = 10,
  showHeader = true
}: NoteSuggestionsProps) {
  const {
    activeSuggestions,
    staleSuggestions,
    isGenerating,
    error,
    refresh,
    applySuggestion,
    dismissSuggestion
  } = useNoteSuggestions({ note });

  const handleApply = (suggestionId: string) => {
    const suggestion = [...activeSuggestions, ...staleSuggestions].find(s => s.id === suggestionId);
    if (suggestion && applySuggestion(suggestionId)) {
      onSuggestionApplied?.(suggestion);
    }
  };

  const handleDismiss = (suggestionId: string) => {
    const suggestion = [...activeSuggestions, ...staleSuggestions].find(s => s.id === suggestionId);
    if (suggestion && dismissSuggestion(suggestionId)) {
      onSuggestionDismissed?.(suggestion);
    }
  };

  if (!note) {
    return (
      <div className={styles.empty}>
        <p>No note selected</p>
      </div>
    );
  }

  const displaySuggestions = [
    ...activeSuggestions.slice(0, maxSuggestions),
    ...(showStale ? staleSuggestions.slice(0, Math.max(0, maxSuggestions - activeSuggestions.length)) : [])
  ];

  if (isGenerating && displaySuggestions.length === 0) {
    return (
      <div className={styles.loading} role="status" aria-live="polite">
        <div className={styles.spinner} />
        <p>Generating suggestions…</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.error} role="alert">
        <p>Error: {error.message}</p>
        <button onClick={refresh} className={styles.retryButton}>
          Retry
        </button>
      </div>
    );
  }

  if (displaySuggestions.length === 0) {
    return (
      <div className={styles.empty}>
        <p>No suggestions available</p>
        <button onClick={refresh} className={styles.refreshButton}>
          Refresh
        </button>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      {showHeader && (
        <div className={styles.header}>
          <h3>Suggestions</h3>
          <div className={styles.headerActions}>
            <span className={styles.count}>
              {activeSuggestions.length} active
              {staleSuggestions.length > 0 && `, ${staleSuggestions.length} stale`}
            </span>
            <button
              onClick={refresh}
              className={styles.refreshButton}
              disabled={isGenerating}
              aria-label="Refresh suggestions"
            >
              ⟳
            </button>
          </div>
        </div>
      )}

      <div className={styles.list} role="list" aria-label="Suggestions">
        {activeSuggestions.length > 0 && (
          <>
            {showHeader && <div className={styles.sectionHeader}>Active</div>}
            {activeSuggestions.slice(0, maxSuggestions).map(suggestion => (
              <SuggestionCard
                key={suggestion.id}
                suggestion={suggestion}
                onApply={handleApply}
                onDismiss={handleDismiss}
              />
            ))}
          </>
        )}

        {showStale && staleSuggestions.length > 0 && (
          <>
            {showHeader && <div className={styles.sectionHeader}>Stale — refresh to update</div>}
            {staleSuggestions.slice(0, Math.max(0, maxSuggestions - activeSuggestions.length)).map(suggestion => (
              <SuggestionCard
                key={suggestion.id}
                suggestion={suggestion}
                onApply={handleApply}
                onDismiss={handleDismiss}
              />
            ))}
          </>
        )}
      </div>
    </div>
  );
}
import React from 'react';
import { Note, NoteSuggestion } from '@notention/core';
import { SuggestionCard } from './SuggestionCard';
import styles from './NoteSuggestions.module.css';

interface NoteSuggestionsProps {
  note: Note | null;
  activeSuggestions: NoteSuggestion[];
  staleSuggestions: NoteSuggestion[];
  appliedSuggestions: NoteSuggestion[];
  onSuggestionApplied?: (suggestion: NoteSuggestion) => void;
  onSuggestionDismissed?: (suggestionId: string) => boolean;
  onSuggestionUndoApply?: (suggestionId: string) => boolean;
  onSuggestionUndoDismiss?: (suggestionId: string) => boolean;
  showStale?: boolean;
  showApplied?: boolean;
  maxSuggestions?: number;
  showHeader?: boolean;
  isGenerating?: boolean;
  error?: Error | null;
  refresh?: () => Promise<void>;
}

export function NoteSuggestions({
  note,
  activeSuggestions = [],
  staleSuggestions = [],
  appliedSuggestions = [],
  onSuggestionApplied,
  onSuggestionDismissed,
  onSuggestionUndoApply,
  onSuggestionUndoDismiss,
  showStale = true,
  showApplied = true,
  maxSuggestions = 10,
  showHeader = true,
  isGenerating = false,
  error = null,
  refresh
}: NoteSuggestionsProps) {
  const handleApply = (suggestionId: string) => {
    const suggestion = [...activeSuggestions, ...staleSuggestions, ...appliedSuggestions].find(s => s.id === suggestionId);
    if (suggestion && onSuggestionApplied) {
      onSuggestionApplied(suggestion);
    }
  };

  const handleDismiss = (suggestionId: string) => {
    onSuggestionDismissed?.(suggestionId);
  };

  const handleUndoApply = (suggestionId: string) => {
    onSuggestionUndoApply?.(suggestionId);
  };

  const handleUndoDismiss = (suggestionId: string) => {
    onSuggestionUndoDismiss?.(suggestionId);
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

  if (isGenerating && displaySuggestions.length === 0 && (!showApplied || appliedSuggestions.length === 0)) {
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

  if (displaySuggestions.length === 0 && (!showApplied || appliedSuggestions.length === 0)) {
    return (
      <div className={styles.empty}>
        <p>No suggestions available</p>
        {refresh && (
          <button onClick={refresh} className={styles.refreshButton}>
            Refresh
          </button>
        )}
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
                onUndoApply={handleUndoApply}
                onUndoDismiss={handleUndoDismiss}
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
                onUndoApply={handleUndoApply}
                onUndoDismiss={handleUndoDismiss}
              />
            ))}
          </>
        )}

        {showApplied && appliedSuggestions.length > 0 && (
          <>
            {showHeader && <div className={styles.sectionHeader}>Applied</div>}
            {appliedSuggestions.slice(0, maxSuggestions).map(suggestion => (
              <SuggestionCard
                key={suggestion.id}
                suggestion={suggestion}
                onApply={handleApply}
                onDismiss={handleDismiss}
                onUndoApply={handleUndoApply}
                onUndoDismiss={handleUndoDismiss}
              />
            ))}
          </>
        )}
      </div>
    </div>
  );
}
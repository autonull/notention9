import React from 'react';
import { NextStep } from '../../hooks/useNextSteps';
import { XIcon, HelpIcon, CheckIcon, ArrowPathIcon } from '../ui/icons';
import styles from './NextStepCard.module.css';

interface NextStepCardProps {
  step: NextStep;
  onApply?: (stepId: string) => void;
  onDismiss?: (stepId: string) => void;
  onUndo?: (stepId: string) => void;
  onPreview?: (step: NextStep) => void;
}

const sourceLabels: Record<NextStep['source'], string> = {
  'on-device': 'On-device',
  'ai': 'AI',
  'skill': 'Skill',
  'network': 'Network',
};

const sourceIcons: Record<NextStep['source'], React.ReactNode> = {
  'on-device': <span className={styles.sourceIcon}>📱</span>,
  'ai': <span className={styles.sourceIcon}>🤖</span>,
  'skill': <span className={styles.sourceIcon}>⚡</span>,
  'network': <span className={styles.sourceIcon}>🌐</span>,
};

export function NextStepCard({ step, onApply, onDismiss, onUndo, onPreview }: NextStepCardProps) {
  const isStale = step.state === 'stale';
  const isApplied = step.state === 'applied';
  const sourceLabel = sourceLabels[step.source];
  const sourceIcon = sourceIcons[step.source];

  const handleDismissClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onDismiss?.(step.id);
  };

  const handleUndoClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onUndo?.(step.id);
  };

  const handleApplyClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onApply?.(step.id);
  };

  const handleWhyClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (step.why) {
      alert(`Why?\n\n${step.why}\n\nSource: ${sourceLabel}`);
    }
  };

  return (
    <div
      className={`${styles.card} ${isStale ? styles.stale : ''} ${isApplied ? styles.applied : ''}`}
      data-testid={`next-step-card-${step.id}`}
      role="listitem"
    >
      <div className={styles.mainRow}>
        <div className={styles.content}>
          <h4 className={styles.title}>{step.title}</h4>
          {step.evidence && (
            <p className={styles.evidence}>
              {sourceIcon}
              <span>{step.evidence}</span>
            </p>
          )}

          {step.why && !isApplied && (
            <button
              className={styles.whyButton}
              onClick={handleWhyClick}
              aria-label="Why this suggestion?"
              title="Why?"
            >
              <HelpIcon className="w-4 h-4" />
            </button>
          )}
        </div>

        <div className={styles.actions}>
          {!isApplied && (
            <>
              <button
                className={`${styles.primaryAction} ${isStale ? styles.refreshAction : ''}`}
                onClick={handleApplyClick}
                aria-label={isStale ? 'Refresh suggestion' : step.actionLabel || 'Apply'}
                disabled={isStale && !step.apply}
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
                    <span>{step.actionLabel || 'Apply'}</span>
                  </>
                )}
              </button>

              <button
                className={styles.whyButton}
                onClick={handleWhyClick}
                aria-label="Why this suggestion?"
                title="Why?"
              >
                <HelpIcon className="w-4 h-4" />
              </button>

              <button
                className={styles.dismissButton}
                onClick={handleDismissClick}
                aria-label="Dismiss suggestion"
              >
                <XIcon className="w-4 h-4" />
              </button>
            </>
          )}

          {isApplied && onUndo && (
            <button
              className={`${styles.primaryAction} ${styles.undoAction}`}
              onClick={handleUndoClick}
              aria-label="Undo"
            >
              <span className={styles.actionIcon}>
                <ArrowPathIcon className="w-4 h-4" />
              </span>
              <span>Undo</span>
            </button>
          )}
        </div>
      </div>

      <div className={styles.sourceChip}>
        {sourceIcon}
        <span>{sourceLabel}</span>
      </div>
    </div>
  );
}
import React, {useState} from 'react';
import type {NextStep} from '../../hooks/useNextSteps';
import {XIcon, CheckIcon, ArrowPathIcon} from '../ui/icons';
import styles from './NextStepCard.module.css';

interface NextStepCardProps {
  step: NextStep;
  onApply?: (stepId: string) => void;
  onDismiss?: (stepId: string) => void;
  onUndo?: (stepId: string) => void;
}

const sourceLabels: Record<NextStep['source'], string> = {
  'on-device': 'On-device',
  'ai': 'AI',
  'skill': 'Skill',
  'network': 'Network',
};

export function NextStepCard({step, onApply, onDismiss, onUndo}: NextStepCardProps) {
  const [showWhy, setShowWhy] = useState(false);
  const isStale = step.state === 'stale';
  const isApplied = step.state === 'applied';

  return (
    <div
      className={`${styles.card} ${isStale ? styles.stale : ''} ${isApplied ? styles.applied : ''}`}
      data-testid={`next-step-card-${step.id}`}
      role="listitem"
    >
      <div className={styles.header}>
        <div className={styles.content}>
          <h4 className={styles.title}>{step.title}</h4>
          <p className={styles.evidence}>{step.evidence}</p>
        </div>
        {!isApplied && (
          <button
            className={styles.dismissButton}
            onClick={() => onDismiss?.(step.id)}
            aria-label="Dismiss suggestion"
            title="Dismiss"
          >
            <XIcon className="w-4 h-4"/>
          </button>
        )}
      </div>

      {step.why && !isApplied && (
        <button
          type="button"
          className={styles.whyButton}
          onClick={() => setShowWhy(value => !value)}
          aria-expanded={showWhy}
        >
          Why this step?
        </button>
      )}
      {showWhy && step.why && (
        <p className={styles.why}>{step.why}</p>
      )}

      <div className={styles.footer}>
        <span className={styles.sourceChip}>{sourceLabels[step.source]}</span>
        {isApplied ? (
          onUndo && (
            <button className={styles.undoAction} onClick={() => onUndo(step.id)}>
              <ArrowPathIcon className="w-3.5 h-3.5"/>
              Undo
            </button>
          )
        ) : (
          <button
            className={`${styles.primaryAction} ${isStale ? styles.refreshAction : ''}`}
            onClick={() => onApply?.(step.id)}
            disabled={isStale && !step.apply}
          >
            <CheckIcon className="w-4 h-4"/>
            {isStale ? 'Refresh' : step.actionLabel || 'Apply'}
          </button>
        )}
      </div>
    </div>
  );
}

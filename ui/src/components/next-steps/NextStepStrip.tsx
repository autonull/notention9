import React, {useEffect, useState} from 'react';
import type {Note} from '@notention/core';
import {ArrowPathIcon, CheckIcon, ChevronRightIcon, SparklesIcon, XIcon} from '../ui/icons';
import type {NextStep, UseNextStepsReturn} from '../../hooks/useNextSteps';
import styles from './NextStepStrip.module.css';

interface NextStepStripProps {
  note: Note | null;
  model: UseNextStepsReturn;
  onOpenDrawer?: () => void;
}

function DrawerButton({count, onOpenDrawer}: {count: number; onOpenDrawer?: () => void}) {
  if (!onOpenDrawer || count <= 1) return null;
  return (
    <button
      type="button"
      className={styles.more}
      onClick={onOpenDrawer}
      aria-label={`Open next steps (${count})`}
    >
      {count - 1} more
      <ChevronRightIcon className="w-3.5 h-3.5"/>
    </button>
  );
}

function AppliedHint({step, count, onOpenDrawer}: {step: NextStep; count: number; onOpenDrawer?: () => void}) {
  return (
    <div className={styles.strip} role="region" aria-label="Next steps" data-testid="next-step-strip">
      <div className={`${styles.hint} ${styles.appliedHint}`} data-testid={`next-step-card-${step.id}`}>
        <CheckIcon className={`${styles.icon} ${styles.appliedIcon}`} aria-hidden="true"/>
        <span className={styles.appliedTag}>Applied</span>
        <span className={styles.title}>{step.title}</span>
        <span className={styles.evidence}>{step.evidence}</span>
        <div className={styles.actions}>
          <button
            type="button"
            className={styles.why}
            onClick={() => step.undo?.()}
            aria-label="Undo applied step"
          >
            <ArrowPathIcon className="w-3.5 h-3.5"/>
            Undo
          </button>
          <DrawerButton count={count} onOpenDrawer={onOpenDrawer}/>
        </div>
      </div>
    </div>
  );
}

/**
 * One quiet line for the top next step. Detail lives in the drawer.
 */
export function NextStepStrip({note, model, onOpenDrawer}: NextStepStripProps) {
  const {topNextStep, nextSteps} = model;
  const [showWhy, setShowWhy] = useState(false);
  const step = topNextStep ?? nextSteps.find(candidate => candidate.state === 'stale') ?? null;
  const appliedStep = step ? null : nextSteps.find(candidate => candidate.state === 'applied') ?? null;
  const stepId = step?.id ?? appliedStep?.id;

  useEffect(() => {
    setShowWhy(false);
  }, [stepId]);

  if (!note) return null;
  if (!step) {
    return appliedStep ? <AppliedHint step={appliedStep} count={nextSteps.length} onOpenDrawer={onOpenDrawer}/> : null;
  }

  const isStale = step.state === 'stale';
  const applyDisabled = isStale && !step.apply;

  return (
    <div className={styles.strip} role="region" aria-label="Next steps" data-testid="next-step-strip">
      <div className={styles.hint} data-testid={`next-step-card-${step.id}`} aria-live="polite">
        <SparklesIcon className={styles.icon} aria-hidden="true"/>
        <span className={styles.title}>{step.title}</span>
        <span className={styles.evidence}>{step.evidence}</span>

        <div className={styles.actions}>
          {step.why && (
            <button
              type="button"
              className={styles.why}
              onClick={() => setShowWhy(value => !value)}
              aria-expanded={showWhy}
            >
              Why
            </button>
          )}
          <button
            type="button"
            className={styles.apply}
            onClick={() => step.apply?.()}
            disabled={applyDisabled}
          >
            {isStale ? 'Refresh' : step.actionLabel || 'Apply'}
          </button>
          <button
            type="button"
            className={styles.iconButton}
            onClick={() => step.dismiss?.()}
            aria-label="Dismiss suggestion"
            title="Dismiss"
          >
            <XIcon className="w-4 h-4"/>
          </button>
          <DrawerButton count={nextSteps.length} onOpenDrawer={onOpenDrawer}/>
        </div>
      </div>
      {showWhy && step.why && (
        <p className={styles.explain}>{step.why}</p>
      )}
    </div>
  );
}

import React from 'react';
import { Note } from '@notention/core';
import { ChevronDownIcon, SparklesIcon } from '../ui/icons';
import { NextStepCard } from './NextStepCard';
import { useNextSteps, NextStep, SimpleMatch, SkillApprovalState } from '../../hooks/useNextSteps';
import { SkillApprovalDialog } from '../skills/SkillApprovalDialog';
import styles from './NextStepStrip.module.css';

interface NextStepStripProps {
  note: Note | null;
  localMatches?: SimpleMatch[];
  networkMatches?: SimpleMatch[];
  onStepApplied?: (stepId: string) => void;
  onStepDismissed?: (stepId: string) => void;
  onOpenDrawer?: () => void;
}

export function NextStepStrip({
  note,
  localMatches = [],
  networkMatches = [],
  onStepApplied,
  onStepDismissed,
  onOpenDrawer,
}: NextStepStripProps) {
  const {
    topNextStep,
    hasNextSteps,
    isGenerating,
    error,
    refresh,
    nextSteps,
    skillApproval,
    closeSkillApproval,
  } = useNextSteps({ note, localMatches, networkMatches });

  const handleApply = (stepId: string) => {
    const step = nextSteps.find(s => s.id === stepId);
    if (step && step.apply) {
      step.apply();
      if (step.state === 'active') {
        onStepApplied?.(stepId);
      }
    }
  };

  const handleDismiss = (stepId: string) => {
    const step = nextSteps.find(s => s.id === stepId);
    if (step && step.dismiss) {
      step.dismiss();
      onStepDismissed?.(stepId);
    }
  };

  const handleUndo = (stepId: string) => {
    const step = nextSteps.find(s => s.id === stepId);
    if (step && step.undo) {
      step.undo();
    }
  };

  if (!note) return null;

  if (isGenerating && !hasNextSteps) {
    return (
      <div className={styles.loading} role="status" aria-live="polite">
        <div className={styles.spinner} />
        <span>Generating next steps…</span>
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

  if (!hasNextSteps) {
    return (
      <div className={styles.empty}>
        <span>No next steps</span>
        <button onClick={refresh} className={styles.refreshButton} aria-label="Refresh">
          ⟳
        </button>
      </div>
    );
  }

  return (
    <div className={styles.strip} role="region" aria-label="Next steps">
      <div className={styles.cardWrapper}>
        {topNextStep && (
          <NextStepCard
            step={topNextStep}
            onApply={handleApply}
            onDismiss={handleDismiss}
            onUndo={handleUndo}
          />
        )}
      </div>
      {nextSteps.length > 1 && onOpenDrawer && (
        <button
          className={styles.openDrawer}
          onClick={onOpenDrawer}
          aria-label={`Open drawer with ${nextSteps.length} next steps`}
        >
          <SparklesIcon className="w-4 h-4" />
          <span>{nextSteps.length} next steps</span>
          <ChevronDownIcon className="w-4 h-4" />
        </button>
      )}
      {skillApproval.isOpen && skillApproval.step && (
        <SkillApprovalDialog
          isOpen={skillApproval.isOpen}
          onClose={closeSkillApproval}
          onApprove={skillApproval.onApprove}
          onReject={skillApproval.onReject}
          skillName={skillApproval.step.skillName || ''}
          skillDescription={skillApproval.step.skillDescription || ''}
          actions={skillApproval.step.skillActions || []}
          domains={skillApproval.step.skillDomains || []}
          requiresAuth={skillApproval.step.skillRequiresAuth || false}
          expectedOutcome={skillApproval.step.skillExpectedOutcome}
          preview={skillApproval.step.skillPreview}
        />
      )}
    </div>
  );
}
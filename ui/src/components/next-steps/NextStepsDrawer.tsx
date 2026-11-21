import React, { useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { Note } from '@notention/core';
import { XIcon, ChevronDownIcon, ChevronUpIcon, SparklesIcon, ArrowPathIcon } from '../ui/icons';
import { NextStepCard } from './NextStepCard';
import { useNextSteps, NextStep, SimpleMatch, SkillApprovalState } from '../../hooks/useNextSteps';
import { useFocusTrap } from '../ui/Overlay';
import { SkillApprovalDialog } from '../skills/SkillApprovalDialog';
import styles from './NextStepsDrawer.module.css';

interface NextStepsDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  note: Note | null;
  localMatches?: SimpleMatch[];
  networkMatches?: SimpleMatch[];
  onStepApplied?: (stepId: string) => void;
  onStepDismissed?: (stepId: string) => void;
  onNavigateToMatch?: (noteId: string) => void;
  // Apply path handlers
  onOpenPropertyEditor?: (key: string, operator: string, value: string, placeholder?: string) => void;
  onUpdateProperty?: (key: string, operator: string, value: string, previousProperty?: any) => void;
  onRemoveProperty?: (key: string) => void;
  onNavigateToNote?: (noteId: string) => void;
  onExecuteSkill?: (skillId: string, note: Note) => Promise<{ success: boolean; resultNoteIds?: string[]; fitCount?: number; error?: string }>;
}

export function NextStepsDrawer({
  isOpen,
  onClose,
  note,
  localMatches = [],
  networkMatches = [],
  onStepApplied,
  onStepDismissed,
  onNavigateToMatch,
  onOpenPropertyEditor,
  onUpdateProperty,
  onRemoveProperty,
  onNavigateToNote,
  onExecuteSkill,
}: NextStepsDrawerProps) {
  const drawerRef = useRef<HTMLDivElement>(null);
  const contentRef = useFocusTrap(isOpen, onClose);
  const previousActiveElement = useRef<HTMLElement | null>(null);

  const {
    nextSteps,
    isGenerating,
    error,
    refresh,
    skillApproval,
    closeSkillApproval,
  } = useNextSteps({ 
    note, 
    localMatches, 
    networkMatches,
    onOpenPropertyEditor,
    onUpdateProperty,
    onRemoveProperty,
    onNavigateToNote,
    onExecuteSkill,
  });

  // Focus management
  useEffect(() => {
    if (isOpen) {
      previousActiveElement.current = document.activeElement as HTMLElement;
    } else if (previousActiveElement.current) {
      previousActiveElement.current.focus();
      previousActiveElement.current = null;
    }
  }, [isOpen]);

  // Handle Escape key
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      onClose();
    }
  }, [onClose]);

  useEffect(() => {
    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'hidden';
    }
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [isOpen, handleKeyDown]);

  // Handle swipe down on mobile
  const touchStartRef = useRef<number | null>(null);
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartRef.current = e.touches[0].clientY;
  };
  const handleTouchMove = (e: React.TouchEvent) => {
    if (touchStartRef.current === null) return;
    const delta = e.touches[0].clientY - touchStartRef.current;
    if (delta > 100) {
      onClose();
      touchStartRef.current = null;
    }
  };
  const handleTouchEnd = () => {
    touchStartRef.current = null;
  };

  const activeSteps = nextSteps.filter(s => s.state === 'active');
  const staleSteps = nextSteps.filter(s => s.state === 'stale');
  const appliedSteps = nextSteps.filter(s => s.state === 'applied');

  const allMatches = [...localMatches, ...networkMatches];

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

  const handleMatchClick = (match: SimpleMatch) => {
    onNavigateToMatch?.(match.note.id);
    onClose();
  };

  if (!isOpen) return null;

  const drawerContent = (
    <>
      <div
        ref={drawerRef}
        className={styles.drawer}
        role="dialog"
        aria-modal="true"
        aria-label="Next steps"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        <div className={styles.overlay} onClick={onClose} aria-hidden="true" />
        <div ref={contentRef} className={styles.panel} tabIndex={-1}>
          <div className={styles.handle} aria-hidden="true" />
          <header className={styles.header}>
            <h2 className={styles.title}>
              <SparklesIcon className="w-5 h-5" />
              Next steps
              <span className={styles.count}>{nextSteps.length}</span>
            </h2>
            <div className={styles.headerActions}>
              <button
                className={styles.refreshButton}
                onClick={refresh}
                disabled={isGenerating}
                aria-label="Refresh next steps"
              >
                <ArrowPathIcon className={`w-4 h-4 ${isGenerating ? styles.spinning : ''}`} />
              </button>
              <button
                className={styles.closeButton}
                onClick={onClose}
                aria-label="Close drawer"
              >
                <XIcon className="w-5 h-5" />
              </button>
            </div>
          </header>

          {error && (
            <div className={styles.error} role="alert">
              <span>Error: {error.message}</span>
              <button onClick={refresh} className={styles.retryButton}>
                Retry
              </button>
            </div>
          )}

          <div className={styles.content}>
            {activeSteps.length > 0 && (
              <section className={styles.section}>
                <h3 className={styles.sectionTitle}>Next steps</h3>
                <div className={styles.stepsList} role="list">
                  {activeSteps.map(step => (
                    <NextStepCard
                      key={step.id}
                      step={step}
                      onApply={handleApply}
                      onDismiss={handleDismiss}
                      onUndo={handleUndo}
                    />
                  ))}
                </div>
              </section>
            )}

            {staleSteps.length > 0 && (
              <section className={styles.section}>
                <h3 className={styles.sectionTitle}>Stale</h3>
                <div className={styles.stepsList} role="list">
                  {staleSteps.map(step => (
                    <NextStepCard
                      key={step.id}
                      step={step}
                      onApply={handleApply}
                      onDismiss={handleDismiss}
                      onUndo={handleUndo}
                    />
                  ))}
                </div>
              </section>
            )}

            {allMatches.length > 0 && (
              <section className={styles.section}>
                <h3 className={styles.sectionTitle}>Matches</h3>
                <div className={styles.matchesList} role="list">
                  {allMatches.slice(0, 10).map((match, index) => (
                    <MatchCard
                      key={`${match.note.id}-${index}`}
                      match={match}
                      index={index}
                      onClick={() => handleMatchClick(match)}
                    />
                  ))}
                </div>
              </section>
            )}

            {appliedSteps.length > 0 && (
              <section className={styles.section}>
                <button
                  className={styles.appliedToggle}
                  onClick={() => {}}
                  aria-expanded="true"
                >
                  <h3 className={styles.sectionTitle}>
                    Applied history
                    <span className={styles.appliedCount}>{appliedSteps.length} applied</span>
                  </h3>
                  <ChevronUpIcon className="w-4 h-4" />
                </button>
                <div className={styles.appliedList} role="list">
                  {appliedSteps.map(step => (
                    <NextStepCard
                      key={step.id}
                      step={step}
                      onApply={handleApply}
                      onDismiss={handleDismiss}
                      onUndo={handleUndo}
                    />
                  ))}
                </div>
              </section>
            )}

            {nextSteps.length === 0 && !isGenerating && !error && (
              <div className={styles.empty}>
                <span>No next steps available</span>
                <button onClick={refresh} className={styles.refreshButtonSmall}>
                  Refresh
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
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
    </>
  );

  // Render as portal to body for proper overlay behavior
  return createPortal(drawerContent, document.body);

  // Render as portal to body for proper overlay behavior
  return createPortal(drawerContent, document.body);
}

interface MatchCardProps {
  match: SimpleMatch;
  index: number;
  onClick: () => void;
}

function MatchCard({ match, onClick }: MatchCardProps) {
  const fitCount = match.fitCount;
  const totalProps = match.totalProperties || 4;
  const source = match.source === 'network' ? 'Network' : 'Local';
  const sourceIcon = match.source === 'network' ? '🌐' : '📱';

  return (
    <button
      className={styles.matchCard}
      onClick={onClick}
      role="listitem"
      aria-label={`${match.note.title || 'Untitled note'}, ${source}`}
    >
      <div className={styles.matchMain}>
        <div className={styles.matchInfo}>
          <h4 className={styles.matchTitle}>{match.note.title || 'Untitled note'}</h4>
          <div className={styles.matchMeta}>
            <span className={styles.sourceChip}>
              {sourceIcon}
              {source}
            </span>
            {typeof fitCount === 'number' && fitCount > 0 && (
              <span className={styles.fitCount}>
                {fitCount} of {totalProps} fit
              </span>
            )}
          </div>
        </div>
      </div>
    </button>
  );
}
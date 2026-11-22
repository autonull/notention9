import React, {useEffect, useRef, useCallback} from 'react';
import {createPortal} from 'react-dom';
import {XIcon, ChevronDownIcon, SparklesIcon, ArrowPathIcon} from '../ui/icons';
import type {UseNextStepsReturn} from '../../hooks/useNextSteps';
import {useFocusTrap} from '../ui/Overlay';
import {NextStepCard} from './NextStepCard';
import styles from './NextStepsDrawer.module.css';

interface NextStepsDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  model: UseNextStepsReturn;
}

export function NextStepsDrawer({isOpen, onClose, model}: NextStepsDrawerProps) {
  const drawerRef = useRef<HTMLDivElement>(null);
  const contentRef = useFocusTrap(isOpen, onClose);
  const previousActiveElement = useRef<HTMLElement | null>(null);

  const {nextSteps, isGenerating, error, refresh} = model;

  useEffect(() => {
    if (isOpen) {
      previousActiveElement.current = document.activeElement as HTMLElement;
    } else if (previousActiveElement.current) {
      previousActiveElement.current.focus();
      previousActiveElement.current = null;
    }
  }, [isOpen]);

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

  const activeSteps = nextSteps.filter(step => step.state === 'active');
  const staleSteps = nextSteps.filter(step => step.state === 'stale');
  const appliedSteps = nextSteps.filter(step => step.state === 'applied');

  const handleApply = (stepId: string) => {
    nextSteps.find(step => step.id === stepId)?.apply?.();
  };

  const handleDismiss = (stepId: string) => {
    nextSteps.find(step => step.id === stepId)?.dismiss?.();
  };

  const handleUndo = (stepId: string) => {
    nextSteps.find(step => step.id === stepId)?.undo?.();
  };

  if (!isOpen) return null;

  const drawerContent = (
    <div
      ref={drawerRef}
      className={styles.drawer}
      role="dialog"
      aria-modal="true"
      aria-label="Next steps"
      data-testid="next-steps-drawer"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      <div className={styles.overlay} onClick={onClose} aria-hidden="true"/>
      <div ref={contentRef} className={styles.panel} tabIndex={-1}>
        <div className={styles.handle} aria-hidden="true"/>
        <header className={styles.header}>
          <h2 className={styles.title}>
            <SparklesIcon className="w-5 h-5"/>
            Next steps
            <span className={styles.count}>{activeSteps.length + staleSteps.length}</span>
          </h2>
          <div className={styles.headerActions}>
            <button
              className={styles.refreshButton}
              onClick={refresh}
              disabled={isGenerating}
              aria-label="Refresh next steps"
              title="Refresh"
            >
              <ArrowPathIcon className={`w-4 h-4 ${isGenerating ? styles.spinning : ''}`}/>
            </button>
            <button
              className={styles.closeButton}
              onClick={onClose}
              aria-label="Close drawer"
            >
              <XIcon className="w-5 h-5"/>
            </button>
          </div>
        </header>

        {error && (
          <div className={styles.error} role="alert">
            <span>Could not load next steps.</span>
            <button onClick={refresh} className={styles.retryButton}>
              Retry
            </button>
          </div>
        )}

        <div className={styles.content}>
          {activeSteps.length > 0 && (
            <section className={styles.section}>
              <h3 className={styles.sectionTitle}>Suggested</h3>
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
              <h3 className={styles.sectionTitle}>Needs refresh</h3>
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

          {appliedSteps.length > 0 && (
            <details className={styles.appliedSection}>
              <summary className={styles.appliedSummary}>
                <span>Applied history</span>
                <span className={styles.appliedCount}>{appliedSteps.length}</span>
                <ChevronDownIcon className={`w-4 h-4 ${styles.chevron}`}/>
              </summary>
              <div className={styles.stepsList} role="list">
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
            </details>
          )}

          {activeSteps.length === 0 && staleSteps.length === 0 && appliedSteps.length === 0 && (
            <div className={styles.empty}>
              <SparklesIcon className="w-6 h-6"/>
              <span>No next steps yet.</span>
              <span className={styles.emptyHint}>Write a little more, or add a structured detail.</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );

  return createPortal(drawerContent, document.body);
}

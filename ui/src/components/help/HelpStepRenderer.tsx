import { useState, useEffect, useCallback, useRef } from 'react';
import { useHelp, useHelpAnalytics } from '@/hooks';
import { StepExecutor, createStepExecutor, helpEngine, type StepExecutionContext, type StepResult } from '@/lib/helpConfig';
import { Button } from '../ui/Button';
import { cn } from '../../utils/ui';
import { 
  CheckCircleIcon, AlertCircleIcon, InfoIcon, 
  MousePointerClickIcon, KeyboardIcon, EyeIcon,
  ChevronLeftIcon, ChevronRightIcon, PlayIcon, PauseIcon,
  SkipForwardIcon, SkipBackIcon
} from '../ui/icons';
import type { HelpTopic, HelpStep, SpotlightConfig, HelpTarget } from '@notention/core/help';

function useReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    setReduced(mediaQuery.matches);
    const handler = (e: MediaQueryListEvent) => setReduced(e.matches);
    mediaQuery.addEventListener('change', handler);
    return () => mediaQuery.removeEventListener('change', handler);
  }, []);
  return reduced;
}

function useHighContrast(): boolean {
  const [highContrast, setHighContrast] = useState(false);
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-contrast: more)');
    setHighContrast(mediaQuery.matches);
    const handler = (e: MediaQueryListEvent) => setHighContrast(e.matches);
    mediaQuery.addEventListener('change', handler);
    return () => mediaQuery.removeEventListener('change', handler);
  }, []);
  return highContrast;
}

export interface HelpStepRendererProps {
  className?: string;
}

export function HelpStepRenderer({ className }: HelpStepRendererProps) {
  const { 
    currentTopic, 
    currentTopicId, 
    getProgress, 
    startTopic, 
    updateStep, 
    completeTopic, 
    resetTopic,
    recordEvent 
  } = useHelp();
  const { trackStepRetry, trackAbandon } = useHelpAnalytics();
  
  const [executor, setExecutor] = useState<StepExecutor | null>(null);
  const [currentStepResult, setCurrentStepResult] = useState<StepResult | null>(null);
  const [isExecuting, setIsExecuting] = useState(false);
  const [showSpotlight, setShowSpotlight] = useState<{ target: HelpTarget; style?: string } | null>(null);
  const [autoAdvanceEnabled, setAutoAdvanceEnabled] = useState(true);
  const [announcement, setAnnouncement] = useState<string>('');
  
  const progress = currentTopicId ? getProgress(currentTopicId) : undefined;
  const currentStepIndex = progress?.currentStepIndex ?? 0;
  const currentStep = currentTopic?.steps[currentStepIndex];
  const isTopicComplete = progress?.completedAt;
  
  const previousStepIndexRef = useRef(currentStepIndex);
  const liveRegionRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const reducedMotion = useReducedMotion();
  const highContrast = useHighContrast();

  useEffect(() => {
    if (currentTopicId && !executor) {
      const exec = createStepExecutor(helpEngine, {
        onSpotlight: (config) => setShowSpotlight(config),
        onAutoAdvance: () => handleNext(),
        onStepComplete: (stepId, success) => {
          if (success) {
            recordEvent({ type: 'step_complete', topicId: currentTopicId, stepId, metadata: { stepId } });
          } else {
            recordEvent({ type: 'step_fail', topicId: currentTopicId, stepId, metadata: { stepId } });
          }
        },
        getState: (path) => {
          // This would connect to the app's state management
          return undefined;
        },
        findElement: (target) => {
          if (target.testId) {
            return document.querySelector(`[data-testid="${target.testId}"]`);
          }
          if (target.selector) {
            return document.querySelector(target.selector);
          }
          if (target.role && target.name) {
            return document.querySelector(`[role="${target.role}"][aria-label="${target.name}"]`);
          }
          return null;
        },
      });
      setExecutor(exec);
      startTopic(currentTopicId);
    }
  }, [currentTopicId, executor, startTopic, recordEvent]);

  useEffect(() => {
    if (executor && currentTopic) {
      executor.executeCurrentStep().then(result => {
        setCurrentStepResult(result);
        setIsExecuting(false);
      });
      
      // Announce step change for screen readers
      if (currentStepIndex !== previousStepIndexRef.current && currentStep) {
        const announcementText = `Step ${currentStepIndex + 1} of ${currentTopic.steps.length}: ${currentStep.title}. ${currentStep.description}`;
        setAnnouncement(announcementText);
        previousStepIndexRef.current = currentStepIndex;
      }
    }
  }, [executor, currentStepIndex, currentTopic]);

  const handleNext = useCallback(async () => {
    if (!executor || !currentTopicId) return;
    setIsExecuting(true);
    const result = await executor.nextStep();
    setCurrentStepResult(result);
    if (result.success && executor.getProgress().current >= executor.getProgress().total) {
      completeTopic(currentTopicId);
      recordEvent({ type: 'topic_complete', topicId: currentTopicId });
    }
    setIsExecuting(false);
  }, [executor, currentTopicId, completeTopic, recordEvent]);

  const handlePrevious = useCallback(async () => {
    if (!executor) return;
    setIsExecuting(true);
    const result = await executor.previousStep();
    setCurrentStepResult(result);
    setIsExecuting(false);
  }, [executor]);

  const handleRetry = useCallback(async () => {
    if (!executor || !currentTopicId || !currentStep) return;
    trackStepRetry(currentTopicId, currentStep.id);
    setIsExecuting(true);
    const result = await executor.executeCurrentStep();
    setCurrentStepResult(result);
    setIsExecuting(false);
  }, [executor, currentTopicId, currentStep, trackStepRetry]);

  const handleSkip = useCallback(async () => {
    if (!executor || !currentTopicId || !currentStep) return;
    trackAbandon(currentTopicId, currentStep.id, currentStepIndex);
    const result = await executor.nextStep();
    setCurrentStepResult(result);
  }, [executor, currentTopicId, currentStep, currentStepIndex, trackAbandon]);

  const handleReset = useCallback(() => {
    if (!currentTopicId) return;
    resetTopic(currentTopicId);
    setCurrentStepResult(null);
    if (executor) {
      executor.abort();
    }
    setExecutor(null);
  }, [currentTopicId, resetTopic, executor]);

  if (!currentTopic) {
    return (
      <div 
        className={cn('help-step-renderer', className, highContrast && 'high-contrast', reducedMotion && 'reduced-motion')}
        role="region"
        aria-label="Help step renderer - no topic selected"
      >
        <div className="text-center py-8 text-[var(--app-muted)]">
          <InfoIcon className="w-12 h-12 mx-auto mb-4 text-[var(--app-muted)]" aria-hidden="true" />
          <p className="text-lg">Select a topic to see step-by-step guidance</p>
        </div>
      </div>
    );
  }

  if (isTopicComplete) {
    return (
      <div 
        className={cn('help-step-renderer', className, highContrast && 'high-contrast', reducedMotion && 'reduced-motion')}
        role="region"
        aria-label={`${currentTopic?.title} - Completed`}
      >
        <div className="text-center py-12">
          <CheckCircleIcon className="w-16 h-16 mx-auto mb-4 text-[var(--color-success)]" aria-hidden="true" />
          <h3 className="text-xl font-bold text-[var(--app-text)] mb-2">Topic Completed!</h3>
          <p className="text-[var(--app-text-secondary)] mb-6">Great job! You've completed all steps in this topic.</p>
          <div className="flex justify-center gap-3">
            <Button 
              variant="secondary" 
              onClick={handleReset} 
              data-testid="step-reset"
              aria-label="Restart this topic from the beginning"
            >
              Restart Topic
            </Button>
            <Button 
              onClick={() => recordEvent({ type: 'topic_start', topicId: currentTopicId ?? undefined })} 
              data-testid="step-next-topic"
              aria-label="Start another topic"
            >
              Next Topic
            </Button>
          </div>
        </div>
      </div>
    );
  }

  if (!currentStep) {
    return null;
  }

  const stepProgress = (currentStepIndex + 1) / currentTopic.steps.length * 100;

  const renderStepContent = () => {
    switch (currentStep.type) {
      case 'action':
        return (
          <div className="space-y-4">
            <div className="p-4 rounded-lg bg-[var(--app-surface)] border border-[var(--app-line)]">
              <div className="flex items-start gap-3">
                <div className={cn(
                  'flex-shrink-0 w-10 h-10 rounded-lg flex items-center justify-center',
                  currentStep.action?.type === 'click' && 'bg-[var(--app-accent-soft)] text-[var(--app-accent)]',
                  currentStep.action?.type === 'fill' && 'bg-[var(--color-info-soft)] text-[var(--color-info)]',
                  currentStep.action?.type === 'wait' && 'bg-[var(--color-warning-soft)] text-[var(--color-warning)]',
                )}>
                  {currentStep.action?.type === 'click' && <MousePointerClickIcon className="w-5 h-5" />}
                  {currentStep.action?.type === 'fill' && <KeyboardIcon className="w-5 h-5" />}
                  {currentStep.action?.type === 'wait' && <InfoIcon className="w-5 h-5" />}
                </div>
                <div className="flex-1">
                  <p className="font-medium text-[var(--app-text)]">{currentStep.title}</p>
                  <p className="text-[var(--app-text-secondary)] mt-1">{currentStep.description}</p>
                </div>
              </div>
            </div>
            
            <div className="flex gap-2">
              <Button 
                onClick={isExecuting ? undefined : handleNext}
                disabled={isExecuting || !currentStepResult?.success}
                data-testid="step-next"
                aria-label={isExecuting ? 'Step executing, please wait' : currentStepResult?.success ? 'Continue to next step' : 'Skip this step'}
                aria-disabled={isExecuting || !currentStepResult?.success}
              >
                {isExecuting ? (
                  <>
                    <div className={cn('w-4 h-4 border-2 border-current border-t-transparent rounded-full mr-2', reducedMotion ? '' : 'animate-spin')} aria-hidden="true" />
                    <span className="sr-only">Executing step</span>
                    Executing...
                  </>
                ) : currentStepResult?.success ? (
                  <>
                    <CheckCircleIcon className="w-4 h-4 mr-2" aria-hidden="true" />
                    Continue
                  </>
                ) : (
                  <>
                    <SkipForwardIcon className="w-4 h-4 mr-2" aria-hidden="true" />
                    Skip Step
                  </>
                )}
              </Button>
              
              {!currentStepResult?.success && (
                <Button variant="outline" onClick={handleRetry} data-testid="step-retry" aria-label="Retry this step">
                  <ChevronLeftIcon className="w-4 h-4 mr-1" aria-hidden="true" />
                  Retry
                </Button>
              )}
            </div>
          </div>
        );

      case 'explanation':
        return (
          <div className="space-y-4">
            <div className="p-4 rounded-lg bg-[var(--app-accent-soft)] border border-[var(--app-accent)]">
              <div className="flex items-start gap-3">
                <InfoIcon className="flex-shrink-0 w-6 h-6 text-[var(--app-accent)] mt-0.5" />
                <div className="flex-1">
                  <p className="font-medium text-[var(--app-text)]">{currentStep.title}</p>
                  <p className="text-[var(--app-text-secondary)] mt-1">{currentStep.description}</p>
                </div>
              </div>
            </div>
            
            {currentStep.spotlight && (
              <div className="p-3 rounded-lg bg-[var(--app-surface)] border border-[var(--app-line)]">
                <p className="text-sm text-[var(--app-text-secondary)]">
                  <EyeIcon className="w-4 h-4 inline mr-1" />
                  This step highlights a UI element. Look for the spotlight indicator.
                </p>
              </div>
            )}
            
            <div className="flex gap-2">
              <Button 
                variant="secondary" 
                onClick={handlePrevious} 
                disabled={currentStepIndex === 0} 
                data-testid="step-prev"
                aria-label="Go to previous step"
                aria-disabled={currentStepIndex === 0}
              >
                <ChevronLeftIcon className="w-4 h-4 mr-1" aria-hidden="true" />
                Back
              </Button>
              <Button 
                onClick={handleNext} 
                data-testid="step-next"
                aria-label="Continue to next step"
              >
                Continue <ChevronRightIcon className="w-4 h-4 ml-1" aria-hidden="true" />
              </Button>
            </div>
          </div>
        );

      case 'validation':
        return (
          <div className="space-y-4">
            <div className="p-4 rounded-lg bg-[var(--app-surface)] border border-[var(--app-line)]">
              <div className="flex items-start gap-3">
                <div className={cn(
                  'flex-shrink-0 w-10 h-10 rounded-lg flex items-center justify-center',
                  currentStepResult?.success ? 'bg-[var(--color-success-soft)] text-[var(--color-success)]' : 'bg-[var(--color-warning-soft)] text-[var(--color-warning)]'
                )}>
                  {currentStepResult?.success ? <CheckCircleIcon className="w-5 h-5" /> : <AlertCircleIcon className="w-5 h-5" />}
                </div>
                <div className="flex-1">
                  <p className="font-medium text-[var(--app-text)]">{currentStep.title}</p>
                  <p className="text-[var(--app-text-secondary)] mt-1">{currentStep.description}</p>
                </div>
              </div>
            </div>
            
            {currentStepResult && !currentStepResult.success && (
              <div className="p-3 rounded-lg bg-[var(--color-error-soft)] border border-[var(--color-error)]">
                <p className="text-sm text-[var(--color-error-text)]">
                  <AlertCircleIcon className="w-4 h-4 inline mr-1" />
                  {currentStepResult.error || 'Validation failed. Please try again.'}
                </p>
              </div>
            )}
            
            <div className="flex gap-2">
              <Button 
                variant="secondary" 
                onClick={handlePrevious} 
                disabled={currentStepIndex === 0} 
                data-testid="step-prev"
                aria-label="Go to previous step"
                aria-disabled={currentStepIndex === 0}
              >
                <ChevronLeftIcon className="w-4 h-4 mr-1" aria-hidden="true" />
                Back
              </Button>
              {currentStepResult?.success ? (
                <Button 
                  onClick={handleNext} 
                  data-testid="step-next"
                  aria-label="Continue to next step"
                >
                  Continue <ChevronRightIcon className="w-4 h-4 ml-1" aria-hidden="true" />
                </Button>
              ) : (
                <Button 
                  onClick={handleRetry} 
                  variant="outline" 
                  data-testid="step-retry"
                  aria-label="Try this step again"
                >
                  <ChevronLeftIcon className="w-4 h-4 mr-1" aria-hidden="true" />
                  Try Again
                </Button>
              )}
            </div>
          </div>
        );

      default:
        return (
          <div className="p-4 text-center text-[var(--app-muted)]">
            Step type not yet supported: {currentStep.type}
          </div>
        );
    }
  };

  return (
    <div 
      ref={containerRef}
      className={cn('help-step-renderer space-y-4', className, highContrast && 'high-contrast', reducedMotion && 'reduced-motion')}
      role="region"
      aria-label={`${currentTopic?.title} - Step ${currentStepIndex + 1} of ${currentTopic?.steps.length}`}
      aria-live="polite"
    >
      {/* Live region for screen reader announcements */}
      <div 
        ref={liveRegionRef}
        role="status"
        aria-live="polite"
        aria-atomic="true"
        className="sr-only"
      >
        {announcement}
      </div>
      
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-sm text-[var(--app-muted)]">
            Step {currentStepIndex + 1} of {currentTopic.steps.length}
          </span>
          <div className="w-32 h-1.5 bg-[var(--app-line)] rounded-full overflow-hidden" role="progressbar" aria-valuenow={Math.round(stepProgress)} aria-valuemin={0} aria-valuemax={100} aria-label="Step progress">
            <div 
              className={cn('h-full bg-[var(--app-accent)]', reducedMotion ? 'transition-none' : 'transition-all duration-300')}
              style={{ width: `${stepProgress}%` }}
            />
          </div>
        </div>
        
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={autoAdvanceEnabled}
            onChange={e => setAutoAdvanceEnabled(e.target.checked)}
            className="rounded border-[var(--app-line)]"
          />
          Auto-advance
        </label>
      </div>

      {showSpotlight && (
        <div className="fixed inset-0 z-50 pointer-events-none" data-testid="spotlight-overlay" aria-hidden="true">
          {(() => {
            const element = showSpotlight.target.testId 
              ? document.querySelector(`[data-testid="${showSpotlight.target.testId}"]`)
              : showSpotlight.target.selector
                ? document.querySelector(showSpotlight.target.selector)
                : showSpotlight.target.role && showSpotlight.target.name
                  ? document.querySelector(`[role="${showSpotlight.target.role}"][aria-label="${showSpotlight.target.name}"]`)
                  : null;
            
            if (!element) return null;
            
            const rect = element.getBoundingClientRect();
            return (
              <div 
                className="absolute pointer-events-none"
                style={{
                  top: rect.top,
                  left: rect.left,
                  width: rect.width,
                  height: rect.height,
                }}
              >
                <div className={cn(
                  'absolute inset-0 rounded-lg border-2 border-[var(--app-accent)] shadow-[0_0_0_9999px_rgba(0,0,0,0.5)]',
                  reducedMotion ? '' : 'animate-pulse'
                )} />
                <div className="absolute -top-8 left-1/2 -translate-x-1/2 px-2 py-1 bg-[var(--app-accent)] text-[var(--app-accent-text)] text-xs rounded whitespace-nowrap">
                  {currentStep?.spotlight?.position || 'Focus here'}
                </div>
              </div>
            );
          })()}
        </div>
      )}

      <div className="p-4 rounded-lg bg-[var(--app-surface)] border border-[var(--app-line)]">
        {renderStepContent()}
      </div>

      <div className="flex items-center justify-between pt-2">
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={handleReset} 
          data-testid="step-reset-topic"
          aria-label="Restart this topic from the beginning"
        >
          Restart Topic
        </Button>
        <span className="text-xs text-[var(--app-muted)]" aria-hidden="true">
          {currentStep.type === 'action' ? 'Action' : 
           currentStep.type === 'explanation' ? 'Explanation' :
           currentStep.type === 'validation' ? 'Validation' : 'Other'}
        </span>
      </div>
    </div>
  );
}
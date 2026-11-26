import { useState, useEffect, useCallback, useRef } from 'react';
import { useHelp, useHelpAnalytics } from '@/hooks';
import { InteractiveExample, createInteractiveExample, ComponentSandbox, createComponentSandbox, type InteractiveDemoConfig } from '@notention/core/help';
import { Button } from '../ui/Button';
import { cn } from '../../utils/ui';
import { 
  PlayIcon, PauseIcon, StopIcon, RefreshIcon, 
  CheckCircleIcon, AlertCircleIcon, CodeIcon, 
  ChevronLeftIcon, ChevronRightIcon
} from '../ui/icons';
import type { HelpTopic } from '@notention/core/help';

export interface HelpInteractiveDemoProps {
  className?: string;
  topicId?: string;
}

export function HelpInteractiveDemo({ className, topicId }: HelpInteractiveDemoProps) {
  const { currentTopic, recordEvent } = useHelp();
  const { trackDemoStart, trackDemoStep, trackDemoComplete } = useHelpAnalytics();
  
  const [demo, setDemo] = useState<InteractiveExample | null>(null);
  const [sandbox, setSandbox] = useState<ComponentSandbox | null>(null);
  const [mounted, setMounted] = useState(false);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [completedSteps, setCompletedSteps] = useState<Set<string>>(new Set());
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const topic = topicId ? currentTopic : undefined;
  const demoConfig = topic?.interactiveDemo;
  const validationSteps = demoConfig?.validationSteps ?? [];
  const currentValidationStep = validationSteps[currentStepIndex];

  useEffect(() => {
    if (demoConfig && !demo) {
      const interactiveDemo = createInteractiveExample();
      const componentSandbox = createComponentSandbox();
      setDemo(interactiveDemo);
      setSandbox(componentSandbox);

      const unsubscribeStepStart = interactiveDemo.subscribe('onStepStart', (step, index) => {
        setCurrentStepIndex(index);
        setRunning(true);
        setError(null);
      });

      const unsubscribeStepComplete = interactiveDemo.subscribe('onStepComplete', (step, index, success) => {
        if (success) {
          setCompletedSteps(prev => new Set([...prev, step.id]));
        }
        if (index === validationSteps.length - 1 && success) {
          setRunning(false);
          trackDemoComplete(topic?.id ?? '', demoConfig.component);
          recordEvent({ type: 'demo_complete', topicId: topic?.id, metadata: { demoId: demoConfig.component } });
        }
      });

      const unsubscribeError = interactiveDemo.subscribe('onError', (err) => {
        setError(err);
        setRunning(false);
      });

      interactiveDemo.loadDemo(demoConfig).then(() => {
        setMounted(true);
        trackDemoStart(topic?.id ?? '', demoConfig.component);
        recordEvent({ type: 'demo_start', topicId: topic?.id, metadata: { demoId: demoConfig.component } });
      });

      return () => {
        unsubscribeStepStart();
        unsubscribeStepComplete();
        unsubscribeError();
        interactiveDemo.destroy();
        componentSandbox.unmount();
      };
    }
  }, [demoConfig, demo, topic?.id, validationSteps.length, trackDemoStart, trackDemoComplete, recordEvent]);

  useEffect(() => {
    if (sandbox && containerRef.current && mounted) {
      sandbox.mount(containerRef.current, {
        component: demoConfig!.component,
        props: demoConfig!.props,
        onChange: (props) => {
          // Handle prop changes if needed
        },
      });
    }
    return () => {
      if (sandbox) sandbox.unmount();
    };
  }, [sandbox, mounted, demoConfig]);

  const handleStart = useCallback(async () => {
    if (!demo || !currentValidationStep) return;
    setError(null);
    const result = await demo.executeStep(currentStepIndex);
    if (!result.success && result.error) {
      setError(result.error);
    }
  }, [demo, currentValidationStep]);

  const handleNext = useCallback(async () => {
    if (!demo) return;
    const nextIndex = currentStepIndex + 1;
    if (nextIndex < validationSteps.length) {
      setCurrentStepIndex(nextIndex);
      setError(null);
      const result = await demo.executeStep(nextIndex);
      if (!result.success && result.error) {
        setError(result.error);
      }
    }
  }, [demo, currentStepIndex, validationSteps.length]);

  const handlePrevious = useCallback(() => {
    if (currentStepIndex > 0) {
      setCurrentStepIndex(prev => prev - 1);
      setError(null);
    }
  }, [currentStepIndex]);

  const handleReset = useCallback(() => {
    if (demo) {
      demo.reset();
      setCurrentStepIndex(0);
      setCompletedSteps(new Set());
      setRunning(false);
      setError(null);
      trackDemoStart(topic?.id ?? '', demoConfig!.component);
      recordEvent({ type: 'demo_start', topicId: topic?.id, metadata: { demoId: demoConfig!.component } });
    }
  }, [demo, demoConfig, topic?.id, trackDemoStart, recordEvent]);

  const progress = validationSteps.length > 0 ? ((currentStepIndex + 1) / validationSteps.length) * 100 : 0;

  if (!demoConfig) {
    return null;
  }

  return (
    <div className={cn('help-interactive-demo space-y-4', className)}>
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-semibold text-[var(--app-text)]">Interactive Demo</h3>
          <p className="text-sm text-[var(--app-text-secondary)]">
            {demoConfig.instructions[currentStepIndex] || 'Follow the steps to complete the demo'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-32 h-1.5 bg-[var(--app-line)] rounded-full overflow-hidden">
            <div 
              className="h-full bg-[var(--app-accent)] transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
          <span className="text-sm text-[var(--app-muted)]">
            {currentStepIndex + 1} / {validationSteps.length}
          </span>
        </div>
      </div>

      {error && (
        <div className="p-3 rounded-lg bg-[var(--color-error-soft)] border border-[var(--color-error)] flex items-center gap-2">
          <AlertCircleIcon className="w-5 h-5 text-[var(--color-error)] flex-shrink-0" />
          <span className="text-sm text-[var(--color-error-text)]">{error}</span>
        </div>
      )}

      <div 
        ref={containerRef}
        className="border border-[var(--app-line)] rounded-lg overflow-hidden bg-[var(--app-surface)] min-h-[300px]"
        data-testid="interactive-demo-container"
      >
        {!mounted && (
          <div className="flex items-center justify-center h-full">
            <div className="animate-spin rounded-full h-8 w-8 border-2 border-[var(--app-accent)] border-t-transparent" />
          </div>
        )}
      </div>

      <div className="flex items-center justify-between">
        <div className="flex gap-2">
          <Button 
            variant="secondary" 
            size="sm"
            onClick={handlePrevious}
            disabled={currentStepIndex === 0 || running}
            data-testid="demo-prev"
          >
            <ChevronLeftIcon className="w-4 h-4 mr-1" />
            Back
          </Button>
          <Button 
            variant={running ? 'secondary' : 'primary'}
            size="sm"
            onClick={running ? undefined : handleStart}
            disabled={running}
            data-testid={running ? 'demo-running' : 'demo-start'}
          >
            {running ? (
              <>
                <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin mr-2" />
                Running...
              </>
            ) : currentValidationStep ? (
              <>
                <PlayIcon className="w-4 h-4 mr-1" />
                Run Step {currentStepIndex + 1}
              </>
            ) : (
              <PlayIcon className="w-4 h-4 mr-1" />
            )}
          </Button>
          <Button 
            variant="secondary" 
            size="sm"
            onClick={handleNext}
            disabled={currentStepIndex >= validationSteps.length - 1 || running}
            data-testid="demo-next"
          >
            Next <ChevronRightIcon className="w-4 h-4 ml-1" />
          </Button>
        </div>
        <Button variant="ghost" size="sm" onClick={handleReset} data-testid="demo-reset">
          <RefreshIcon className="w-4 h-4 mr-1" />
          Reset
        </Button>
      </div>

      <div className="flex flex-wrap gap-2">
        {validationSteps.map((step, index) => (
          <button
            key={step.id}
            onClick={() => !running && setCurrentStepIndex(index)}
            disabled={running}
            className={cn(
              'px-3 py-1 rounded text-sm transition-colors',
              'border border-[var(--app-line)]',
              completedSteps.has(step.id) && 'bg-[var(--color-success-soft)] text-[var(--color-success)] border-[var(--color-success)]',
              index === currentStepIndex && !completedSteps.has(step.id) && 'bg-[var(--app-accent-soft)] text-[var(--app-accent)] border-[var(--app-accent)]',
              !completedSteps.has(step.id) && index !== currentStepIndex && 'bg-[var(--app-surface)] text-[var(--app-text-secondary)] hover:bg-[var(--app-raised)]'
            )}
            data-testid={`demo-step-${step.id}`}
          >
            {completedSteps.has(step.id) ? <CheckCircleIcon className="w-4 h-4 inline mr-1" /> : index + 1}
            {step.title}
          </button>
        ))}
      </div>

      <div className="pt-2 border-t border-[var(--app-line)]">
        <details className="group">
          <summary className="flex items-center gap-2 text-sm text-[var(--app-text-secondary)] cursor-pointer">
            <CodeIcon className="w-4 h-4" />
            Demo Configuration
          </summary>
          <div className="mt-2 p-3 bg-[var(--app-surface)] rounded text-xs text-[var(--app-muted)] font-mono">
            <pre>{JSON.stringify(demoConfig.props, null, 2)}</pre>
          </div>
        </details>
      </div>
    </div>
  );
}

export default HelpInteractiveDemo;

import { useState, useCallback } from 'react';
import { useSettings } from '@/hooks/useSettingsContext';
import { useHelp } from '@/hooks/useHelp';
import { Button } from '../ui/Button';
import { cn } from '../../utils/ui';
import { ChevronRightIcon, CheckCircleIcon, XIcon, SparklesIcon } from '../ui/icons';

interface SettingsWizardProps {
  onComplete: () => void;
  onSkip: () => void;
}

const WIZARD_STEPS = [
  {
    id: 'welcome',
    title: 'Welcome to Notention',
    description: 'Let\'s set up your workspace in a few quick steps.',
    icon: SparklesIcon,
  },
  {
    id: 'theme',
    title: 'Choose Your Theme',
    description: 'Select your preferred appearance.',
    icon: null,
    settings: ['theme', 'density'],
  },
  {
    id: 'ai',
    title: 'AI Features',
    description: 'Enable AI-powered features for smarter note-taking.',
    icon: null,
    settings: ['aiEnabled', 'aiProvider'],
  },
  {
    id: 'network',
    title: 'Network (Optional)',
    description: 'Connect to Nostr relays to discover and share notes.',
    icon: null,
    settings: ['nostr'],
    optional: true,
  },
  {
    id: 'shortcuts',
    title: 'Essential Shortcuts',
    description: 'Learn the key shortcuts to navigate efficiently.',
    icon: null,
    helpTopics: ['keyboard-shortcuts-reference'],
  },
  {
    id: 'complete',
    title: 'You\'re All Set!',
    description: 'Start capturing notes and building your knowledge graph.',
    icon: SparklesIcon,
  },
];

export function SettingsWizard({ onComplete, onSkip }: SettingsWizardProps) {
  const { settings, setSettings } = useSettings();
  const { setCurrentTopic } = useHelp();
  const [currentStep, setCurrentStep] = useState(0);
  const [completedSteps, setCompletedSteps] = useState<Set<string>>(new Set());

  const step = WIZARD_STEPS[currentStep];
  const isFirstStep = currentStep === 0;
  const isLastStep = currentStep === WIZARD_STEPS.length - 1;
  const progress = ((currentStep + 1) / WIZARD_STEPS.length) * 100;

  const handleNext = useCallback(() => {
    if (currentStep < WIZARD_STEPS.length - 1) {
      setCompletedSteps(prev => new Set([...prev, WIZARD_STEPS[currentStep].id]));
      setCurrentStep(prev => prev + 1);
    } else {
      onComplete();
    }
  }, [currentStep, onComplete]);

  const handleBack = useCallback(() => {
    if (currentStep > 0) {
      setCurrentStep(prev => prev - 1);
    }
  }, [currentStep]);

  const handleSkip = useCallback(() => {
    onSkip();
  }, [onSkip]);

  const handleSettingChange = useCallback((key: string, value: unknown) => {
    setSettings({ [key]: value } as any);
  }, [setSettings]);

  const renderStepContent = () => {
    switch (step.id) {
      case 'welcome':
        return (
          <div className="text-center py-8">
            {step.icon && <step.icon className="w-16 h-16 mx-auto mb-4 text-[var(--app-accent)]" aria-hidden="true" />}
            <h3 className="text-base font-bold text-[var(--app-text)] mb-2">{step.title}</h3>
            <p className="text-[var(--app-text-secondary)] max-w-md mx-auto">{step.description}</p>
          </div>
        );

      case 'theme':
        return (
          <div className="space-y-6">
            <h3 className="text-sm font-medium text-[var(--app-text)]">Theme</h3>
            <div className="grid grid-cols-3 gap-3">
              {['dark', 'light', 'system'].map(theme => (
                <button
                  key={theme}
                  onClick={() => handleSettingChange('theme', theme)}
                  className={cn(
                    'p-4 rounded-lg border-2 transition-all',
                    settings.theme === theme
                      ? 'border-[var(--app-accent)] bg-[var(--app-accent-soft)]'
                      : 'border-[var(--app-line)] hover:border-[var(--app-accent-line)]'
                  )}
                  data-testid={`wizard-theme-${theme}`}
                >
                  <div className="font-medium capitalize">{theme}</div>
                  <div className="text-sm text-[var(--app-muted)] mt-1">
                    {theme === 'dark' && 'Dark mode'}
                    {theme === 'light' && 'Light mode'}
                    {theme === 'system' && 'Follow system'}
                  </div>
                </button>
              ))}
            </div>
            
            <h3 className="text-sm font-medium text-[var(--app-text)] mt-6">Density</h3>
            <div className="grid grid-cols-3 gap-3">
              {['compact', 'comfortable', 'spacious'].map(density => (
                <button
                  key={density}
                  onClick={() => handleSettingChange('density', density)}
                  className={cn(
                    'p-4 rounded-lg border-2 transition-all',
                    settings.density === density
                      ? 'border-[var(--app-accent)] bg-[var(--app-accent-soft)]'
                      : 'border-[var(--app-line)] hover:border-[var(--app-accent-line)]'
                  )}
                  data-testid={`wizard-density-${density}`}
                >
                  <div className="font-medium capitalize">{density}</div>
                </button>
              ))}
            </div>
          </div>
        );

      case 'ai':
        return (
          <div className="space-y-6">
            <h3 className="text-sm font-medium text-[var(--app-text)]">AI Assistance</h3>
            <label className="flex items-center gap-3 p-4 rounded-lg border border-[var(--app-line)] cursor-pointer">
              <input
                type="checkbox"
                checked={settings.aiEnabled}
                onChange={e => handleSettingChange('aiEnabled', e.target.checked)}
                className="w-5 h-5 rounded border-[var(--app-line)] bg-[var(--app-surface)] focus:ring-2 focus:ring-[var(--app-accent)]"
                data-testid="wizard-ai-enabled"
              />
              <div>
                <div className="font-medium">Enable AI features</div>
                <div className="text-sm text-[var(--app-muted)]">Smart suggestions, auto-tagging, and Describe It</div>
              </div>
            </label>

            {settings.aiEnabled && (
              <div>
                <h4 className="font-medium text-[var(--app-text)] mb-3">AI Provider</h4>
                <div className="space-y-2">
                  {['local', 'gemini', 'openai'].map(provider => (
                    <label key={provider} className="flex items-center gap-3 p-3 rounded-lg border cursor-pointer">
                      <input
                        type="radio"
                        name="aiProvider"
                        value={provider}
                        checked={settings.aiProvider === provider}
                        onChange={e => handleSettingChange('aiProvider', e.target.value)}
                        className="w-4 h-4 border-[var(--app-line)] focus:ring-2 focus:ring-[var(--app-accent)]"
                      />
                      <div className="capitalize">{provider}</div>
                    </label>
                  ))}
                </div>
              </div>
            )}
          </div>
        );

      case 'network':
        return (
          <div className="space-y-6">
            <h3 className="text-sm font-medium text-[var(--app-text)]">Nostr Network</h3>
            <p className="text-[var(--app-text-secondary)]">Connect to relays to discover and share notes with others.</p>
            <label className="flex items-center gap-3 p-4 rounded-lg border border-[var(--app-line)] cursor-pointer">
              <input
                type="checkbox"
                checked={settings.nostr?.privkey !== null}
                onChange={e => handleSettingChange('nostr.privkey', e.target.checked ? 'generate' : null)}
                className="w-5 h-5 rounded border-[var(--app-line)] bg-[var(--app-surface)] focus:ring-2 focus:ring-[var(--app-accent)]"
              />
              <div>
                <div className="font-medium">Generate Nostr identity</div>
                <div className="text-sm text-[var(--app-muted)]">Create a keypair for encrypted communication</div>
              </div>
            </label>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setCurrentTopic('connect-network')}
              className="w-full"
              leftIcon={<SparklesIcon className="w-4 h-4" />}
            >
              Learn more about Network
            </Button>
          </div>
        );

      case 'shortcuts':
        return (
          <div className="space-y-4">
            <h3 className="text-sm font-medium text-[var(--app-text)]">Essential Shortcuts</h3>
            <div className="space-y-2">
              {[
                { keys: '⌘N', desc: 'New note' },
                { keys: '⌘K', desc: 'Command palette' },
                { keys: '⌘/', desc: 'Search notes' },
                { keys: '⌘H', desc: 'Open Help' },
                { keys: '⌘⇧/', desc: 'Describe It' },
                { keys: '?', desc: 'Keyboard shortcuts' },
              ].map((shortcut, i) => (
                <div key={i} className="flex items-center justify-between p-3 rounded-lg bg-[var(--app-surface)] border border-[var(--app-line)]">
                  <kbd className="font-mono text-sm px-2 py-1 bg-[var(--app-raised)] rounded border border-[var(--app-line)]">
                    {shortcut.keys}
                  </kbd>
                  <span className="text-[var(--app-text-secondary)]">{shortcut.desc}</span>
                </div>
              ))}
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setCurrentTopic('keyboard-shortcuts-reference')}
              className="w-full"
              leftIcon={<SparklesIcon className="w-4 h-4" />}
            >
              View all shortcuts
            </Button>
          </div>
        );

      case 'complete':
        return (
          <div className="text-center py-8">
            {step.icon && <step.icon className="w-16 h-16 mx-auto mb-4 text-[var(--color-success)]" aria-hidden="true" />}
            <h3 className="text-base font-bold text-[var(--app-text)] mb-2">{step.title}</h3>
            <p className="text-[var(--app-text-secondary)] max-w-md mx-auto mb-6">{step.description}</p>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setCurrentTopic('create-first-note')}
              leftIcon={<SparklesIcon className="w-4 h-4" />}
            >
              Create your first note
            </Button>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className={cn('settings-wizard animate-slide-in-from-bottom', 'fixed inset-0 z-50 flex items-center justify-center p-4')}>
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={handleSkip} aria-hidden="true" />
      
      <div className="relative w-full max-w-md rounded-xl border border-[var(--app-line)] bg-[var(--app-panel)] shadow-[var(--app-shadow)] overflow-hidden animate-scale-in-bounce">
        <div className="flex items-center justify-between p-4 border-b border-[var(--app-line)]">
          <h2 className="font-semibold text-[var(--app-text)]">Setup Wizard</h2>
          {!isFirstStep && !isLastStep && (
            <button
              onClick={handleSkip}
              className="text-sm text-[var(--app-muted)] hover:text-[var(--app-text)] transition-colors"
              data-testid="wizard-skip"
            >
              Skip
            </button>
          )}
        </div>

        <div className="px-4 py-3 border-b border-[var(--app-line)]">
          <div className="flex items-center gap-2 mb-2">
            {WIZARD_STEPS.map((s, i) => (
              <div key={s.id} className="flex items-center gap-1 flex-1">
                <div
                  className={cn(
                    'h-1 rounded-full transition-all',
                    i < currentStep ? 'bg-[var(--color-success)]' :
                    i === currentStep ? 'bg-[var(--app-accent)]' :
                    'bg-[var(--app-line)]'
                  )}
                  style={{ flex: 1 }}
                />
                {i < WIZARD_STEPS.length - 1 && <div className="w-px h-px" />}
              </div>
            ))}
          </div>
          <div className="text-xs text-[var(--app-muted)]">
            Step {currentStep + 1} of {WIZARD_STEPS.length}
          </div>
        </div>

        <div className="p-6 max-h-[60vh] overflow-y-auto">
          {renderStepContent()}
        </div>

        <div className="flex items-center justify-between p-4 border-t border-[var(--app-line)] bg-[var(--app-surface)]">
          {!isFirstStep && (
            <Button variant="secondary" onClick={handleBack} data-testid="wizard-back">
              Back
            </Button>
          )}
          <div className="flex gap-2">
            {isLastStep ? (
              <Button onClick={handleNext} data-testid="wizard-finish">
                Get Started
              </Button>
            ) : (
              <Button onClick={handleNext} data-testid="wizard-next">
                Next <ChevronRightIcon className="w-4 h-4 ml-1" />
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
import React from 'react';
import {useSettings} from '../../hooks/useSettingsContext';
import {useView} from '../../hooks/useViewContext';
import {useNotes} from '../../hooks/useNotes';
import {Button} from './Button';
import {CheckCircleIcon, XCircleIcon, ArrowRightIcon, SparklesIcon, NoteIcon, NetworkIcon, CheckIcon} from './icons';
import {cn} from '../../utils/ui';

export function OnboardingChecklist() {
    const {settings, setSettings} = useSettings();
    const {activeView, setActiveView} = useView();
    const {notes} = useNotes();

    const onboarding = settings.onboarding ?? {
        completed: false,
        step: 1,
        captureCompleted: false,
        matchCompleted: false,
        actionCompleted: false,
        dismissed: false,
    };

    if (onboarding.completed || onboarding.dismissed) {
        return null;
    }

    const hasNotes = notes.length > 0;
    const hasMatch = notes.some(n => n.properties.some(p => p.key === 'intent' && p.values.includes('request')))
        && notes.some(n => n.properties.some(p => p.key === 'intent' && p.values.includes('offer')));

    const steps = [
        {
            id: 1,
            title: 'Capture a note',
            description: 'Press ⌘N or click "New Note" to create your first note. Try natural language like "Buy milk under $5"',
            completed: onboarding.captureCompleted,
            action: () => setActiveView('inbox'),
            actionLabel: 'Start capturing',
            icon: NoteIcon,
        },
        {
            id: 2,
            title: 'See a match',
            description: 'Create a request note (with intent:request) and an offer note (with intent:offer). They\'ll match automatically.',
            completed: onboarding.matchCompleted,
            action: () => setActiveView('inbox'),
            actionLabel: 'View matches',
            icon: NetworkIcon,
        },
        {
            id: 3,
            title: 'Take action',
            description: 'When a match appears, click "Respond" to create a response note that connects them.',
            completed: onboarding.actionCompleted,
            action: () => setActiveView('inbox'),
            actionLabel: 'Try responding',
            icon: CheckIcon,
        },
    ];

    const currentStepIndex = steps.findIndex(s => !s.completed);
    const currentStep = currentStepIndex >= 0 ? steps[currentStepIndex] : steps[steps.length - 1];
    const allCompleted = steps.every(s => s.completed);

    const updateOnboarding = (updates: Partial<typeof onboarding>) => {
        setSettings(s => ({
            ...s,
            onboarding: {
                ...onboarding,
                ...updates,
                completed: allCompleted,
                step: currentStepIndex + 1,
            },
        }));
    };

    const handleDismiss = () => {
        updateOnboarding({dismissed: true});
    };

    const handleCompleteStep = (stepId: number) => {
        const stepUpdates: Partial<typeof onboarding> = {};
        if (stepId === 1) stepUpdates.captureCompleted = true;
        if (stepId === 2) stepUpdates.matchCompleted = true;
        if (stepId === 3) stepUpdates.actionCompleted = true;
        updateOnboarding(stepUpdates);
    };

    return (
        <div className="fixed bottom-6 right-6 z-50 w-full max-w-md animate-slide-in-right" role="region" aria-label="Onboarding checklist">
            <div className="bg-gray-900/95 backdrop-blur-sm border border-gray-700/50 rounded-2xl shadow-2xl overflow-hidden">
                <div className="flex items-center justify-between p-4 border-b border-gray-700/50">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-purple-500/10 rounded-xl">
                            <SparklesIcon className="w-5 h-5 text-purple-400"/>
                        </div>
                        <div>
                            <h3 className="font-bold text-white">Welcome to Notention</h3>
                            <p className="text-xs text-gray-400">Three steps to get started</p>
                        </div>
                    </div>
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={handleDismiss}
                        className="text-gray-400 hover:text-gray-200"
                        aria-label="Dismiss onboarding"
                    >
                        <XCircleIcon className="w-5 h-5"/>
                    </Button>
                </div>

                <div className="p-4 space-y-3 max-h-96 overflow-y-auto">
                    {steps.map((step, index) => {
                        const isCurrent = index === currentStepIndex;
                        const isCompleted = step.completed;

                        return (
                            <div
                                key={step.id}
                                className={cn(
                                    'flex items-start gap-3 p-3 rounded-xl transition-all',
                                    isCompleted
                                        ? 'bg-green-500/5 border border-green-500/20'
                                        : isCurrent
                                        ? 'bg-purple-500/5 border border-purple-500/20 ring-1 ring-purple-500/20'
                                        : 'bg-gray-800/50 border border-gray-700/50 opacity-60'
                                )}
                            >
                                <div className={cn(
                                    'flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold',
                                    isCompleted
                                        ? 'bg-green-500 text-white'
                                        : isCurrent
                                        ? 'bg-purple-500 text-white'
                                        : 'bg-gray-700 text-gray-400'
                                )}>
                                    {isCompleted ? (
                                        <CheckCircleIcon className="w-5 h-5"/>
                                    ) : (
                                        step.id
                                    )}
                                </div>

                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 mb-1">
                                        <step.icon className={cn('w-4 h-4', isCurrent ? 'text-purple-400' : 'text-gray-400')} aria-hidden="true"/>
                                        <h4 className={cn('font-medium text-sm', isCompleted ? 'text-gray-300 line-through' : 'text-white')}>
                                            {step.title}
                                        </h4>
                                        {isCurrent && (
                                            <span className="text-xs px-1.5 py-0.5 bg-purple-500/10 text-purple-300 rounded-full">
                                                Current
                                            </span>
                                        )}
                                    </div>
                                    <p className="text-xs text-gray-400 mb-2">{step.description}</p>
                                    {!isCompleted && (
                                        <Button
                                            variant="primary"
                                            size="sm"
                                            onClick={() => {
                                                step.action();
                                                handleCompleteStep(step.id);
                                            }}
                                            className="touch-target-48"
                                            leftIcon={<ArrowRightIcon className="w-3 h-3"/>}
                                        >
                                            {step.actionLabel}
                                        </Button>
                                    )}
                                </div>
                            </div>
                        );
                    })}

                    {allCompleted && (
                        <div className="flex items-center justify-center gap-3 p-4 bg-green-500/5 border border-green-500/20 rounded-xl animate-fade-in-up">
                            <CheckCircleIcon className="w-6 h-6 text-green-400"/>
                            <span className="font-medium text-green-300">All done! You're ready to use Notention.</span>
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => updateOnboarding({completed: true})}
                            >
                                Close
                            </Button>
                        </div>
                    )}
                </div>

                <div className="flex items-center justify-between px-4 py-3 border-t border-gray-700/50 bg-gray-950/50">
                    <div className="flex items-center gap-2">
                        {steps.map((_, index) => (
                            <div
                                key={index}
                                className={cn(
                                    'w-2 h-2 rounded-full transition-all',
                                    index < currentStepIndex
                                        ? 'bg-green-500'
                                        : index === currentStepIndex
                                        ? 'bg-purple-500 w-6'
                                        : 'bg-gray-700'
                                )}
                            />
                        ))}
                    </div>
                    <span className="text-xs text-gray-500">
                        Step {Math.min(currentStepIndex + 1, steps.length)} of {steps.length}
                    </span>
                </div>
            </div>
        </div>
    );
}

export interface OnboardingStep {
    id: string;
    title: string;
    description: string;
    isCompleted: boolean;
    isRequired: boolean;
}

export interface SetupConfiguration {
    privacyLevel: 'local-only' | 'shared-network';
    enableBrowserAutomation: boolean;
    enableFileAccess: boolean;
    userName?: string;
}

export interface WizardState {
    currentStepIndex: number;
    steps: OnboardingStep[];
    config: SetupConfiguration;
    isComplete: boolean;
}

export const DEFAULT_STEPS: OnboardingStep[] = [
    {
        id: 'welcome',
        title: 'Welcome to Notention',
        description: 'Discover how Notention bridges your thinking and doing.',
        isCompleted: false,
        isRequired: true,
    },
    {
        id: 'privacy',
        title: 'Privacy Settings',
        description: 'Configure how your data is handled.',
        isCompleted: false,
        isRequired: true,
    },
    {
        id: 'capabilities',
        title: 'System Capabilities',
        description: 'Detect and enable available integrations.',
        isCompleted: false,
        isRequired: true,
    },
    {
        id: 'finalize',
        title: 'All Set',
        description: 'Initialize your workspace.',
        isCompleted: false,
        isRequired: true,
    },
];

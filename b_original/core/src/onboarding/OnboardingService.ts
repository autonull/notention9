import { DEFAULT_STEPS, SetupConfiguration, WizardState } from './types';
import { Note } from '../types';

export class OnboardingService {
    private state: WizardState;

    constructor(initialConfig?: Partial<SetupConfiguration>) {
        this.state = {
            currentStepIndex: 0,
            steps: [...DEFAULT_STEPS],
            config: {
                privacyLevel: 'local-only',
                enableBrowserAutomation: false,
                enableFileAccess: false,
                ...initialConfig,
            },
            isComplete: false,
        };
    }

    getState(): WizardState {
        return this.state;
    }

    updateConfig(updates: Partial<SetupConfiguration>): void {
        this.state.config = { ...this.state.config, ...updates };
    }

    completeStep(stepId: string): void {
        const step = this.state.steps.find((s) => s.id === stepId);
        if (step) {
            step.isCompleted = true;
            this.checkCompletion();
        }
    }

    nextStep(): void {
        if (this.state.currentStepIndex < this.state.steps.length - 1) {
            this.state.currentStepIndex++;
        }
    }

    prevStep(): void {
        if (this.state.currentStepIndex > 0) {
            this.state.currentStepIndex--;
        }
    }

    private checkCompletion(): void {
        const allRequiredComplete = this.state.steps
            .filter((s) => s.isRequired)
            .every((s) => s.isCompleted);

        if (allRequiredComplete && this.state.currentStepIndex === this.state.steps.length - 1) {
            // Logic for finalization could go here or be triggered explicitly
            this.state.isComplete = true;
        }
    }

    // Generate the configuration note content based on current selections
    generateConfigNoteContent(): string {
        return `
# System Configuration
@config:active
@version:1.0

## Privacy
[privacy:level:${this.state.config.privacyLevel}]

## Capabilities
[capability:browser:${this.state.config.enableBrowserAutomation}]
[capability:files:${this.state.config.enableFileAccess}]
${this.state.config.userName ? `[user:name:${this.state.config.userName}]` : ''}
     `.trim();
    }
}

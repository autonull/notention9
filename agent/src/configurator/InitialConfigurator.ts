import { Note, createNote } from '@notention/core';

export class InitialConfigurator {
    /**
     * Checks if the system has been initialized.
     * In a real implementation, this might query the database for @config:active notes.
     */
    async isInitialized(notes: Note[]): Promise<boolean> {
        return notes.some(note => note.tags.includes('@config:active'));
    }

    /**
     * Creates the initial onboarding note to trigger the setup wizard.
     */
    createOnboardingTriggerNote(): Note {
        return createNote({
            title: 'Welcome to Notention',
            content: 'Click here to start the setup wizard.\n\n[action:setup_wizard]',
            tags: ['@onboarding:setup'],
            source: {
                type: 'import',
                identifier: 'initial-configurator',
                timestamp: Date.now()
            }
        });
    }

    /**
     * Detects system capabilities.
     * In a real implementation, this would check environment variables or try accessing APIs.
     */
    async detectCapabilities(): Promise<{ browser: boolean; fileAccess: boolean }> {
        // Mock detection logic for now
        const hasBrowser = true; // Assume true for this environment
        const hasFileAccess = true; // Assume true for local app

        return {
            browser: hasBrowser,
            fileAccess: hasFileAccess
        };
    }

    /**
     * Generates the default ontology note.
     */
    createDefaultOntologyNote(): Note {
        return createNote({
            title: 'Base Ontology',
            content: `
# Base Ontology
@ontology:base
@version:1.0

[field:status:options:todo,in-progress,done]
[field:priority:range:0-1]
      `.trim(),
            tags: ['@ontology:base'],
            source: {
                type: 'import',
                identifier: 'initial-configurator',
                timestamp: Date.now()
            }
        });
    }
}

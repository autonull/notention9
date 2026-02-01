import React, { useState, useEffect } from 'react';
import { SetupWizard } from './SetupWizard';
import { OnboardingService, SetupConfiguration, Note, createNote } from '@notention/core';
import { useNotes } from '../../hooks/useNotes'; // Assuming this hook exists or similar state management

interface OnboardingModalProps {
    // Mechanism to close or check status could be passed here
}

export const OnboardingModal: React.FC<OnboardingModalProps> = () => {
    const [isOpen, setIsOpen] = useState(false);
    const [service] = useState(new OnboardingService());
    const { notes, addNote } = useNotes();

    useEffect(() => {
        // Check if configuration already exists
        const hasConfig = notes.some(n => n.tags.includes('@config:active'));
        // Check if onboarding trigger exists
        const hasTrigger = notes.some(n => n.tags.includes('@onboarding:setup'));

        // Open if triggered explicitly OR if no config exists (and we want to force it)
        // For now, let's respect the trigger or if it's completely empty?
        // The plan said "@onboarding:setup" notes trigger the wizard.
        if (hasTrigger && !hasConfig) {
            setIsOpen(true);
        }
        // Also optional: if NO notes exist at all, maybe trigger?
        // if (notes.length === 0) setIsOpen(true);

    }, [notes]);

    const handleComplete = (config: SetupConfiguration) => {
        // Generate the config note
        const configContent = service.generateConfigNoteContent();

        // Create the @config:active note
        const configNote = createNote({
            title: 'System Configuration',
            content: configContent,
            tags: ['@config:active'],
            source: {
                type: 'system',
                identifier: 'setup-wizard',
                timestamp: Date.now()
            }
        });

        // Create @ontology:base note if it doesn't exist
        // (This Logic could be moved to InitialConfigurator agent, but for UI simplicity we do it here or call agent)
        // Since UI can't directly call "Agent classes" if they run on backend, we typically create notes.
        // But here we are just adding notes to the local store which syncs.

        addNote(configNote);

        // Archive or remove the trigger note?
        // In a real app we'd find the trigger note and delete it or tag it done.

        setIsOpen(false);
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 backdrop-blur-sm p-4">
            <SetupWizard onComplete={handleComplete} service={service} />
        </div>
    );
};

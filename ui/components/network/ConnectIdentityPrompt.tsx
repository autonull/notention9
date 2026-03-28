import React from 'react';
import { KeyIcon, SettingsIcon } from '../common/icons';
import { Button } from '../common/Button';

interface ConnectIdentityPromptProps {
    onNavigateToSettings: () => void;
}

export function ConnectIdentityPrompt({ onNavigateToSettings }: ConnectIdentityPromptProps) {
    return (
        <div className="p-8 h-full flex flex-col items-center justify-center text-center bg-gray-800/50 rounded-lg">
            <KeyIcon className="h-16 w-16 text-yellow-500 mb-4" />
            <h2 className="text-2xl font-bold text-white mb-2">
                Connect your Nostr Identity
            </h2>
            <p className="text-gray-400 mb-6 max-w-md">
                A Nostr identity is required to publish notes and interact with the
                network. You can generate one in settings.
            </p>
            <Button
                onClick={onNavigateToSettings}
                variant="primary"
                size="lg"
                icon={SettingsIcon}
            >
                Go to Settings
            </Button>
        </div>
    );
};

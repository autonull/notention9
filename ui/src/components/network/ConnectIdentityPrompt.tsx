import React from 'react';
import {KeyIcon, SettingsIcon} from '../ui/icons';
import {Button} from '../ui/Button';

interface ConnectIdentityPromptProps {
    onNavigateToSettings: () => void;
    compact?: boolean;
}

export function ConnectIdentityPrompt({onNavigateToSettings, compact = false}: ConnectIdentityPromptProps) {
    if (compact) {
        return (
            <div className="flex flex-col sm:flex-row sm:items-center gap-3 rounded-2xl border border-yellow-500/20 bg-yellow-500/5 p-4">
                <KeyIcon className="h-6 w-6 text-yellow-500 flex-shrink-0"/>
                <div className="flex-1 min-w-0">
                    <h2 className="text-sm font-semibold text-white">Read-only public feed</h2>
                    <p className="text-xs text-neutral-400">Add an identity to publish, reply, or chat.</p>
                </div>
                <Button onClick={onNavigateToSettings} variant="primary" size="sm">
                    Add identity
                </Button>
            </div>
        );
    }

    return (
        <div className="p-8 h-full flex flex-col items-center justify-center text-center bg-neutral-800/50 rounded-lg">
            <KeyIcon className="h-16 w-16 text-yellow-500 mb-4"/>
            <h2 className="text-2xl font-bold text-white mb-2">
                Connect your Nostr Identity
            </h2>
            <p className="text-neutral-400 mb-6 max-w-md">
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

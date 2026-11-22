import React from 'react';
import {KeyIcon} from '../ui/icons';
import {Button} from '../ui/Button';

interface ConnectIdentityPromptProps {
    onNavigateToSettings: () => void;
}

/** The read-only public-feed state is one line, not a card. */
export function ConnectIdentityPrompt({onNavigateToSettings}: ConnectIdentityPromptProps) {
    return (
        <div className="flex min-w-0 flex-wrap items-center gap-x-2.5 gap-y-1.5 py-2">
            <KeyIcon className="h-4 w-4 shrink-0 text-amber-400"/>
            <span className="text-[13px] font-medium text-[var(--app-text)]">Read-only public feed</span>
            <span className="min-w-0 truncate text-[11px] text-[var(--app-muted)]">
                Add an identity to publish, reply, or chat.
            </span>
            <Button
                onClick={onNavigateToSettings}
                variant="secondary"
                size="xs"
                className="ml-auto"
            >
                Add identity
            </Button>
        </div>
    );
}

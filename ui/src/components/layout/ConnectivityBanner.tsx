import React from 'react';
import {useOnlineStatus} from '../../hooks/useOnlineStatus';
import {tone, toneClass} from '../../styles/tone';
import {cn} from '../../utils/ui';

export function ConnectivityBanner() {
    const {online, retry} = useOnlineStatus();

    if (online) return null;

    return (
        <div
            data-testid="offline-banner"
            className={cn('flex-shrink-0 flex items-center justify-center gap-3 border-b px-4 py-1.5 text-xs', toneClass('warning'))}
        >
            <span>You are offline. Notes stay on this device.</span>
            <button
                onClick={retry}
                className={cn('rounded border px-2 py-0.5 font-semibold hover:bg-[var(--app-hover)]', tone.warning.border, tone.warning.text)}
            >
                Retry
            </button>
        </div>
    );
}

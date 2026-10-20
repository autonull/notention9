import React from 'react';
import {useOnlineStatus} from '../../hooks/useOnlineStatus';

export function ConnectivityBanner() {
    const {online, retry} = useOnlineStatus();

    if (online) return null;

    return (
        <div
            data-testid="offline-banner"
            className="flex-shrink-0 flex items-center justify-center gap-3 border-b border-yellow-500/20 bg-yellow-500/10 px-4 py-1.5 text-xs text-yellow-200"
        >
            <span>You are offline. Notes stay on this device.</span>
            <button
                onClick={retry}
                className="rounded border border-yellow-500/30 px-2 py-0.5 font-semibold text-yellow-100 hover:bg-yellow-500/20"
            >
                Retry
            </button>
        </div>
    );
}

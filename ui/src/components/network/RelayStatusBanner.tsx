import React from 'react';
import {useRelayStatus} from '../../hooks/useRelayStatus';
import {Button} from '../common/Button';

interface RelayStatusBannerProps {
    relays?: string[];
}

export function RelayStatusBanner({relays}: RelayStatusBannerProps) {
    const {down, checking, retry} = useRelayStatus(relays);

    if (down.length === 0) return null;

    return (
        <div
            data-testid="relay-banner"
            className="mx-4 md:mx-6 mt-4 flex flex-wrap items-center gap-3 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-200"
        >
            <span>
                Relay unavailable: <span className="font-mono">{down.join(', ')}</span>. Local notes still work.
            </span>
            <Button size="xs" variant="secondary" onClick={retry} isLoading={checking}>
                Retry
            </Button>
        </div>
    );
}

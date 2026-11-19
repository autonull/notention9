import React from 'react';
import {useRelayStatus, type RelayStatus} from '../../hooks/useRelayStatus';
import {Button} from '../ui/Button';

interface RelayStatusBannerProps {
    relays?: string[];
    detailed?: boolean;
}

function RelayStatusItem({status}: {status: RelayStatus}) {
    const isUp = status.reachable;
    const healthScore = status.healthScore ?? 0.5;
    const healthColor = healthScore > 0.7 ? 'text-green-400' : healthScore > 0.4 ? 'text-yellow-400' : 'text-red-400';
    const healthBg = healthScore > 0.7 ? 'bg-green-500/10' : healthScore > 0.4 ? 'bg-yellow-500/10' : 'bg-red-500/10';

    return (
        <div className={`flex items-center gap-2 px-2 py-1.5 rounded border ${
            isUp
                ? 'bg-green-500/10 border-green-500/30 text-green-300'
                : 'bg-red-500/10 border-red-500/30 text-red-300'
        }`}>
            <div className={`w-2 h-2 rounded-full ${isUp ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`} />
            <span className="font-mono text-xs truncate max-w-[160px]">{status.url}</span>
            {isUp && status.latency && (
                <span className="text-xs text-gray-400">{status.latency}ms</span>
            )}
            {status.healthScore !== undefined && (
                <span className={`text-xs font-mono ${healthColor} ${healthBg} px-1.5 py-0.5 rounded`}>
                    {Math.round(status.healthScore * 100)}%
                </span>
            )}
            {status.healthLatency && status.healthSuccessRate !== undefined && (
                <span className="text-[10px] text-gray-500">
                    {status.healthLatency}ms / {status.healthSuccessRate}% ok
                </span>
            )}
            {!isUp && status.error && (
                <span className="text-xs text-gray-500">{status.error}</span>
            )}
        </div>
    );
}

export function RelayStatusBanner({relays, detailed = false}: RelayStatusBannerProps) {
    const {statuses, down, up, checking, retry} = useRelayStatus(relays);

    if (statuses.length === 0) return null;

    if (!detailed) {
        if (down.length === 0) return null;
        return (
            <div
                data-testid="relay-banner"
                className="mx-4 md:mx-6 mt-4 flex flex-wrap items-center gap-3 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-200"
            >
                <span>
                    Relay unavailable: <span className="font-mono">{down.join(', ')}</span>. Local notes still work.
                </span>
                <Button size="xs" variant="secondary" onClick={retry} loading={checking}>
                    Retry
                </Button>
            </div>
        );
    }

    const healthyCount = statuses.filter(s => (s.healthScore ?? 0.5) > 0.5).length;

    return (
        <div
            data-testid="relay-status-detailed"
            className="mx-4 md:mx-6 mt-4 rounded-lg border border-gray-700 bg-gray-900/50 p-4"
        >
            <div className="flex items-center justify-between mb-3">
                <h4 className="text-sm font-medium text-gray-200">Relay Status</h4>
                <Button size="xs" variant="secondary" onClick={retry} loading={checking}>
                    Retry All
                </Button>
            </div>
            <div className="grid gap-2 max-h-48 overflow-y-auto">
                {statuses.map(status => (
                    <RelayStatusItem key={status.url} status={status} />
                ))}
            </div>
            <div className="mt-3 flex items-center gap-4 text-xs text-gray-400 flex-wrap">
                <span className="flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-green-500" />
                    {up.length} connected
                </span>
                <span className="flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-red-500" />
                    {down.length} unreachable
                </span>
                <span className="flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-yellow-500" />
                    {healthyCount} healthy
                </span>
            </div>
        </div>
    );
}

import React from 'react';
import {CpuChipIcon, BrainIcon, GlobeIcon, WifiIcon} from '../ui/icons';
import {useBestProviderStatus} from '../../hooks/useExtractionStatus';
import {cn} from '../../utils/ui';

export function ExtractionStatusBadge() {
    const {status, providerName, providerKind} = useBestProviderStatus();

    if (status === 'unknown' || !providerName || providerName === 'none') return null;

    const isHeuristic = providerKind === 'heuristic';
    const isLocalModel = providerKind === 'local-model';
    const isRemote = providerKind === 'remote';

    const label = isHeuristic
        ? 'Local extraction (AI unavailable)'
        : isLocalModel
        ? 'Local model'
        : isRemote
        ? 'Remote model'
        : 'Unknown';

    const icon = isHeuristic ? <CpuChipIcon className="w-3 h-3" /> : isLocalModel ? <BrainIcon className="w-3 h-3" /> : <GlobeIcon className="w-3 h-3" />;

    const badgeClass = cn(
        'inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium transition-colors',
        isHeuristic && 'bg-amber-900/30 text-amber-300 border border-amber-800',
        isLocalModel && 'bg-green-900/30 text-green-300 border border-green-800',
        isRemote && 'bg-blue-900/30 text-blue-300 border border-blue-800'
    );

    return (
        <span className={badgeClass} title={label}>
            {icon}
            {providerName}
        </span>
    );
}

export function ExtractionStatusIndicator() {
    const {status, providerName, providerKind} = useBestProviderStatus();

    if (status === 'unknown' || !providerName || providerName === 'none') return null;

    const isHeuristic = providerKind === 'heuristic';
    const isLocalModel = providerKind === 'local-model';
    const isRemote = providerKind === 'remote';

    const colorClass = isHeuristic
        ? 'bg-amber-500'
        : isLocalModel
        ? 'bg-green-500'
        : isRemote
        ? 'bg-blue-500'
        : 'bg-gray-500';

    const label = isHeuristic
        ? 'Local extraction (AI unavailable)'
        : isLocalModel
        ? 'Local model'
        : isRemote
        ? 'Remote model'
        : 'Unknown';

    return (
        <div className="flex items-center gap-1.5 px-2" title={label}>
            <div className={`w-1.5 h-1.5 rounded-full ${colorClass}`}/>
            <span className="text-[10px] font-bold text-gray-500 uppercase tracking-tighter hidden sm:inline">
                {providerName}
            </span>
        </div>
    );
}
import React from 'react';
import {cn} from '../../utils/ui';
import {GlobeIcon, CpuChipIcon, ExclamationTriangleIcon, LoadingSpinner} from './icons';

interface ExtractionStatusProps {
    loading?: boolean;
    fallbackUsed?: boolean;
    providerUsed?: string;
    providerKind?: string;
    error?: Error | null;
    onRetry?: () => void;
    compact?: boolean;
}

export function ExtractionStatus({
    loading = false,
    fallbackUsed = false,
    providerUsed = 'none',
    providerKind = 'none',
    error = null,
    onRetry,
    compact = false,
}: ExtractionStatusProps) {
    if (!loading && !fallbackUsed && !error) {
        return null;
    }

    const isError = !!error;
    const isFallback = fallbackUsed && !isError;
    const isLoading = loading && !isError && !isFallback;

    if (compact) {
        if (isLoading) {
            return (
                <span className="flex items-center gap-1 text-xs text-neutral-400" aria-live="polite">
                    <LoadingSpinner className="h-3 w-3" />
                    Extracting…
                </span>
            );
        }
        if (isFallback) {
            return (
                <span className="flex items-center gap-1 text-xs text-amber-400" aria-live="polite">
                    <ExclamationTriangleIcon className="h-3 w-3" />
                    Using local extraction (AI unavailable)
                </span>
            );
        }
        if (isError) {
            return (
                <span className="flex items-center gap-1 text-xs text-red-400" aria-live="assertive">
                    <ExclamationTriangleIcon className="h-3 w-3" />
                    Extraction failed
                    {onRetry && (
                        <button
                            onClick={onRetry}
                            className="text-blue-400 hover:underline focus:outline-none focus:ring-1 focus:ring-blue-400"
                            aria-label="Retry extraction"
                        >
                            Retry
                        </button>
                    )}
                </span>
            );
        }
        return null;
    }

    return (
        <div
            className={cn(
                'flex items-start gap-2 p-3 rounded-lg border transition-colors',
                isLoading && 'bg-blue-900/20 border-blue-800 text-blue-300',
                isFallback && 'bg-amber-900/20 border-amber-800 text-amber-300',
                isError && 'bg-red-900/20 border-red-800 text-red-300'
            )}
            role="status"
            aria-live={isError ? 'assertive' : 'polite'}
        >
            {isLoading && <LoadingSpinner className="h-5 w-5 flex-shrink-0 mt-0.5" />}
            {isFallback && <CpuChipIcon className="h-5 w-5 flex-shrink-0 mt-0.5" />}
            {isError && <ExclamationTriangleIcon className="h-5 w-5 flex-shrink-0 mt-0.5" />}

            <div className="flex-1 min-w-0">
                {isLoading && (
                    <div className="text-sm font-medium">Extracting properties…</div>
                )}
                {isFallback && (
                    <div className="text-sm font-medium">Using local heuristic extraction</div>
                )}
                {isError && (
                    <div className="text-sm font-medium">Extraction failed</div>
                )}

                <div className="mt-1 text-xs text-neutral-400">
                    {isLoading && 'Heuristic patterns are running; AI refinement pending…'}
                    {isFallback && (
                        <>
                            AI extraction ({providerUsed}) fell back to local heuristic extraction.
                            {providerKind === 'heuristic' && ' Results may be less comprehensive.'}
                        </>
                    )}
                    {isError && (
                        <>
                            {error.message}
                            {onRetry && ' Click Retry to try again.'}
                        </>
                    )}
                </div>

                {onRetry && (isFallback || isError) && (
                    <button
                        onClick={onRetry}
                        className={cn(
                            'mt-2 text-xs font-medium px-3 py-1 rounded transition-colors focus:outline-none focus:ring-2',
                            isFallback && 'bg-amber-800 text-amber-200 hover:bg-amber-700 focus:ring-amber-700',
                            isError && 'bg-red-800 text-red-200 hover:bg-red-700 focus:ring-red-700'
                        )}
                        aria-label={isFallback ? 'Retry AI extraction' : 'Retry extraction'}
                    >
                        {isFallback ? 'Retry AI Extraction' : 'Retry'}
                    </button>
                )}
            </div>
        </div>
    );
}

export function ExtractionProviderBadge({
    providerUsed = 'none',
    providerKind = 'none',
    fallbackUsed = false,
}: {
    providerUsed?: string;
    providerKind?: string;
    fallbackUsed?: boolean;
}) {
    if (providerUsed === 'none') return null;

    const isHeuristic = providerKind === 'heuristic';
    const isLocalModel = providerKind === 'local-model';
    const isRemote = providerKind === 'remote';

    return (
        <span
            className={cn(
                'inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium',
                isHeuristic && 'bg-neutral-800 text-neutral-300',
                isLocalModel && 'bg-green-900/30 text-green-300 border border-green-800',
                isRemote && 'bg-blue-900/30 text-blue-300 border border-blue-800',
                fallbackUsed && 'bg-amber-900/30 text-amber-300 border border-amber-800'
            )}
            title={`Extraction provider: ${providerUsed} (${providerKind})${fallbackUsed ? ' — fell back from higher-priority provider' : ''}`}
        >
            {isHeuristic && <CpuChipIcon className="h-3 w-3" />}
            {isLocalModel && <CpuChipIcon className="h-3 w-3" />}
            {isRemote && <GlobeIcon className="h-3 w-3" />}
            {providerUsed}
            {fallbackUsed && <span className="text-amber-400" aria-label="Fell back from AI">↓</span>}
        </span>
    );
}
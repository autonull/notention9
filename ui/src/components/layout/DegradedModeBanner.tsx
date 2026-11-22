import React from 'react';
import {useDegradedMode} from '../../hooks/useDegradedMode';
import {cn} from '../../utils/ui';
import {tone, toneClass, type Tone} from '../../styles/tone';
import {AlertTriangleIcon, WifiOffIcon, DatabaseIcon, ZapIcon, ServerIcon} from '../ui/icons';

const MODE_CONFIG: Record<string, {
    icon: React.ReactNode;
    title: string;
    defaultMessage: string;
    color: 'amber' | 'red' | 'blue';
    severity: 'warning' | 'error';
}> = {
    'llm-timeout': {
        icon: <ZapIcon className="w-4 h-4" />,
        title: 'AI Extraction Timeout',
        defaultMessage: 'AI extraction timed out. Using local heuristic extraction.',
        color: 'amber',
        severity: 'warning',
    },
    'llm-fallback': {
        icon: <ServerIcon className="w-4 h-4" />,
        title: 'AI Unavailable',
        defaultMessage: 'Using local heuristic extraction (AI provider unavailable).',
        color: 'amber',
        severity: 'warning',
    },
    'storage-full': {
        icon: <DatabaseIcon className="w-4 h-4" />,
        title: 'Storage Full',
        defaultMessage: 'Local storage is full. Some data may not be saved.',
        color: 'red',
        severity: 'error',
    },
    'storage-corrupt': {
        icon: <AlertTriangleIcon className="w-4 h-4" />,
        title: 'Storage Corrupted',
        defaultMessage: 'Data corruption detected. A backup has been restored.',
        color: 'red',
        severity: 'error',
    },
    'sync-failed': {
        icon: <WifiOffIcon className="w-4 h-4" />,
        title: 'Sync Failed',
        defaultMessage: 'Background sync failed. Changes are stored locally.',
        color: 'blue',
        severity: 'warning',
    },
    'offline': {
        icon: <WifiOffIcon className="w-4 h-4" />,
        title: 'Offline',
        defaultMessage: 'You are offline. Notes stay on this device.',
        color: 'blue',
        severity: 'warning',
    },
};

const TONES: Record<'amber' | 'red' | 'blue', Tone> = {
    amber: 'warning',
    red: 'danger',
    blue: 'accent',
};

export function DegradedModeBanner() {
    const {degradedModes, removeDegradedMode} = useDegradedMode();

    if (degradedModes.length === 0) return null;

    return (
        <div
            className="flex flex-col gap-1.5 px-4 py-1.5 border-b"
            data-testid="degraded-mode-banner"
            role="region"
            aria-label="Degraded mode indicators"
        >
            {degradedModes.map((mode) => {
                const config = MODE_CONFIG[mode.type];
                const modeTone = TONES[config.color];

                return (
                    <div
                        key={mode.type}
                        className={cn(
                            'flex items-center gap-3 rounded-lg border px-3 py-2 text-xs',
                            toneClass(modeTone)
                        )}
                        data-testid={`degraded-${mode.type}`}
                    >
                        <span className="flex-shrink-0" aria-hidden="true">{config.icon}</span>
                        <div className="flex-1 min-w-0">
                            <p className="font-medium">{config.title}</p>
                            <p className="truncate opacity-80">{mode.message || config.defaultMessage}</p>
                        </div>
                        {mode.action && (
                            <button
                                onClick={mode.action.onClick}
                                className={cn(
                                    'flex-shrink-0 rounded border px-2 py-1 text-xs font-medium transition-colors hover:bg-[var(--app-hover)]',
                                    tone[modeTone].border,
                                    tone[modeTone].text
                                )}
                            >
                                {mode.action.label}
                            </button>
                        )}
                        {mode.dismissible && (
                            <button
                                onClick={() => removeDegradedMode(mode.type)}
                                className="flex-shrink-0 p-1 opacity-50 hover:opacity-100 transition-opacity"
                                aria-label={`Dismiss ${config.title}`}
                            >
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        )}
                    </div>
                );
            })}
        </div>
    );
}
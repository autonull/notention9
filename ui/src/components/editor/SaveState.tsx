import React from 'react';
import {CheckCircleIcon, ExclamationTriangleIcon, LoadingSpinner} from '../ui/icons';
import {cn} from '../../utils/ui';

interface SaveStateProps {
    status?: 'saved' | 'saving' | 'error';
    showSaved?: boolean;
    className?: string;
}

/** Transient save state. "Saved" is permanent only at the page end. */
export function SaveState({status, showSaved = false, className}: SaveStateProps) {
    if (status === 'saving') {
        return (
            <span className={cn('flex items-center gap-1.5 text-[11px] text-[var(--app-muted)]', className)}>
                <LoadingSpinner className="h-3 w-3"/>
                Saving…
            </span>
        );
    }

    if (status === 'error') {
        return (
            <span className={cn('flex items-center gap-1.5 text-[11px] text-red-400', className)}>
                <ExclamationTriangleIcon className="h-3 w-3"/>
                Not saved
            </span>
        );
    }

    if (showSaved && status === 'saved') {
        return (
            <span className={cn('flex items-center gap-1.5 text-[11px] text-[var(--app-faint)]', className)}>
                <CheckCircleIcon className="h-3 w-3 text-emerald-400/70"/>
                Saved
            </span>
        );
    }

    return null;
}

import React from 'react';
import {cn} from '../../utils/ui';

interface IdentityStripProps {
    avatar: React.ReactNode;
    name: React.ReactNode;
    handle?: React.ReactNode;
    chips?: React.ReactNode;
    actions?: React.ReactNode;
    className?: string;
}

/** One identity, one line: avatar, name, handle, status chips, edit. */
export function IdentityStrip({avatar, name, handle, chips, actions, className}: IdentityStripProps) {
    return (
        <div className={cn('flex min-w-0 flex-wrap items-center gap-x-2.5 gap-y-1.5 py-2', className)}>
            <div className="shrink-0">{avatar}</div>
            <div className="flex min-w-0 items-baseline gap-2">
                <span className="min-w-0 max-w-[16rem] truncate text-[13px] font-medium text-[var(--app-text)]">{name}</span>
                {handle}
            </div>
            {chips && <div className="flex min-w-0 items-center gap-1.5">{chips}</div>}
            {actions && <div className="ml-auto flex shrink-0 items-center gap-1">{actions}</div>}
        </div>
    );
}

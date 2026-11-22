import React, {useEffect, useRef, useState} from 'react';
import {useRelayStatus, type RelayStatus} from '../../hooks/useRelayStatus';
import {Button} from '../ui/Button';
import {Chip} from '../ui/kit';
import {cn} from '../../utils/ui';

const dotClass = (reachable: boolean) => (reachable ? 'bg-emerald-400' : 'bg-red-400');

function RelayRow({status}: {status: RelayStatus}) {
    const health = status.healthScore ?? 0.5;
    const healthClass = health > 0.7 ? 'text-emerald-300' : health > 0.4 ? 'text-amber-300' : 'text-red-300';

    return (
        <div className="flex items-center gap-2 px-1 py-1">
            <span className={cn('h-1.5 w-1.5 shrink-0 rounded-full', dotClass(status.reachable))}/>
            <span className="min-w-0 flex-1 truncate font-mono text-[11px] text-[var(--app-muted)]" title={status.url}>
                {status.url}
            </span>
            {status.reachable && status.latency !== undefined && (
                <span className="text-[11px] tabular-nums text-[var(--app-faint)]">{status.latency}ms</span>
            )}
            <span className={cn('text-[11px] tabular-nums', healthClass)}>{Math.round(health * 100)}%</span>
        </div>
    );
}

/** Relay health is a chip on the identity strip, not a card above the feed. */
export function RelayStatusChip({relays}: {relays?: string[]}) {
    const {statuses, up, down, checking, retry} = useRelayStatus(relays);
    const [open, setOpen] = useState(false);
    const rootRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!open) return;
        const close = (event: PointerEvent) => {
            if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
        };
        document.addEventListener('pointerdown', close);
        return () => document.removeEventListener('pointerdown', close);
    }, [open]);

    if (statuses.length === 0) return null;

    const tone = down.length === 0 ? 'success' : up.length === 0 ? 'danger' : 'warning';

    return (
        <div ref={rootRef} className="relative">
            <button
                type="button"
                onClick={() => setOpen(value => !value)}
                aria-expanded={open}
                aria-label={open ? 'Hide relay health' : 'Show relay health'}
                className="rounded-md"
            >
                <Chip tone={tone} size="xs" data-testid="relay-status-chip">
                    <span className={cn('h-1.5 w-1.5 rounded-full', dotClass(down.length === 0))}/>
                    {up.length}/{statuses.length} relays
                </Chip>
            </button>
            {open && (
                <div className="absolute right-0 z-30 mt-1 w-72 rounded-lg border border-[var(--app-line)] bg-[var(--app-panel)] p-2 shadow-[var(--app-shadow)]">
                    <div className="max-h-48 space-y-0.5 overflow-y-auto">
                        {statuses.map(status => <RelayRow key={status.url} status={status}/>)}
                    </div>
                    <div className="mt-2 flex items-center justify-between gap-2 border-t border-[var(--app-line)] pt-2">
                        <span className="text-[11px] text-[var(--app-faint)]">
                            {down.length === 0 ? 'All relays reachable' : `${down.length} unreachable`}
                        </span>
                        <Button size="xs" variant="ghost" onClick={retry} loading={checking}>
                            Retry
                        </Button>
                    </div>
                </div>
            )}
        </div>
    );
}

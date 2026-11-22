import React from 'react';
import {cn} from '../../utils/ui';

export interface FeedRowProps {
    leading?: React.ReactNode;
    title: React.ReactNode;
    meta?: React.ReactNode;
    body?: React.ReactNode;
    chips?: React.ReactNode;
    actions?: React.ReactNode;
    onSelect?: () => void;
    selected?: boolean;
    className?: string;
    testId?: string;
}

/**
 * Feed rows reuse the history row: identity line, one body, one property line,
 * one action row. Nothing nests a card inside a card.
 */
export function FeedRow({
    leading,
    title,
    meta,
    body,
    chips,
    actions,
    onSelect,
    selected = false,
    className,
    testId,
}: FeedRowProps) {
    const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
        if (!onSelect || (event.key !== 'Enter' && event.key !== ' ')) return;
        event.preventDefault();
        onSelect();
    };

    return (
        <div
            data-testid={testId}
            role={onSelect ? 'button' : undefined}
            tabIndex={onSelect ? 0 : undefined}
            aria-current={selected ? 'true' : undefined}
            onClick={onSelect}
            onKeyDown={handleKeyDown}
            className={cn(
                'group relative rounded-lg border px-3 py-2.5 transition-colors',
                selected
                    ? 'border-[var(--app-line)] bg-[var(--app-raised)]'
                    : 'border-transparent hover:bg-[var(--app-hover)]',
                onSelect && 'cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--app-accent)]/40',
                className
            )}
        >
            <div className="flex min-w-0 items-start gap-2.5">
                {leading && <div className="shrink-0">{leading}</div>}
                <div className="min-w-0 flex-1">
                    <div className="flex min-w-0 items-baseline gap-2">
                        <span className="min-w-0 truncate text-[13px] font-medium leading-5 text-[var(--app-text)]">
                            {title}
                        </span>
                        {meta && (
                            <span className="ml-auto flex shrink-0 items-center gap-1.5 text-[11px] tabular-nums text-[var(--app-faint)]">
                                {meta}
                            </span>
                        )}
                    </div>
                    {body && (
                        <div className="mt-1 whitespace-pre-wrap break-words text-[13px] leading-6 text-[var(--app-text-secondary)]">
                            {body}
                        </div>
                    )}
                    {chips && <div className="mt-1.5 flex min-w-0 flex-wrap items-center gap-1.5">{chips}</div>}
                    {actions && (
                        <div className="mt-1.5 flex flex-wrap items-center gap-1">
                            {actions}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

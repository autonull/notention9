import React, {useCallback, useRef} from 'react';
import {cn} from '../../utils/ui';

interface PaneResizerProps {
    value: number;
    min: number;
    max: number;
    onChange: (value: number) => void;
    /** Which edge of the pane this handle sits on. */
    edge?: 'left' | 'right';
    label: string;
    defaultValue?: number;
    className?: string;
}

/**
 * A vertical separator for percentage-based panes. Pointer drag and arrow
 * keys change the share; Home/End jump to the range; double-click resets.
 */
export function PaneResizer({
    value,
    min,
    max,
    onChange,
    edge = 'right',
    label,
    defaultValue = edge === 'right' ? 22 : 20,
    className,
}: PaneResizerProps) {
    const drag = useRef<{x: number; value: number} | null>(null);

    const clamp = useCallback((next: number) => Math.min(max, Math.max(min, Math.round(next))), [max, min]);

    const apply = useCallback((deltaPercent: number) => {
        onChange(clamp(value + (edge === 'right' ? deltaPercent : -deltaPercent)));
    }, [clamp, edge, onChange, value]);

    const onPointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
        event.preventDefault();
        event.currentTarget.setPointerCapture(event.pointerId);
        drag.current = {x: event.clientX, value};
    };

    const onPointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
        if (!drag.current) return;
        const delta = ((event.clientX - drag.current.x) / window.innerWidth) * 100;
        const next = clamp(drag.current.value + (edge === 'right' ? delta : -delta));
        if (next !== value) onChange(next);
    };

    const endDrag = (event: React.PointerEvent<HTMLDivElement>) => {
        if (!drag.current) return;
        drag.current = null;
        if (event.currentTarget.hasPointerCapture(event.pointerId)) {
            event.currentTarget.releasePointerCapture(event.pointerId);
        }
    };

    return (
        <div
            role="separator"
            aria-orientation="vertical"
            aria-label={label}
            aria-valuemin={min}
            aria-valuemax={max}
            aria-valuenow={value}
            tabIndex={0}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={endDrag}
            onPointerCancel={endDrag}
            onDoubleClick={() => onChange(clamp(defaultValue))}
            onKeyDown={(event) => {
                if (event.key === 'ArrowLeft') {
                    event.preventDefault();
                    apply(-1);
                } else if (event.key === 'ArrowRight') {
                    event.preventDefault();
                    apply(1);
                } else if (event.key === 'Home') {
                    event.preventDefault();
                    onChange(min);
                } else if (event.key === 'End') {
                    event.preventDefault();
                    onChange(max);
                }
            }}
            className={cn(
                'group relative z-10 hidden w-[var(--pane-handle)] shrink-0 cursor-col-resize touch-none lg:block',
                'bg-transparent focus:outline-none focus-visible:bg-[var(--app-accent-soft)]',
                className
            )}
        >
            <span
                aria-hidden="true"
                className="absolute inset-y-0 left-1/2 w-px -translate-x-1/2 bg-[var(--app-line)] transition-colors group-hover:bg-[var(--app-line-strong)] group-focus-visible:bg-[var(--app-accent-line)]"
            />
        </div>
    );
}

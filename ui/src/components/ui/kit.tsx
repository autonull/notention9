import React from 'react';
import {cn} from '../../utils/ui';
import type {UiOption} from '../../config/uiSurfaces';

import {toneClass, type Tone} from '../../styles/tone';

export function Chip({
    tone = 'neutral',
    size = 'sm',
    className,
    children,
    ...props
}: React.HTMLAttributes<HTMLSpanElement> & {tone?: Tone; size?: 'xs' | 'sm'}) {
    return (
        <span
            className={cn(
                'inline-flex items-center gap-1 rounded-md border font-medium leading-none',
                size === 'xs' ? 'px-1.5 py-1 text-[11px]' : 'px-2 py-1 text-[11px]',
                toneClass(tone),
                className
            )}
            {...props}
        >
            {children}
        </span>
    );
}

interface SegmentedProps<T extends string> {
    options: Array<UiOption<T>>;
    value: T;
    onChange: (id: T) => void;
    label: string;
    compact?: boolean;
    className?: string;
    optionClassName?: string;
    disabled?: (id: T) => boolean;
}

/** One control for every mutually exclusive display choice. */
export function Segmented<T extends string>({
    options,
    value,
    onChange,
    label,
    compact = false,
    className,
    optionClassName,
    disabled,
}: SegmentedProps<T>) {
    return (
        <div
            className={cn(
                'flex shrink-0 items-center gap-0.5 rounded-[9px] border border-[var(--app-line)] bg-[var(--app-surface)] p-0.5',
                className
            )}
            role="tablist"
            aria-label={label}
        >
            {options.map(option => {
                const Icon = option.icon;
                return (
                    <button
                        key={option.id}
                        type="button"
                        role="tab"
                        aria-selected={value === option.id}
                        title={option.label}
                        disabled={disabled?.(option.id)}
                        onClick={() => onChange(option.id)}
                        className={cn(
                            'flex h-7 items-center gap-1.5 rounded-[7px] px-2 text-[12px] font-medium transition-colors disabled:opacity-30',
                            value === option.id
                                ? 'bg-[var(--app-hover)] text-[var(--app-text)]'
                                : 'text-[var(--app-muted)] hover:text-[var(--app-text-secondary)]',
                            optionClassName
                        )}
                    >
                        {Icon && <Icon className="h-3.5 w-3.5"/>}
                        {!compact && <span className="hidden lg:inline">{option.label}</span>}
                    </button>
                );
            })}
        </div>
    );
}

interface TabsProps<T extends string> {
    options: Array<UiOption<T> & {count?: number}>;
    value: T;
    onChange: (id: T) => void;
    label: string;
    disabled?: (id: T) => boolean;
    className?: string;
}

export function Tabs<T extends string>({options, value, onChange, label, disabled, className}: TabsProps<T>) {
    return (
        <div
            className={cn('flex min-w-0 items-center gap-4 overflow-x-auto', className)}
            role="tablist"
            aria-label={label}
        >
            {options.map(option => (
                <button
                    key={option.id}
                    type="button"
                    role="tab"
                    aria-selected={value === option.id}
                    disabled={disabled?.(option.id)}
                    onClick={() => onChange(option.id)}
                    className={cn(
                        'relative -mb-px flex h-9 shrink-0 items-center gap-1.5 border-b-2 px-0.5 text-[13px] font-medium transition-colors disabled:opacity-30',
                        value === option.id
                            ? 'border-[var(--app-accent)] text-[var(--app-text)]'
                            : 'border-transparent text-[var(--app-muted)] hover:text-[var(--app-text-secondary)]'
                    )}
                >
                    {option.label}
                    {option.count !== undefined && (
                        <span className="text-[11px] tabular-nums text-[var(--app-faint)]">{option.count}</span>
                    )}
                </button>
            ))}
        </div>
    );
}

export function Toolbar({children, className}: {children: React.ReactNode; className?: string}) {
    return (
        <div
            className={cn(
                'flex h-11 shrink-0 items-center gap-1 overflow-x-auto border-b border-[var(--app-line)] bg-[var(--app-bg)] px-2 md:px-4',
                className
            )}
            role="toolbar"
            aria-label="Editor formatting"
        >
            {children}
        </div>
    );
}

export function SectionHeader({
    title,
    description,
    actions,
    icon: Icon,
    className,
}: {
    title: string;
    description?: string;
    actions?: React.ReactNode;
    icon?: React.ComponentType<{className?: string}>;
    className?: string;
}) {
    return (
        <div className={cn('flex items-end justify-between gap-4', className)}>
            <div className="flex min-w-0 items-start gap-2">
                {Icon && <Icon className="mt-0.5 h-4 w-4 shrink-0 text-[var(--app-faint)]"/>}
                <div className="min-w-0">
                    <h2 className="text-[15px] font-semibold tracking-[-0.01em] text-[var(--app-text)]">{title}</h2>
                    {description && <p className="mt-0.5 text-[12px] text-[var(--app-muted)]">{description}</p>}
                </div>
            </div>
            {actions}
        </div>
    );
}

export interface Choice<T extends string> {
    id: T;
    label: string;
    description?: string;
    icon?: React.ComponentType<{className?: string}>;
}

/** Card-shaped single choice, used for theme, density, and similar settings. */
export function ChoiceGrid<T extends string>({
    options,
    value,
    onChange,
    columns = 2,
    label,
}: {
    options: Array<Choice<T>>;
    value: T;
    onChange: (id: T) => void;
    columns?: 2 | 3;
    label?: string;
}) {
    return (
        <div
            className={cn('grid gap-2', columns === 3 ? 'grid-cols-3' : 'grid-cols-2')}
            role="group"
            aria-label={label}
        >
            {options.map(option => {
                const Icon = option.icon;
                const selected = value === option.id;
                return (
                    <button
                        key={option.id}
                        type="button"
                        onClick={() => onChange(option.id)}
                        aria-pressed={selected}
                        className={cn(
                            'flex min-h-[64px] flex-col gap-1 rounded-lg border px-3 py-2.5 text-left transition-colors',
                            selected
                                ? 'border-[var(--app-accent-line)] bg-[var(--app-accent-soft)] text-[var(--app-text)]'
                                : 'border-[var(--app-line)] bg-[var(--app-surface)] text-[var(--app-muted)] hover:border-[var(--app-line-strong)] hover:text-[var(--app-text-secondary)]'
                        )}
                    >
                        <span className="flex items-center gap-2 text-[13px] font-medium">
                            {Icon && <Icon className={cn('h-4 w-4', selected ? 'text-[var(--app-accent-text)]' : 'text-[var(--app-faint)]')}/>}
                            {option.label}
                        </span>
                        {option.description && (
                            <span className="text-[11px] text-[var(--app-muted)]">{option.description}</span>
                        )}
                    </button>
                );
            })}
        </div>
    );
}

export function Kbd({children}: {children: React.ReactNode}) {
    return (
        <kbd className="shrink-0 rounded border border-[var(--app-line)] bg-[var(--app-bg)] px-1.5 py-0.5 font-mono text-[11px] text-[var(--app-faint)]">
            {children}
        </kbd>
    );
}

export function Hint({children, className}: {children: React.ReactNode; className?: string}) {
    return <p className={cn('text-[11px] leading-5 text-[var(--app-faint)]', className)}>{children}</p>;
}

import React, {useEffect, useRef, useState} from 'react';
import type {NoteMode, NotesGroup, SortOrder} from '@notention/core';
import {ARRANGE_GROUPS, browseModeLabel, sortOrderLabel, type UiOption} from '../../config/uiSurfaces';
import {cn} from '../../utils/ui';
import {ChevronDownIcon} from '../ui/icons';

interface ArrangeMenuProps {
    mode: NoteMode;
    onModeChange: (mode: NoteMode) => void;
    sortOrder: SortOrder;
    onSortOrderChange: (order: SortOrder) => void;
    group: NotesGroup;
    onGroupChange: (group: NotesGroup) => void;
    className?: string;
}

const optionsFor = <T extends string>(id: 'layout' | 'order' | 'group'): Array<UiOption<T>> =>
    ARRANGE_GROUPS.find(group => group.id === id)?.options as Array<UiOption<T>> ?? [];

/** One control for layout, order, and group. Not three rows of chrome. */
export function ArrangeMenu({
    mode,
    onModeChange,
    sortOrder,
    onSortOrderChange,
    group,
    onGroupChange,
    className,
}: ArrangeMenuProps) {
    const [isOpen, setIsOpen] = useState(false);
    const root = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!isOpen) return;
        const onPointerDown = (event: PointerEvent) => {
            if (!root.current?.contains(event.target as Node)) setIsOpen(false);
        };
        const onKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                event.stopPropagation();
                setIsOpen(false);
            }
        };
        document.addEventListener('pointerdown', onPointerDown);
        document.addEventListener('keydown', onKeyDown, true);
        return () => {
            document.removeEventListener('pointerdown', onPointerDown);
            document.removeEventListener('keydown', onKeyDown, true);
        };
    }, [isOpen]);

    const layouts = optionsFor<NoteMode>('layout');
    const orders = optionsFor<SortOrder>('order');
    const groups = optionsFor<NotesGroup>('group');

    const choose = (apply: () => void) => {
        apply();
        setIsOpen(false);
    };

    return (
        <div ref={root} className={cn('relative', className)}>
            <button
                type="button"
                onClick={() => setIsOpen(open => !open)}
                aria-haspopup="dialog"
                aria-expanded={isOpen}
                aria-label={`Arrange notes: ${browseModeLabel(mode)}, ${sortOrderLabel(sortOrder)}`}
                className="inline-flex h-7 max-w-full items-center gap-1 rounded-md border border-[var(--app-line)] bg-[var(--app-surface)] px-2 text-[12px] font-medium text-[var(--app-text-secondary)] transition-colors hover:border-[var(--app-line-strong)] hover:text-[var(--app-text)]"
            >
                <span className="truncate">{browseModeLabel(mode)} · {sortOrderLabel(sortOrder)}</span>
                <ChevronDownIcon className="h-3.5 w-3.5 shrink-0 text-[var(--app-faint)]"/>
            </button>

            {isOpen && (
                <div
                    role="dialog"
                    aria-label="Arrange notes"
                    className="absolute left-0 top-9 z-50 w-64 rounded-xl border border-[var(--app-line)] bg-[var(--app-panel)] p-2 shadow-[var(--app-shadow)]"
                >
                    <ArrangeSection label="Layout">
                        <div className="grid grid-cols-2 gap-1">
                            {layouts.map(option => {
                                const Icon = option.icon;
                                return (
                                    <button
                                        key={option.id}
                                        type="button"
                                        aria-pressed={mode === option.id}
                                        onClick={() => choose(() => onModeChange(option.id))}
                                        className={cn(
                                            'flex h-8 items-center gap-1.5 rounded-md px-2 text-[12px] font-medium transition-colors',
                                            mode === option.id
                                                ? 'bg-[var(--app-hover)] text-[var(--app-text)]'
                                                : 'text-[var(--app-muted)] hover:bg-[var(--app-hover)] hover:text-[var(--app-text-secondary)]'
                                        )}
                                    >
                                        {Icon && <Icon className="h-3.5 w-3.5"/>}
                                        {option.label}
                                    </button>
                                );
                            })}
                        </div>
                    </ArrangeSection>

                    <ArrangeSection label="Order">
                        <div className="grid grid-cols-2 gap-1">
                            {orders.map(option => (
                                <button
                                    key={option.id}
                                    type="button"
                                    aria-pressed={sortOrder === option.id}
                                    onClick={() => choose(() => onSortOrderChange(option.id))}
                                    className={cn(
                                        'flex h-7 items-center rounded-md px-2 text-left text-[11px] font-medium transition-colors',
                                        sortOrder === option.id
                                            ? 'bg-[var(--app-hover)] text-[var(--app-text)]'
                                            : 'text-[var(--app-muted)] hover:bg-[var(--app-hover)] hover:text-[var(--app-text-secondary)]'
                                    )}
                                >
                                    <span className="truncate">{option.label}</span>
                                </button>
                            ))}
                        </div>
                    </ArrangeSection>

                    <ArrangeSection label="Group">
                        <div className="flex flex-wrap gap-1">
                            {groups.map(option => (
                                <button
                                    key={option.id}
                                    type="button"
                                    aria-pressed={group === option.id}
                                    onClick={() => choose(() => onGroupChange(option.id as NotesGroup))}
                                    className={cn(
                                        'h-7 rounded-md px-2 text-[11px] font-medium transition-colors',
                                        group === option.id
                                            ? 'bg-[var(--app-hover)] text-[var(--app-text)]'
                                            : 'text-[var(--app-muted)] hover:bg-[var(--app-hover)] hover:text-[var(--app-text-secondary)]'
                                    )}
                                >
                                    {option.label}
                                </button>
                            ))}
                        </div>
                    </ArrangeSection>
                </div>
            )}
        </div>
    );
}

function ArrangeSection({label, children}: {label: string; children: React.ReactNode}) {
    return (
        <section className="border-b border-[var(--app-line)] px-1 py-2 last:border-b-0">
            <h3 className="mb-1 px-1 text-[11px] font-medium text-[var(--app-faint)]">{label}</h3>
            {children}
        </section>
    );
}

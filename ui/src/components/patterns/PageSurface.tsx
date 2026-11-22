import React, {useEffect, useRef} from 'react';
import type {Note, Property} from '@notention/core';
import {cn} from '../../utils/ui';
import {PlusIcon} from '../ui/icons';

interface PageSurfaceProps {
    children: React.ReactNode;
    className?: string;
}

/** The page fills its pane; chrome never wraps it in a card. */
export function PageSurface({children, className}: PageSurfaceProps) {
    return (
        <div
            className={cn('flex min-h-0 flex-1 flex-col bg-[var(--app-surface)]', className)}
            data-testid="page-surface"
        >
            {children}
        </div>
    );
}

interface PageTitleProps {
    title: string;
    onChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
    autoFocus?: boolean;
    readOnly?: boolean;
}

/** The document owns its name; the bar does not. */
export function PageTitle({title, onChange, autoFocus = false, readOnly = false}: PageTitleProps) {
    const ref = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (autoFocus) requestAnimationFrame(() => ref.current?.focus());
    }, [autoFocus]);

    return (
        <input
            ref={ref}
            id="note-title-input"
            type="text"
            value={title}
            onChange={onChange}
            onKeyDown={(event) => {
                if (event.key === 'Enter') {
                    event.preventDefault();
                    document.querySelector<HTMLElement>('.ProseMirror')?.focus();
                }
            }}
            placeholder="Untitled note"
            aria-label="Note title"
            readOnly={readOnly}
            disabled={readOnly}
            className="page-title w-full min-w-0 border-0 bg-transparent p-0 text-[var(--app-text)] placeholder:text-[var(--app-faint)] focus:outline-none"
        />
    );
}

export function PageMeta({children, className}: {children: React.ReactNode; className?: string}) {
    return <p className={cn('page-meta', className)}>{children}</p>;
}

const hasInlineDetail = (content: string, property: Property) =>
    content.includes(`data-name="${property.key}"`) || content.includes(`data-name='${property.key}'`);

interface DetailChipsProps {
    note: Note;
    onEdit: (property: Property) => void;
    onAdd: () => void;
    readOnly?: boolean;
}

/**
 * Structured details that have no inline node. Inline chips in the prose stay
 * the primary path; this keeps imported details visible in the page.
 */
export function DetailChips({note, onEdit, onAdd, readOnly = false}: DetailChipsProps) {
    const orphaned = note.properties.filter(property => !hasInlineDetail(note.content, property));

    return (
        <div className="mt-3 flex flex-wrap items-center gap-1.5" aria-label="Note details">
            {orphaned.map(property => (
                <button
                    key={`${property.key}-${property.values.join(',')}`}
                    type="button"
                    onPointerDown={(event) => {
                        event.preventDefault();
                        onEdit(property);
                    }}
                    onClick={(event) => {
                        if (event.detail === 0) onEdit(property);
                    }}
                    aria-label={`Edit ${property.key}`}
                    className="inline-flex h-6 items-center gap-1 rounded-md border border-[var(--app-line)] bg-[var(--app-raised)] px-2 text-[11px] font-medium text-[var(--app-muted)] transition-colors hover:border-[var(--app-line-strong)] hover:text-[var(--app-text-secondary)]"
                >
                    <span className="text-[var(--app-text-secondary)]">{property.key}</span>
                    <span className="text-[var(--app-faint)]">=</span>
                    <span className="max-w-40 truncate text-[var(--app-muted)]">{property.values.join(', ')}</span>
                </button>
            ))}
            {!readOnly && (
                <button
                    type="button"
                    onPointerDown={(event) => {
                        event.preventDefault();
                        onAdd();
                    }}
                    onClick={(event) => {
                        if (event.detail === 0) onAdd();
                    }}
                    data-testid="page-add-detail"
                    className="inline-flex h-6 items-center gap-1 rounded-md px-2 text-[11px] font-medium text-[var(--app-faint)] transition-colors hover:bg-[var(--app-hover)] hover:text-[var(--app-text-secondary)]"
                >
                    <PlusIcon className="h-3 w-3"/>
                    Add detail
                </button>
            )}
        </div>
    );
}

interface PageHeaderProps {
    title: string;
    onTitleChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
    autoFocus?: boolean;
    readOnly?: boolean;
    children?: React.ReactNode;
}

export function PageHeader({title, onTitleChange, autoFocus, readOnly, children}: PageHeaderProps) {
    return (
        <header className="w-full max-w-[var(--page-measure)] px-[var(--page-pad)] pb-4 pt-8">
            <PageTitle title={title} onChange={onTitleChange} autoFocus={autoFocus} readOnly={readOnly}/>
            {children}
        </header>
    );
}

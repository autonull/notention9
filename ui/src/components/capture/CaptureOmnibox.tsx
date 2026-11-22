import React, {useCallback, useEffect, useRef, useState} from 'react';
import type {Property} from '@notention/core';
import {useSettings} from '../../hooks/useSettingsContext';
import {useHeuristicExtraction} from '../../hooks/useExtraction';
import {useToast} from '../../hooks/useToast';
import {useDemoWorkspace} from '../../hooks/useDemoWorkspace';
import {useNotes} from '../../hooks/useNotes';
import {ArrowRightIcon, SparklesIcon, TagIcon} from '../ui/icons';
import {cn} from '../../utils/ui';
import {deriveCaptureTags, useCaptureNote} from './useCaptureNote';

interface CaptureOmniboxProps {
    autoFocus?: boolean;
    className?: string;
    showSample?: boolean;
}

export function CaptureOmnibox({autoFocus = false, className, showSample = true}: CaptureOmniboxProps) {
    const {settings} = useSettings();
    const {addToast} = useToast();
    const {notes} = useNotes();
    const {load: loadSampleWorkspace} = useDemoWorkspace();
    const captureNote = useCaptureNote();
    const inputRef = useRef<HTMLInputElement>(null);
    const [value, setValue] = useState('');
    const [properties, setProperties] = useState<Property[]>([]);

    const extraction = useHeuristicExtraction(value, settings.ontology ?? []);
    const {extract} = extraction;

    useEffect(() => {
        if (!value.trim()) {
            setProperties([]);
            return;
        }
        let cancelled = false;
        const timer = window.setTimeout(() => {
            extract().then(result => {
                if (!cancelled && result) {
                    setProperties(result.properties.map(p => ({
                        key: p.key,
                        operator: p.operator,
                        values: p.values,
                    })));
                }
            });
        }, 120);
        return () => {
            cancelled = true;
            window.clearTimeout(timer);
        };
    }, [value, extract]);

    useEffect(() => {
        const focus = () => {
            inputRef.current?.focus();
            inputRef.current?.scrollIntoView({block: 'center'});
        };
        window.addEventListener('focus-capture', focus);
        return () => window.removeEventListener('focus-capture', focus);
    }, []);

    useEffect(() => {
        if (autoFocus) inputRef.current?.focus();
    }, [autoFocus]);

    const submit = useCallback((event: React.FormEvent) => {
        event.preventDefault();
        const note = captureNote(value, properties);
        if (!note) return;
        setValue('');
        setProperties([]);
        addToast('Note kept', 'success');
    }, [captureNote, value, properties, addToast]);

    const tags = deriveCaptureTags(value);
    const canSubmit = !!value.trim();

    return (
        <div className={cn('w-full', className)} data-testid="capture-omnibox">
            <form onSubmit={submit} className="relative">
                <label className="sr-only" htmlFor="capture-omnibox-input">What's on your mind?</label>
                <input
                    ref={inputRef}
                    id="capture-omnibox-input"
                    data-testid="quick-capture-input"
                    value={value}
                    onChange={event => setValue(event.target.value)}
                    placeholder="What's on your mind? Write what you need, or what you can offer."
                    autoComplete="off"
                    className="h-12 w-full rounded-xl border border-[var(--app-line)] bg-[var(--app-surface)] pl-4 pr-14 text-lg text-[var(--app-text)] placeholder:text-[var(--app-faint)] transition-colors focus:border-[var(--app-accent-line)] focus:outline-none focus:ring-[3px] focus:ring-[var(--app-accent-soft)] md:h-11 md:text-[15px]"
                />
                <button
                    type="submit"
                    disabled={!canSubmit}
                    aria-label="Keep note"
                    className={cn(
                        'absolute right-1.5 top-1/2 grid h-8 w-8 -translate-y-1/2 place-items-center rounded-lg transition-colors',
                        canSubmit
                            ? 'bg-[var(--app-accent)] text-[#ffffff] hover:bg-[color-mix(in_srgb,var(--app-accent)_88%,black)]'
                            : 'text-[var(--app-faint)]'
                    )}
                >
                    <ArrowRightIcon className="h-4 w-4"/>
                </button>
            </form>

            {(properties.length > 0 || tags.length > 0) && (
                <div className="mt-2 flex flex-wrap items-center gap-1.5">
                    {properties.map((prop, index) => (
                        <span
                            key={`${prop.key}-${index}`}
                            className="inline-flex items-center gap-1.5 rounded-md border border-[var(--app-accent-line)] bg-[var(--app-accent-soft)] px-2 py-1 text-[11px] font-medium text-[var(--app-accent-text)]"
                        >
                            <SparklesIcon className="h-3 w-3"/>
                            {prop.key}: {prop.values.join(', ')}
                        </span>
                    ))}
                    {tags.map(tag => (
                        <span
                            key={tag}
                            className="inline-flex items-center gap-1 rounded-md border border-[var(--app-line)] bg-[var(--app-raised)] px-2 py-1 text-[11px] font-medium text-[var(--app-muted)]"
                        >
                            <TagIcon className="h-3 w-3"/>
                            {tag}
                        </span>
                    ))}
                </div>
            )}

            <p className="mt-2 px-0.5 text-[11px] text-[var(--app-faint)]">
                Enter keeps the note · <span className="text-[var(--app-muted)]">#tags</span> or <span className="text-[var(--app-muted)]">key: value</span> add structure
            </p>

            {showSample && notes.length === 0 && (
                <button
                    type="button"
                    onClick={loadSampleWorkspace}
                    className="mt-2 px-0.5 text-[12px] text-[var(--app-muted)] underline decoration-[var(--app-line-strong)] underline-offset-4 hover:text-[var(--app-text-secondary)]"
                >
                    Or load a sample workspace
                </button>
            )}
        </div>
    );
}

import React, {useCallback, useEffect, useRef, useState} from 'react';
import type {Property} from '@notention/core';
import {Button} from '../ui/Button';
import {Chip, Kbd} from '../ui/kit';
import {SparklesIcon, XIcon} from '../ui/icons';
import {useSettings} from '../../hooks/useSettingsContext';
import {useHeuristicExtraction} from '../../hooks/useExtraction';
import {useCaptureNote} from './useCaptureNote';
import {MOD_LABEL} from '../../utils/platform';

interface CaptureComposerProps {
    isOpen: boolean;
    onClose: () => void;
}

export function CaptureComposer({isOpen, onClose}: CaptureComposerProps) {
    const {settings} = useSettings();
    const captureNote = useCaptureNote();
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const [value, setValue] = useState('');
    const [properties, setProperties] = useState<Property[]>([]);
    const extraction = useHeuristicExtraction(value, settings.ontology ?? []);
    const {extract} = extraction;

    useEffect(() => {
        if (!isOpen) {
            setValue('');
            setProperties([]);
            return;
        }
        requestAnimationFrame(() => textareaRef.current?.focus());
    }, [isOpen]);

    useEffect(() => {
        if (!value.trim()) {
            setProperties([]);
            return;
        }
        let cancelled = false;
        const timer = window.setTimeout(() => {
            extract().then(result => {
                if (!cancelled && result) {
                    setProperties(result.properties.map(p => ({key: p.key, operator: p.operator, values: p.values})));
                }
            });
        }, 120);
        return () => {
            cancelled = true;
            window.clearTimeout(timer);
        };
    }, [value, extract]);

    const submit = useCallback(() => {
        const note = captureNote(value, properties);
        if (!note) return;
        onClose();
    }, [captureNote, value, properties, onClose]);

    if (!isOpen) return null;

    return (
        <div
            className="fixed inset-0 z-50 flex items-start justify-center px-4 pt-[12vh]"
            role="dialog"
            aria-modal="true"
            aria-label="New note"
        >
            <button
                type="button"
                className="absolute inset-0 cursor-default bg-black/55 backdrop-blur-[2px]"
                aria-label="Close composer"
                onClick={onClose}
            />
            <form
                className="relative w-full max-w-[560px] rounded-xl border border-[var(--app-line)] bg-[var(--app-panel)] shadow-[var(--app-shadow)] animate-slide-in-down"
                onSubmit={(event) => {
                    event.preventDefault();
                    submit();
                }}
            >
                <div className="flex h-11 items-center justify-between border-b border-[var(--app-line)] px-4">
                    <h2 className="text-[14px] font-semibold text-[var(--app-text)]">New note</h2>
                    <button
                        type="button"
                        onClick={onClose}
                        aria-label="Close composer"
                        className="grid h-7 w-7 place-items-center rounded-md text-[var(--app-muted)] transition-colors hover:bg-[var(--app-hover)] hover:text-[var(--app-text)]"
                    >
                        <XIcon className="h-4 w-4"/>
                    </button>
                </div>

                <div className="p-4">
                    <textarea
                        ref={textareaRef}
                        data-testid="capture-composer-input"
                        value={value}
                        onChange={event => setValue(event.target.value)}
                        onKeyDown={(event) => {
                            if ((event.metaKey || event.ctrlKey) && event.key === 'Enter') {
                                event.preventDefault();
                                submit();
                            }
                        }}
                        placeholder="Write what you need, or what you can offer."
                        rows={5}
                        className="w-full resize-none rounded-lg border border-[var(--app-line)] bg-[var(--app-surface)] px-3 py-2.5 text-[15px] leading-6 text-[var(--app-text)] placeholder:text-[var(--app-faint)] focus:border-[var(--app-accent-line)] focus:outline-none focus:ring-[3px] focus:ring-[var(--app-accent-soft)]"
                    />

                    {properties.length > 0 && (
                        <div className="mt-2 flex flex-wrap gap-1.5">
                            {properties.map((prop, index) => (
                                <Chip key={`${prop.key}-${index}`} tone="accent">
                                    <SparklesIcon className="h-3 w-3"/>
                                    {prop.key}: {prop.values.join(', ')}
                                </Chip>
                            ))}
                        </div>
                    )}

                    <div className="mt-3 flex items-center justify-between gap-4">
                        <span className="flex items-center gap-1.5 text-[11px] text-[var(--app-faint)]">
                            <Kbd>{MOD_LABEL}</Kbd>
                            <span>+</span>
                            <Kbd>Enter</Kbd>
                            <span>to keep</span>
                        </span>
                        <Button type="submit" variant="primary" size="sm" disabled={!value.trim()}>
                            Keep note
                        </Button>
                    </div>
                </div>
            </form>
        </div>
    );
}

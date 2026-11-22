import React, {useCallback, useEffect, useRef, useState} from 'react';
import type {Property} from '@notention/core';
import {Button} from '../ui/Button';
import {XIcon} from '../ui/icons';
import {useSettings} from '../../hooks/useSettingsContext';
import {useHeuristicExtraction} from '../../hooks/useExtraction';
import {useCaptureNote} from './useCaptureNote';

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
        <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/70 p-4 pt-16" role="dialog" aria-modal="true" aria-label="New note">
            <button type="button" className="absolute inset-0 cursor-default" aria-label="Close composer" onClick={onClose}/>
            <form
                className="relative w-full max-w-2xl rounded-2xl border border-neutral-800 bg-neutral-950 p-5 shadow-2xl"
                onSubmit={(event) => {
                    event.preventDefault();
                    submit();
                }}
            >
                <div className="mb-4 flex items-center justify-between">
                    <h2 className="text-2xl font-semibold text-neutral-100">New note</h2>
                    <Button variant="ghost" size="sm" onClick={onClose} aria-label="Close composer">
                        <XIcon className="h-5 w-5"/>
                    </Button>
                </div>
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
                    rows={6}
                    className="w-full resize-none rounded-xl border border-neutral-800 bg-neutral-900 px-4 py-3 text-lg text-neutral-100 placeholder:text-neutral-400 focus:outline-none focus:border-neutral-600"
                />
                <div className="mt-2 flex items-center justify-between gap-4 text-sm text-neutral-400">
                    <span>One note. Details and next steps come next.</span>
                    <Button type="submit" variant="primary" size="lg" disabled={!value.trim()}>
                        Keep note
                    </Button>
                </div>
            </form>
        </div>
    );
}

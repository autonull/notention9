import React, {useCallback, useEffect, useRef, useState} from 'react';
import type {Property} from '@notention/core';
import {useSettings} from '../../hooks/useSettingsContext';
import {useHeuristicExtraction} from '../../hooks/useExtraction';
import {useToast} from '../../hooks/useToast';
import {useDemoWorkspace} from '../../hooks/useDemoWorkspace';
import {useNotes} from '../../hooks/useNotes';
import {Button} from '../ui/Button';
import {Badge} from '../ui/Badge';
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
                    className="w-full h-14 md:h-16 pl-5 pr-16 rounded-2xl border border-neutral-800 bg-neutral-900/80 text-lg text-neutral-100 placeholder:text-neutral-400 focus:outline-none focus:border-neutral-600 focus:ring-2 focus:ring-neutral-500/30"
                />
                <Button
                    type="submit"
                    variant="primary"
                    size="lg"
                    className="absolute right-2 top-1/2 -translate-y-1/2 h-11 w-11 rounded-xl p-0"
                    aria-label="Keep note"
                    disabled={!value.trim()}
                >
                    <ArrowRightIcon className="w-5 h-5"/>
                </Button>
            </form>

            {(properties.length > 0 || tags.length > 0) && (
                <div className="mt-2 flex flex-wrap items-center gap-2">
                    {properties.map((prop, index) => (
                        <Badge key={`${prop.key}-${index}`} variant="purple" size="sm" pill icon={<SparklesIcon className="w-3 h-3"/>}>
                            {prop.key}: {prop.values.join(', ')}
                        </Badge>
                    ))}
                    {tags.map(tag => (
                        <Badge key={tag} variant="info" size="sm" pill icon={<TagIcon className="w-3 h-3"/>}>
                            #{tag}
                        </Badge>
                    ))}
                </div>
            )}

            <p className="mt-2 px-1 text-sm text-neutral-400">
                Enter keeps the note. Add <span className="text-neutral-300">#tags</span> or <span className="text-neutral-300">key: value</span> inline.
            </p>

            {showSample && notes.length === 0 && (
                <button
                    type="button"
                    onClick={loadSampleWorkspace}
                    className="mt-3 px-1 text-sm text-neutral-400 underline decoration-neutral-700 underline-offset-4 hover:text-neutral-300"
                >
                    Or load a sample workspace
                </button>
            )}
        </div>
    );
}

import React, {KeyboardEvent, useState, useRef, useEffect} from 'react';
import {LoadingSpinner, SparklesIcon, TagIcon, XCircleIcon, PlusIcon} from '../ui/icons';

interface TagInputProps {
    tags: string[];
    onChange: (tags: string[]) => void;
    onAutoTag?: () => void;
    isAutoTagging?: boolean;
    autoFocus?: boolean;
    className?: string;
}

export function TagInput({
                              tags,
                              onChange,
                              onAutoTag,
                              isAutoTagging,
                              autoFocus,
                              className = "",
                          }: TagInputProps) {
    const [input, setInput] = useState('');
    const [isExpanded, setIsExpanded] = useState(false);
    const inputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (isExpanded && inputRef.current && autoFocus) {
            inputRef.current.focus();
        }
    }, [isExpanded, autoFocus]);

    const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            const val = input.trim();
            if (val && !tags.includes(val)) {
                onChange([...tags, val]);
                setInput('');
            }
        } else if (e.key === 'Escape') {
            setIsExpanded(false);
            inputRef.current?.blur();
            setInput('');
        } else if (e.key === 'Backspace' && !input && tags.length > 0) {
            onChange(tags.slice(0, -1));
        }
    };

    const removeTag = (tagToRemove: string) => {
        onChange(tags.filter((tag) => tag !== tagToRemove));
    };

    const handleBlur = () => {
        if (!input.trim()) {
            setIsExpanded(false);
        }
    };

    return (
        <div className={`flex min-w-0 flex-wrap items-center gap-1.5 ${className}`}>
            <TagIcon className="h-3.5 w-3.5 shrink-0 text-[var(--app-faint)]"/>
            {tags.map((tag) => (
                <span
                    key={tag}
                    className="flex shrink-0 items-center gap-1 rounded-md border border-[var(--app-line)] bg-[var(--app-raised)] px-1.5 py-0.5 text-[11px] font-medium text-[var(--app-muted)]"
                >
                    {tag}
                    <button
                        onClick={() => removeTag(tag)}
                        className="text-[var(--app-faint)] transition-colors hover:text-[var(--app-text)]"
                        aria-label={`Remove tag ${tag}`}
                    >
                        <XCircleIcon className="h-3 w-3"/>
                    </button>
                </span>
            ))}
            {isExpanded ? (
                <div className="flex min-w-[120px] flex-grow items-center gap-1">
                    <input
                        ref={inputRef}
                        type="text"
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={handleKeyDown}
                        onBlur={handleBlur}
                        placeholder="Add tags…"
                        className="min-w-[80px] flex-grow bg-transparent text-[12px] text-[var(--app-text-secondary)] placeholder:text-[var(--app-faint)] focus:outline-none"
                    />
                    {onAutoTag && (
                        <button
                            onClick={onAutoTag}
                            disabled={isAutoTagging}
                            className="shrink-0 rounded p-0.5 text-[var(--app-muted)] transition-colors hover:text-[var(--app-accent-text)] disabled:opacity-50"
                            title="Suggest tags with AI"
                        >
                            {isAutoTagging ? <LoadingSpinner className="h-3.5 w-3.5"/> : <SparklesIcon className="h-3.5 w-3.5"/>}
                        </button>
                    )}
                </div>
            ) : (
                <button
                    type="button"
                    onClick={() => {
                        setIsExpanded(true);
                        requestAnimationFrame(() => inputRef.current?.focus());
                    }}
                    className="inline-flex h-6 shrink-0 items-center gap-1 rounded-md px-1.5 text-[11px] font-medium text-[var(--app-faint)] transition-colors hover:bg-[var(--app-hover)] hover:text-[var(--app-muted)]"
                >
                    <PlusIcon className="h-3 w-3"/>
                    tag
                </button>
            )}
            {onAutoTag && !isExpanded && (
                <button
                    type="button"
                    onClick={onAutoTag}
                    disabled={isAutoTagging}
                    className="grid h-6 w-6 shrink-0 place-items-center rounded-md text-[var(--app-faint)] transition-colors hover:bg-[var(--app-hover)] hover:text-[var(--app-accent-text)] disabled:opacity-50"
                    title="Suggest tags with AI"
                    aria-label="Suggest tags"
                >
                    {isAutoTagging ? <LoadingSpinner className="h-3.5 w-3.5"/> : <SparklesIcon className="h-3.5 w-3.5"/>}
                </button>
            )}
        </div>
    );
}

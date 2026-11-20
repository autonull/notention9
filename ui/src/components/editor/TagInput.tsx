import React, {KeyboardEvent, useState, useRef, useEffect} from 'react';
import {LoadingSpinner, SparklesIcon, TagIcon, XCircleIcon, PlusIcon} from '../ui/icons';

interface TagInputProps {
    tags: string[];
    onChange: (tags: string[]) => void;
    onAutoTag?: () => void;
    isAutoTagging?: boolean;
    autoFocus?: boolean;
    className?: string;
    onAddDetail?: () => void;
}

export function TagInput({
                              tags,
                              onChange,
                              onAutoTag,
                              isAutoTagging,
                              autoFocus,
                              className = "p-2 bg-gray-900/50 rounded-md border border-gray-700/30",
                              onAddDetail,
                          }: TagInputProps) {
    const [input, setInput] = useState('');
    const [isExpanded, setIsExpanded] = useState(tags.length > 0);
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

    const handleAddTagClick = () => {
        setIsExpanded(true);
    };

    const handleBlur = () => {
        if (!input.trim()) {
            setIsExpanded(false);
        }
    };

    return (
        <div className={`flex flex-wrap items-center gap-2 ${className}`}>
            <TagIcon className="h-4 w-4 text-gray-400 flex-shrink-0"/>
            {tags.map((tag) => (
                <span
                    key={tag}
                    className="flex items-center gap-1 px-2 py-0.5 bg-blue-900/50 text-blue-200 text-xs rounded-full border border-blue-800 flex-shrink-0"
                >
                    {tag}
                    <button
                        onClick={() => removeTag(tag)}
                        className="hover:text-white focus:outline-none p-0.5"
                        aria-label={`Remove tag ${tag}`}
                    >
                        <XCircleIcon className="h-3 w-3"/>
                    </button>
                </span>
            ))}
            {isExpanded ? (
                <div className="flex items-center gap-1 flex-grow min-w-[120px]">
                    <input
                        ref={inputRef}
                        type="text"
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={handleKeyDown}
                        onBlur={handleBlur}
                        placeholder="Add tags..."
                        className="flex-grow min-w-[80px] bg-transparent text-sm text-gray-300 focus:outline-none placeholder-gray-600"
                    />
                    {onAutoTag && (
                        <button
                            onClick={onAutoTag}
                            disabled={isAutoTagging}
                            className="p-1 text-purple-400 hover:text-purple-300 transition-colors disabled:opacity-50 flex-shrink-0"
                            title="Auto-suggest tags with AI"
                        >
                            {isAutoTagging ? <LoadingSpinner className="h-4 w-4"/> : <SparklesIcon className="h-4 w-4"/>}
                        </button>
                    )}
                </div>
            ) : (
                <button
                    type="button"
                    onClick={handleAddTagClick}
                    className="btn btn-ghost btn-xs px-2 py-0.5 text-xs uppercase tracking-wider bg-gray-800 text-gray-400 border border-gray-700 hover:bg-gray-700 hover:text-gray-200 active:scale-95 touch-target flex-shrink-0"
                >
                    <PlusIcon className="w-3 h-3 mr-1" />
                    tag
                </button>
            )}
            {onAddDetail && (
                <button
                    type="button"
                    onClick={onAddDetail}
                    className="btn btn-ghost btn-xs px-2 py-0.5 text-xs uppercase tracking-wider bg-gray-800 text-gray-400 border border-gray-700 hover:bg-gray-700 hover:text-gray-200 active:scale-95 touch-target flex-shrink-0"
                    title="Add property from ontology"
                >
                    <PlusIcon className="w-3 h-3 mr-1" />
                    detail
                </button>
            )}
        </div>
    );
};
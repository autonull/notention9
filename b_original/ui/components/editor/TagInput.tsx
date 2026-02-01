import React, { useState, KeyboardEvent } from 'react';
import { TagIcon, XCircleIcon, SparklesIcon, LoadingSpinner } from '../common/icons';

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
  className = "p-2 bg-gray-900/50 rounded-md border border-gray-700/30"
}: TagInputProps) {
  const [input, setInput] = useState('');

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const val = input.trim();
      if (val && !tags.includes(val)) {
        onChange([...tags, val]);
        setInput('');
      }
    } else if (e.key === 'Backspace' && !input && tags.length > 0) {
      onChange(tags.slice(0, -1));
    }
  };

  const removeTag = (tagToRemove: string) => {
    onChange(tags.filter((tag) => tag !== tagToRemove));
  };

  return (
    <div className={`flex flex-wrap items-center gap-2 ${className}`}>
      <TagIcon className="h-4 w-4 text-gray-400" />
      {tags.map((tag) => (
        <span
          key={tag}
          className="flex items-center gap-1 px-2 py-0.5 bg-blue-900/50 text-blue-200 text-xs rounded-full border border-blue-800"
        >
          {tag}
          <button
            onClick={() => removeTag(tag)}
            className="hover:text-white focus:outline-none"
          >
            <XCircleIcon className="h-3 w-3" />
          </button>
        </span>
      ))}
      <input
        type="text"
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={tags.length === 0 ? "Add tags..." : ""}
        className="flex-grow min-w-[80px] bg-transparent text-sm text-gray-300 focus:outline-none placeholder-gray-600"
        autoFocus={autoFocus}
      />
      {onAutoTag && (
        <button
          onClick={onAutoTag}
          disabled={isAutoTagging}
          className="p-1 text-purple-400 hover:text-purple-300 transition-colors disabled:opacity-50"
          title="Auto-suggest tags with AI"
        >
           {isAutoTagging ? <LoadingSpinner className="h-4 w-4" /> : <SparklesIcon className="h-4 w-4" />}
        </button>
      )}
    </div>
  );
};

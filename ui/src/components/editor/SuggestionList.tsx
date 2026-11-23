import React, {forwardRef, useEffect, useImperativeHandle, useState} from 'react';
import {cn} from '../../utils/ui';

export interface SuggestionItem {
    id: string; // The text to insert
    label: string; // The display text
    description?: string;
    type?: 'tag' | 'property' | 'template' | 'format' | 'command';
}

interface SuggestionListProps {
    items: SuggestionItem[];
    command: (item: SuggestionItem) => void;
}

export const SuggestionList = forwardRef((props: SuggestionListProps, ref) => {
    const [selectedIndex, setSelectedIndex] = useState(0);

    const selectItem = (index: number) => {
        const item = props.items[index];
        if (item) {
            props.command(item);
        }
    };

    const upHandler = () => {
        setSelectedIndex((selectedIndex + props.items.length - 1) % props.items.length);
    };

    const downHandler = () => {
        setSelectedIndex((selectedIndex + 1) % props.items.length);
    };

    const enterHandler = () => {
        selectItem(selectedIndex);
    };

    useEffect(() => setSelectedIndex(0), [props.items]);

    useImperativeHandle(ref, () => ({
        onKeyDown: ({event}: { event: KeyboardEvent }) => {
            if (event.key === 'ArrowUp') {
                upHandler();
                return true;
            }
            if (event.key === 'ArrowDown') {
                downHandler();
                return true;
            }
            if (event.key === 'Enter') {
                enterHandler();
                return true;
            }
            return false;
        },
    }));

    if (props.items.length === 0) {
        return null;
    }

    return (
        <div className="z-50 min-w-[200px] overflow-hidden rounded-xl border border-[var(--app-line)] bg-[var(--app-panel)] shadow-[var(--app-shadow)]">
            {props.items.map((item, index) => (
                <button
                    key={`${item.label}-${index}`}
                    type="button"
                    className={cn(
                        'block w-full px-3 py-2 text-left transition-colors',
                        index === selectedIndex
                            ? 'bg-[var(--app-raised)]'
                            : 'hover:bg-[var(--app-hover)]'
                    )}
                    onClick={() => selectItem(index)}
                >
                    <div className={cn('text-[13px] font-medium', index === selectedIndex ? 'text-[var(--app-text)]' : 'text-[var(--app-text-secondary)]')}>
                        {item.label}
                    </div>
                    {item.description && (
                        <div className="text-[11px] text-[var(--app-muted)]">
                            {item.description}
                        </div>
                    )}
                </button>
            ))}
        </div>
    );
});

SuggestionList.displayName = 'SuggestionList';

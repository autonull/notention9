import React from 'react';
import {
    Heading1Icon,
    Heading2Icon,
    Heading3Icon,
    ListUlIcon,
    ListOlIcon,
    QuoteIcon,
    CodeBlockIcon,
    HorizontalRuleIcon,
} from '../ui/icons';
import {DropdownMenu, type DropdownMenuItem} from '../ui/Primitives';
import type {FormatAction} from './formatCommands';

/** One quiet block-format menu in the bar; the bubble and slash stay primary. */
export function FormatMenu({onFormat}: {onFormat?: (action: FormatAction) => void}) {
    if (!onFormat) return null;

    const items: DropdownMenuItem[] = [
        {label: 'Heading 1', icon: Heading1Icon, onClick: () => onFormat('h1')},
        {label: 'Heading 2', icon: Heading2Icon, onClick: () => onFormat('h2')},
        {label: 'Heading 3', icon: Heading3Icon, onClick: () => onFormat('h3')},
        {label: 'Bullet list', icon: ListUlIcon, onClick: () => onFormat('bullet')},
        {label: 'Numbered list', icon: ListOlIcon, onClick: () => onFormat('numbered')},
        {label: 'Quote', icon: QuoteIcon, onClick: () => onFormat('quote')},
        {label: 'Code block', icon: CodeBlockIcon, onClick: () => onFormat('code')},
        {label: 'Divider', icon: HorizontalRuleIcon, onClick: () => onFormat('divider')},
    ];

    return (
        <DropdownMenu
            trigger={
                <button
                    type="button"
                    aria-label="Text style"
                    title="Text style"
                    aria-haspopup="menu"
                    className="inline-flex h-8 items-center justify-center rounded-[9px] px-2 text-[13px] font-semibold text-[var(--app-muted)] transition-colors hover:bg-[var(--app-hover)] hover:text-[var(--app-text)]"
                >
                    Aa
                </button>
            }
            items={items}
        />
    );
}

import React from 'react';

interface BrandMarkProps {
    onClick: () => void;
    label?: string;
}

export function BrandMark({onClick, label = 'Notention notes'}: BrandMarkProps) {
    return (
        <button
            type="button"
            onClick={onClick}
            className="group grid h-7 w-7 shrink-0 place-items-center rounded-[8px] border border-[var(--app-line)] bg-[var(--app-surface)] transition-colors hover:border-[var(--app-line-strong)]"
            aria-label={label}
            title={label}
        >
            <span
                aria-hidden="true"
                className="text-[15px] leading-none text-[var(--app-text-secondary)] transition-colors group-hover:text-[var(--app-text)]"
            >
                ✳
            </span>
        </button>
    );
}

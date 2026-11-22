import React from 'react';

export interface ToggleProps {
    checked: boolean;
    onChange: (checked: boolean) => void;
    disabled?: boolean;
    id?: string;
    ariaLabel?: string;
    label?: string;
}

export function Toggle({
    checked,
    onChange,
    disabled = false,
    id,
    ariaLabel,
    label
}: ToggleProps) {
    const handleClick = () => {
        if (!disabled) {
            onChange(!checked);
        }
    };

    return (
        <div className="flex items-center gap-3">
            <button
                id={id}
                onClick={handleClick}
                disabled={disabled}
                aria-label={ariaLabel || label}
                aria-checked={checked}
                role="switch"
                type="button"
                className={`relative inline-flex h-5 w-9 flex-shrink-0 cursor-pointer items-center rounded-full transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--app-accent)]/45 focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--app-bg)] ${
                    disabled
                        ? 'cursor-not-allowed bg-[var(--app-line)] opacity-50'
                        : checked
                            ? 'bg-[var(--app-accent)]'
                            : 'bg-[var(--app-line-strong)]'
                }`}
            >
                <span
                    aria-hidden="true"
                    className={`inline-block h-4 w-4 transform rounded-full bg-[#ffffff] shadow-sm transition-transform ${
                        checked && !disabled ? 'translate-x-[1.125rem]' : 'translate-x-0.5'
                    }`}
                />
            </button>
            {label && (
                <span
                    className={`text-[12px] font-medium ${disabled ? 'text-[var(--app-faint)]' : 'text-[var(--app-text-secondary)]'} cursor-pointer`}
                    onClick={!disabled ? () => onChange(!checked) : undefined}
                >
                    {label}
                </span>
            )}
        </div>
    );
}

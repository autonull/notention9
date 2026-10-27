import React, { forwardRef } from 'react';
import { cn } from '../../utils/ui';
import { componentTokens } from '../../styles/tokens';

export interface SelectOption {
    value: string;
    label: string;
}

export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
    label?: string;
    error?: string;
    options?: SelectOption[];
    className?: string;
    leftIcon?: React.ReactNode;
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(({
    label,
    error,
    options,
    children,
    className = '',
    leftIcon,
    ...props
}, ref) => {
    const tokens = componentTokens.input;

    return (
        <div className={className}>
            {label && (
                <label className={tokens.label}>
                    {label}
                </label>
            )}
            <div className="relative">
                {leftIcon && (
                    <div className={cn(tokens.iconWrapper, 'left-0 pl-3')}>
                        {leftIcon}
                    </div>
                )}
                <select
                    ref={ref}
                    className={cn(
                        tokens.base,
                        tokens.padding,
                        'appearance-none',
                        leftIcon ? 'pl-10' : 'px-3',
                        'pr-10',
                        error && tokens.error
                    )}
                    {...props}
                >
                    {options ? (
                        options.map((option) => (
                            <option key={option.value} value={option.value}>
                                {option.label}
                            </option>
                        ))
                    ) : (
                        children
                    )}
                </select>
                {/* Custom arrow icon */}
                <div className={cn(tokens.iconWrapper, 'right-0 pr-3')}>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                </div>
            </div>
            {error && (
                <p className={tokens.errorText}>{error}</p>
            )}
        </div>
    );
});

Select.displayName = 'Select';
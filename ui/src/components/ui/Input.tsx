import React from 'react';
import { cn } from '../../utils/ui';
import { componentTokens } from '../../styles/tokens';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
    label?: string;
    error?: string;
    hint?: string;
    leftIcon?: React.ReactNode;
    rightIcon?: React.ReactNode;
    fullWidth?: boolean;
    touchTarget?: boolean;
}

export function Input({
    label,
    error,
    hint,
    leftIcon,
    rightIcon,
    fullWidth = true,
    className = '',
    id,
    touchTarget = false,
    ...props
}: InputProps) {
    const generatedId = React.useId();
    const inputId = id || `input-${generatedId}`;
    const errorId = error ? `${inputId}-error` : undefined;
    const hintId = hint ? `${inputId}-hint` : undefined;
    const tokens = componentTokens.input;

    return (
        <div className={cn('w-full', fullWidth && 'w-full')}>
            {label && (
                <label
                    htmlFor={inputId}
                    className={tokens.label}
                >
                    {label}
                </label>
            )}
            <div className="relative">
                {leftIcon && (
                    <div className={cn(tokens.iconWrapper, 'left-0 pl-3')}>
                        {leftIcon}
                    </div>
                )}
                <input
                    id={inputId}
                    className={cn(
                        tokens.base,
                        tokens.padding,
                        leftIcon && 'pl-10',
                        rightIcon && 'pr-10',
                        error && tokens.error,
                        touchTarget && 'py-3 text-base',
                        className
                    )}
                    aria-invalid={error ? 'true' : 'false'}
                    aria-describedby={cn(errorId, hintId)}
                    {...props}
                />
                {rightIcon && (
                    <div className={cn(tokens.iconWrapper, 'right-0 pr-3')}>
                        {rightIcon}
                    </div>
                )}
            </div>
            {error && (
                <p id={errorId} className={tokens.errorText} role="alert">
                    {error}
                </p>
            )}
            {hint && !error && (
                <p id={hintId} className={tokens.hintText}>
                    {hint}
                </p>
            )}
        </div>
    );
}
import React from 'react';
import {cn} from '../../utils/ui';

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

    return (
        <div className={cn('w-full', fullWidth && 'w-full')}>
            {label && (
                <label
                    htmlFor={inputId}
                    className="block text-sm font-medium text-gray-300 mb-1.5"
                >
                    {label}
                </label>
            )}
            <div className="relative">
                {leftIcon && (
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-500">
                        {leftIcon}
                    </div>
                )}
                <input
                    id={inputId}
                    className={cn(
                        'input',
                        leftIcon ? 'pl-10' : '',
                        rightIcon ? 'pr-10' : '',
                        error && 'field-error',
                        touchTarget && 'py-3 text-base',
                        className
                    )}
                    aria-invalid={error ? 'true' : 'false'}
                    aria-describedby={cn(errorId, hintId)}
                    {...props}
                />
                {rightIcon && (
                    <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none text-gray-500">
                        {rightIcon}
                    </div>
                )}
            </div>
            {error && (
                <p id={errorId} className="mt-1.5 text-sm text-red-400" role="alert">
                    {error}
                </p>
            )}
            {hint && !error && (
                <p id={hintId} className="mt-1.5 text-sm text-gray-500">
                    {hint}
                </p>
            )}
        </div>
    );
}